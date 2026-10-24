# Specification: Accurate Center on Label Alignment for Rotated Elements and Groups

## Problem Statement
When centering elements on the label canvas:
1. **Misalignment of Rotated Elements in Palette & Multi-Transform**:
   - `commands.ts:201-232` (`centerOnLabel`) used unrotated `width` and `height` for single elements (`x = (label.widthPx - selected[0].width) / 2`). A $200 \times 40$ element rotated 90° was centered as if it were 200px wide, causing severe horizontal misalignment.
   - For multi-element selections, `commands.ts` and `multi-transform-section.tsx` computed the group bounding box using `min(e.x)` and `max(e.x + e.width)`, completely ignoring rotation angles and oriented visual bounds.
2. **Inconsistent UI Wording**:
   - In `transform-section.tsx`, the centering action button had the tooltip `"Center both"`, which is vague and disconnected from `"Center on label"` used elsewhere.
3. **Lack of Single Source of Truth**:
   - Centering math was duplicated in 3 different places with conflicting implementations.

## Architectural Requirements
1. **Single Source of Truth**:
   - Export `getSelectionBounds(elements: BaseElement[])` and `calculateCenterOnLabelPatches(elements, labelWidthPx, labelHeightPx, options)` in `packages/web/src/label/dynamic-label.ts`.
   - Calculate oriented bounding boxes for all elements using `getElementBounds(el)` so that any rotation angle (0°, 15°, 45°, 90°, 180°, 270°) produces exact visual centering on both axes.
2. **Harmonize Call Sites**:
   - `transform-section.tsx`: Use `calculateCenterOnLabelPatches` for `alignH`, `alignV`, and `alignBoth`. Update tooltip to `"Center on label"`.
   - `multi-transform-section.tsx`: Use `getSelectionBounds` for group metrics and `calculateCenterOnLabelPatches` for `centerOnLabel`.
   - `commands.ts`: Unify `centerOnLabel`, `alignCenterHorizontal` (for single element), and `alignCenterVertical` (for single element) to use `calculateCenterOnLabelPatches`.
3. **Verification**:
   - Add unit tests verifying single and group centering with mixed rotation angles (e.g. 0° and 90° elements in the same group).
   - Verify TypeScript compilation and existing 177 unit tests pass.
