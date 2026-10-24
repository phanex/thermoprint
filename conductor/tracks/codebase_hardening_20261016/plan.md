# Implementation Plan: Codebase Hardening & Bug Verification

## Phase 1: Planning & Verification Setup (Current)
- [x] Task: Perform comprehensive static analysis and bug discovery audit (completed in `/boost`)
- [x] Task: Classify all 22 findings into Risk Tiers (Tier 1 Safe Canvas, Tier 2 State/Templates, Tier 3 BLE/Hardware)
- [ ] Task: Review and prioritize roadmap with user; establish hardware testing schedule

## Phase 2: Tier 1 Implementation (Safe Canvas & Editor Ergonomics)
*Prerequisite: Browser visual testing only (no printer connection needed).*
- [x] Task: Verify B05 (trailing click drops multi-selection) -> Discarded: user verified group drag works reliably
- [x] Task: Verify B15 (NumInput validation) -> Discarded: user confirmed current input behavior is ideal
- [x] Task: Verify B13 (line on $Y=0$ off-canvas) -> Kept as feature: user identified the orange striped bleed pattern as a great future UX concept
- [x] Task: Fix B16 (hide selection handles & transformer in saved thumbnails)
- [x] Task: Fix B14 (alignment tools for rotated elements via `getElementBounds`)
- [ ] Task: Fix B04 (refine marquee & off-canvas ghost bounds for rotated elements)
- [ ] Task: Browser verification & atomic commit for Tier 1

## Phase 3: Tier 2 Implementation (State, Undo & Template Engine)
*Prerequisite: Unit tests + browser verification.*
- [ ] Task: Discuss and implement B11 (`paperType` in Zundo partialize for Undo/Redo)
- [ ] Task: Discuss and implement B12 (decimal counter precision with integer start)
- [ ] Task: Discuss and implement B10 (`applyModelDefaults` canvas overwrite protection)
- [ ] Task: Discuss and implement B03 (batch print barcode/QR asynchronous rendering synchronization)
- [ ] Task: Discuss and implement B17 (`localStorage` image quota error handling)
- [ ] Task: Test suite execution & atomic commit for Tier 2

## Phase 4: Tier 3 Implementation (BLE Transport & Protocol Timing — Isolated Live Testing)
*Prerequisite: Physical printer available (Phomemo P12 & Marklife) for live step-by-step verification.*
- [ ] Task: Discuss and implement B02 (`DataView` raw buffer slicing with `byteOffset`/`byteLength`)
- [ ] Task: Discuss and implement B01 (zombie polling timer cancellation in `waitForCredits`)
- [ ] Task: Discuss and implement B09 (`Printer.printBitmap` concurrency guard)
- [ ] Task: Discuss and implement B06 (Phomemo P12 3s model query timeout elimination)
- [ ] Task: Discuss and implement B08 (desktop Chrome 3000ms `waitForDeviceReady` delay reduction)
- [ ] Task: Discuss and implement B18 (`packetDelayMs: 0` coercion to 30ms fix)
- [ ] Task: Live hardware verification with user on Phomemo P12 & atomic commit

## Phase 5: Code Health & Lint Cleanup
- [ ] Task: Address 68 ESLint warnings/errors (ref mutation during render in `text-element.tsx`, remove dead `tooltip.tsx`, effect dependencies)
- [ ] Task: Final regression test pass across all packages
