# Implementation Plan: 1-Bit Printhead Raster Preview, Expanded Dithering & Image Invert/Flip Tools

## Phase 1: Core Image Processing & Unit Tests (`@thermoprint/core`)
- [x] Task: Implement Atkinson & Bayer Dithering Algorithms
  - [x] Add `atkinsonDither` to `packages/core/src/image/dither.ts`.
  - [x] Add `bayerDither` to `packages/core/src/image/dither.ts`.
  - [x] Update `DitherMode` and `processImage` in `packages/core/src/image/pipeline.ts` to support `"atkinson"`, `"bayer"`, and `invert?: boolean`.
- [x] Task: Unit Tests for Dithering & Invert
  - [x] Add tests in `packages/core/test/image/` verifying Atkinson, Bayer, and Inversion outputs.
  - [x] Run `bun test` and ensure all tests pass.

## Phase 2: Image Element Transformations & Inspector (`packages/web`)
- [x] Task: Flip & Invert Rendering in `image-element.tsx`
  - [x] Support `flipH`, `flipV`, and `invert` in `ImageElement`.
- [x] Task: Inspector Controls in `image-section.tsx`
  - [x] Add Flip H, Flip V, and Invert buttons with tooltips.
  - [x] Add per-image Dither selector (`Default`, `Atkinson`, `Floyd-Steinberg`, `Bayer`, `Threshold`) and threshold cutoff slider.
- [x] Task: Keyboard Shortcut Fix in `keyboard.ts`
  - [x] Remove `c` / `KeyC` from `open-icons` trigger in `packages/web/src/lib/keyboard.ts:333`.

## Phase 3: TopChrome Eye Button & Live 1-Bit Raster Preview Overlay (`packages/web`)
- [x] Task: Store State & TopChrome Toggle
  - [x] Add `rasterPreview: boolean` to `editor-store.ts`.
  - [x] Add `Eye` button to desktop & mobile rows in `top-chrome.tsx`.
- [x] Task: Canvas 1-Bit Raster Overlay in `canvas.tsx`
  - [x] Render 1-bit thermal printhead raster over the label when `rasterPreview` is active.
- [x] Task: Verification & Quality Assurance
  - [x] Run `bun test` and `tsc -b`.
  - [x] Update `CHANGELOG.md` under `## [Unreleased]`.
