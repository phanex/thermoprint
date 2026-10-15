# Implementation Plan: Line Element Resize Handles & Off-Canvas Ghost Fix

## Phase 1: Line Element Transformer Handle Fix
- [x] Task: Allow free horizontal length adjustment for lines in `LineElement`
  - [x] Add `keepRatio={false}` and `flipEnabled={false}` to `ElementWrapper` in `line-element.tsx`.
  - [x] Ensure `boundBoxFunc` preserves single-axis width scaling and ignores height.
  - [x] Verify `onTransformEnd` computes positive width when dragging from either left or right handle.

## Phase 2: Off-Canvas Line Ghost Representation
- [x] Task: Specialize `OffCanvasGhostItem` for `line` element types
  - [x] When `element.type === "line"`, render a dashed Konva `<Line points={[0, 0, element.width, 0]} ... />` with `hitStrokeWidth={12}` and amber `#f59e0b` dash.
  - [x] Retain rectangular ghost box for 2D elements (text, barcode, qr, image, rect).

## Phase 3: Verification & Micro-Changelog
- [x] Task: Run unit tests and verify canvas interactions
- [x] Task: Update `CHANGELOG.md` under `## [Unreleased]`
