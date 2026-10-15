# Implementation Plan: Phomemo BLE Connection Resilience & Transparent Diagnostics Logging

This plan outlines the implementation steps to provide complete diagnostic logging during BLE connection and ensure resilient connection for Phomemo P12 on Windows Web Bluetooth, keeping Marklife protocols strictly isolated.

---

## Phase 1: Transparent BLE Diagnostics Logging

- [x] Task: Expand BLE diagnostic logging in `WebBluetoothTransport` and `Printer.connect`
  - [x] Add immediate logging of selected peripheral name & ID upon device selection in `use-web-bluetooth.ts` and `WebBluetoothTransport`.
  - [x] Add verbose logging of candidate service discovery and characteristic queries in `Printer.connect`.
  - [x] Wrap `Printer.connect` errors so that any caught exception is recorded to `debugLog("BLE", ...)` before re-throwing.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 2: Protocol-Isolated Phomemo P12 Connection Resilience

- [x] Task: Unit tests for protocol-specific connection resilience
  - [x] Add unit test verifying that `expectsAck: false` protocols tolerate RX subscription failure / timeout and remain connected in write-only mode.
  - [x] Verify Marklife protocols (`expectsAck: true`) still strictly require and enforce RX / CX contracts.
- [x] Task: Implement timeout & resilient RX subscription in `Printer.connect`
  - [x] Add a bounded timeout to `rx.subscribe()` so hanging OS calls do not freeze the connection indefinitely.
  - [x] For `protocol.expectsAck === false` (Phomemo P12), catch any notification failure/timeout, log warning, and continue in write-only mode.
  - [x] Verify service UUID resolution handles short 16-bit hex `0xff00` alongside 128-bit forms.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 3: Integration, Regression Verification & Micro-Changelog

- [x] Task: Run full test suite across `@thermoprint/core` and `@thermoprint/web`
  - [x] Verify all Marklife tests (`mark-l11.test.ts`, flow control, image pipeline) pass with 0 regressions.
  - [x] Verify Phomemo test suite (`pho-p12.test.ts`, `printer-connect.test.ts`) passes.
- [x] Task: Record discoveries and resolutions in `CHANGELOG.md` under `## [Unreleased]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
