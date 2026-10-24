# Implementation Plan: Accurate Center on Label Alignment for Rotated Elements and Groups

## Phases & Tasks

### Phase 1: Shared Math & Single Source of Truth
- [x] Task 1.1: Add `getSelectionBounds` and `calculateCenterOnLabelPatches` in `packages/web/src/label/dynamic-label.ts`.
- [x] Task 1.2: Add unit tests in `packages/web/test/transform-alignment.test.ts` covering multi-element group centering with mixed rotation (0° and 90° elements).

### Phase 2: Refactor UI and Palette Call Sites
- [x] Task 2.1: Update `packages/web/src/editor/inspector/sections/transform-section.tsx` to use `calculateCenterOnLabelPatches` and rename tooltip to `"Center on label"`.
- [x] Task 2.2: Update `packages/web/src/editor/inspector/sections/multi-transform-section.tsx` to use `getSelectionBounds` and `calculateCenterOnLabelPatches`.
- [x] Task 2.3: Update `packages/web/src/editor/palette/commands.ts` (`centerOnLabel`, `alignCenterHorizontal`, `alignCenterVertical`) to use `calculateCenterOnLabelPatches`.

### Phase 3: Verification & Micro-Changelog
- [x] Task 3.1: Run `bun test` and `bun run --cwd packages/web tsc -b`.
- [x] Task 3.2: Record hardware/UI findings in `CHANGELOG.md` under `## [Unreleased]`.
