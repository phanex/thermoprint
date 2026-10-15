# Specification: Phomemo BLE Connection Resilience & Transparent Diagnostics Logging

## Overview
Stabilize the Phomemo P12 BLE connection lifecycle on Windows Web Bluetooth and introduce comprehensive, transparent diagnostics logging across the entire connection process. Enforce strict protocol-level isolation so that improvements to `PhoP12Protocol` cannot affect `MarkL11Protocol` or `MarkX2Protocol` (Marklife P15, P12, M60).

---

## Functional Requirements

### 1. Transparent BLE Diagnostics Logging
- Log peripheral name immediately upon user selection: `[BLE] selected peripheral "${peripheral.name}" (${peripheral.id})`.
- Log each step of GATT setup: service discovery attempts with UUID candidates, resolved service, TX characteristic, RX characteristic.
- In case of any error at any point during `Printer.connect()`, catch and write the exact exception details (`[BLE] connect failed: ${err.name} - ${err.message}`) to `debugLog("BLE", ...)` before propagating the error to the UI store.
- Ensure the downloaded `.log` file always contains the peripheral name and the exact reason for any connection failure.

### 2. Protocol-Isolated Phomemo P12 Connection Resilience
- In `PhoP12Protocol`, `expectsAck: false` (the printer consumes ESC/POS raster streams directly without requiring flow control acknowledgments).
- In `Printer.connect`, guard the `rx.subscribe()` call with a timeout. If the OS / WinRT BLE stack rejects or hangs on `startNotifications()` on characteristic `0xff03`, log a warning (`[BLE] RX notifications failed/timed out, continuing write-only`) and proceed safely in write-only mode without breaking the connection, mirroring best practices from `phomymo`.
- Support both 16-bit integer `0xff00` and full 128-bit `0000ff00-0000-1000-8000-00805f9b34fb` service resolution for Phomemo devices.

### 3. Strict Protocol & Profile Isolation
- Marklife protocols (`mark-l11`, `mark-x2`) and device profiles (`mark-p15`, `mark-p12`, `mark-m60`) remain 100% untouched.
- Their credit-based flow control (`cx`), handshake synchronization, and query mechanisms continue to execute strictly as designed.

---

## Non-Functional Requirements
- Zero regressions for Marklife printers.
- Full compliance with `CHANGELOG.md` micro-changelog logging.
- Conformance to existing project coding styles and TypeScript strict typing.

---

## Acceptance Criteria
- [ ] Phomemo P12 connects successfully on Windows Web Bluetooth even when Windows WinRT GATT notifications for RX fail or stall.
- [ ] Any connection failure produces an explicit diagnostic trace in the downloaded `.log` file showing the peripheral name, the attempted step, and the exact error message.
- [ ] The full unit test suite for `@thermoprint/core` passes with 0 failures, verifying no regressions for Marklife devices.

---

## Out of Scope
- Modifications to `MarkL11Protocol` or `MarkX2Protocol` binary command builders.
- New UI buttons, modals, or visual style alterations.
