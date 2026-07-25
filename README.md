<p align="center">
  <img src="logo.png" width="420" alt="Writingway logo"/>
</p>

# Writingway 2 Custom Edition
AI-assisted creative writing with character chat, scene planning, worldbuilding, roleplay formatting, and multi-format import — all local-first.

Writingway 2 is a browser-based writing tool for drafting fiction, organizing scenes, roleplaying with AI characters, keeping worldbuilding notes close at hand, and working with cloud AI providers or a local GGUF model.

This is the **Custom Edition** — a feature fork with character chat, character creator, lorebook import, Novelcrafter import, and expanded UI.

Discord: https://discord.gg/HyRmNKe5QA

## What Writingway does

Writingway is organized around projects, chapters, scenes, and compendium entries.
It gives you:

- **Scene-first editor** — draft and revise with inline rewrite, expand, and continue
- **Chapter and scene organization** — reorderable, with drag-and-drop
- **Beat panel** — outline scenes with bullet points before writing
- **Compendium** — worldbuilding for characters, places, items, lore, and notes with `@[entry]` references
- **POV system** — set POV character, tense, and language per scene, chapter, or project
- **Scene summaries** — AI-generated synopses per scene
- **Context panel** — persistent generation context with compendium entries, chapters, scenes, and tags
- **Character Chat** — SillyTavern-style roleplay chat with character cards, session management, and persona support
- **Character Creator** — AI-assisted character card creation with genre-adaptive templates, trait picker, and paste import
- **Workshop Chat** — AI brainstorming with session history and context controls
- **Lorebook panel** — browse and manage imported lorebook entries with character_book embedding
- **Multi-format import** — Writingway 1, Novelcrafter (.md/.zip), Character Cards (JSON/PNG), Lorebook JSON
- **Multi-format export** — EPUB, HTML, TXT, ZIP
- **Multi-tab sync** — work on the same project across browser tabs via BroadcastChannel
- **Local and cloud backups** — GitHub Gist auto-backup and local versioned snapshots
- **Auto-update** — staged update detection and installation

## Highlights

- **Local-first writing workflow**
  Your projects live in IndexedDB while you work, and can also be saved to disk as project files.

- **Character Chat mode**
  Full roleplay chat with imported character cards. Session management, multi-session sidebar, right-panel character info, persona switching, lorebook context, RP formatting tools, and per-chat temperature/output controls.

- **AI-assisted Character Creator**
  Genre-adaptive character templates (Fantasy, Sci-Fi, Romance, Horror, etc.) with per-category trait pickers, AI-generated fields, paste import from wiki articles, auto-save drafts, and image import with AI description.

- **Flexible AI setup**
  Use OpenRouter, Anthropic, OpenAI, Google AI, NanoGPT, LM Studio, custom OpenAI-compatible endpoints, or a local GGUF model via llama.cpp.

- **Built-in local GGUF setup flow**
  If Writingway detects a `.gguf` file in `models/` but no llama.cpp server, it can offer an in-app setup wizard to install llama.cpp for you.

- **Multi-format import**
  Import projects from Writingway 1, Novelcrafter (Markdown or ZIP with character compendium), SillyTavern character cards (JSON or PNG), and lorebook JSON exports with character_book embedding.

- **Backups**
  GitHub Gist backup with 5-minute auto-backup timer, or local versioned backups through the app server. OneDrive and Google Drive are listed in the UI but are not implemented yet.

- **In-app update staging**
  Writingway can detect newer builds on GitHub, download an update, stage it locally, and apply it the next time you restart from the launcher.

## Requirements

### All platforms

- Python 3
- A modern browser

### Optional for local GGUF mode

- A `.gguf` model placed in `models/`
- llama.cpp server files in `llama/`
  Or let the app install them through the setup wizard when supported.

## Quick start

### Windows

1. Download and extract the project.
2. Double-click `start.bat`.
3. Open Writingway in the browser window it launches.

### macOS / Linux

1. Download and extract the project.
2. Run:

```bash
chmod +x start.sh
./start.sh
```

3. Open Writingway in the browser window it launches.

## First-run local AI flow

If you already placed a `.gguf` model in `models/`:

- Writingway checks whether llama.cpp is installed
- If it is missing, Writingway can show a setup wizard
- The wizard can install a supported llama.cpp build
- After installation, restart Writingway from `start.sh` or `start.bat`

If you do not want local AI, just skip the wizard and use an API provider instead.

## AI modes

### API / Local API

Use this for:

- OpenRouter
- Anthropic
- OpenAI
- Google AI
- NanoGPT
- LM Studio
- Custom OpenAI-compatible endpoints
- Ollama if exposed through a compatible API layer

This is the best choice if you want the simplest setup.

### Local GGUF Model

Use this only when both are true:

- You have at least one `.gguf` file in `models/`
- llama.cpp server files are installed in `llama/`

Writingway hides this option when the local backend is not actually available, so users are less likely to end up in a broken configuration.

## Launchers and local services

The launchers do a few important things for you:

- Start the Writingway app server on `http://127.0.0.1:8000`
- Start the updater service on `http://127.0.0.1:8001`
- Start llama.cpp on `http://127.0.0.1:8080` when local GGUF mode is available
- Apply staged updates on the next start

Use the launcher scripts instead of opening `main.html` directly.

## Saving and backups

### Manual project save

The disk save button writes the current project snapshot to the `projects/` folder through the local app server.

### Local versioning backup

Writingway can create timestamped JSON backups in:

```text
project-backups/
```

This gives you local restore points without needing a cloud account.

### GitHub Gist backup

Writingway can back up a project to a private GitHub Gist if you provide a GitHub token with `gist` scope.
Backups run automatically every 5 minutes when enabled.

### Not implemented yet

These appear in the backup provider selector, but are not functional yet:

- OneDrive
- Google Drive

## Updates

Writingway compares the latest GitHub commit date on `main` with the local build date in `src/update-checker.js`.

If a newer build is available:

- Writingway can download and stage the update
- You restart Writingway manually
- The launcher applies the staged update on startup

On Windows and Linux/macOS, the staged update is applied by `start.bat` or `start.sh` on the next launch.

## Import

Writingway supports importing from several formats:

- **Writingway 1** — imports project structure and content from older Writingway projects
- **Novelcrafter** — imports `.md` (Markdown export) or `.zip` (full export with characters into Compendium). Chapter/scene detection via headings and dividers.
- **Character Cards** — imports SillyTavern-compatible character cards from `.json` or `.png` files
- **Lorebook** — imports SillyTavern lorebook `.json` with character_book embedding support, macro stripping ({{char}}/{{user}})

## Project structure

A few important folders and files:

```text
models/                    Optional GGUF model files
llama/                     Optional llama.cpp server files
projects/                  Manual project saves written by the app server
project-backups/           Local versioned backups
tools/                     Local Python services
  writingway-server.py     App server (port 8000)
  updater-server.py        Update server (port 8001)
src/                       App source
  app.js                   Main Alpine.js app object
  chat-mode.js             Character chat mode
  character-creator.js     AI-assisted character card creation
  character-card-importer.js  SillyTavern card import
  lorebook-importer.js     Lorebook JSON import
  novelcrafter-importer.js Novelcrafter project import
  workshop.js              Workshop brainstorming chat
  generation.js            AI generation engine
  ai.js                    AI provider integration
  styles.css               Warm Ink design system
  state/                   Reactive state definitions
  modules/                 Feature modules (project, scene, compendium, etc.)
  templates/               HTML template partials
  vendor/                  Vendored Alpine.js
tests/                     Test suite (Playwright smoke/unit/UI)
```

## Development notes

This repo includes a small test setup in `package.json`.
Available scripts:

```bash
npm run smoke
npm run unit
npm run ui
npm test
```

## Current status

What is working now:

- Writing and scene management
- Beat panel with @ and # mention resolution
- Scene model settings (per-model generation presets)
- POV character system (per scene, chapter, project)
- Scene summaries with AI generation
- Compendium/worldbuilding with genre-specific categories
- Compendium Vault (cross-project entry import)
- Compendium token count display
- Character Chat with session management, persona system, lorebook panel
- Character Creator with genre-adaptive templates, trait picker, paste import, image import
- AI provider configuration (OpenRouter, Anthropic, OpenAI, Google, NanoGPT, LM Studio, custom endpoints)
- Local GGUF mode through llama.cpp
- In-app llama.cpp setup flow on supported platforms
- Multi-tab synchronization
- Writingway 1 project import
- Novelcrafter project import (.md and .zip)
- Character card import (SillyTavern JSON/PNG)
- Lorebook import with character_book embedding
- Manual project save to disk
- Local versioned backups
- GitHub Gist backup (5-minute auto-backup)
- Export to EPUB, HTML, TXT, ZIP
- Update detection and staged update download
- Warm Ink design system (dark/light theme, amber accents, SVG icons)
- Generation abort/cancel for chat and workshop

What is intentionally incomplete:

- OneDrive backup
- Google Drive backup
- Fully automatic restart/apply after update download
- Broader local installer coverage for every llama.cpp release variant

## Troubleshooting

### Writingway opens but local GGUF mode is unavailable

Check that:

- A `.gguf` file exists in `models/`
- llama.cpp is installed in `llama/`
- You restarted the launcher after installation

### The browser says it cannot connect on startup

Use the launcher scripts, not `main.html` directly.
The launchers wait for the local app server before opening the browser.

### Update downloaded but nothing changed

Restart Writingway using `start.sh` or `start.bat`.
The staged update is applied by the launcher on startup.

### Backups are enabled but cloud providers are missing

Only GitHub Gist and Local Versioning are currently implemented.
OneDrive and Google Drive are placeholders in the UI for future work.

### Character chat is not working

Check that:

- You have imported or created a character card with a description
- An AI provider is configured and working in editor mode first
- The character has a first message defined (auto-shown on new chat)
- The console (F12) shows no CORS or network errors for the AI provider
