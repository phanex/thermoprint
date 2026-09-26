# Changelog

All notable changes and improvements in this fork of **Thermoprint**.

---

## [Unreleased]

### 🔌 Hardware & Protocol Discoveries
- **Live Hardware Verification of Keep-Alive Heartbeat (Phomemo P12 & Marklife P15)**: 
  - **Phomemo P12**: Verified over 4.5+ minutes of continuous idle connection. 6 consecutive keep-alive battery query cycles (`1F 11 08` -> `01 01` -> `1a 04 64` @36-42ms latency) executed every 40-45s with unmetered flow control (`credits=Infinity`). Successfully prevented firmware auto-sleep through both the critical 3-minute sleep threshold and 4-minute mark with 100% link stability and persistent `CONNECTED Phomemo P12 100%` UI state.
  - **Marklife P15**: Verified over 6+ minutes of continuous idle connection. 9 consecutive keep-alive battery query cycles (`10 FF 50 F1` -> `00 54` / `00 55`) executed every 45s, maintaining the connection through the 3-minute firmware sleep threshold with 100% link uptime, dynamic UI battery synchronization (84% ↔ 85%), and zero flow-control credit loss (4/4 credits).
- **Automated Keep-Alive / Sleep Prevention**: Added `startKeepAlive(intervalMs = 45000)` and `stopKeepAlive()` to `Printer` (`packages/core/src/printer.ts`). Periodically issues `getBattery()` query every 45s to reset the firmware inactivity sleep timer on Phomemo P12 (which auto-powers off after 3 minutes of idle BLE) and Marklife devices. Keep-alive queries are strictly guarded with `if (!this.isConnected || this._printing || this.disconnecting) return;` so they never interleave with active bitmap raster printing.
- **Live Battery Event Dispatch**: Updated `Printer` to emit typed `battery: { battery: number }` event upon receiving any parsed or queried battery telemetry. Wired listener `printer.on("battery")` in `use-web-bluetooth.ts` to seamlessly synchronize both `usePrinterStore` and `useEditorV2Store` battery state without UI polling.
- **Phomemo P12 Model Packet `02 b6 00`**: Discovered that on connection initialization, the printer sends packet `02 b6 00`. Byte `0xb6` (decimal 182) is the hardware model ID for Phomemo P12. Added parser support for `0x02` model packets in `PhoP12Protocol.parseResponse`, resolving `{ type: "model", value: 0xb6 }`.
- **Phomemo P12 Battery Telemetry (`1a 04 64`)**: The printer transmits battery level in telemetry packet `1a 04 <val>`. Byte `0x64` (decimal 100) reflects 100% on fresh batteries. Fixed bug where the unhandled `02 b6 00` model packet was erroneously misrouted into the pending battery query waiter causing false "182%" readings.
- **Marklife P15 Query Telemetry Stream**: Verified Marklife P15 returns query responses as raw unadorned byte streams (`00 53` for battery = 83%, `50 31 35` for model = "P15", `56 31 2e 30 2e 32 33` for firmware = "V1.0.23", `31 35 32 36...` for serial number). Routing delivers raw bytes to awaiting query handlers.
- **Marklife `_BLE` Advertisement Suffix**: Identified that Marklife BLE advertisements strictly append `_BLE` to broadcast names (e.g., `P15_3549_BLE`, `P12_3549_BLE`), whereas Phomemo devices do not. Utilized as a definitive hardware signature discriminator in profile RegExp patterns.

### 🏗️ Architecture & Protocols Refactoring
- **Vendor-Prefixed Protocol Standards**: Renamed directories `packages/core/src/protocol/l11/` -> `mark-l11/` and `packages/core/src/protocol/x2/` -> `mark-x2/`. Renamed classes to `MarkL11Protocol` and `MarkX2Protocol` (with aliases `L11Protocol`, `X2Protocol` for backwards compatibility).
- **Declarative `DeviceIdentification` Architecture**: Replaced string prefix length heuristics in `registry.ts` with declarative `identification: { namePattern: RegExp, hasCx?: boolean, hardwareId?: number }`. Profiles declare RegExp rules (e.g. Phomemo negative lookahead `^(?!.*_ble$)...`) preventing model collisions.
- **Documentation Reorganization**: Moved `REVERSE_ENGINEERING.md` from repository root to `docs/reverse-engineering.md`.
- **Repository Hygiene & 1.7GB Debris Cleanup**: Completely purged legacy `.bun` cache, stale `.old_modules-...` backup, and nested subpackage `node_modules`. Fresh `npm install` reduced footprint from ~2 GB down to 262 MB.
- **Node Test Runner Migration**: Migrated `packages/core/test/protocol/mark-l11.test.ts` from `bun:test` to standard `node:test` and `node:assert/strict`, ensuring unified test suite execution via Node.js (39/39 passing).

### 🎨 UI & Theme Alignment
- **Integrated Non-Modal Connection Flow**: Removed intrusive `<ConnectFlow />` modal popup; connection state, device discovery, and live telemetry log now render directly within the top-left `<PrinterChip />` and flyout.
- **Theme Palette Conformance**: Reverted unrequested `hover:text-red-400` colors on disconnect `[×]`, Forget, Disconnect, and Clear Log buttons back to standard design system tokens (`text-ink-400 hover:text-ink-100`, `text-ink-300 hover:text-ink-100`).
- **1-Click Quick Disconnect**: Added direct `[×]` disconnect button on the top-left chip bar during Connected and Standby states.
- **Clean Connection Log**: Suppressed download/copy action buttons in the flyout log during automatic connection to avoid distracting the user.
- **Canvas-Local Stacking for Label Selector (Step 3)**: Replaced global portal `createPortal(..., document.body)` with canvas-contained `absolute` positioning at `z-10`. Fixes z-order bug where label size pills floated over open flyouts and modals (Print Settings, Library, Layers); all dialogs now cleanly overlay the canvas.
- **Production Build Cleanliness & TypeScript Zero-Errors**: Resolved all type discrepancies across `@thermoprint/web` (`print-settings-flyout.tsx`, `canvas.tsx`, `text-element.tsx`, `web-bluetooth.ts`), removed legacy fallback sizes, and verified complete clean production build (`tsc -b && vite build`).
- **Inline Textarea Font Scaling Fix**: Bound `scaledFontSize` to `textarea.style.fontSize` during canvas inline text editing to eliminate font jumping on double-click.

### 🖼️ Iconify Icons Integration
- **Icon Search & Collections Flyout**: Added dock tool to browse, search, and insert icons from over 150 design systems (Lucide, Tabler, Material Design, Phosphor, etc.).
- **Batch API & Cloudflare Rate-Limit Protection**: Switched icon loading from on-the-fly dynamic `.svg` URLs to batch JSON endpoints (`/{prefix}.json?icons=...`), reducing network requests from 64+ down to 3–5 cached requests per query.
- **Concurrency Queue & Lazy Loading**: Throttled parallel API requests to max 3 concurrent connections and implemented `IntersectionObserver` lazy loading to prevent 429 rate limits in the "All Collections" view.
- **Inline SVG Component (`<IconifyIcon />`)**: Native `<svg>` rendering with in-memory caching and `currentColor` theme inheritance.
- **Client-Side SVG Data URL Generation**: Instantly generates rasterizable SVG Data URLs locally without additional network roundtrips when inserting or recoloring icons.

### 🔤 Typography & Text Rendering
- **Expanded Cyrillic Font Collection**: Bundled and registered popular Google Web Fonts with full Cyrillic script support:
  - Sans-serif: *Inter, Roboto, Roboto Condensed, Montserrat, Oswald, Rubik, Unbounded, Yanone Kaffeesatz, Cuprum, Days One*.
  - Serif: *Roboto Slab, Merriweather, Georgia*.
  - Monospace: *JetBrains Mono (Variable)*.
  - Handwritten / Display: *Caveat, Pacifico, Lobster, Neucha*.
- **Proper Weight & Italic Variants**: Configured 400/700 normal and italic fontsource imports so font family, weight, and italic toggles render faithfully in Konva canvas and exported print bitmaps.
- **Konva Text Bounding Box Fix**: Resolved text clipping/overflow issues where certain font metrics slightly exceeded the calculated bounding box by relaxing clipping boundaries.
- **Font Cleanup**: Removed redundant Fira Code in favor of JetBrains Mono Variable with complete italic and Cyrillic support.
- **TT All Caps Toggle**: Added one-click uppercase text transformation toggle to the inspector.

### 🏷️ Barcode & QR Enhancements
- **Authentic OCR-B Font**: Bundled genuine monospaced OCR-B font matching ISO 1073-2 / GS1 barcode human-readable interpretation standards.
- **GS1 Proportional Geometry**: Optimized standard aspect ratios, bar module widths, and quiet zones for EAN-13, EAN-8, UPC-A, Code 128, etc.
- **Dynamic Bar Width Calculation**: Fixed horizontal text distortion in JsBarcode by calculating dynamic module widths proportional to element dimensions.
- **Human-Readable Inspector Hints**: Added concise format reminders below the Data input (e.g., `12 digits (+1 auto)`, `7 digits (+1 auto)`, `numeric only`).
- **Input Truncation Safeguard**: Automatically clips excess pasted characters to prevent corrupting barcode checksums and data integrity.

### 🎨 Multi-Selection & Alignment
- **Group Multi-Selection**: Enabled multi-element selection via drag-box (marquee) and Shift+Click.
- **Alignment & Distribution Tools**: Added comprehensive alignment controls in inspector (align left, horizontal center, right, top, vertical center, bottom; distribute horizontally and vertically).
- **Group Dragging**: Multiple selected elements can be dragged together while maintaining their relative layout and snap-to-grid accuracy.
- **Focus Icon for Dual-Center**: Replaced the text "CTR" label with a clean Lucide Focus icon for simultaneous horizontal & vertical centering.

### 📅 Date & Time Tool
- **Dedicated Dock Tool**: Added Date/Time tool positioned alongside Text in the dock.
- **Locale-Aware Presets**: Quick format presets for standard date, time, and timestamp patterns with live clock refresh.
- **Informative Tooltip**: Comprehensive format guide (`YYYY`, `YY`, `MM`, `DD`, `HH:mm`, etc.).

### 📏 Sizing & Transform
- **Fit to Label / Maximize Tool**: Added one-click tool to maximize selected elements to label boundaries respecting margins and aspect ratios.
- **Proportional QR & Barcode Resizing**: Smarter default scaling when adding barcodes and QR codes relative to current label dimensions.
