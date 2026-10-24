# Track: Codebase Hardening & Bug Verification Roadmap

## Overview
Comprehensive roadmap and verification protocol for addressing the 22 bugs and architectural findings uncovered during the 2026-10-16 audit across `@thermoprint/core` and `@thermoprint/web`.

## Guiding Principles & Hardware Safety Rules
1. **Zero Blended PRs**: No mixing of canvas/UI fixes with hardware protocol/BLE transport changes.
2. **Atomic Verification**: One item at a time — Discuss -> Test Plan -> Implement -> Live Hardware/Browser Test -> Changelog -> Commit.
3. **Hardware Isolation (Phomemo P12 Protection)**: Phomemo P12 timing, GATT characteristics, and raster flow control must not be modified without explicit isolated test sessions on physical hardware.

## Artifacts
- **Specification & Issue Registry**: [spec.md](./spec.md)
- **Execution & Discussion Plan**: [plan.md](./plan.md)
