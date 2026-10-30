// Novelcrafter Importer - DEBUG VERSION 3
console.log('=== NOVELCRAFTER IMPORTER LOADED v3 (DIRECT CHECK) ===');
(
    function () {
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
                        if (novelFile) {
                            rawText = await novelFile.async('text');
                        } else {
                            console.warn('ZIP file does not contain novel.md. Importing codex entries only.');
                        }
                        codexZip = zip;
                    } else {
                        rawText = await this.readFileAsText(file);
                        projectName = file.name.replace(/\.md$/i, '');
                    }

                    let chapters = this.parseMarkdown(rawText, projectName);

                    if (chapters.length === 0 && !codexZip) {
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

                    let categoryCounts = {};
                    if (codexZip) {
                        try {
                            categoryCounts = await this.importCodexFromZip(codexZip, projectId);
                        } catch (e) {
                            console.warn('Codex import failed, but novel was imported:', e);
                        }
                    }

                    await app.loadProjects();
                    app.showNovelcrafterImportModal = false;
                    app.novelcrafterImportInProgress = false;

                    let successMsg = '✓ Successfully imported "' + projName + '"!\n\n' + chapters.length + ' chapters and ' + totalScenes + ' scenes imported.';
                    if (chapters.length === 0) {
                        successMsg += '\n\nNo novel content found (novel.md missing). Codex-only import.';
                    }

                    if (codexZip) {
                        const totalEntries = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
                        if (totalEntries > 0) {
                            successMsg += '\n\nCodex entries imported by category:';
                            for (const [cat, count] of Object.entries(categoryCounts)) {
                                successMsg += '\n  - ' + cat + ': ' + count;
                            }
                        }
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
                    return [{ title: 'Chapter 1', scenes: [{ title: 'Scene 1', content: blocks.map(b => b.lines.join('\n')).join('\n').trim() }], summary: '' }];
                }

                const firstBlock = blocks[0];
                const h1Blocks = headingBlocks.filter(b => b.type === 'h1');
                let skipH1Title = false;
                if (h1Blocks.length === 1 && h1Blocks[0] === firstBlock) {
                    const h1Title = (h1Blocks[0].title || '').trim();
                    if (!/^act/i.test(h1Title)) {
                        skipH1Title = true;
                    }
                }

                const structuralBlocks = skipH1Title
                    ? headingBlocks.filter(b => b !== h1Blocks[0])
                    : headingBlocks;

                if (structuralBlocks.length === 0) {
                    return [{ title: 'Chapter 1', scenes: [{ title: 'Scene 1', content: blocks.map(b => b.lines.join('\n')).join('\n').trim() }], summary: '' }];
                }

                const structTypes = [...new Set(structuralBlocks.map(b => b.type))].sort();

                let hasActs = false;
                if (structTypes.length >= 2) {
                    const highestLevel = structTypes[0];
                    const actCount = structuralBlocks.filter(b => b.type === highestLevel && /^act/i.test(b.title)).length;
                    hasActs = actCount > 0;
                }

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
                        const raw = this.extractContent(betweenBlocks);
                        const sceneBlocks = this.splitIntoScenes(raw);
                        const scenes = [];

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
                const parts = text.split(/\n\s*\n/);
                return parts.map(p => p.trim()).filter(p => p.length > 0);
            },

            splitSceneBlock(text) {
                if (!text || !text.trim()) return { summary: '', prose: '' };
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
                return textBlocks.map(b => b.lines.join('\n')).join('\n').replace(/\n{3,}/g, '\n').trim();
            },

            splitBySceneDividers(text) {
                const dividerRegex = /^(\*{3}|-{3,}|_+)$/gm;
                const parts = text.split(dividerRegex);
                const scenes = [];
                let current = [];

                for (const part of parts) {
                    const trimmed = part.trim();
                    if (/^\*{3}$|^---+$|^_+$/.test(trimmed)) {
                        if (current.length > 0) {
                            scenes.push(current.join('\n').trim());
                            current = [];
                        }
                    } else if (trimmed) {
                        current.push(trimmed);
                    }
                }
                if (current.length > 0) {
                    scenes.push(current.join('\n').trim());
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
                console.log('=== CODEX IMPORT START ===');
                const allFiles = Object.keys(zip.files);
                console.log('All files in ZIP:', allFiles.length);
                let imported = 0;
                const categoryCounts = {};

                const jsonFiles = allFiles.filter(f => f.endsWith('.json'));
                console.log('JSON files found:', jsonFiles.length, jsonFiles);

                for (const jsonFile of jsonFiles) {
                    const mf = zip.file(jsonFile);
                    if (!mf) continue;

                    try {
                        const metadataText = await mf.async('text');
                        const metadata = JSON.parse(metadataText);
                        const attrs = metadata.attributes || {};
                        const name = attrs.name || 'Unknown Entry';
                        const tags = attrs.tags || [];
                        const aliases = attrs.aliases || [];

                        // Phase 2.2: Extract category dynamically
                        let category = this.extractCategory(metadata, jsonFile);
                        console.log('DEBUG', jsonFile, '-> category:', category, 'type:', attrs.type);

                        const contentFile = this.findContentFile(zip, jsonFile);
                        console.log('DEBUG contentFile found:', !!contentFile);
                        let body = '';

                        if (contentFile) {
                            const entryText = await contentFile.async('text');
                            body = this.stripFrontmatter(entryText);
                        } else {
                            console.log('No content file found for:', jsonFile);
                        }

                        const entryId = Date.now().toString() + '-nc-' + Math.random().toString(36).slice(2, 7);

                        await db.compendium.add({
                            id: entryId,
                            projectId: projectId,
                            category: category,
                            title: name,
                            body: body,
                            summary: '',
                            tags: [...new Set([...tags, ...aliases])],
                            created: new Date(),
                            modified: new Date(),
                            order: 0
                        });

                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                        imported++;
                    } catch (e) {
                        console.warn('Failed to import entry:', jsonFile, e);
                    }
                }

                if (imported > 0) {
                    console.log('Imported ' + imported + ' compendium entries from ZIP');
                    console.log('Category breakdown:', categoryCounts);
                }

                return categoryCounts;
            },

            extractCategory(metadata, filePath) {
                // Strategy 1: Use type from metadata
                if (metadata.attributes?.type) {
                    return this.mapTypeToCategory(metadata.attributes.type);
                }

                // Strategy 2: Extract from file path (fallback)
                const pathParts = filePath.split('/');
                const lastFolder = pathParts[pathParts.length - 2];

                // Check if last folder matches known categories
                const knownCategories = ['characters', 'locations', 'lore', 'objects', 'species', 'magic', 'technology', 'organizations', 'religions', 'events', 'notes'];
                if (knownCategories.includes(lastFolder)) {
                    return lastFolder;
                }

                // Strategy 3: Extract from directory structure
                for (const dir of pathParts) {
                    const knownCategory = knownCategories.find(cat => dir.includes(cat));
                    if (knownCategory) {
                        return knownCategory;
                    }
                }

                // Strategy 4: Default to 'custom'
                return 'custom';
            },

            findContentFile(zip, jsonFile) {
                // Strategy 1: Try standard entry.md pattern
                const entryFile = jsonFile.replace(/\/metadata\.json$/, '/entry.md');
                if (zip.file(entryFile)) {
                    return zip.file(entryFile);
                }

                // Strategy 2: Try other common content file patterns
                const contentPatterns = [
                    jsonFile.replace(/\/metadata\.json$/, '/content.md'),
                    jsonFile.replace(/\/metadata\.json$/, '/body.md'),
                ];

                for (const pattern of contentPatterns) {
                    if (zip.file(pattern)) {
                        return zip.file(pattern);
                    }
                }

                // Strategy 3: Look for files with same name but different extension
                const baseName = jsonFile.replace(/\/metadata\.json$/, '');
                const otherFiles = Object.keys(zip.files).filter(f => 
                    f.includes(baseName) && !f.endsWith('.json') && f !== jsonFile
                );

                if (otherFiles.length > 0) {
                    return zip.file(otherFiles[0]);
                }

                return null;
            },

            mapTypeToCategory(type) {
                const typeMap = {
                    'character': 'characters',
                    'location': 'places',
                    'lore': 'lore',
                    'object': 'items',
                    'species': 'species',
                    'magic': 'magic',
                    'technology': 'technology',
                    'organization': 'organizations',
                    'religion': 'religions',
                    'event': 'events',
                    'note': 'notes',
                    'other': 'other'
                };
                return typeMap[type] || type;
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