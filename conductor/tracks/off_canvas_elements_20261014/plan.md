# Implementation Plan: Off-Canvas Element Ghost Indicators, Drag Recovery & Parking Zone Logic

## Phase 1: Detection Math & Parking Zone Dynamic Logic
- [ ] Task: Off-Canvas Detection Utility (`isElementOffCanvas`)
  - [ ] Implement `isElementOffCanvas(el, widthPx, heightPx)` in `packages/web/src/label/dynamic-label.ts` using `getElementBounds(el)`.
  - [ ] Add unit tests verifying off-canvas detection for unrotated, rotated, and intersecting elements.
- [ ] Task: Parking Zone Dynamic Sizing in `fitDynamicLabel`
  - [ ] Update `fitDynamicLabel` in `packages/web/src/label/dynamic-label.ts` to exclude parked off-canvas elements from stretching ribbon width.
  - [ ] Add unit tests verifying that off-canvas elements do not bloat continuous tape length.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Run unit tests (`bun test`) and verify 100% pass rate.

## Phase 2: Visual Ghost Overlay & Interactive Dragging
- [ ] Task: Component `OffCanvasGhostOverlay`
  - [ ] Create `packages/web/src/editor/canvas/off-canvas-ghost.tsx`.
  - [ ] Render dashed amber rectangle (`#ff9f40`, `dash: [4, 4]`) for off-canvas elements.
  - [ ] Add transparent hit-box with `useElementDrag` handlers allowing direct click-to-select and drag-to-move.
- [ ] Task: Integration into Canvas Layer
  - [ ] Mount `<OffCanvasGhostOverlay />` inside `<Layer id="label-group">` in `packages/web/src/editor/canvas/canvas.tsx`.
  - [ ] Verify transition between off-canvas amber ghost and on-canvas normal element rendering.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Live testing in browser: dragging off-canvas, clicking dashed outline, dragging back onto canvas, checking dynamic ribbon width.
