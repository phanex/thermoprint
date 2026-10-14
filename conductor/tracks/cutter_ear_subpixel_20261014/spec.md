# Specification: Fix Cutter Ears Subpixel Misalignment & Clean Canvas Clipping

## Overview & Problem Statement
On continuous tape rolls, physical printer cut margins ("вуха" / cutter margins — e.g., 9 mm lead-in feed and 9 mm cut-off trail for Phomemo P12) simulate the actual physical leader/trailer paper margins handled mechanically by the hardware.
- **Current Behavior**: `LabelPaper` renders a single tape surface from `-leadPx` to `widthPx + trailPx` with drop shadow (`shadowBlur: 20`). To prevent dragged or rotated elements from overflowing onto the unprintable margins, two pure white unshadowed overlay rectangles (`CutterEars`) are rendered on top of the elements layer.
- **Defect**: Under fractional canvas zoom levels (e.g., 1.34x, 2.2x) or device pixel ratios, the rasterization and anti-aliasing of `CutterEars` Rects results in a 0.5px–1px vertical height mismatch relative to the underlying shadowed `LabelPaper`. This creates visible subpixel steps/seams at the top and bottom junctions of the cutter margins.
- **Secondary Issue**: In the current layer stack, element selection handles (Transformer) are drawn beneath `CutterEars`, causing selection borders and handles to be partially obscured when an element sits near the tape margin.

---

## Functional Requirements
1. **Single Unified Ribbon Surface**:
   - The physical tape in `LabelPaper` remains a single, continuous, shadowed rectangle spanning `[-leadPx .. widthPx + trailPx]` with height `heightPx`.
   - Redundant overlay Rects in `CutterEars` are eliminated, ensuring zero subpixel height mismatch across the entire tape length at any zoom level.
2. **Native Content Clipping**:
   - The element graphics container (`<Group id="canvas-elements">`) is natively clipped to the printable label bounds `[0, 0, widthPx, heightPx]` using Konva's `clipX`, `clipY`, `clipWidth`, `clipHeight`.
   - Any graphic element (text, image, barcode, qr, shape) extending past `x < 0` or `x > widthPx` or `y < 0` or `y > heightPx` is cleanly clipped at the print boundary, keeping cutter margins pure white.
3. **Interactive Selection Handles on Top**:
   - Selection bounding box and transform handles (Transformer) must remain visible on top of the tape and cutter margins. Handles must not be clipped or obscured when an element touches or crosses the margin.
4. **Coordinate System Invariance**:
   - The printable origin `(0, 0)` remains strictly the first printable dot.
   - Lead margin resides strictly in negative space `[-leadPx .. 0]`.
   - Trail margin resides strictly in `[widthPx .. widthPx + trailPx]`.
5. **Print Raster Capture Invariance**:
   - `captureLabel` continues to capture strictly `[0 .. widthPx, 0 .. heightPx]` at `originX, originY`.
   - Physical cutter margins are never captured or sent to the printer hardware.
6. **Dynamic Auto-Length Calculation Invariance**:
   - `fitDynamicLabel` calculation, camera stabilization (`deltaPanX`), and element normalization starting at `x = 0` remain 100% untouched and functional.
7. **Fixed-Size (Gap / Die-cut) Paper Invariance**:
   - Die-cut labels continue rendering as single rounded labels with their existing behavior.

---

## Acceptance Criteria
- [ ] At any canvas zoom level (100%, 150%, 220%, fit-to-screen), the top and bottom edges of the tape in continuous mode form a completely straight, seamless line with zero subpixel height discrepancy.
- [ ] When elements are placed or dragged past `x = 0` or `x = widthPx`, their graphics are neatly clipped at the printable boundary, leaving the cutter margins pure white.
- [ ] Element selection boxes and resize handles (Transformer) remain fully visible and operable when elements are positioned against the margin edges.
- [ ] Printed output and export bitmaps contain strictly the printable content without cutter margins.
- [ ] Element z-ordering, dragging, and keyboard navigation remain 100% functional.

---

## Out of Scope
- Redesigning the hatched cutter tabs (scissors) above and below the canvas.
- Modifying physical hardware margin values in printer device profiles.
