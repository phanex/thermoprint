# Specification: Bleed Ghost Indicators for Elements Exceeding Printable Canvas

## Problem Statement
When an element (line, rectangle, text, icon, image, barcode, QR code) extends beyond the printable boundaries of the label canvas:
- The content inside the label renders normally.
- The content extending into the workspace is abruptly clipped to complete invisibility by `clipFunc` on `<Group id="canvas-elements">`.
- If selected, only floating selection dots/handles are visible in mid-air with no element body. If unselected, there is zero visual clue that an object is being cropped.

## Proposed Solution
1. **Geometry Detection (`isElementBleeding`)**:
   - In `packages/web/src/label/dynamic-label.ts`, implement `isElementBleeding(el, labelWidthPx, labelHeightPx)` using `getElementBounds(el)`.
   - Returns `true` if `minX < -0.5 || maxX > labelWidthPx + 0.5 || minY < -0.5 || maxY > labelHeightPx + 0.5`.
2. **Inverse Canvas Clip on Ghost Overlay (`OffCanvasGhostOverlay`)**:
   - In `packages/web/src/editor/canvas/off-canvas-ghost.tsx`, wrap the ghost group in an inverse clip function using standard nonzero-winding geometry:
     - Outer rectangle covering the workspace: `ctx.rect(-100000, -100000, 200000, 200000)` (clockwise).
     - Inner hole matching the label boundary (continuous rect or gap rounded-rect) drawn in counter-clockwise direction.
   - Result: Ghost indicators are strictly clipped OUT of the white printable label, guaranteeing zero visual pollution on the printable paper, while freely rendering across the workspace outside the label.
3. **Ghost Rendering**:
   - For `line`: Renders dashed amber `<Line points={[0, 0, width, 0]} stroke="#f59e0b" dash={[4, 4]} />`.
   - For all other shapes/text/images: Renders oriented dashed amber `<Rect stroke="#f59e0b" dash={[4, 4]} fill="rgba(245, 158, 11, 0.08)" />`.
   - Both are interactive (draggable and clickable via `useElementDrag`).
4. **Clean Print & Capture Parity**:
   - `captureLabel` in `packages/web/src/editor/canvas/capture.ts` already hides `#canvas-off-screen-ghosts`, ensuring ghosts never leak into printouts or raster preview bitmaps.
