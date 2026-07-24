(function () {
    const NovelcrafterImporter = {
        async importProject(app, files) {
            if (!files || files.length === 0) {
                alert('No file selected. Please select a Novelcrafter export file.');
                return;
            }

            app.novelcrafterImportInProgress = true;

            try {
                const file = files[0];
                const ext = file.name.split('.').pop().toLowerCase();

                if (ext !== 'md' && ext !== 'zip') {
                    throw new Error('Unsupported file format: .' + ext + '. Please select a .md or .zip file exported from Novelcrafter.');
                }

                let rawText, projectName, codexZip;

                if (ext === 'zip') {
                    projectName = file.name.replace(/\.zip$/i, '');
                    const arrayBuffer = await this.readFileAsArrayBuffer(file);
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const novelFile = zip.file('novel.md');
                    if (!novelFile) {
                        throw new Error('ZIP file does not contain novel.md. Make sure this is a Novelcrafter full export.');
                    }
                    rawText = await novelFile.async('text');
                    codexZip = zip;
                } else {
                    rawText = await this.readFileAsText(file);
                    projectName = file.name.replace(/\.md$/i, '');
                }

                let chapters = this.parseMarkdown(rawText, projectName);

                if (chapters.length === 0) {
                    throw new Error('No chapters or scenes found in the file. Make sure the export includes heading structure.');
                }

                const projectId = Date.now().toString();
                const projName = projectName || 'Imported Novelcrafter Project';
                const project = {
                    id: projectId,
                    name: projName,
                    created: new Date(),
                    modified: new Date()
                };
                await db.projects.add(project);

                let totalScenes = 0;
                for (let ci = 0; ci < chapters.length; ci++) {
                    const ch = chapters[ci];
                    const chapterId = Date.now().toString() + '-c' + ci;

                    await db.chapters.add({
                        id: chapterId,
                        projectId: projectId,
                        title: ch.title,
                        order: ci,
                        summary: ch.summary || '',
                        created: new Date(),
                        modified: new Date()
                    });

                    for (let si = 0; si < ch.scenes.length; si++) {
                        const scene = ch.scenes[si];
                        const sceneId = Date.now().toString() + '-s' + ci + '-' + si + '-' + Math.random().toString(36).slice(2, 6);

                        await db.scenes.add({
                            id: sceneId,
                            projectId: projectId,
                            chapterId: chapterId,
                            title: scene.title || 'Scene ' + (si + 1),
                            order: si,
                            povCharacter: '',
                            pov: '3rd person limited',
                            tense: 'past',
                            language: 'English',
                            summary: scene.summary || '',
                            created: new Date(),
                            modified: new Date()
                        });

                        await db.content.add({
                            sceneId: sceneId,
                            text: scene.content || '',
                            wordCount: this.countWords(scene.content)
                        });

                        totalScenes++;
                    }
                }

                if (codexZip) {
                    try {
                        await this.importCodexFromZip(codexZip, projectId);
                    } catch (e) {
                        console.warn('Codex import failed, but novel was imported:', e);
                    }
                }

                await app.loadProjects();
                app.showNovelcrafterImportModal = false;
                app.novelcrafterImportInProgress = false;

                let successMsg = '\u2713 Successfully imported "' + projName + '"!\n\n' + chapters.length + ' chapters and ' + totalScenes + ' scenes imported.';
                if (codexZip) {
                    const compendiumCount = await db.compendium.where('projectId').equals(projectId).count();
                    successMsg += '\n' + compendiumCount + ' compendium entries imported.';
                }
                alert(successMsg);

                await app.openProject(projectId);

            } catch (e) {
                console.error('Failed to import Novelcrafter project:', e);
                alert('Failed to import project:\n\n' + e.message + '\n\nSee console for details.');
                app.novelcrafterImportInProgress = false;
            }
        },

        parseMarkdown(text, fallbackName) {
            const lines = text.split('\n');
            const blocks = [];
            let currentBlock = { type: 'text', lines: [] };

            for (const line of lines) {
                const h1Match = line.match(/^# (.+)/);
                const h2Match = line.match(/^## (.+)/);
                const h3Match = line.match(/^### (.+)/);

                if (h1Match || h2Match || h3Match) {
                    if (currentBlock.lines.length > 0 || currentBlock.type !== 'text') {
                        blocks.push(currentBlock);
                    }
                    currentBlock = {
                        type: h1Match ? 'h1' : h2Match ? 'h2' : 'h3',
                        title: (h1Match || h2Match || h3Match)[1].trim(),
                        lines: []
                    };
                } else {
                    if (currentBlock.type !== 'text') {
                        blocks.push(currentBlock);
                        currentBlock = { type: 'text', lines: [] };
                    }
                    currentBlock.lines.push(line);
                }
            }
            if (currentBlock.lines.length > 0 || currentBlock.type !== 'text') {
                blocks.push(currentBlock);
            }

            return this.buildStructure(blocks, fallbackName);
        },


        buildStructure(blocks, fallbackName) {
            const headingBlocks = blocks.filter(b => b.type !== 'text');

            if (headingBlocks.length === 0) {
                return [{ title: 'Chapter 1', scenes: [{ title: 'Scene 1', content: blocks.map(b => b.lines.join('\n')).join('\n\n').trim() }], summary: '' }];
            }

            // Determine if H1 is a project title (single H1, first in doc, not "Act")
            const firstBlock = blocks[0];
            const h1Blocks = headingBlocks.filter(b => b.type === 'h1');
            let skipH1Title = false;
            if (h1Blocks.length === 1 && h1Blocks[0] === firstBlock) {
                const h1Title = (h1Blocks[0].title || '').trim();
                if (!/^act\b/i.test(h1Title)) {
                    skipH1Title = true;
                }
            }

            // Structural headings exclude the H1 title
            const structuralBlocks = skipH1Title
                ? headingBlocks.filter(b => b !== h1Blocks[0])
                : headingBlocks;

            if (structuralBlocks.length === 0) {
                return [{ title: 'Chapter 1', scenes: [{ title: 'Scene 1', content: blocks.map(b => b.lines.join('\n')).join('\n\n').trim() }], summary: '' }];
            }

            const structTypes = [...new Set(structuralBlocks.map(b => b.type))].sort();

            // Detect if the highest structural heading level contains act titles
            let hasActs = false;
            if (structTypes.length >= 2) {
                const highestLevel = structTypes[0];
                const actCount = structuralBlocks.filter(b => b.type === highestLevel && /^act\b/i.test(b.title)).length;
                hasActs = actCount > 0;
            }

            // Map heading levels to roles
            let chapterLevel, sceneLevel;

            if (hasActs) {
                const actLevel = structTypes[0];
                chapterLevel = structTypes[1] || null;
                sceneLevel = structTypes.length >= 3 ? structTypes[2] : null;
            } else if (structTypes.length >= 2) {
                chapterLevel = structTypes[0];
                sceneLevel = structTypes[1];
            } else if (structTypes.length === 1) {
                chapterLevel = structTypes[0];
                sceneLevel = null;
            } else {
                chapterLevel = null;
                sceneLevel = null;
            }

            let chapterBlocks;
            if (chapterLevel) {
                chapterBlocks = structuralBlocks.filter(b => b.type === chapterLevel);
            } else {
                chapterBlocks = [];
            }

            if (chapterBlocks.length === 0) {
                chapterBlocks = [{ type: chapterLevel || 'h2', title: 'Chapter 1', lines: [] }];
                chapterLevel = chapterLevel || 'h2';
            }

            const chapters = [];

            for (let ci = 0; ci < chapterBlocks.length; ci++) {
                const cb = chapterBlocks[ci];
                const startIdx = blocks.indexOf(cb);
                const endIdx = ci < chapterBlocks.length - 1 ? blocks.indexOf(chapterBlocks[ci + 1]) : blocks.length;

                const betweenBlocks = blocks.slice(startIdx + 1, endIdx).filter(b => b.type === 'text');

                if (sceneLevel) {
                    const sceneHeadingBlocks = blocks.slice(startIdx + 1, endIdx).filter(b => b.type === sceneLevel);
                    const scenes = [];
                    let chapterSummary = '';

                    if (sceneHeadingBlocks.length > 0) {
                        // Read text before first scene heading as chapter summary
                        const firstSceneIdx = blocks.indexOf(sceneHeadingBlocks[0]);
                        const beforeBlocks = blocks.slice(startIdx + 1, firstSceneIdx).filter(b => b.type === 'text');
                        const beforeText = this.extractContent(beforeBlocks);
                        const parts = this.splitSceneBlock(beforeText);
                        chapterSummary = parts.summary;

                        for (let si = 0; si < sceneHeadingBlocks.length; si++) {
                            const sb = sceneHeadingBlocks[si];
                            const sStart = blocks.indexOf(sb);
                            const sEnd = si < sceneHeadingBlocks.length - 1 ? blocks.indexOf(sceneHeadingBlocks[si + 1]) : endIdx;
                            const contentBlocks = blocks.slice(sStart + 1, sEnd).filter(b => b.type === 'text');
                            const raw = this.extractContent(contentBlocks);
                            const parts = this.splitSceneBlock(raw);

                            scenes.push({
                                title: sb.title,
                                content: parts.prose,
                                summary: parts.summary
                            });
                        }
                    } else {
                        // No scene headings despite sceneLevel set (shouldn't happen)
                        const raw = this.extractContent(betweenBlocks);
                        const sceneParts = this.splitIntoScenes(raw);

                        for (let i = 0; i < sceneParts.length; i++) {
                            const parts = this.splitSceneBlock(sceneParts[i]);
                            if (i === 0) chapterSummary = parts.summary;
                            scenes.push({
                                title: 'Scene ' + (i + 1),
                                content: parts.prose,
                                summary: ''
                            });
                        }
                    }

                    chapters.push({
                        title: cb.title,
                        scenes: scenes,
                        summary: chapterSummary
                    });
                } else {
                    // No scene headings: split chapter content by * * * into scenes
                    const raw = this.extractContent(betweenBlocks);
                    const sceneBlocks = this.splitIntoScenes(raw);
                    const scenes = [];
                    let chapterSummary = '';

                    for (let i = 0; i < sceneBlocks.length; i++) {
                        const parts = this.splitSceneBlock(sceneBlocks[i]);
                        if (i === 0) chapterSummary = parts.summary;
                        scenes.push({
                            title: 'Scene ' + (i + 1),
                            content: parts.prose,
                            summary: ''
                        });
                    }

                    chapters.push({
                        title: cb.title,
                        scenes: scenes,
                        summary: chapterSummary
                    });
                }
            }

            return chapters;
        },

        splitIntoScenes(text) {
            if (!text || !text.trim()) return [];
            // Split by * * * only (scene separator)
            const parts = text.split(/\n?\* \* \*\n?/);
            return parts.map(p => p.trim()).filter(p => p.length > 0);
        },

        splitSceneBlock(text) {
            if (!text || !text.trim()) return { summary: '', prose: '' };
            // Find first --- divider which separates summary from prose
            const match = text.match(/^---+$/m);
            if (match) {
                const summary = text.substring(0, match.index).trim();
                const prose = text.substring(match.index + match[0].length).trim();
                return { summary, prose };
            }
            return { summary: '', prose: text.trim() };
        },

        extractContent(blocks) {
            const textBlocks = blocks.filter(b => b.type === 'text');
            return textBlocks.map(b => b.lines.join('\n')).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
        },

        splitBySceneDividers(text) {
            const dividerRegex = /^(\* \* \*|---|___+)$/gm;
            const parts = text.split(dividerRegex);
            const scenes = [];
            let current = [];

            for (const part of parts) {
                const trimmed = part.trim();
                if (/^\* \* \*$|^---+$|^___+$/.test(trimmed)) {
                    if (current.length > 0) {
                        scenes.push(current.join('\n\n').trim());
                        current = [];
                    }
                } else if (trimmed) {
                    current.push(trimmed);
                }
            }
            if (current.length > 0) {
                scenes.push(current.join('\n\n').trim());
            }

            if (scenes.length === 0 && text.trim()) {
                scenes.push(text.trim());
            }

            return scenes;
        },

        readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        },

        countWords(text) {
            if (!text) return 0;
            return text.trim().split(/\s+/).filter(w => w.length > 0).length;
        },

        async importCodexFromZip(zip, projectId) {
            const metadataFiles = zip.file(/^characters\/.*\/metadata\.json$/);
            let imported = 0;

            for (const mf of metadataFiles) {
                try {
                    const metadataText = await mf.async('text');
                    const metadata = JSON.parse(metadataText);
                    const attrs = metadata.attributes || {};
                    const name = attrs.name || 'Unknown Character';
                    const tags = attrs.tags || [];
                    const aliases = attrs.aliases || [];

                    const dirPath = mf.name.replace(/\/metadata\.json$/, '');
                    const entryFile = zip.file(dirPath + '/entry.md');
                    let body = '';

                    if (entryFile) {
                        const entryText = await entryFile.async('text');
                        body = this.stripFrontmatter(entryText);
                    }

                    const entryId = Date.now().toString() + '-nc-' + Math.random().toString(36).slice(2, 7);

                    await db.compendium.add({
                        id: entryId,
                        projectId: projectId,
                        category: 'characters',
                        title: name,
                        body: body,
                        summary: '',
                        tags: [...new Set([...tags, ...aliases])],
                        created: new Date(),
                        modified: new Date(),
                        order: 0
                    });

                    imported++;
                } catch (e) {
                    console.warn('Failed to import entry:', mf.name, e);
                }
            }

            if (imported > 0) {
                console.log('Imported ' + imported + ' compendium entries from ZIP');
            }
        },

        stripFrontmatter(text) {
            const match = text.match(/^---[\s\S]*?---\n*/);
            if (match) {
                return text.slice(match[0].length).trim();
            }
            return text.trim();
        },

        readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsArrayBuffer(file);
            });
        }
    };

    window.NovelcrafterImporter = NovelcrafterImporter;
})();
