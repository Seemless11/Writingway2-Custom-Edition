# src/views — source partials for `main.html`

`main.html` is **generated**. Do not edit it directly; the next build overwrites it.

```
partials (this folder)  ->  node tools/build-html.js  ->  main.html
```

## Commands

```powershell
npm run build         # regenerate main.html from the manifest
npm run build:check   # fail if main.html does not match the partials
```

`build:check` runs as part of `npm test`. If someone edits `main.html` by hand, the check
fails at commit time instead of silently discarding the edit later.

## Rules

1. **Partials are concatenated verbatim.** No separators, no reindentation, no parsing.
   Each partial must end with a newline.
2. **Order matters.** `manifest.json` lists the partials in output order. It is the single
   source of truth for document structure.
3. **Never reformat** while moving HTML. The app root `<div x-data="app">` is not explicitly
   closed, several wrappers span feature boundaries, and there are nested `<template>`
   elements. Slicing is lossless; parsing is not.
4. **One extraction per commit**, message `split(<area>): extract <name>`, so reverting a
   single file is a one-line `git revert`.
5. **Verify with the hash.** The pre-split baseline is
   `ad4a2600d55a925cbdd9a75b515f545a36cce7b9ea1ab0619a053be33a3f75b4` (SHA-256 of
   `main.html`). Any reorganization that is meant to be behaviour-neutral must reproduce it.

## Layout

| Folder | Contents |
|---|---|
| `shell/` | doctype + `<head>`, loading screen, SVG icon sprite, closing tags/style |
| `app/` | app root open, sidebar, main-content wrapper, sidebar toggle, closing tags |
| `editor/` | editor container + toolbar/header |
| `chat/` | character chat panel |
| `workshop/` | embedded split panel, splitter, chat component template, chat modal |
| `panels/` | slide panels: summary, ai-settings, backup, prompts, compendium, lorebook |
| `modals/` | every dialog, one file each |
| `creators/` | world and scenario creators |
| `overlays/` | model loading overlay |

Largest partial is ~520 lines (`workshop/split-panel.html`); the original monolith was
5,808 lines.

Some files intentionally contain unbalanced tags — for example `app/app-container-open.html`
opens a `<div>` that `app/closing-tags.html` closes. That reflects the original document's
nesting and must not be "fixed" during a move.

## Adding a partial

1. Slice the exact block out of its current partial (byte-for-byte) into
   `src/views/<area>/<name>.html`.
2. Add its path to `manifest.json` in the correct position.
3. `npm run build:check` must pass.
4. `npm run smoke` must pass.
5. Commit.

## Extracting a block with the helper

`tools/extract-partial.js` slices the first N lines off a partial, writes them to a new
partial, inserts it into the manifest in the same position, and then runs `build:check`.
Because it only ever peels from the top of a file, no line bookkeeping is needed.

```powershell
node tools/extract-partial.js panel.html modals/new-project.html 76
node tools/extract-partial.js --split panel.html modals/last.html 71   # source becomes empty
```

If the check fails, the extraction was lossy and nothing should be committed.
