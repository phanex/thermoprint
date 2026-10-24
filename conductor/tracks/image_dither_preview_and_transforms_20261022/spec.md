# Specification: 1-Bit Printhead Raster Preview, Expanded Dithering & Image Invert/Flip Tools

## 1. Overview & Problem Statement
Currently, Thermoprint renders smooth anti-aliased vectors, text, and full-color/grayscale images on the canvas. However, physical thermal label printers (203 DPI) can strictly print pure 1-bit monochrome pixels ($0$ = unheated paper, $1$ = burned black dot).
1. **Blind Printing / Wasted Tape**: Users cannot see how images, photos, or fine details will actually rasterize until after burning a physical label.
2. **Limited Dithering Algorithms**: `@thermoprint/core` only provides basic Floyd-Steinberg and Threshold. Photorealistic thermal printing greatly benefits from **Atkinson dithering** (which drops 25% of error to keep whites pure and shadows clean) and **Bayer Ordered dithering** (retro newsprint stippling).
3. **No Image Inversion or Mirroring**: Users cannot invert colors (negative white-on-black for badges or fixing dark logos) or mirror/flip images (essential for stickers placed on the inside of shop windows or car windshields).
4. **Lack of Per-Image Dither Overrides**: Global dither settings apply uniformly to all elements, preventing users from having a crisp high-contrast logo alongside a soft dithered photo on the same label.
5. **Keyboard Shortcut Legacy Residue**: The `Icons` panel currently triggers on both `i` and legacy `c`, when the UI badge explicitly denotes `I`.

---

## 2. Functional Requirements

### 2.1 Core Image Processing Pipeline (`@thermoprint/core`)
1. **Atkinson Dithering**:
   - Implement `atkinsonDither(grayscale, width, height)` in `packages/core/src/image/dither.ts`.
   - Distributes $6/8$ error ($1/8$ right, $1/8$ two-right, $1/8$ down-left, $1/8$ down, $1/8$ down-right, $1/8$ down-two).
2. **Bayer 4×4 / 8×8 Ordered Dithering**:
   - Implement `bayerDither(grayscale, width, height, matrixSize)` in `packages/core/src/image/dither.ts`.
3. **Color Inversion & Threshold Options**:
   - Support `invert?: boolean` in `ProcessImageOptions`.
   - Support `threshold?: number` ($1..255$, default $128$).
4. **Type Alignment**:
   - Expand `DitherMode = "floyd-steinberg" | "atkinson" | "bayer" | "threshold" | "none"`.

### 2.2 TopChrome 1-Bit Printhead Preview (`Eye` Button)
1. **Store State**:
   - Add `rasterPreview: boolean` (default: `false`) and `toggleRasterPreview: () => void` in `editor-store.ts`.
2. **TopChrome Controls**:
   - Add an `Eye` / `EyeOff` button next to `Grid3x3` and `Ruler` in the desktop and mobile toolbars of `packages/web/src/editor/top-chrome/top-chrome.tsx`.
   - Active state style matches theme accent (`bg-accent/10 text-accent border-accent/30`).
3. **Canvas 1-Bit Overlay**:
   - When `rasterPreview` is enabled, render the exact 1-bit thermal printhead raster over the label paper using `processImage`, accurately showing individual thermal burn dots.
   - Preserves interactivity: users can still select, move, and edit elements with live-updating raster feedback.

### 2.3 Image Element Invert, Flip, and Dither Overrides
1. **Element Properties (`BaseElement.props`)**:
   - Support `flipH?: boolean`, `flipV?: boolean`, `invert?: boolean`.
   - Support `dither?: DitherMode | "default"` and `thresholdCutoff?: number`.
2. **Canvas Rendering (`image-element.tsx`)**:
   - Apply horizontal/vertical scaling and canvas filters for invert/flip cleanly within Konva.
3. **Inspector Controls (`image-section.tsx`)**:
   - Add Quick Action buttons with icons: **Flip Horizontal** (`FlipHorizontal`), **Flip Vertical** (`FlipVertical`), and **Invert Colors** (`Contrast` / `Moon`).
   - Add Dither Mode dropdown: `Default (Print Settings)`, `Atkinson`, `Floyd-Steinberg`, `Bayer`, `Threshold`.
   - Show interactive cutoff slider ($1..255$) when `Threshold` is selected.

### 2.4 Keyboard Shortcut Cleanup
- Remove `key === "c" || code === "KeyC"` trigger from `packages/web/src/lib/keyboard.ts:333`, so `Icons` only responds to `I`.

---

## 3. Acceptance Criteria
- [ ] `bun test` passes 100% with new unit tests for Atkinson, Bayer, and Invert processing in `@thermoprint/core`.
- [ ] TopChrome contains an `Eye` button that toggles between smooth vector rendering and 1-bit pixel printhead raster.
- [ ] Image Inspector has functional Flip H, Flip V, and Invert buttons that update image rendering immediately.
- [ ] Individual images can override the global dither algorithm with live raster preview.
- [ ] Pressing `c` on the keyboard does not open the Icons flyout; pressing `i` opens it reliably.
