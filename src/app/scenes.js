/**
 * scenes — Chapters and scenes.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // Scene & Chapter Management
            async loadChapters() {
                // Load chapters for the current project
                this.chapters = await db.chapters
                    .where('projectId')
                    .equals(this.currentProject.id)
                    .sortBy('order');

                // For each chapter, load its scenes
                this.scenes = [];
                for (let ch of this.chapters) {
                    // Load scenes for this chapter by filtering projectId and chapterId
                    let scenesForChapter = await db.scenes
                        .where('projectId')
                        .equals(this.currentProject.id)
                        .and(s => s.chapterId === ch.id)
                        .sortBy('order');

                    for (let s of scenesForChapter) {
                        // Primary lookup by primary key (sceneId), but some restored DBs may have
                        // stored content records with a different primary key. Use a fallback
                        // lookup by the `sceneId` property if primary-key get() returns nothing.
                        let content = null;
                        try {
                            content = await db.content.get(s.id);
                        } catch (e) {
                            content = null;
                        }
                        if (!content) {
                            try {
                                content = await db.content.where('sceneId').equals(s.id).first();
                            } catch (e) {
                                content = null;
                            }
                        }
                        s.wordCount = content ? content.wordCount : 0;
                        // load persisted generation options into scene if present
                        s.povCharacter = s.povCharacter || s.povCharacter === '' ? s.povCharacter : '';
                        s.pov = s.pov || s.pov === '' ? s.pov : '3rd person limited';
                        s.tense = s.tense || s.tense === '' ? s.tense : 'past';
                        s.language = s.language || s.language === '' ? s.language : (this.currentProject?.language || 'English');
                        // (debug log removed)
                    }

                    // attach scenes array to chapter for UI
                    ch.scenes = scenesForChapter;
                    ch.expanded = ch.expanded ?? true;

                    // add to flattened scenes list
                    this.scenes.push(...scenesForChapter);
                }

                // If there are no chapters, create a default one and migrate orphan scenes
                if (this.chapters.length === 0) {
                    const chapter = {
                        id: Date.now().toString() + '-c',
                        projectId: this.currentProject.id,
                        title: 'Chapter 1',
                        order: 0,
                        created: new Date(),
                        modified: new Date()
                    };
                    await db.chapters.add(chapter);

                    // Move any existing scenes (which lack chapterId) into this chapter
                    try {
                        const orphanScenes = await db.scenes.where('projectId').equals(this.currentProject.id).filter(s => !s.chapterId).toArray();
                        for (const s of orphanScenes) {
                            await db.scenes.update(s.id, { chapterId: chapter.id });
                        }
                    } catch (e) {
                        console.warn('Failed to migrate orphan scenes into default chapter:', e);
                    }

                    await this.loadChapters();
                    return;
                }

                // Set currentChapter to first if none
                if (!this.currentChapter) this.currentChapter = this.chapters[0];

                // Debug: dump scenes for current project so we can inspect summary fields after load
                // (debug dump removed)
            },

            async createScene() {
                await window.SceneManager.createScene(this, this.newSceneName);
            },

            openNewSceneModal() {
                window.SceneManager.openNewSceneModal(this);
            },

            openNewChapterModal() {
                window.ChapterManager.openNewChapterModal(this);
            },

            async createChapter() {
                await window.ChapterManager.createChapter(this, this.newChapterName);
            },

            async loadScene(sceneId) {
                await window.SceneManager.loadScene(this, sceneId);
            },

            async moveSceneToChapter(sceneId, targetChapterId) {
                await window.SceneManager.moveSceneToChapter(this, sceneId, targetChapterId);
            },

            async moveSceneUp(sceneId) {
                await window.SceneManager.moveSceneUp(this, sceneId);
            },

            async moveSceneDown(sceneId) {
                await window.SceneManager.moveSceneDown(this, sceneId);
            },

            async deleteScene(sceneId) {
                await window.SceneManager.deleteScene(this, sceneId);
            },

            async moveChapterUp(chapterId) {
                await window.ChapterManager.moveChapterUp(this, chapterId);
            },

            async moveChapterDown(chapterId) {
                await window.ChapterManager.moveChapterDown(this, chapterId);
            },

            async deleteChapter(chapterId) {
                await window.ChapterManager.deleteChapter(this, chapterId);
            },

            openRenameChapterModal(chapterId) {
                const chapter = this.chapters.find(c => c.id === chapterId);
                if (chapter) {
                    this.renameChapterId = chapterId;
                    this.renameChapterName = chapter.title;
                    this.showRenameChapterModal = true;
                }
            },

            async renameChapter() {
                if (!this.renameChapterId || !this.renameChapterName.trim()) return;
                try {
                    await db.chapters.update(this.renameChapterId, {
                        title: this.renameChapterName.trim(),
                        modified: new Date()
                    });
                    await this.loadChapters();
                    this.showRenameChapterModal = false;
                    this.renameChapterId = null;
                    this.renameChapterName = '';
                } catch (e) {
                    console.error('Failed to rename chapter:', e);
                    alert('Failed to rename chapter');
                }
            },

            openRenameSceneModal(sceneId) {
                const scene = this.scenes.find(s => s.id === sceneId);
                if (scene) {
                    this.renameSceneId = sceneId;
                    this.renameSceneName = scene.title;
                    this.showRenameSceneModal = true;
                }
            },

            async renameScene() {
                if (!this.renameSceneId || !this.renameSceneName.trim()) return;
                try {
                    await db.scenes.update(this.renameSceneId, {
                        title: this.renameSceneName.trim(),
                        modified: new Date()
                    });
                    await this.loadChapters();
                    this.showRenameSceneModal = false;
                    this.renameSceneId = null;
                    this.renameSceneName = '';
                } catch (e) {
                    console.error('Failed to rename scene:', e);
                    alert('Failed to rename scene');
                }
            },
});
