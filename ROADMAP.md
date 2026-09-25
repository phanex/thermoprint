# Thermoprint — Project Roadmap & Technical Standards

## 1. Core Architectural Standards

### 1.1 Device Naming & File Conventions
* **Rule:** All device profiles and profile files strictly follow `<vendor>-<model>.ts`.
  * `packages/core/src/device/profiles/mark-p15.ts` (`mark-p15`, alias `p15`)
  * `packages/core/src/device/profiles/mark-p12.ts` (`mark-p12`, alias `p12`)
  * `packages/core/src/device/profiles/mark-m60.ts` (`mark-m60`, alias `m60`)
  * `packages/core/src/device/profiles/pho-p12.ts` (`pho-p12`)
  * Future vendors: `niim-*` (Niimbot), `dymo-*` (Dymo), etc.
* **UI Representation:** Human-readable vendor and model as primary label ("Phomemo P12", "Marklife P15"), with raw technical BLE peripheral name shown as a secondary muted badge.

### 1.2 Reference Repositories
* Reference code and third-party tools are placed strictly in `.reference/` in the project root (ignored by git):
  * `.reference/phomymo` — Web Bluetooth designer (transcriptionstream)
  * `.reference/phomemo-tools` — CUPS driver for Linux (vivier)
  * `.reference/thermal-print` — Clean Web Bluetooth ESC/POS engine (yaddran)
  * `.reference/soburi-phomemo-p12` — Reverse-engineered Python P12 protocol (soburi)

---

## 2. Completed Milestones

- [x] **Milestone 1: Architectural Renaming & Device Standard**
  - Renamed all legacy profiles to `<vendor>-<model>.ts`.
  - Registered profile aliases for backwards compatibility.
  - Added `unmetered: true` flow control for continuous tape printers.

- [x] **Milestone 2: Phomemo P12 Protocol & Windows BLE Stabilization**
  - Reverse-engineered 6-packet initialization sequence (`1F 11 38...`).
  - Implemented `pho-p12` protocol (`expectsAck: false`, rotated ESC/POS raster).
  - Web Bluetooth Windows pairing fix: 3s settling delay (`waitForDeviceReady`) + 6-attempt retry backoff.
  - Handled Windows WinRT `Connection already in progress` by making RX notifications optional for unmetered devices.
  - Disabled telemetry queries that cause AAA battery P12 firmware crashes.
  - **Verified real hardware physical printing on desk!**

---

## 3. Active Milestone: Connection Lifecycle & Reconnect UX

- [ ] **Silent Auto-Reconnect on Print:**
  - If P12 drops GATT connection due to idle battery-saving timeout:
  - Keep UI status as `Ready (Standby)` without alarming the user.
  - When user hits Print (`Ctrl+P` / button), silently re-establish GATT session in background and send print job.
  - Only show error/disconnected if physical reconnect fails (powered off / out of range).
- [ ] **Battery Telemetry Policy:**
  - `pho-p12` (AAA battery base model): hide battery indicator completely (no ADC telemetry on device).
  - `pho-p12pro` (Li-ion rechargeable): allow battery telemetry.
- [ ] **1-Click Reconnect:**
  - Clicking the printer chip in Top Chrome directly reconnects to the cached peripheral without reopening the browser picker dialog.

---

## 4. Milestone: Continuous Tape Canvas & Cutter Margins ("Вуха")

- [ ] **Cutter Margins ("Вуха") Visual Representation:**
  - Continuous tape with `cutterMargins` (e.g. 9 mm lead / 9 mm trail on P12).
  - **WYSIWYG rule:** Do NOT draw hatching or tinting *inside* the white printable canvas.
  - Render the "ears" **outside the canvas** (in workspace space above/below edges with diagonal accent hatching and cut tick marks, as sketched).
  - Canvas elements must strictly clip at printable boundaries so user sees exact cutoffs.
- [ ] **Roll Direction Control:**
  - When continuous tape mode is active (`paperType: "continuous"`), hide the `Roll direction` toggle (meaningless for tape).
- [ ] **Phantom Labels:**
  - Hide phantom repeat preview labels in continuous tape mode (no gap repeats on continuous tape).
- [ ] **Label Length Modes for Continuous Tape:**
  - **1. Preset Sizes:** Quick choices (`12x12`, `22x12`, `30x12`, `40x12`, `50x12`, `60x12`, `80x12` mm).
  - **2. Custom Length:** Popover with 1 mm step scroll/arrows (minimum length 12 mm).
  - **3. Auto-fit to Content (Auto-grow Canvas):** Canvas width automatically expands as text/elements grow, maintaining 9 mm lead and trail cutter margins.

---

## 5. Milestone: Print Settings & Tape Width Architecture Overhaul

- [ ] **Tape Width Primary Filter:**
  - In Settings / Size Picker, group presets by tape width (e.g., 12 mm, 14 mm, 15 mm).
  - For single-width printers (P12 = 12 mm only), lock/hide width selector.
  - For multi-width printers (P15, M02, A30), select tape width first, then length preset.
- [ ] **Printer Constraint Overrides:**
  - When disconnected: show all general sizes.
  - When connected: default to printer's supported widths/lengths.
  - Allow manual override with warning if user designs for another printer.
- [ ] **Print Density & Thermal Transfer Optimization:**
  - Investigate density control on P12 / thermal transfer ribbons.
  - Note: AAA battery voltage affects thermal transfer darkness.

---

## 6. Future Milestones

- [ ] **Template Fields & Batch Printing (Variable Data):**
  - Keep dedicated visual Date element with relative math (`+ 14 days`).
  - Add optional CSV import & batch printing for serialization (`{{SKU}}`, `{{Price}}`).
- [ ] **Hardware Expansion:**
  - Niimbot support (`niim-d11`, `niim-b21`).
  - Additional Phomemo models (`pho-m02`, `pho-d30`, `pho-m110`).
