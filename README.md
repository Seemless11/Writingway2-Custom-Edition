<p align="center">
  <img src="logo.png" width="420" alt="Writingway logo"/>
</p>

# Writingway 2 — Custom Edition

> **A heavily refactored fork of [Writingway 2](https://github.com/aomukai/Writingway2) by [aomukai](https://github.com/aomukai) (MIT License).**


---

## 

| Aspect | Status |
|--------|--------|
| **Upstream** | [aomukai/Writingway2](https://github.com/aomukai/Writingway2) (MIT) |
| **This fork** | ~120 commits diverged, major architectural refactor |
| **License** | MIT — retains original copyright + license |



---

##  What This Edition Adds

###  
| Feature | Description |
|---------|-------------|
| **HTML Partial Build System** | 51 partials in `src/views/` assembled via `tools/build-html.js` from `manifest.json`. Run `npm run build` to regenerate `main.html`. |
| **Modular app.js** | 18 modules in `src/app/` (core, rewrite, ai, summaries, context-panel, projects, compendium, lorebook, paste-import, character-creator, world-creator, scenario-creator, workshop, prompts, scenes, editor, generation, backup). Original `app.js` reduced 85% (2800 → ~400 lines). |
| **Split Tooling** | `tools/split-app-js.js` + `tools/app-module-map.json` for automated module extraction. |
| **Test Suite** | Playwright smoke/unit/UI tests (`npm test`), handler coverage checker (`node tests/handler-coverage.js`). |

### Compendium Image Lightbox *(new feature)*
- Click any compendium entry image → full-screen lightbox
- **Zoom** (mouse wheel / ± buttons, 0.5×–4×)
- **Pan** (drag to reposition)
- **240×360 crop preview** (2:3 portrait, matches character cards)
- **Persisted state** — zoom/pan saved with entry (`imageZoom`, `imagePanX`, `imagePanY`)
- Editor preview reacts to saved state

---

##  Complete Feature List (Upstream + This Edition)

### Writing & Organization
- Scene-first editor with inline rewrite, expand, continue
- Chapter/scene reordering (drag-and-drop)
- Beat panel with `@compendium` and `#scene` mention resolution
- Per-scene POV character, tense, language
- AI-generated scene summaries
- Context panel (compendium entries, chapters, scenes, tags)

### Character Chat *(SillyTavern-style)*
- Character card import (JSON/PNG)
- Session management (multi-session sidebar)
- Persona system with switching
- Lorebook context injection
- RP formatting toggle
- Per-chat temperature/output controls

### Character Creator
- 22 genre presets (Fantasy, Sci-Fi, Mystery & Thriller, Dystopian, Urban Fantasy, Adventure, Space Opera, LitRPG, Slice of Life, Anime, Shonen, Isekai, Superpowers, Romance, Horror, etc.)
- Genre-adaptive trait pickers with categories
- AI-assisted field generation
- Paste import from wiki/articles
- Auto-save drafts
- Image import with AI description

### Workshop Chat
- Persistent brainstorming sessions
- Context controls
- Session export/import

### Compendium / Worldbuilding
- Characters, places, items, lore, notes
- `@[entry]` inline references in beat panel
- **Vault** — cross-project entry import

### Imports
- Writingway 1 projects
- Novelcrafter (.md / .zip with character compendium)
- SillyTavern character cards (JSON/PNG)
- SillyTavern lorebook JSON (character_book embedding, macro stripping)

### Exports
- EPUB, HTML, TXT, ZIP

### AI Providers
- OpenRouter, Anthropic, OpenAI, Google AI, NanoGPT
- LM Studio, custom OpenAI-compatible endpoints
- Local GGUF via llama.cpp (in-app setup wizard)
- Added KoboldCpp Support
### Backups & Sync
- GitHub Gist auto-backup (5-min timer)
- Local versioned backups (`project-backups/`)
- Multi-tab sync via BroadcastChannel
- In-app update detection + staged download

### Technical
- Warm Ink design system (dark/light, amber accents, SVG icons)
- Generation abort/cancel
- Truncation-safe generation (auto-resume, trimmed-vs-kept indicator) (i wont lie this one is kind of hack still and WIP)
- CJK-aware ending trim

---

## 🚀 Quick Start

### Windows
```bash
# 1. Clone or download
# 2. Double-click start.bat
```

### macOS / Linux
```bash
# 1. Clone or download
chmod +x start.sh
./start.sh
```

### Local GGUF (optional)
1. Place `.gguf` model in `models/`
2. On first launch, Writingway offers to install llama.cpp via setup wizard
3. Restart after installation

> **Use the launcher scripts** (`start.bat` / `start.sh`), not `main.html` directly. They start the local app server (port 8000), updater (port 8001), and llama.cpp (port 8080).

---

## 🛠️ Development

### Prerequisites
- Node.js 18+ (for build tools)
- Python 3 (for app server)

### Build Commands
```bash
npm run build        # Regenerate main.html from partials
npm run build:check  # Verify main.html matches partials (CI gate)
npm run split:app    # Extract module from app.js (see app-module-map.json)
npm test             # Full test suite (build:check + smoke + unit + UI)
```

### Project Structure
```
├── main.html                 # Built artifact (do not edit directly)
├── src/
│   ├── views/                # 51 HTML partials + manifest.json
│   ├── app/                  # 18 split app.js modules
│   ├── modules/              # Feature modules (project, scene, compendium, etc.)
│   ├── state/                # Reactive state definitions
│   ├── chat-mode.js          # Character chat mode
│   ├── generation.js         # AI generation engine
│   ├── styles.css            # Warm Ink design system
│   └── vendor/alpine.min.js  # Alpine.js
├── tools/
│   ├── build-html.js         # Assembles main.html from partials
│   ├── split-app-js.js       # Extracts modules from app.js
│   ├── app-module-map.json   # Module → method mapping
│   └── writingway-server.py  # Local app server (port 8000)
├── projects/                 # Project JSON files (folder-first storage)
├── images/                   # Embedded images
├── models/                   # Optional GGUF models
├── llama/                    # Optional llama.cpp server
└── tests/                    # Playwright tests (gitignored)
```

---

## 📄 License

**MIT License** — see [LICENSE](LICENSE).

This project is a derivative work of **Writingway 2** by **aomukai**, licensed under MIT.

```
Copyright (c) 2025 aomukai (original Writingway 2)
Copyright (c) 2025–2026 Custom Edition contributors
```

The MIT license permits modification, distribution, and commercial use with preservation of copyright and license notices.

---

## 🙏 Acknowledgments

- **aomukai** — Original Writingway 1 & 2 author; MIT-licensed foundation


---

## 🔄 Merging Upstream Changes

This fork has significant architectural divergence. To cherry-pick upstream fixes:

```bash
git fetch upstream
git log --oneline main..upstream/main   # See new upstream commits
git cherry-pick <commit-sha>            # Apply specific fix
npm run build                           # Regenerate main.html from partials
npm run build:check                     # Verify no drift
```

The modular architecture makes this easier — most upstream changes touch areas now split into `src/app/*.js` modules or `src/views/*.html` partials.

---

*Last updated: October 29, 2026 
