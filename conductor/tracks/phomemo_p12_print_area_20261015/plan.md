# Implementation Plan: Phomemo P12 Printable Area Calibration & Vertical Offset Alignment

## Phase 1: Device Profile & Calibration Schema
- [ ] Task: Add printable area and offset configuration to `DeviceProfile` / `TapeOption`
  - [ ] Add optional `printableDots?: number` and `dotOffset?: number` (or margin) to `TapeOption` / `DeviceProfile`.
  - [ ] Configure `phoP12Profile` for 12mm tape: active printable dots = 93, offset to center on physical tape.

## Phase 2: Raster Alignment Pipeline
- [ ] Task: Implement offset-aware raster generation for rotated printers
  - [ ] Adjust raster packing or rotation slicing to map the printable dots onto the 12-byte (96-dot) packet sent to P12 ESC/POS header.
  - [ ] Verify unit tests for raster packing with offset.

## Phase 3: Hardware Verification & Micro-Changelog
- [ ] Task: Physical test print confirmation on user's Phomemo P12
- [ ] Task: Record findings and byte structures in `CHANGELOG.md` under `## [Unreleased]`
