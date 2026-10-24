# Implementation Plan: Image & Icon Inspector Ergonomics, Dimension Preservation & Vector Bayer Halftoning

## Phase 1: Inspector UI Alignment & Contextual Browse Buttons
- [x] Task: Align Key-Value Rows in `image-section.tsx`
  - [x] Standardize label spans (`Name`, `Collection`, `Resolution`, `Color`) with `w-20 shrink-0`.
  - [x] Format `NAME` row with inline `FolderOpen` button (`size={14}`).
  - [x] For Image elements, display `NAME` (`props.fileName || "Image"`) and `RESOLUTION` (`${naturalWidth} × ${naturalHeight} px`).
- [x] Task: Contextual Single Action Button
  - [x] When element is an Icon: render single bottom button `Replace with Image` (`ImageIcon`).
  - [x] When element is an Image: render single bottom button `Replace with Icon` (`Sticker`).

## Phase 2: Dimension Preservation on Asset Replacement
- [x] Task: Preserve Dimensions in `icons-flyout.tsx`
  - [x] In `handleSelectIcon`, when `targetElementId` is provided, preserve `targetEl.width` and `targetEl.height`.
- [x] Task: Preserve Dimensions in `image-section.tsx`
  - [x] In `handleReplaceImageFile`, save `fileName: file.name` and natural dimensions without altering `element.width` or `element.height`.
- [x] Task: Record `fileName` on New Image Additions in `keyboard.ts`
  - [x] In `addImageEl`, record `fileName: file.name` in props.

## Phase 3: Vector Bayer Halftoning & Dither Pipeline Integration
- [x] Task: Multi-Pass Raster Composition in `capture.ts` / `raster-preview-overlay.tsx`
  - [x] Non-raster vector elements with gray fills render via Bayer 8×8 ordered halftone.
  - [x] Photo images render via active `ditherMode` (Atkinson, Floyd-Steinberg, Bayer, Threshold).
  - [x] Composite into unified 1-bit thermal printhead bitmap for both preview and `Printer.print`.

## Phase 4: Verification & Micro-Changelog
- [x] Task: Quality Assurance
  - [x] Run `bun test` and `bun run --cwd packages/web tsc -b`.
  - [x] Test live in browser: replace icon, replace image, inspect alignment, verify gray rectangle Bayer halftone.
  - [x] Append updates to `CHANGELOG.md` under `## [Unreleased]`.
