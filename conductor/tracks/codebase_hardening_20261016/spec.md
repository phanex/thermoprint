# Specification: Codebase Hardening & Bug Verification

## Context & Objectives
An in-depth static analysis and code audit was conducted on 2026-10-16 identifying 22 distinct issues ranging from UI/Canvas quirks to transport leaks and BLE timeouts.

Because hardware protocols (particularly the Phomemo P12 driver and BLE flow control) were hard-won through extensive physical reverse-engineering, changes must be strictly tiered and isolated to prevent regressions.

---

## Issue Classification & Risk Tiers

### 🟢 Tier 1: Safe Canvas & Editor Ergonomics (Zero Hardware Risk)
*Changes in this tier touch only pure React/Konva canvas rendering, Inspector inputs, and CSS/geometry. They carry zero risk of breaking BLE communication or printer rasterization.*

- **B04 (Marquee selection ignores rotation)**: `canvas.tsx:787-809` calculates marquee bounding box using unrotated `x, y, w, h`. Must use `getElementBounds(el)` for accurate oriented bounding boxes.
- **B05 (Trailing click drops multi-selection on dragend)**: `use-element-drag.ts:101-111` receives Konva `click` after `dragend`, calling `selectOnly([id])`. Must maintain a `hasDraggedRef` flag to suppress unselected click logic.
- **B13 (Line on Y=0 false-positive off-canvas)**: `dynamic-label.ts:18-19, 80-87` clamps line height to 0, causing `maxY <= 0` at $Y=0$. Must clamp to `strokeWidth` and use strict inequalities.
- **B14 (Inspector alignment tools misalign rotated elements)**: `transform-section.tsx:16-25` uses unrotated coordinates. Must use visual center from `getElementBounds`.
- **B15 (NumInput NaN leakage & 0 on Backspace)**: `fields.tsx:140` passes 0 when empty and `NaN` on invalid input. Must clamp to min/max and guard against `NaN`.
- **B16 (Active selection handles rendered in library thumbnails)**: `editor.tsx:96-103` captures stage without hiding transformers. Must hide transformers during thumbnail rasterization.

---

### 🟡 Tier 2: State Management & Template Engine (Controlled Logic Risk)
*Changes in this tier affect store state, undo/redo history, dynamic label length, and text template parsing. They must be validated through unit tests and simulated prints before hardware testing.*

- **B10 (`applyModelDefaults` canvas overwrite on connect)**: `use-web-bluetooth.ts:49`, `printer-store.ts:47-74` unconditionally resets user's custom label dimensions when a printer connects. Must guard against overwriting non-empty canvases.
- **B11 (`paperType` omitted from Zundo `partialize`)**: `editor-store.ts:627-635` does not record `paperType` in undo history. Switching to dynamic tape and pressing `Ctrl+Z` leaves `paperType` stuck on `"continuous"`. Must include `paperType` in `partialize`.
- **B12 (Decimal counter precision with integer start)**: `template-engine.ts:99-143` checks decimals only on start value (`{{#:1+0.5}}` drops decimals). Must check `Math.max(decimals(start), decimals(step))`.
- **B03 (Asynchronous `new Image().onload` race in Batch Print)**: `editor.tsx:185-215`, `barcode-element.tsx:139`, `qr-element.tsx:63`. Waiting 1 `requestAnimationFrame` is insufficient for async `Image.onload` from data URLs, causing barcode data to lag 1 item behind. Must synchronize canvas image readiness before capturing.
- **B17 (LocalStorage quota failure on large images)**: `library.ts:48`. Large base64 images can silently exceed the 5MB quota. Must handle `QuotaExceededError` gracefully.

---

### 🔴 Tier 3: BLE Transport & Protocol Timing (High Hardware Risk — Live Test Mandatory)
*Changes in this tier touch Bluetooth packet exchange, credit flow control, and printer protocol handlers. Under no circumstances should multiple items in this tier be committed together. Each fix must be vetted against real hardware with live test logs.*

- **B06 (Phomemo P12 3s model query timeout on connect)**: `pho-p12/protocol.ts:55-57`, `printer.ts:293`. Phomemo P12 does not support `0x02` model queries. Querying firmware responds with type `"firmware"`, while `getModel()` awaits `"model"`, stalling for 3000ms. Must infer model from BLE peripheral name without sending unsupported packets.
- **B08 (Desktop Chrome 3000ms `waitForDeviceReady` delay)**: `web-bluetooth.ts:266-270`. An artificial 3s delay is enforced when `watchAdvertisements` is unsupported. Must evaluate safe progressive connection retries instead of a fixed 3s pause.
- **B01 (Zombie polling timer in `waitForCredits`)**: `printer.ts:441-478`. `setTimeout(check, 20)` keeps firing indefinitely if connection drops during printing. Must add explicit cancellation on disconnect/timeout.
- **B02 (`DataView` raw buffer slicing ignores `byteOffset`)**: `web-bluetooth.ts:68-70`. `new Uint8Array(target.value.buffer)` risks reading adjacent buffer pool memory. Must use `new Uint8Array(target.value.buffer, target.value.byteOffset, target.value.byteLength)`.
- **B09 (`Printer.printBitmap` concurrency guard)**: `printer.ts:179-224` lacks re-entrancy lock, allowing interleaved raster packets if triggered twice rapidly.
- **B18 (`packetDelayMs: 0` coerces to 30ms)**: `flow-control.ts:65`. Setting 0 pings the fallback 30ms delay. Must allow explicit 0ms for unmetered high-speed transports.
