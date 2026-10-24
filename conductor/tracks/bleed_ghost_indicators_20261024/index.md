# Track: Bleed Ghost Indicators for Elements Exceeding Printable Canvas

## Status
- **Status**: completed
- **Created**: 2026-10-24
- **Context**: Elements that extend beyond printable canvas boundaries currently get abruptly clipped by `canvas-elements`'s `clipFunc`, leaving no visual indication of cropped portions (or only showing floating transformer handles when selected). Building on user-requested "feature B13", any element bleeding beyond the printable canvas bounds will now display an elegant dashed amber ghost outline (`#f59e0b`, `dash: [4, 4]`) in the workspace, with an inverse clip preserving clean white printable paper.

## Links
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
