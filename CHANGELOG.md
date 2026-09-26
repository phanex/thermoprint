# Changelog

All notable changes and improvements in this fork of **Thermoprint**.

---

## [Unreleased]

### 🎨 UI & Theme Alignment
- **Step 5: Dynamic Tape Mode (`isDynamic`) & Content-Fitting Canvas**:
  - **Zero-Padding Pure Content Fit (`fitDynamicLabel`)**:
    - The printable canvas width is strictly the content span: `contentWidth = Math.max(10, Math.round(maxX - minX))`.
    - Content is normalized to zero: `shiftX = -Math.round(minX)`, setting the leftmost object to `x = 0` ("весь вміст ставимо на нуль").
    - Canvas width is strictly `contentWidth` without injecting printer cutter margins into the label size (`widthPx = contentWidth`, `widthMm = Math.round(pxToMm(widthPx))`).
  - **Outside Cutter Margin Positioning ("Вуха ззовні холста")**:
    - In dynamic mode, cutter margins ("вуха") are rendered strictly **outside** the printable canvas: lead ear spans from `originX - leadPx` to `originX`, trail ear spans from `originX + displayW` to `originX + displayW + trailPx`.
    - Stretching an element to the left or right pulls it outside the canvas onto the ears. Releasing snaps the canvas around the element, keeping ears flush on the exterior.
  - **Mathematical Camera Stabilization (Zero Jitter / No Canvas Jumps)**:
    - Implemented camera pan compensation in Zustand:
      `deltaPanX = ((newWidthPx - oldWidthPx) * zoom) / 2 + Math.round(minX) * zoom`.
    - Guaranteed invariant `originX_new = originX_old + minX * zoom`: elements remain 100% stationary on screen at the exact drop/typed position (zero jumping when dragging left or right).
  - **Transformer Alignment**: Added element coordinates and dimensions into `ElementWrapper` dependencies across `RectElement`, `TextElement`, `LineElement`, `ImageElement`, `BarcodeElement`, and `QrElement`, ensuring selection handles and bounding boxes re-anchor instantly upon drop/transform.
  - **Dynamic Ribbon Selector & Quick-Toggle Button `[ ▤ ]`**:
    - Activated the canvas pill `[ ▤ ]` button with design token styling (`bg-accent/15 border-accent/40 text-accent` when active; `bg-ink-850/95 border-white/8 text-ink-300` when inactive).
    - Activated the `Dynamic` option in the canvas label size dropdown, completely removing the disabled state and "Soon" tag.
    - Updated the label size button to render `Dynamic · {len} mm` when active, providing instant visual feedback on current cut length.
  - **Responsive Inline Text Auto-Width**: Bound `refreshLayout` in `TextElement` to unwrapped text metrics via Konva `measureSize(displayText)`. Typing words smoothly expands element width and tape length in real-time, while manual width adjustments via Transformer side handles set `autoWidth: false` to preserve deliberate multi-line wrapping.
  - **Print Settings Flyout & Status Bar Synchronization**: Added a 2-column `[ Dynamic ] [ Custom... ]` control in `PrintSettingsFlyout` under continuous paper, updated media details in `PrintButton` (`continuous (dynamic)`), and added `CONT (DYN)` document tag in `StatusBar`.

### 🔌 Hardware & Protocol Discoveries
- **Strict Paper Type & Hardware Compatibility Verification**: Added `isTapeWidthSupported(modelId, tapeWidthMm, paperType)` to `packages/web/src/label/label-sizes.ts`. Validates `profile.labelConfig.supportedPaperTypes.includes(paperType)` and tape definition before declaring hardware readiness. Prevents false positive green indicators (e.g. showing 12 mm tape as green on Phomemo P12 when in "Gap" mode, since P12 hardware only supports continuous paper).
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
- **Accurate Cutter Margins ("Вуха") Layout as Sketched (Step 4.1)**: Rendered physical tape cutter margins (`leadMm` and `trailMm`) as 4 distinct guide ear blocks **above and below** the printable canvas with a 6px vertical offset (`originY - 28 - 6` and `originY + displayH + 6`), matching the user's architectural sketch (`media_1790326666405.png`) and `ROADMAP.md`. Features doubled vertical height (`earH = 28px`) for spacious visual breathing room, theme accent diagonal hatching (`repeating-linear-gradient` with `var(--color-accent)`), dashed outer cut edge lines, inner margin boundaries, and minimalist 11px `Scissors` icons. Preserves 100% clean white printable canvas with `pointerEvents: "none"` so ears never block canvas pan, zoom, or marquee selection.
- **Refined Label Corner Radius**: Reduced base canvas `cornerRadius` in `LabelPaper` from `4` to `2` (0.25 mm in dot space). At high zoom factors (e.g. ~3.5× on small continuous sizes like 27 × 12 mm), this replaces exaggerated 14px "soap-bar" curves with crisp, modern ~6–7px soft corners.
- **Zero Tooltip Slop**: Completely eliminated all tooltips (`title` attributes) on cutter margin zones, keeping the canvas entirely free of verbose or redundant text.
- **Continuous Orientation Measured "With Ears"**: Removed artificial `Math.max/Math.min` dimension-swapping across `label-sizes.ts`, `print-settings-flyout.tsx`, and `canvas.tsx` for continuous paper. When evaluating tape orientation, the physical strip is measured "with ears" (`cutLength + leadMm + trailMm >= tapeWidthMm`), ensuring short continuous labels (e.g. 10 mm length on 12 mm tape, physically 28 × 12 mm) remain strictly horizontal along the feed axis without accidental 90° flips.
- **Clean Canvas Viewport Fit**: Restored `fitToScreen` to calculate canvas framing strictly from `label.widthPx` and `label.heightPx` without artificial side padding.
- **Custom Length & Continuous Option Isolation**: Scoped `Dynamic` and `Custom...` length controls in the canvas dropdown strictly to `paperType === "continuous"`, matching the print settings flyout. Added the reserved 6px spacer to `Custom...` so it aligns precisely with label dimensions.
- **Sizes Grid Column Alignment**: Replaced conditional rendering of green dots in `PrintSettingsFlyout` size grid with reserved invisible 6px spacers (`invisible`), keeping text horizontally centered and aligned across all buttons.
- **Chromium Button Focus Ring Elimination**: Added global reset in `index.css` (`button:focus, button:focus-visible { outline: none }`) and explicit `outline-none` on custom controls. Fixes jarring white border ring that Chromium drew around the focused `Custom` button whenever `Shift` was pressed.
- **Windows Chromium Shift+Wheel Delta Normalization**: Resolved critical issue across all wheel handlers (`handleUiScaleWheel`, `handleThresholdWheel`, `handleCustomLengthWheel`, `fields.tsx`, and `canvas.tsx`) where Windows Chromium maps mouse wheel movement to `deltaX` (horizontal scroll) when `Shift` is held, leaving `deltaY === 0`. The previous `deltaY < 0 ? step : -step` logic failed (`0 < 0` is false), causing every wheel tick to decrement values. Handlers now evaluate `rawDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX`, ensuring smooth bidirectional acceleration (e.g. ±5 mm for custom length, ±10 for threshold, ±0.1 for UI scale) with Shift.
- **Expanded Custom Length Wheel Hit Target**: Allowed wheel adjustments directly on the `Custom` button, the popover container, and the numeric input box, with automatic input focus on open.
- **Dropdown Text Column Alignment via Reserved Spacers**: Fixed ragged and misaligned text across tape width and label size dropdowns by rendering a fixed 6px spacer (`<span className="w-1.5 h-1.5 rounded-full shrink-0 invisible" />`) for unsupported or non-indicator items. Ensures all items share an identical vertical gutter regardless of whether an active hardware green dot is present.
- **UI De-Cluttering & Dropdown Checkmark Removal**: Removed redundant checkmark `✓` icons on selected items across canvas and flyout dropdowns (active items are already highlighted via `bg-accent/10 text-accent`).
- **Clean Paper Type Naming**: Streamlined paper type selector button label from `"Gap (die-cut)"` to `"Gap"`.
- **Integrated Non-Modal Connection Flow**: Removed intrusive `<ConnectFlow />` modal popup; connection state, device discovery, and live telemetry log now render directly within the top-left `<PrinterChip />` and flyout.
- **Theme Palette Conformance**: Reverted unrequested `hover:text-red-400` colors on disconnect `[×]`, Forget, Disconnect, and Clear Log buttons back to standard design system tokens (`text-ink-400 hover:text-ink-100`, `text-ink-300 hover:text-ink-100`).
- **1-Click Quick Disconnect**: Added direct `[×]` disconnect button on the top-left chip bar during Connected and Standby states.
- **Clean Connection Log**: Suppressed download/copy action buttons in the flyout log during automatic connection to avoid distracting the user.
- **Canvas-Local Stacking for Label Selector (Step 3)**: Replaced global portal `createPortal(..., document.body)` with canvas-contained `absolute` positioning at `z-10`. Fixes z-order bug where label size pills floated over open flyouts and modals (Print Settings, Library, Layers); all dialogs now cleanly overlay the canvas.
- **Paper Type & Label Size Decoupling**: Decoupled document canvas size and paper type selection from the connected printer. Users can freely design and save templates for other printers (e.g., 50×30 mm gap for Marklife) even while Phomemo P12 is connected.
- **Tape Width Filter Dropdown**: Added `[ All widths ▾ ]` selector in the `Label size` header of `PrintSettingsFlyout`, dynamically filtering the sizes grid by physical tape width (12, 14, 15, 20, 30, 40, 50 mm).
- **Custom Length for Continuous Paper**: Added `Custom...` / `Custom: {len} mm` button in the print settings grid for continuous tape, featuring direct numeric input, ±5 mm steppers, and mouse wheel adjustments (10–300 mm).
- **2-Column Layout for Print Settings**: Overhauled `PrintSettingsFlyout` into a balanced 2-column desktop layout (Left: Interface scale, theme, density, dither; Right: Paper type, tape width filter, label sizes grid). Reduces flyout height by 50% to prevent viewport overflow at 120%–140% interface scale.
- **Unified Section Header Typography**: Standardized all section headers (`INTERFACE SIZE`, `THEME`, `PAPER TYPE`, `LABEL SIZE`, `DENSITY`, `DITHER`) to `text-ui-2xs font-mono uppercase tracking-wider text-ink-400`.
- **Centric Pulsing LED Aura**: Restructured `<PrinterChip />` status indicator to strictly concentric 8×8px geometry (`relative flex h-2 w-2` with `animate-ping absolute inline-flex h-full w-full rounded-full` and inner `h-2 w-2 rounded-full`). Eliminates off-center pulse drift and elliptical shape distortion across display densities.
- **Natural Compact Size Grid Packing (`content-start`)**: Replaced artificial `flex-1 min-h-[220px]` in `PrintSettingsFlyout` size grid with `content-start max-h-[260px]`. Eliminates CSS Grid's default `align-content: stretch` row expansion ("розрядка"), ensuring buttons pack tightly from the top with consistent 6px (`gap-1.5`) row spacing.
- **Green Dot Hardware Readiness Indicators**: Extended green dots (`bg-emerald-400`) to natively supported tape widths and label sizes across all selectors: `PrintSettingsFlyout` tape filter dropdown, canvas tape width dropdown, and canvas label sizes dropdown.
- **Harmonious Flyout Bottom Offset (`md:bottom-[130px]`)**: Aligned all dock flyouts (`PrintSettingsFlyout`, `IconsFlyout`, `LibraryFlyout`, `LayersFlyout`, `ShapesFlyout`) to an exact 8px floating offset (`bottom-[130px]`) above the 90px dock, perfectly mirroring the 8px offset between the status bar (`h-6` / 24px) and the dock (`bottom: 32px`).
- **Flyout Footer 2-Column Alignment & Clear Status**: Restored printer status to the left (`Printer: {name}`) under the General/Dither column, and active label dimensions (`20 × 10 mm · Gap`) to the right under the Label Sizes column. Replaced vague icon status with explicit text: `· Not supported by printer` without any icon.
- **Pixel-Perfect Canvas Lucide `PrinterX` & Integer Snapping**: Replaced hand-drawn blurred SVG with official `PrinterX` from `lucide-react` (`size={18}`, `strokeWidth={1.75}`). Snapped canvas pill positioning to whole pixels (`Math.round(...)`) to eliminate subpixel anti-aliasing blur. Simplified tooltip to crisp `Not supported by %printer%` / `Not supported by current printer`.
- **Mouse Wheel & Shift Acceleration for Sliders**: Added wheel control to both Interface size and Dithering Threshold sliders in `PrintSettingsFlyout`. Standard scroll adjusts threshold by 1 (or scale by 0.05); holding Shift accelerates step to 10 (or scale by 0.1).
- **Restored Dithering Threshold Slider**: Removed accidental conditional rendering wrapper from `PrintSettingsFlyout`, ensuring the Threshold cutoff slider (0–255) is unconditionally visible across all dithering modes.
- **Pulsing Connection Status Dot Restored**: Restored the 8px green pulsing LED indicator with soft `animate-ping` aura in `<PrinterChip />` for active Bluetooth connections.
- **Green Dot Indicator for Supported Sizes**: Flipped grid size dots to green (`emerald-400`) on native supported formats for the connected printer, leaving unsupported formats plain to prevent user confusion.
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
