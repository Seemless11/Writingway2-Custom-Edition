# Writingway 2 - Refactoring Plan

**Date:** November 24, 2025  
**Status:** Planning Phase  
**Goal:** Improve code maintainability, testability, and developer experience by modularizing the monolithic `app.js` file

---

## Current State Analysis

### File Size Overview

| File | Lines | Size | Status |
|------|-------|------|--------|
| `src/app.js` | 2,811 | 138KB | ⚠️ **CRITICAL - Needs refactoring** |
| `src/styles.css` | 1,538 | 37KB | ⚠️ Consider splitting |
| `src/modules/project-manager.js` | 848 | 39KB | ⚠️ Monitor growth |
| `src/workshop.js` | 557 | 27KB | ✓ Reasonable size |
| `src/generation.js` | 438 | 22KB | ✓ Reasonable size |
| `src/modules/tab-sync.js` | 377 | 17KB | ✓ Good |
| `src/modules/beat-mentions.js` | 362 | 18KB | ✓ Good |
| `src/modules/github-backup.js` | 334 | 14KB | ✓ Good |

### Problems with `app.js`

The main `app.js` file has become a monolithic "god object" containing:

1. **Database Layer** (~240 lines)
   - Dexie initialization
   - 8 schema versions with migrations
   - Test helpers (`window.__test`)
   - Debug utilities (`__waitForApp`, `__forceSave`, `__dumpWritingway`)

2. **State Initialization** (~600 lines)
   - 80+ reactive properties
   - Computed properties
   - Watchers setup

3. **Lifecycle Management** (~150 lines)
   - App initialization sequence
   - Loading screen updates
   - AI settings restoration
   - Project loading

4. **Editor Functions** (~300 lines)
   - Scene editing and saving
   - Text selection handling
   - Rewrite modal logic
   - Special character insertion
   - Auto-replacement features

5. **Context Management** (~250 lines)
   - Context panel state
   - `buildContextFromPanel()`
   - Mention resolution (@compendium, #scenes)
   - POV/tense configuration

6. **Generation Logic** (~400 lines)
   - Beat input handling
   - Quick search for mentions
   - Generation streaming
   - Accept/retry/discard actions
   - Prompt history

7. **Workshop Chat** (~200 lines)
   - Session management
   - Save/load sessions
   - Export functionality
   - Prompt selection

8. **Wrapper Methods** (~200 lines)
   - Delegating to various modules
   - AI settings methods
   - Prompt management
   - GitHub backup methods

9. **Utility Functions** (~400 lines)
   - Word counting
   - Order normalization
   - Various helpers

---

## Refactoring Strategy

### Phase 1: Database Layer Extraction ⭐ **START HERE**

**Priority:** HIGH  
**Complexity:** LOW  
**Risk:** LOW  
**Impact:** Foundation for other refactors

#### Create: `src/db.js`

Extract database initialization and migrations:

```javascript
// src/db.js
const db = new Dexie('WritingwayDB');

// Schema versions 1-8
db.version(1).stores({ ... });
db.version(2).stores({ ... }).upgrade(...);
// ... all versions

// Expose globally
window.db = db;

export default db;
```

#### Create: `src/test-helpers.js`

Extract test utilities:

```javascript
// src/test-helpers.js
window.__test = {
    getApp() { ... },
    seedProject(name) { ... },
    seedChapter(projectId, title) { ... },
    seedScene(projectId, chapterId, title) { ... },
    selectProject(projectId) { ... },
    // ... all test methods
};

window.__waitForApp = function(timeout) { ... };
window.__forceSave = async function() { ... };
window.__dumpWritingway = async function() { ... };
```

**Benefits:**
- Clean separation of concerns
- Database logic isolated for easier testing
- Reduces app.js by ~300 lines

---

### Phase 2: State Management Extraction

**Priority:** HIGH  
**Complexity:** MEDIUM  
**Risk:** MEDIUM  
**Impact:** Establishes clear state structure

#### Create: `src/state/app-state.js`

Define the initial state structure:

```javascript
// src/state/app-state.js
export function createAppState() {
    return {
        // Project state
        currentProject: null,
        projects: [],
        selectedProjectId: null,
        
        // UI state
        showRenameProjectModal: false,
        showExportModal: false,
        showAISettings: false,
        // ... all 80+ properties organized by category
        
        // Computed properties (getters)
        get currentSceneWords() { ... },
        get totalWords() { ... },
    };
}
```

#### Create: `src/state/watchers.js`

Extract watch logic:

```javascript
// src/state/watchers.js
export function setupWatchers(app) {
    app.$watch('showMarkdownPreview', (isPreview) => {
        if (!isPreview && app.isReading) {
            window.TTS.stop();
            app.isReading = false;
        }
    });
    
    // ... other watchers
}
```

**Benefits:**
- State structure documented in one place
- Easier to understand data flow
- Watchers are explicit and discoverable
- Reduces app.js by ~600 lines

---

### Phase 3: Editor Module Extraction

**Priority:** HIGH  
**Complexity:** LOW  
**Risk:** LOW  
**Impact:** High-value, self-contained feature

#### Create: `src/modules/editor.js`

Extract editor-specific functions:

```javascript
// src/modules/editor.js
const Editor = {
    // Text selection and rewrite
    handleTextSelection(app, event) { ... },
    openRewriteModal(app) { ... },
    acceptRewrite(app) { ... },
    retryRewrite(app) { ... },
    discardRewrite(app) { ... },
    
    // Special characters
    insertSpecialChar(app, char) { ... },
    handleAutoReplace(app, event) { ... },
    
    // Preview toggling
    togglePreview(app) { ... },
    
    // Word counting
    countWords(text) { ... },
};

window.Editor = Editor;
```

**Benefits:**
- Editor logic in one place
- Easy to add new editor features
- Testable in isolation
- Reduces app.js by ~300 lines

---

### Phase 4: Context Module Extraction

**Priority:** MEDIUM  
**Complexity:** MEDIUM  
**Risk:** MEDIUM  
**Impact:** Clarifies generation context logic

#### Create: `src/modules/context-panel.js`

Extract context management:

```javascript
// src/modules/context-panel.js
const ContextPanel = {
    async buildContextFromPanel(app) { ... },
    async resolveCompendiumEntriesFromBeat(app, beatText) { ... },
    async resolveSceneSummariesFromBeat(app, beatText) { ... },
    async resolveProsePromptInfo(app) { ... },
    
    // Context panel UI
    toggleContextPanel(app) { ... },
    addToContext(app, type, id) { ... },
    removeFromContext(app, type, id) { ... },
};

window.ContextPanel = ContextPanel;
```

**Benefits:**
- Context building logic centralized
- Easier to debug generation issues
- Clear API for context management
- Reduces app.js by ~250 lines

---

### Phase 5: Generation Enhancement

**Priority:** MEDIUM  
**Complexity:** MEDIUM  
**Risk:** LOW  
**Impact:** Completes generation refactor

#### Enhance: `src/generation.js`

Move remaining generation logic:

```javascript
// src/generation.js
const Generation = {
    // Existing: buildPrompt, streamGeneration
    
    // Add:
    async generateFromBeat(app) { ... },
    async acceptGeneration(app) { ... },
    async retryGeneration(app) { ... },
    async discardGeneration(app) { ... },
    
    // Quick search for mentions
    handleBeatMentionSearch(app, event) { ... },
    handleSceneMentionSearch(app, event) { ... },
};
```

**Benefits:**
- All generation logic in one module
- Consistent API
- Reduces app.js by ~400 lines

---

### Phase 6: Workshop Enhancement

**Priority:** LOW  
**Complexity:** LOW  
**Risk:** LOW  
**Impact:** Completes workshop refactor

#### Enhance: `src/workshop.js`

Move session management from app.js:

```javascript
// src/workshop.js
const Workshop = {
    // Existing: buildWorkshopPrompt, extractContext, etc.
    
    // Add from app.js:
    async saveWorkshopSessions(app) { ... },
    async loadWorkshopSessions(app) { ... },
    async exportWorkshopSession(app, index) { ... },
    async deleteWorkshopSession(app, index) { ... },
    createNewWorkshopSession(app) { ... },
    switchWorkshopSession(app, index) { ... },
};
```

**Benefits:**
- Workshop feature fully self-contained
- Reduces app.js by ~200 lines

---

### Phase 7: Initialization Module

**Priority:** LOW  
**Complexity:** MEDIUM  
**Risk:** MEDIUM  
**Impact:** Clean app startup

#### Create: `src/init.js`

Extract initialization logic:

```javascript
// src/init.js
const AppInitializer = {
    async initialize(app) {
        app.updateLoadingScreen(10, 'Initializing...', 'Starting up...');
        
        // Protocol check
        await this.checkProtocol(app);
        
        // Load settings
        app.updateLoadingScreen(30, 'Loading settings...', '');
        await this.loadAISettings(app);
        
        // Load projects
        app.updateLoadingScreen(50, 'Loading projects...', '');
        await this.loadProjects(app);
        
        // Restore last project
        app.updateLoadingScreen(70, 'Restoring workspace...', '');
        await this.restoreLastProject(app);
        
        // Initialize AI
        app.updateLoadingScreen(90, 'Initializing AI...', '');
        await this.initializeAI(app);
        
        // Complete
        app.updateLoadingScreen(100, 'Ready!', '');
        app.hideLoadingScreen();
    },
    
    checkProtocol(app) { ... },
    loadAISettings(app) { ... },
    // ... other init methods
};

window.AppInitializer = AppInitializer;
```

**Benefits:**
- Clear initialization sequence
- Easy to add new startup tasks
- Better error handling at startup
- Reduces app.js by ~150 lines

---

### Phase 8: Wrapper Method Cleanup

**Priority:** LOW  
**Complexity:** LOW  
**Risk:** LOW  
**Impact:** Final cleanup

After all modules are extracted, remove wrapper methods from `app.js`:

**Before:**
```javascript
async saveAISettings() {
    await window.AISettings.saveAISettings(this);
}
```

**After:**
```javascript
// In HTML template
<button @click="window.AISettings.saveAISettings($data)">Save</button>
```

Or keep thin wrappers if Alpine.js requires it:
```javascript
async saveAISettings() {
    return window.AISettings.saveAISettings(this);
}
```

**Benefits:**
- Reduces indirection
- Clearer about what's calling what
- Reduces app.js by ~200 lines

---

## Style Sheet Refactoring (Optional)

### Current: `src/styles.css` (1,538 lines)

Consider splitting into:

```
src/styles/
├── base.css          # Reset, typography, colors
├── layout.css        # Grid, flexbox, positioning
├── components.css    # Buttons, modals, panels
├── editor.css        # Editor-specific styles
├── sidebar.css       # Sidebar and navigation
└── utilities.css     # Helper classes
```

**Benefits:**
- Easier to find and modify styles
- Reduced merge conflicts
- Better organization by feature
- Potential for lazy loading

---

## Expected Outcomes

### Line Count Reduction in `app.js`

| Phase | Lines Removed | Lines Remaining |
|-------|---------------|-----------------|
| Initial | 0 | 2,811 |
| 1. Database | -300 | 2,511 |
| 2. State | -600 | 1,911 |
| 3. Editor | -300 | 1,611 |
| 4. Context | -250 | 1,361 |
| 5. Generation | -400 | 961 |
| 6. Workshop | -200 | 761 |
| 7. Init | -150 | 611 |
| 8. Wrappers | -200 | **~400** ✓ |

**Final `app.js` would contain:**
- Alpine.data() declaration
- State initialization (delegated to state/app-state.js)
- Lifecycle hooks (delegated to init.js)
- Thin wrapper methods (if needed for Alpine.js)

### New Module Structure

```
src/
├── db.js                      # Database initialization
├── test-helpers.js            # Test utilities
├── init.js                    # App initialization
├── state/
│   ├── app-state.js          # State structure
│   └── watchers.js           # Watch logic
├── modules/
│   ├── ai-settings.js        # ✓ Already exists
│   ├── beat-mentions.js      # ✓ Already exists
│   ├── chapter-manager.js    # ✓ Already exists
│   ├── compendium-manager.js # ✓ Already exists
│   ├── context-panel.js      # NEW - Context management
│   ├── editor.js             # NEW - Editor functions
│   ├── github-backup.js      # ✓ Already exists
│   ├── project-manager.js    # ✓ Already exists
│   ├── scene-manager.js      # ✓ Already exists
│   └── tab-sync.js           # ✓ Already exists
├── generation.js              # ✓ Enhance existing
├── workshop.js                # ✓ Enhance existing
├── prompts.js                 # ✓ Already exists
├── compendium.js              # ✓ Already exists
├── ai.js                      # ✓ Already exists
├── tts.js                     # ✓ Already exists
├── update-checker.js          # ✓ Already exists
└── app.js                     # ✓ Refactored (400 lines)
```

---

## Implementation Guidelines

### General Principles

1. **One Phase at a Time**: Complete and test each phase before moving to the next
2. **Backward Compatibility**: Maintain existing global API (`window.*`)
3. **No Breaking Changes**: HTML templates should work without changes (initially)
4. **Test After Each Phase**: Run manual smoke tests and automated tests
5. **Commit Frequently**: One commit per phase with clear messages

### Module Pattern

All modules should follow this pattern:

```javascript
// src/modules/example.js
(function() {
    const ExampleModule = {
        method1(app, ...args) {
            // Implementation
        },
        
        async method2(app, ...args) {
            // Implementation
        },
    };
    
    // Expose globally for Alpine.js
    window.ExampleModule = ExampleModule;
})();
```

### Error Handling

Each module method should:
- Handle errors gracefully
- Log errors with context
- Show user-friendly messages
- Not crash the entire app

```javascript
async someMethod(app, ...args) {
    try {
        // Implementation
    } catch (error) {
        console.error('ExampleModule.someMethod failed:', error);
        alert('Operation failed: ' + (error.message || 'Unknown error'));
    }
}
```

### Testing Strategy

For each refactored module:
1. **Unit Tests**: Test module methods in isolation
2. **Integration Tests**: Test module interaction with app
3. **Smoke Tests**: Test critical user flows
4. **Manual Testing**: Test UI interactions

---

## Migration Checklist

### Phase 1: Database ✅
- [ ] Create `src/db.js`
- [ ] Create `src/test-helpers.js`
- [ ] Update `main.html` script loading order
- [ ] Test database operations
- [ ] Test test helpers
- [ ] Commit changes

### Phase 2: State ✅
- [ ] Create `src/state/app-state.js`
- [ ] Create `src/state/watchers.js`
- [ ] Update `app.js` to use state factory
- [ ] Test reactive updates
- [ ] Test computed properties
- [ ] Test watchers
- [ ] Commit changes

### Phase 3: Editor ✅
- [ ] Create `src/modules/editor.js`
- [ ] Move editor methods
- [ ] Update app.js method calls
- [ ] Test text selection
- [ ] Test rewrite modal
- [ ] Test special characters
- [ ] Commit changes

### Phase 4: Context ✅
- [ ] Create `src/modules/context-panel.js`
- [ ] Move context methods
- [ ] Update app.js method calls
- [ ] Test context building
- [ ] Test mention resolution
- [ ] Commit changes

### Phase 5: Generation ✅
- [ ] Enhance `src/generation.js`
- [ ] Move generation methods
- [ ] Update app.js method calls
- [ ] Test generation flow
- [ ] Test accept/retry/discard
- [ ] Commit changes

### Phase 6: Workshop ✅
- [ ] Enhance `src/workshop.js`
- [ ] Move workshop methods
- [ ] Update app.js method calls
- [ ] Test session management
- [ ] Test chat functionality
- [ ] Commit changes

### Phase 7: Initialization ✅
- [ ] Create `src/init.js`
- [ ] Move init methods
- [ ] Update app.js init call
- [ ] Test startup sequence
- [ ] Test error handling
- [ ] Commit changes

### Phase 8: Cleanup ✅
- [ ] Remove unnecessary wrappers
- [ ] Update HTML templates (if needed)
- [ ] Add documentation comments
- [ ] Run full test suite
- [ ] Update README
- [ ] Commit changes

---

## Risks and Mitigations

### Risk 1: Breaking Alpine.js Reactivity
**Mitigation:** Keep state in app.js, only move logic to modules

### Risk 2: Global Scope Pollution
**Mitigation:** Use IIFE pattern, minimize global exports

### Risk 3: Module Loading Order
**Mitigation:** Document dependencies, use script order in main.html

### Risk 4: Lost Functionality
**Mitigation:** Comprehensive testing after each phase

### Risk 5: Merge Conflicts
**Mitigation:** Small, focused commits; communicate with team

---

## Success Metrics

- ✅ `app.js` reduced from 2,811 to ~400 lines (85% reduction)
- ✅ All features continue to work
- ✅ No performance regression
- ✅ Improved code coverage with tests
- ✅ Faster developer onboarding (measured by feedback)
- ✅ Easier to add new features (measured by LOC per feature)

---

## Future Considerations

### After Initial Refactoring

1. **TypeScript Migration**: Add type safety to modules
2. **Build System**: Consider bundling with Vite/Rollup
3. **Component Framework**: Evaluate Alpine.js alternatives
4. **State Management**: Consider Vuex/Pinia patterns
5. **CSS-in-JS**: Evaluate Tailwind or similar
6. **Testing Framework**: Add Jest/Vitest for unit tests

### Long-term Architecture

Consider moving toward:
- **Event-driven architecture**: Modules communicate via events
- **Dependency injection**: Explicit module dependencies
- **Service layer**: Separate business logic from UI
- **Repository pattern**: Abstract database operations

---

## Questions and Decisions

### Q: Should we maintain backward compatibility?
**A:** Yes, initially. Break compatibility only after refactoring is stable.

### Q: Do we need a build step?
**A:** Not immediately, but consider for production optimization.

### Q: Should we refactor styles.css?
**A:** Optional, lower priority than JavaScript refactoring.

### Q: How do we handle Alpine.js method calls?
**A:** Keep thin wrappers in app.js that delegate to modules.

### Q: What about main.html script loading?
**A:** Add new module scripts in dependency order, before app.js.

---

## Resources

- [Alpine.js Documentation](https://alpinejs.dev/)
- [Dexie.js Documentation](https://dexie.org/)
- [JavaScript Module Pattern](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#modulepatternjavascript)
- [Refactoring Techniques](https://refactoring.guru/refactoring/techniques)

---

## Changelog

- **2025-11-24**: Initial refactoring plan created
