<img width="700" alt="new writing ui" src="https://github.com/user-attachments/assets/0c481c3f-51d3-4b01-bafa-4a7798418d3f" />
<img width="700" alt="new project" src="https://github.com/user-attachments/assets/43dc05c8-6137-457f-819d-e613c483ed0f" />

<img width="700" alt="NEW INPUT" src="https://github.com/user-attachments/assets/06772e74-a187-4eec-8b1d-ebfb1d77e388" />
<img width="700" alt="compengen" src="https://github.com/user-attachments/assets/8d87c3ba-72ac-4b0f-9a70-868ee000732d" />
<img width="700" alt="compendium1" src="https://github.com/user-attachments/assets/d0d9f71e-bf95-4090-824b-4963ccc5a703" />
<img width="700" alt="cc2" src="https://github.com/user-attachments/assets/2791e212-0fff-439e-92c8-4d939aec873d" />
<img width="700" alt="cc" src="https://github.com/user-attachments/assets/988003fa-ba38-4bfc-94fd-c1e1dd705c7c" />
<img width="700" alt="cardimport2" src="https://github.com/user-attachments/assets/7f631bf0-dba1-48c1-9b8b-1b2ad00958ee" />
<img width="700" alt="cardimport" src="https://github.com/user-attachments/assets/0c8d81cc-bd4b-424d-aeb2-97a8bf66fea9" />



<p align="center">
  <img src="logo.png" width="420" alt="Writingway logo"/>
</p>

# Writingway 2
AI-assisted creative writing, scene planning, and worldbuilding in a local-first app.

Writingway 2 is a browser-based writing tool built for drafting fiction, organizing scenes, keeping worldbuilding notes close at hand, and working with either cloud AI providers or a local GGUF model.

Discord:
https://discord.gg/HyRmNKe5QA

## What Writingway does

Writingway is organized around projects, chapters, scenes, and compendium entries.
It gives you:

- A scene-first editor for drafting and revising
- Chapter and scene organization with reordering
- A compendium for characters, locations, lore, items, and other story notes
- AI-assisted drafting, rewriting, brainstorming, and workshop chat
- **Genre-adaptive prompts** — pick genres when creating a project; prompts, descriptors, and extra compendium categories auto-configure
- **AI character creator** — trait-based system with genre-filtered professions, AI chat refinement, and one-click adopt into the compendium
- **SillyTavern card import** — import character cards from `.json`/`.png` with full data preservation
- **Inline `##` beat mode** — type `## your beat` directly in the editor, or toggle to the legacy bottom panel
- **Compendium AI generation** — generate full entries for any category with category-specific directives
- **Global prompts** — prompts can be project-scoped or shared across all projects
- **Sidebar collapse** — one-click toggle for more writing space
- **Compendium `@[entry]` references** — reference other entries in compendium body text, resolved as AI context
- **Inline project picker** — select and switch projects without leaving the main view
- **Delete project** — permanently remove projects from within the app
- Writingway 1 project import
- Local project save/export tools
- Optional backup flows
- Optional local GGUF inference through llama.cpp

## Highlights

- Local-first writing workflow
  Your projects live in IndexedDB while you work, and can also be saved to disk as project files.

- Flexible AI setup
  Use OpenRouter, Anthropic, OpenAI, Google, NanoGPT, LM Studio, custom OpenAI-compatible endpoints, or a local GGUF model via llama.cpp.

- Built-in local GGUF setup flow
  If Writingway detects a `.gguf` file in `models/` but no llama.cpp server, it can offer an in-app setup wizard to install llama.cpp for you.

- Genre-adaptive prompts
  Pick genres (Fantasy, Sci-Fi, Horror, Romance, Cyberpunk, and more) when creating a project. Writingway auto-generates genre-tailored prose, rewrite, summary, and workshop prompts, adds genre-appropriate compendium categories, and injects genre descriptors into every generation.

- Character Creator
  Build characters with a structured trait system covering appearance, clothing, personality, and background — with genre-filtered professions. Chat with the AI to flesh out details, then adopt the finished character directly into the compendium. Re-open any character entry to edit traits later. Add custom traits of your own.

- Character Card Import
  Import SillyTavern character cards from `.json` or `.png` files. Name, description, personality, scenario, dialogue examples, system prompt, avatar image — all preserved and stored as a compendium entry.

- AI Compendium Generation
  Generate full compendium entries with AI. Category-specific directives (30+ categories) ensure content tailored to the entry type. Accept, retry, or discard with pre-state preservation. Reference existing entries via `@[Title]` for richer context.

- Dual-mode beat input
  Type `## your beat` directly in the editor for a streamlined flow, or toggle the legacy bottom panel. In inline mode, the beat is part of the scene text and gets stripped before generation. Length presets (200/400/600 words) and custom targets are available.

- Accept / Retry / Discard
  After any generation, review the output and accept it, retry (rewind and regenerate), or discard (restore pre-generation state).

- Global prompts
  Prompts can be project-scoped or global — available across all projects. Default prompts are auto-seeded for each genre and category.

- Compendium `@[entry]` references
  Type `@[Title]` in a compendium entry body to reference another entry. Referenced entries are included as context for AI generation, and `@[Title]` is replaced with plain text.

- Inline project picker
  Switch between projects without leaving the main editing view. The last active scene is remembered per project.

- Sidebar collapse
  Toggle the project tree sidebar with a single click for more writing space.

- Abortable generation
  Stop in-progress beat or compendium generation at any time.

- Autoscroll during generation
  The editor auto-scrolls as tokens stream in.

- Backups
  GitHub Gist backup is supported, and local versioned backups are supported through the app server. OneDrive and Google Drive are listed in the UI but are not implemented yet.

- In-app update staging
  Writingway can detect newer builds, download an update, stage it locally, and apply it the next time you restart from the launcher.

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

## Writingway 1 import

Writingway includes a Writingway 1 importer for older projects.
It can bring over project structure and content so you can continue working in Writingway 2.

## Project structure

A few important folders:

```text
models/           Optional GGUF model files
llama/            Optional llama.cpp server files
projects/         Manual project saves written by the app server
project-backups/  Local versioned backups
tools/            Local Python services
src/              App source
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
- Compendium/worldbuilding
- AI provider configuration
- LM Studio integration
- Local GGUF mode through llama.cpp
- In-app llama.cpp setup flow on supported platforms
- Manual project save to disk
- Local versioned backups
- GitHub Gist backup
- Update detection and staged update download
- Genre selection with auto-configured prompts and extra compendium categories
- Character Creator with trait system, genre-filtered professions, AI chat, and custom traits
- SillyTavern character card import (.json/.png)
- AI-powered compendium entry generation for all categories (30+ category directives)
- Dual-mode beat input (inline `##` or legacy panel)
- Accept / Retry / Discard for beat and compendium generation
- Global and project-scoped prompt toggle
- Sidebar collapse toggle
- Abortable generation (beat and compendium)
- Compendium `@[entry]` references with autocomplete
- Inline project picker
- Delete project button
- Last-scene persistence across project switches
- Autoscroll during streaming generation
- Prompt preview modal
- Prompt history browser

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
