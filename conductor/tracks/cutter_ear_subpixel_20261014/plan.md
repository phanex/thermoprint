# Implementation Plan: Fix Cutter Ears Subpixel Misalignment & Clean Canvas Clipping

## Phase 1: Canvas Architecture & Content Clipping Setup
- [x] Task: Native Content Clipping on Canvas Elements [6825a03]
  - [x] Add `clipX={0}`, `clipY={0}`, `clipWidth={label.widthPx}`, `clipHeight={label.heightPx}` to `<Group id="canvas-elements">` in `packages/web/src/editor/canvas/canvas.tsx`.
  - [x] Verify element content is clipped to printable area boundaries and does not bleed into lead/trail margins.
- [x] Task: Unclipped Selection & Transformer Overlay [6825a03]
  - [x] Ensure selection transformer handles render above the clipped elements group (e.g. in a dedicated unclipped Transformer group or layer) so handles are never sliced off at the margin edge.
  - [x] Verify handles are fully visible on top of tape margins and interactive.
- [x] Task: Remove Redundant CutterEars Overlay Rects [6825a03]
  - [x] Retire or clean up the unshadowed overlay rectangles in `CutterEars` (`packages/web/src/editor/canvas/cutter-ears.tsx`).
  - [x] Confirm `LabelPaper` is the sole physical tape surface from `-leadPx` to `widthPx + trailPx`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [6825a03]
  - [x] Verify in browser: tape ribbon has zero subpixel seams across cutter margins, elements clip cleanly, transformer handles sit visibly on top.

## Phase 2: Print Pipeline, Dynamic Auto-Fit & Regression Verification
- [x] Task: Verify Print Raster Capture (`captureLabel`) [6825a03]
  - [x] Test print bitmap generation in `packages/web/src/editor/editor.tsx` to confirm bounds `[0 .. widthPx, 0 .. heightPx]` remain exact with zero margins captured.
- [x] Task: Verify Dynamic Ribbon Auto-Fit & Camera Stabilization [6825a03]
  - [x] Test `fitDynamicLabel` with various element additions, deletions, drags, and rotations to ensure no coordinate shift or jitter.
- [x] Task: Verify Fixed-Size (Die-Cut / Gap) Mode [6825a03]
  - [x] Switch to gap paper mode and verify selection, element rendering, and paper outlines are unaffected.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [6825a03]
  - [x] Final user testing and approval in browser, record changelog in `CHANGELOG.md`.
