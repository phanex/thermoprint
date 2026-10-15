# Specification: Line Element Resize Handles & Off-Canvas Ghost Fix

## 1. Overview
Fix two usability defects in the canvas `line` element:
1. Transformer handles (`middle-left`, `middle-right`) fail to resize/change the length of a line because `ElementWrapper` defaults to `keepRatio={true}`, which degenerates when element height is 0.
2. When a line element is positioned completely off-canvas, `OffCanvasGhostOverlay` clamps height to `Math.max(10, element.height)`, displaying a tall rectangular box (~10-15px high) instead of a line ghost.

## 2. Functional Requirements
- **FR-1**: Line element resizing via Transformer side handles (`middle-left`, `middle-right`) must smoothly update `element.width` without locking, dividing by zero, or aspect ratio constraints (`keepRatio={false}`).
- **FR-2**: Off-canvas line elements must be represented in `OffCanvasGhostOverlay` as a clean dashed line matching the line's orientation and stroke width, retaining interactive click-to-select and drag-to-recover behavior with an enlarged hit area (`hitStrokeWidth={12}`).
- **FR-3**: Rotation and position coordinates must remain accurate when transforming lines from either side handle.

## 3. Acceptance Criteria
- [ ] User can click and drag `middle-left` or `middle-right` transformer handle of a line to increase or decrease its length.
- [ ] Moving a line completely off-canvas renders a dashed amber line (not a 10px tall box).
- [ ] Dragging the off-canvas line brings it back onto the printable canvas.
- [ ] Automated tests verify line drag, transform end width calculation, and ghost rendering behavior.
