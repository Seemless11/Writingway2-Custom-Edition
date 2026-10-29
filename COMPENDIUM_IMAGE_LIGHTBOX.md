# Compendium Image Lightbox

## What it does
Click any compendium entry image to open a full-resolution lightbox. You can zoom (mouse wheel or +/- buttons) and drag to pan/position the source image. The 240×360 preview at the bottom shows exactly how the crop will appear in the editor (portrait 2:3 ratio matching character cards). Click "Use Image" to save the positioned image back to the entry with zoom/pan state persisted.

## How to use
1. Edit a compendium entry
2. Click the image preview (or any card thumbnail in the roster)
3. Lightbox opens with full source file
4. Zoom in/out with wheel or +/- buttons
5. Drag to pan/reposition
6. Watch the 240×360 preview update live
7. Click "Use Image" — applies image + zoom/pan to entry
8. Editor preview reflects saved state

## Technical details
- State: `compendiumImageZoom` (0.5–4), `compendiumImagePanX/Y` (pixels), `showCompendiumImageLightbox`, `compendiumImageLightboxEntry`
- Handler: `window.ChatMode.useCurrentImageForEntry(app)` saves `imageUrl`, `imageZoom`, `imagePanX`, `imagePanY` to `currentCompEntry`
- CSS: `.image-lightbox`, `.image-lightbox-img` (`object-fit: contain`), `.image-lightbox-image-container`
- Preview: `transform: scale()` + `translate()` applied to both main image and 240×360 preview
- Editor preview: `:key="currentCompEntry.imageUrl"` + `:style` with same zoom/pan for reactive updates
- Compendium save (`saveCompendiumEntry`) includes `imageZoom`, `imagePanX`, `imagePanY` fields

## Changes made
- `main.html`: lightbox modal (line ~5420), editor click handler (`@click.stop` opens lightbox), preview with live zoom/pan
- `src/chat-mode.js`: `showCompendiumImageLightbox`, `closeCompendiumImageLightbox`, `useCurrentImageForEntry`, zoom in/out
- `src/state/app-state.js`: lightbox state variables
- `src/styles.css`: `.image-lightbox`, `.image-lightbox-img`, `.image-lightbox-image-container`
- `src/modules/compendium-manager.js`: save includes zoom/pan fields
- `main.html`: preview changed from 240×240 square to 240×360 portrait (2:3)
