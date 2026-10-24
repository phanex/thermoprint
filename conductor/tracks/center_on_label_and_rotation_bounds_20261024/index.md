# Track: Accurate Center on Label Alignment for Rotated Elements and Groups

## Status
- **Status**: completed
- **Created**: 2026-10-24
- **Context**: Centering elements on the label canvas was inconsistent and inaccurate when elements were rotated (e.g. 90° or arbitrary angles) or multi-selected. Specifically, `commands.ts` and `multi-transform-section.tsx` used unrotated dimensions (`width`, `height`) and coordinates (`x`, `x + width`), and the single-element inspector labeled the action vaguely as "Center both".

## Links
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
