# Specification: Off-Canvas Element Ghost Indicators, Drag Recovery & Parking Zone Logic

## Overview & Problem Statement
When canvas elements are moved completely outside the printable bounds `[0, 0, label.widthPx, label.heightPx]` (e.g. into the lead/trail cut margins or dark background):
1. **Invisibility**: Native clipping correctly prevents elements from drawing over printer margins, but as a result, off-canvas objects become 100% invisible.
2. **Unreachable Drag**: Because their graphic node is clipped, direct mouse clicks on the canvas cannot hit them. Users can only select them blindly via marquee dragging or retrieve them via center alignment buttons in the inspector.
3. **Dynamic Tape Bloat**: In continuous dynamic mode (`fitDynamicLabel`), off-canvas or discarded elements were previously included in `minX..maxX` calculation, causing the continuous ribbon to unexpectedly expand under empty space.

---

## Functional Requirements
1. **Ghost Warning Indicator (Amber Dashed Outline)**:
   - For any element whose bounding box (`getElementBounds(el)`) lies completely outside the printable canvas `[0, 0, widthPx, heightPx]`:
     - `bounds.maxX <= 0 || bounds.minX >= widthPx || bounds.maxY <= 0 || bounds.minY >= heightPx`
   - Render a dashed bounding box in an unclipped layer:
     - Color: amber/warning (`#ff9f40` / `var(--color-amber-400)`).
     - Style: `dash: [4, 4]`, `strokeWidth: 1.5`, aligned to element `x, y, width, height, rotation`.
   - **Unselected state**: Show only the dashed outline, with zero resize/rotate handles to keep the interface uncluttered.
   - **Selected state**: Show active selection frame.
2. **Interactive Hit-Box & Drag Recovery**:
   - The ghost outline contains an interactive hit surface (`fill: "transparent"`, `draggable: true`) matching the element's bounds.
   - Clicking inside the ghost box selects the element (`selectOnly([el.id])`).
   - Dragging the ghost box immediately moves the actual element, allowing the user to grab an off-canvas object from anywhere in the dark canvas or cut margin and drag it back onto the printable label.
   - When the element intersects or re-enters the printable area, the ghost overlay automatically disappears, and standard element rendering resumes.
3. **Parking Zone Dynamic Ribbon Logic**:
   - In `fitDynamicLabel`: Elements that are completely outside the printable bounds (`maxX <= 0` or `minX >= currentLabel.widthPx`) are treated as "parked off-canvas" and do NOT expand the continuous ribbon length.
   - The dynamic ribbon length is determined strictly by elements currently on or intersecting the label.
   - When an off-canvas element is dragged back onto the label, dynamic auto-fit automatically incorporates it and expands the ribbon.

---

## Known Limitations & Edge Cases (Noted)
- **Text boxes with excess whitespace**:
  If a text element has a large bounding box where the box itself touches `[0..widthPx]` but the visible letters are pushed into empty margin space due to alignment or trailing spaces, the element is mathematically considered intersecting the canvas and will not trigger the off-canvas amber ghost indicator. Users can locate and manage such elements via the Layers palette or direct click. (Design decision: keep as-is without complex font glyph boundary parsing).

---

## Acceptance Criteria
- [ ] Any element completely outside `[0, 0, widthPx, heightPx]` renders an amber dashed outline.
- [ ] Clicking the amber dashed box selects the element.
- [ ] Dragging the amber dashed box moves the element back onto the printable tape.
- [ ] Completely off-canvas elements do not expand the dynamic ribbon length.
- [ ] Elements on the label behave normally without ghost outlines.
