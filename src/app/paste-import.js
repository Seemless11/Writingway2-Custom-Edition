/**
 * paste-import — Paste import and image description.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 *
 * Moved verbatim from src/app.js by tools/split-app-js.js — do not reindent.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
            // ========== Paste Import Methods ==========
            openPasteImport() {
                this.pasteImportText = '';
                this.pasteImportResult = null;
                this.pasteImportError = '';
                this.pasteImportLoading = false;
                this.pasteImportInstruction = '';
                this.pasteImportLanguage = this.language || this.currentProject?.language || 'English';
                this.pasteImportGenre = (this.currentProject?.genres?.length)
                    ? this.currentProject.genres[0]
                    : 'fantasy';
                this.pasteImportImageData = null;
                this.pasteImportImageFileName = '';
                this.pasteImportImageDescrLoading = false;
                this.pasteImportImageDescription = '';
                this.pasteImportImageError = '';
                this.showPasteImport = true;
                this.$nextTick(function () {
                    var el = document.getElementById('pasteImportTextarea');
                    if (el) el.focus();
                });
            },

            closePasteImport() {
                this.showPasteImport = false;
                this.pasteImportText = '';
                this.pasteImportResult = null;
                this.pasteImportError = '';
                this.pasteImportLoading = false;
                this.pasteImportInstruction = '';
                this.pasteImportImageData = null;
                this.pasteImportImageFileName = '';
                this.pasteImportImageDescrLoading = false;
                this.pasteImportImageDescription = '';
                this.pasteImportImageError = '';
            },

            async runPasteImport() {
                var text = (this.pasteImportText || '').trim();
                if (!text) return;
                if (this.pasteImportLoading) return;
                this.pasteImportLoading = true;
                this.pasteImportError = '';
                try {
                    var result = await window.Compendium.extractCharacterFromText(text, this.pasteImportGenre, this, this.pasteImportInstruction, this.pasteImportLanguage);
                    if (!result) {
                        this.pasteImportError = 'No character information could be extracted from the provided text.';
                    } else if (result.error) {
                        this.pasteImportError = result.error;
                    } else {
                        this.pasteImportResult = result;
                        this.mergeImageDescriptionIntoResult();
                    }
                } catch (e) {
                    this.pasteImportError = e.message || 'Extraction failed';
                    console.error('Paste import error:', e);
                } finally {
                    this.pasteImportLoading = false;
                }
            },

            async adoptPasteImport() {
                if (!this.pasteImportResult || !this.currentProject) return;
                var result = this.pasteImportResult;
                var entry = {
                    title: result.title || 'Unknown Character',
                    body: result.body || result.raw || '',
                    category: 'characters',
                    tags: ['imported', 'wiki-import'],
                    imageUrl: this.pasteImportImageData || null,
                    alwaysInContext: false,
                    isPovCharacter: false
                };
                try {
                    var imported = await window.Compendium.import(this.currentProject.id, [entry]);
                    if (imported && imported.length > 0) {
                        await window.CompendiumManager.loadCompendiumCategory(this, 'characters');
                        this.closePasteImport();
                        this.selectCompendiumEntry(imported[0].id);
                    }
                } catch (e) {
                    alert('Failed to save: ' + (e.message || e));
                }
            },

            // ========== Paste Import Image Methods ==========
            triggerPasteImportImageUpload() {
                this.pasteImportImageError = '';
                var el = document.getElementById('pasteImportImageInput');
                if (el) el.click();
            },

            onPasteImportImageSelected(event) {
                var file = event.target.files?.[0];
                if (!file) return;
                this.pasteImportImageError = '';
                var allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
                if (!allowed.includes(file.type)) {
                    this.pasteImportImageError = 'Unsupported format. Use PNG, JPEG, WebP, or GIF.';
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    this.pasteImportImageError = 'Image too large (max 10MB).';
                    return;
                }
                this.pasteImportImageFileName = file.name;
                var self = this;
                var reader = new FileReader();
                reader.onload = function (e) {
                    self.pasteImportImageData = e.target.result;
                    self.pasteImportImageDescription = '';
                    self.pasteImportImageError = '';
                };
                reader.onerror = function () {
                    self.pasteImportImageError = 'Failed to read file.';
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            },

            removePasteImportImage() {
                this.pasteImportImageData = null;
                this.pasteImportImageFileName = '';
                this.pasteImportImageDescription = '';
                this.pasteImportImageError = '';
                this.pasteImportImageDescrLoading = false;
            },

            async describePasteImportImage() {
                if (!this.pasteImportImageData) return;
                if (this.pasteImportImageDescrLoading) return;
                if (!this.aiApiKey) {
                    this.pasteImportImageError = 'No API key found. Set your OpenRouter API key in AI Settings.';
                    return;
                }
                this.pasteImportImageDescrLoading = true;
                this.pasteImportImageError = '';
                try {
                    var result = await window.ImageDescriber.describe(
                        this.pasteImportImageData,
                        this.pasteImportLanguage,
                        this.aiApiKey
                    );
                    if (result?.error) {
                        this.pasteImportImageError = result.error;
                    } else if (result?.description) {
                        this.pasteImportImageDescription = result.description;
                        if (this.pasteImportResult) {
                            this.mergeImageDescriptionIntoResult();
                        }
                    } else {
                        this.pasteImportImageError = 'No description could be generated.';
                    }
                } catch (e) {
                    this.pasteImportImageError = e.message || 'Image description failed';
                    console.error('Image description error:', e);
                } finally {
                    this.pasteImportImageDescrLoading = false;
                }
            },

            mergeImageDescriptionIntoResult() {
                if (!this.pasteImportResult || !this.pasteImportImageDescription) return;
                var descSection = '\n\n## Visual Description\n' + this.pasteImportImageDescription.trim();
                this.pasteImportResult.body = descSection + '\n\n' + this.pasteImportResult.body;
            },
});
