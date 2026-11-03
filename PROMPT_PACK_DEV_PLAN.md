# Prompt Pack Remediation — Dev Plan

Status: Phase 4–5 complete
Owner: —
Created: 2026-11-03
Scope: `src/prompt-packs.js`, `src/genres.js`, `src/prompts.js`, creator modules, prompt UI, tests

---

## Why

`ww2.5` is the writing app. It shares a common origin with its companion app,
so `ww2.5` still ships the **pre-fix** genre packs — the same packs that were
audited and rewritten in the companion.

In the companion app the biased fields (`engines`, `rewriteFocus`, `summaryFocus`,
`workshopAgenda`, `promptDescriptor`) were dead code, so the damage was limited
to flat characters. In `ww2.5` **those fields are the live prompt path**:
`compose()` / `composeSet()` seed the prose, rewrite, summary and workshop rows
in IndexedDB, and `{genres}` renders `promptDescriptor` into every prompt.

Result: every genre hands the model the same emotional thesis — *"the cost of
intervention"*, *"the private cost of visibility"*, *"hope is earned"* — twice
per generation (system message **and** user message). Stories converge.

Three independent causes, in order of impact:

1. **The packs prescribe verdicts.** 25 of 25 packs contain at least one
   thesis-phrased engine/focus line. They tell the model what the scene should
   *mean* instead of how the genre's world *works*.
2. **The contract is stated twice per call.** `TEMPLATES.prose` puts
   voice/engines/dialogue/imagery in the system message and repeats
   engines/dialogue/imagery in the user message.
3. **A second, unaudited bias channel.** `genres.js` `promptDescriptor` is live
   via `prompt-render.js` (`{genres}`), `generation.js:2074` (compendium
   entries) and `charDescription` (`app/character-creator.js:359`).

Definition of done: a genre tells the model **how its world works and what its
people do**, not what the story means or how the reader should feel.

---

## What ports from Blaze

| Blaze asset | Ports? | Notes |
|---|---|---|
| 25 rewritten genre pack bodies | Yes | Same ids, same fields, same shape. Only syntax differs. |
| `creation` arrays (creator-facing facts) | Yes, content | No consumer yet in `ww2.5`; add the field now so it survives merges. |
| `GENERAL_PACK` rewrite + `creation` | Yes | |
| `mergePacks` `?? []` guards | Yes (small) | Prevents crashes on packs that omit optional lists. |
| `VERSION` bump 2 → 3 | Yes | Signal for the Phase 2 migration. |
| `genreSheet()` injection | No direct port | `ww2.5` has no field-routing layer; Phase 5 adapts it into the creator modules. |
| 21 companion-only genres | Not in Phase 1 | Those packs have empty `rewriteFocus`/`summaryFocus` in the companion app; in `ww2.5` those are live sections. Author the lists before porting (Phase 6). |

---

## Phase 1 — Port the fixed pack content

**Goal:** ship the corrected contract without changing any architecture.

Files:
- `src/prompt-packs.js`
  - Replace the 25 `GENRE_PACKS` bodies with Blaze's current versions, in the
    existing order and single-quote / 8-space style.
  - Add `creation: [...]` to every pack and to `GENERAL_PACK`.
  - `VERSION` 2 → 3; header comment `Prompt pack v3`.
  - `mergePacks`: guard optional lists (`strings()` helper or `?? []`) and carry
    `creation` through multi-genre merges (`unique(...).slice(0, 8)`).
- `tests/unit-prompt-packs.js`
  - `VERSION === 3`.
  - Per-pack completeness guard: non-empty `voice`, `engines`, `craftMoves`,
    `dialogue`, `imagery`, `avoid`, `rewriteFocus`, `summaryFocus`,
    `workshopAgenda`, `creation`.
  - Keep the merge-size assertions; adjust if a limit changes.

Acceptance:
- `node --check src/prompt-packs.js`
- `node tests/unit-prompt-packs.js` green
- `npm run lint` clean
- No template changes, so prompt *shape* is unchanged — only the content the
  templates interpolate.

Out of scope: existing installs. Editing `prompt-packs.js` does **not** change
already-seeded rows; Phase 2 fixes that.

---

## Phase 2 — Make the upgrade real

Why: `seedDefaultPrompts()` only inserts missing/empty rows;
`maybeUpgradePrompts()` only replaces exact V1 signatures; `packVersion` is
written but never read; there is no reset-to-default control.

Files:
- `src/prompts.js`
  - Store `contentHash` and `edited` when seeding builtin rows.
  - On load, for `builtin && packVersion < VERSION` rows: snapshot the
    `prompts` table to JSON, then replace **only if** the row is untouched
    (`!edited` and hash matches, or it matches the known V1 signature).
  - Never silently overwrite a row the user edited.
- `src/views/panels/prompts.html` + `src/app/prompts.js`
  - Per-prompt **Reset to pack default** with confirmation.
- `tests/unit-migration.js`
  - Mirror the new strategy; assert edited rows survive, untouched rows upgrade,
    and a snapshot is produced.

Decision pending: auto-upgrade with snapshot (recommended) vs. reset-only.

---

## Phase 3 — Audit the descriptor channel

Files: `src/genres.js`, plus consumers
(`src/prompt-render.js`, `src/generation.js:2074`,
`src/app/character-creator.js:359`).

- Rewrite all 25 `promptDescriptor` values as **setting + mechanics facts**
  (technology, institutions, professions, constraints). No verdicts, no
  "the cost of", no emotional prescriptions.
- Rewrite `charDescription` from `creation` facts: role/rank, institutions,
  logistics, money, kit, public surface.
- Decide on `worldDescription` / `scenarioDescription`: they are exported but
  unused. Either wire them into the creators (Phase 5) or delete them.
- Delete or clearly mark `defaultPrompts` in `genres.js` (25 × 4 V1 prompts,
  ~500 lines, no consumers, full of thesis language).

---

## Phase 4 — De-duplicate the prose contract (complete)

File: `src/prompt-packs.js` (`TEMPLATES`).

- System message keeps: voice, engines, dialogue, imagery, POV/tense.
- User message dropped the repeated `{enginesInline}` / `{dialogue}` / `{imageryInline}` "Genre contract" block; keeps the beat, craft moves, continuity, avoid, length.
- Net: one statement of the genre contract per call instead of two.

## Phase 5 — Creator modules (complete)

Files: `src/app/character-creator.js`, `src/app/world-creator.js`, `src/app/scenario-creator.js`.

- Fixed the `{genreLabels}` leak: all three `*_SYSTEM_PROMPT` constants contained the placeholder but were pushed raw. Now resolved via `.replace(/\{genreLabels\}/gi, resolvedLabels)` before pushing.
- Character creator: replaced the `charDescription` paragraph with a **GENRE SHEET** built from `creation` facts (role/rank, institutions, logistics, money, kit, public surface) via `PromptPacks.mergePacks`.
- World/scenario creators: inject setting/mechanics context from `promptDescriptor` (rewritten in Phase 3 as facts, not verdicts).

## Phase 6 — Optional genre parity (partial: sports added)

Added **sports** as the 26th genre. Blaze's sports pack had empty `rewriteFocus`/`summaryFocus` (Class C dead code), so those two lists were authored fresh:
- `rewriteFocus`: show technique under pressure, make the body's limits physical, keep the score consequential
- `summaryFocus`: score and standings shifts, injuries and substitutions, team morale after the result

The other 20 companion-only genres remain unported (they have empty live focus lists in the companion app and would need authored focus lists first): academy, alternate-history, crime-noir, dark-fantasy, espionage, fairy-tale, gothic, magical-realism, mecha, military, monster-romance, pirate, romantasy, solarpunk, steampunk, supernatural, survival, time-travel, workplace, wuxia.

Decision pending on those 20: keep 26, or port them with authored focus lists.

---

## Open decisions

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 3 | Genre count | 26 / 46 | 26 until focus lists are authored for the remaining 20 |

## Completed phases

| Phase | Work | Status |
|-------|------|--------|
| 1 | Port fixed packs + `creation` + VERSION 3 + tests | ✅ Done |
| 2 | Auto-upgrade migration + snapshot + tests | ✅ Done |
| 3 | Audit `promptDescriptor`/`charDescription` in `genres.js`; strip verdicts; remove dead `defaultPrompts`, `worldDescription`, `scenarioDescription` | ✅ Done |
| 4 | Prose de-dup (remove repeated engines/dialogue/imagery from user message) | ✅ Done |
| 5 | Creator modules: fix `{genreLabels}` leak, inject GENRE SHEET from `creation` | ✅ Done |
| 6 | Port sports (26 genres total); other 20 pending | ✅ Partial |

## Test commands

```
node --check src/prompt-packs.js
node tests/unit-prompt-packs.js
node tests/unit-migration.js
node tests/unit-prompt-render.js
npm run lint
npm run build:check
npm run unit
```
