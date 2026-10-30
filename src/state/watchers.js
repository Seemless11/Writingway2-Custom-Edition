/**
 * Watchers Module
 * Sets up Alpine.js watchers for reactive state changes
 */

function setupWatchers(app) {
    // Debounced save to batch rapid changes into a single save
    let saveTimer = null;
    const debouncedSave = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            if (window.AISettings && typeof window.AISettings.saveGenerationParams === 'function') {
                window.AISettings.saveGenerationParams(app);
            }
        }, 300);
    };

    // Watch AI settings and auto-save when they change (but not during initialization)
    app.$watch('aiMode', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('aiProvider', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('aiModel', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('aiApiKey', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('aiEndpoint', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('temperature', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('maxTokens', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('forceNonStreaming', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('useProviderDefaults', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('topP', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('topK', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('repetitionPenalty', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('frequencyPenalty', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('presencePenalty', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('minP', () => {
        if (!app.isInitializing) debouncedSave();
    });

    app.$watch('seed', () => {
        if (!app.isInitializing) debouncedSave();
    });

    // Compendium dirty tracking: recalculate dirty flag whenever the selected
    // entry changes (safe — currentCompEntry may be null). @change handlers on
    // individual checkboxes (alwaysInContext, isPovCharacter) already call
    // updateCompendiumDirtyFlag; this watcher is a backup for programmatic edits.
    app.$watch('currentCompEntry', () => {
        if (!app.isInitializing && app.currentCompEntry && typeof app.updateCompendiumDirtyFlag === 'function') {
            app.updateCompendiumDirtyFlag();
        }
    });
}

// Expose globally for Alpine.js
window.setupWatchers = setupWatchers;
