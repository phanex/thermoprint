# Implementation Plan: Phomemo P12 Printable Area Calibration & Cross-Feed Offset Alignment

## Phase 1: Device Profile & Calibration Schema
- [x] Task: Add cross-feed offset configuration to `DeviceProfile`, `PrintOptions`, and `PrintSequenceOptions`
  - [x] Add declarative `crossFeedOffsetDots?: number` to `DeviceProfile` in `packages/core/src/device/types.ts`.
  - [x] Configure `phoP12Profile`: `crossFeedOffsetDots: 3` to align 93 active dots on tape.
  - [x] Configure `markP15Profile`, `markP12Profile`, `markM60Profile`: `crossFeedOffsetDots: 0`.

## Phase 2: Raster Alignment Pipeline
- [x] Task: Implement offset-aware raster shift engine
  - [x] Implement `shiftBitmapCrossFeed(image, offsetDots)` in `packages/core/src/image/offset.ts`.
  - [x] Integrate across all protocols (`pho-p12`, `mark-l11`, `mark-x2`) and `Printer.printBitmap`.
  - [x] Verify unit tests for bitmap cross-feed shifting and protocol raster generation (`bun test`).

## Phase 3: Hardware Verification & Micro-Changelog
- [x] Task: Physical test print confirmation on user's Phomemo P12
- [x] Task: Record findings and byte structures in `CHANGELOG.md` under `## [Unreleased]`
