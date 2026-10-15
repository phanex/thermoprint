# Implementation Plan: Off-Canvas Element Ghost Indicators, Drag Recovery & Parking Zone Logic

## Phase 1: Detection Math & Parking Zone Dynamic Logic
- [x] Task: Off-Canvas Detection Utility (`isElementOffCanvas`)
  - [x] Implement `isElementOffCanvas(el, widthPx, heightPx)` in `packages/web/src/label/dynamic-label.ts` using `getElementBounds(el)`.
  - [x] Add unit tests verifying off-canvas detection for unrotated, rotated, and intersecting elements.
- [x] Task: Parking Zone Dynamic Sizing in `fitDynamicLabel`
  - [x] Update `fitDynamicLabel` in `packages/web/src/label/dynamic-label.ts` to exclude parked off-canvas elements from stretching ribbon width.
  - [x] Add unit tests verifying that off-canvas elements do not bloat continuous tape length.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Run unit tests (`bun test`) and verify 100% pass rate.

## Phase 2: Visual Ghost Overlay & Interactive Dragging
- [x] Task: Component `OffCanvasGhostOverlay`
  - [x] Create `packages/web/src/editor/canvas/off-canvas-ghost.tsx`.
  - [x] Render dashed amber rectangle (`#f59e0b`, `dash: [4, 4]`) for off-canvas elements.
  - [x] Add transparent hit-box with `useElementDrag` handlers allowing direct click-to-select and drag-to-move.
- [x] Task: Integration into Canvas Layer
  - [x] Mount `<OffCanvasGhostOverlay />` inside `<Layer id="label-group">` in `packages/web/src/editor/canvas/canvas.tsx`.
  - [x] Verify transition between off-canvas amber ghost and on-canvas normal element rendering.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Live testing in browser: dragging off-canvas, clicking dashed outline, dragging back onto canvas, checking dynamic ribbon width.
