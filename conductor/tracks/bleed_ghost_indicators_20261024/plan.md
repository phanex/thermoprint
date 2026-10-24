# Implementation Plan: Bleed Ghost Indicators for Elements Exceeding Printable Canvas

## Phases & Tasks

### Phase 1: Bleed Detection & Unit Tests
- [x] Task 1.1: Add `isElementBleeding` function in `packages/web/src/label/dynamic-label.ts`.
- [x] Task 1.2: Add unit tests in `packages/web/test/off-canvas.test.ts` verifying `isElementBleeding` for lines, rotated shapes, and boundaries.

### Phase 2: Inverse Clip & Ghost Overlay Update
- [x] Task 2.1: Update `packages/web/src/editor/canvas/off-canvas-ghost.tsx` to detect bleeding elements and apply the inverse clipping hole.
- [x] Task 2.2: Verify TypeScript compilation and running tests (`bun test`).

### Phase 3: Verification & Micro-Changelog
- [x] Task 3.1: Verify in browser at `http://localhost:5173/thermoprint/`.
- [x] Task 3.2: Append hardware/UI discoveries to `CHANGELOG.md` under `## [Unreleased]`.
