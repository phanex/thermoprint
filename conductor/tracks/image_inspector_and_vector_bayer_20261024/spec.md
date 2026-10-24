# Specification: Image & Icon Inspector Ergonomics, Dimension Preservation & Vector Bayer Halftoning

## 1. Overview & Problem Statement
1. **Misaligned Field Labels**: In `ImageSection`, the labels `NAME` and `COLLECTION` have variable text lengths without a fixed column width, causing their corresponding values to start at staggered horizontal positions.
2. **Dimension Clobbering on Asset Replacement**: When replacing an icon via `icons-flyout.tsx` (`targetElementId`) or replacing an image file in `image-section.tsx` (`handleReplaceImageFile`), the element's existing width and height on the canvas are overwritten with natural/default dimensions (e.g. 64px or 200px), destroying user canvas layouts.
3. **Redundant & Cluttered Replace Actions**: The inspector displays two full-width buttons simultaneously ("Replace with Icon" and "Replace with Image File"). There is no direct "browse" affordance next to the current asset name, and the wording "Image File" is awkward and redundant.
4. **Error Diffusion Worm Artifacts on Solid Gray Fills**: When dithering vector shapes with solid gray fills (e.g. `#808080` rectangle) using error diffusion algorithms (Atkinson or Floyd-Steinberg), the flat color triggers recursive error oscillation loops, resulting in chaotic serpentine "worms" and directional noise. In contrast, Bayer 8×8 ordered dithering produces a pristine, uniform, stable crosshatch halftone dot pattern.

---

## 2. Functional Requirements

### FR-1: Aligned Inspector Key-Value Rows (`image-section.tsx`)
- Standardize all property label columns (`NAME`, `COLLECTION`, `RESOLUTION`, `COLOR`) to a fixed width of `80px` (`w-20 shrink-0`).
- Ensure all values (`iconName`, `collectionName`, `fileName`, `resolution`, `ColorInput`) begin on the exact same horizontal alignment plane.

### FR-2: Inline Asset Browse & Replace Trigger (`FolderOpen`)
- Place an inline `28×28px` icon button (`FolderOpen`, `size={14}`) directly on the `NAME` row:
  - **For Icons**: Clicking `FolderOpen` opens the Icon Library flyout (`thermoprint:open-icons`) to choose a replacement icon.
  - **For Images**: Clicking `FolderOpen` opens the OS file picker to choose a replacement image file.
- Style with design system tokens: `w-7 h-7 flex items-center justify-center rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-100 hover:bg-ink-750 transition-colors shrink-0 cursor-pointer`.

### FR-3: Canvas Dimension Preservation on Replace
- When replacing an icon in `icons-flyout.tsx` where `targetElementId` is present:
  - Update `src`, `iconName`, `collection`, `collectionName`, and `fill`.
  - **DO NOT** update or overwrite `targetEl.width` and `targetEl.height`.
- When replacing an image in `image-section.tsx` (`handleReplaceImageFile`):
  - Update `src`, `fileName`, `naturalWidth`, `naturalHeight`, and clear icon props.
  - **DO NOT** update or overwrite `element.width` and `element.height`.

### FR-4: Contextual Single Action Button & Metadata Display
- Remove dual replace buttons. Provide a single contextual conversion button at the bottom:
  - If current element is an **Icon**: Single button `Replace with Image` (icon: `ImageIcon`).
  - If current element is an **Image**: Single button `Replace with Icon` (icon: `Sticker`).
- For Image elements, store and display:
  - `NAME`: filename (stored as `props.fileName`, defaulting to `"Image"`).
  - `RESOLUTION`: natural pixel dimensions formatted as `${naturalWidth} × ${naturalHeight} px`.

### FR-5: Vector Gray Halftoning via Bayer 8×8
- Non-raster vector elements with gray fills (rectangles, shapes, lines) are rendered using **Bayer 8×8 ordered halftoning** in both the 1-bit thermal printhead preview and the final print pipeline.
- Continuous-tone photos (raster `Image` elements) utilize the user's active dithering selection (Atkinson, Floyd-Steinberg, Bayer, or Threshold).
- Non-raster elements and raster photos are composited cleanly into the unified 1-bit thermal printhead bitmap.

---

## 3. Acceptance Criteria
- [ ] In `ImageSection`, `NAME`, `COLLECTION`, `RESOLUTION`, and `COLOR` values are vertically aligned.
- [ ] Clicking `[ 📁 ]` next to an Icon opens the Icon Library; selecting an icon updates the graphic while retaining existing width, height, and coordinates.
- [ ] Clicking `[ 📁 ]` next to an Image opens the file picker; selecting a file updates the picture while retaining existing width, height, and coordinates.
- [ ] If an Icon is selected, the bottom button says `Replace with Image`. If an Image is selected, the bottom button says `Replace with Icon`.
- [ ] Solid gray rectangles render as uniform Bayer 8×8 halftone crosshatches rather than Atkinson serpentine worms in 1-bit preview and print output.
- [ ] All tests pass (`bun test`), with zero TypeScript compiler errors (`tsc -b`).
