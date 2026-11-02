/**
 * authors-note — Project-wide "Author's Note" standing direction.
 *
 * A freeform note that is injected into every Gen/Flow prompt just before the
 * beat, to steer theme, tone, style and direction without writing it into each
 * beat. Stored on the project record, so StoreSync writes it through to the
 * project file on disk automatically.
 *
 * Methods are merged onto the Alpine app component by src/app.js.
 */
window.AppMethods = window.AppMethods || {};

Object.assign(window.AppMethods, {
    /** The note actually sent to the model (empty when disabled or blank). */
    getActiveAuthorsNote() {
        if (this.authorsNoteEnabled === false) return '';
        return String(this.authorsNote || '').trim();
    },

    /** True when a note will be injected — drives the active button styling. */
    hasActiveAuthorsNote() {
        return this.getActiveAuthorsNote().length > 0;
    },

    /** Open the Author's Note modal, seeding the draft from saved state. */
    openAuthorsNote() {
        this.authorsNoteDraft = this.authorsNote || '';
        this.authorsNoteSaveStatus = '';
        this.showAuthorsNote = true;
    },

    /** Persist the current app state to the project record (write-through to disk). */
    async persistAuthorsNote() {
        if (!this.currentProject || !this.currentProject.id) return;
        const note = this.authorsNote || '';
        const enabled = this.authorsNoteEnabled !== false;
        const now = Date.now();
        try {
            await db.projects.update(this.currentProject.id, {
                authorsNote: note,
                authorsNoteEnabled: enabled,
                modified: new Date(),
                updatedAt: now
            });
            // Keep in-memory copies in sync so the UI reflects the save immediately.
            this.currentProject.authorsNote = note;
            this.currentProject.authorsNoteEnabled = enabled;
            const idx = (this.projects || []).findIndex(p => p.id === this.currentProject.id);
            if (idx !== -1) {
                this.projects[idx].authorsNote = note;
                this.projects[idx].authorsNoteEnabled = enabled;
            }
            if (window.TabSync) {
                window.TabSync.broadcast(window.TabSync.MSG_TYPES.PROJECT_SAVED, {
                    id: this.currentProject.id,
                    updatedAt: now
                });
            }
        } catch (e) {
            console.warn('Failed to save Author\'s Note:', e);
        }
    },

    /** Save the draft into state and persist it. */
    async saveAuthorsNote() {
        this.authorsNote = this.authorsNoteDraft || '';
        await this.persistAuthorsNote();
        this.authorsNoteSaveStatus = 'Saved';
        setTimeout(() => {
            if (this.authorsNoteSaveStatus === 'Saved') this.authorsNoteSaveStatus = '';
        }, 2000);
    },

    /** Clear the note (state + disk). */
    async clearAuthorsNote() {
        this.authorsNoteDraft = '';
        this.authorsNote = '';
        await this.persistAuthorsNote();
        this.authorsNoteSaveStatus = 'Cleared';
    },

    /** Enable/disable checkbox handler — the checkbox already updated the value. */
    async onAuthorsNoteEnabledChange() {
        await this.persistAuthorsNote();
    }
});
