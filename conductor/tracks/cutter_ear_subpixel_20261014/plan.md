# Implementation Plan: Fix Cutter Ears Subpixel Misalignment & Clean Canvas Clipping

## Phase 1: Canvas Architecture & Content Clipping Setup
- [ ] Task: Native Content Clipping on Canvas Elements
  - [ ] Add `clipX={0}`, `clipY={0}`, `clipWidth={label.widthPx}`, `clipHeight={label.heightPx}` to `<Group id="canvas-elements">` in `packages/web/src/editor/canvas/canvas.tsx`.
  - [ ] Verify element content is clipped to printable area boundaries and does not bleed into lead/trail margins.
- [ ] Task: Unclipped Selection & Transformer Overlay
  - [ ] Ensure selection transformer handles render above the clipped elements group (e.g. in a dedicated unclipped Transformer group or layer) so handles are never sliced off at the margin edge.
  - [ ] Verify handles are fully visible on top of tape margins and interactive.
- [ ] Task: Remove Redundant CutterEars Overlay Rects
  - [ ] Retire or clean up the unshadowed overlay rectangles in `CutterEars` (`packages/web/src/editor/canvas/cutter-ears.tsx`).
  - [ ] Confirm `LabelPaper` is the sole physical tape surface from `-leadPx` to `widthPx + trailPx`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Verify in browser: tape ribbon has zero subpixel seams across cutter margins, elements clip cleanly, transformer handles sit visibly on top.

## Phase 2: Print Pipeline, Dynamic Auto-Fit & Regression Verification
- [ ] Task: Verify Print Raster Capture (`captureLabel`)
  - [ ] Test print bitmap generation in `packages/web/src/editor/editor.tsx` to confirm bounds `[0 .. widthPx, 0 .. heightPx]` remain exact with zero margins captured.
- [ ] Task: Verify Dynamic Ribbon Auto-Fit & Camera Stabilization
  - [ ] Test `fitDynamicLabel` with various element additions, deletions, drags, and rotations to ensure no coordinate shift or jitter.
- [ ] Task: Verify Fixed-Size (Die-Cut / Gap) Mode
  - [ ] Switch to gap paper mode and verify selection, element rendering, and paper outlines are unaffected.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Final user testing and approval in browser, record changelog in `CHANGELOG.md`.
