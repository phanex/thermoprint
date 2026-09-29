# Changelog

All notable changes and improvements in this fork of **Thermoprint**.

---

## [Unreleased]

### 🏗️ Architecture & Refactoring
- **1-Based Ordinal Range Parser & Validator (`packages/web/src/lib/range-parser.ts`)**:
  - Implemented `parsePrintRanges` supporting Windows/standard print syntax (`1-50`, `2, 10-15, 99`, `14`), clamped to total items or counter bounds, deduplicated, returning empty array on malformed input (`abc`, `5-2`).
  - Implemented clean `formatMediaDescription` adhering to user specification: dynamic continuous (`${tapeWidth} mm · dynamic`), fixed continuous with cutter margins (`${width} (+${lead+trail}) × ${height} mm` / portrait aware), and fixed gap (`${width} × ${height} mm`).
- **Two-Tier Print Confirmation Workflow**:
  - Direct execution: single-label jobs (`totalLabels === 1`) fire immediately with 0 delay and zero dialogs.
  - Batch confirmation: multi-label jobs (`totalLabels > 1`) invoke `ConfirmPrintModal` with Enter/Escape keybindings.
- **Unified CSV Loader & Validator Pipeline (`packages/web/src/lib/csv-loader.ts`)**:
  - Implemented single standardized CSV/TSV loading procedure across the entire application (Status Bar, Fields Dropdown, Print Flyout, and global drag-and-drop).
  - Validates file integrity, parses rows and headers, verifies against existing template placeholders `{{Field}}` on the canvas, and reports missing columns.
- **Countdown Copy Limit Calculation (`getMaxCountdownCopies` in `@thermoprint/core`)**:
  - Added mathematical copy limit computation for decrement counters (`+-step`). Automatically calculates exact maximum safe prints before underflow halting (`< 0`), e.g. `0100+-2` -> 51 labels (`Math.floor(start / step) + 1`).
- **Complete Elimination of `BatchPrintModal`**:
  - Deleted standalone 520px modal dialog (`batch-print-modal.tsx`) and unified all static, pure counter, and CSV batch print operations natively into the top-right `PrintButton` flyout.

- **Confirmation Sanity Check Modal (`ConfirmPrintModal`)**:
  - Portaled dialog to `document.body` via `createPortal`, preventing `TopChrome`'s `backdrop-blur-sm` from creating an ancestor containing block that clipped the modal off the top edge of the browser viewport.
  - Implemented `max-h-[85vh]` with fixed header and footer (`shrink-0`) and vertically scrollable content (`flex-1 overflow-y-auto`).
  - Standard scannable OS-style prompt: `Print: N copies / Are you sure?` (static) or `Print: N labels (items × copies) / Are you sure?` (batch), without conversational filler.
  - Dynamic Sanity Table: orientation arranged with fields/counters as columns and sequential labels 1..N as rows, guaranteeing that values align vertically without horizontal scrolling. Unified header and data cell colors across counters and CSV fields (`text-ink-300` / `text-ink-200`), eliminating arbitrary accent cyan styling.
  - Standard action buttons: Cancel and `Print N labels` with `<Printer />` icon and Enter-key default focus.
- **WYSIWYG Quick-Print & Split Print Button**:
  - Restored split button in top chrome:
    - **Primary button (`Print ⌘P`)**: prints exactly 1 copy of the currently previewed label on the canvas (instant, zero delay, no modal), fulfilling true WYSIWYG expectations whether viewing static labels, CSV rows, or sequential counter steps.
    - **Dropdown chevron**: opens the batch flyout with range configuration, copies, printer and media info, and batch print action.
  - Contextual range defaulting: when browsing counter steps (e.g. at step 50), the range input placeholder and empty default automatically target the current step (`50`).
  - Theme-compliant warning styling: invalid range inputs highlight in amber (`border-amber-400/60 text-amber-200 focus:border-amber-400`), matching the document unsaved indicator instead of arbitrary red or disabled styling.
- **Status Bar Live Counter Paging & CSV Refinements**:
  - Added live counter stepping widget in the bottom status bar (`# < 1/N >` for countdowns or `# < 1 >` for increment counters) when CSV is not loaded. Clicking `<` and `>` updates canvas elements and recalculates dynamic continuous tape length live.
  - When CSV is loaded, displays cyan `📄 < 8/100 >` with micro-flyout.
  - Dynamically elevated `status-bar` to `z-40` when `csvMenuOpen` is active, preventing the Dock toolbar (`z-30`) from rendering above and clipping the CSV options menu.
  - Purged redundant "rows loaded" message from tooltip; tooltip strictly shows filename (`title={csvFileName || "CSV"}`).
  - Simplified action labels to "Open CSV..." and "Remove CSV" (removed clumsy "from document" wording and rose hover accent).
- **Unified `PrintButton` Flyout**:
  - **Purged `Est. time`**: Removed Martian weather calculation from all flyout views.
  - **Pure Counters (`{{#:...}}` without CSV)**: Uses the standard "Copies" stepper without redundant forms. Automatically clamps stepper `max` and quick-pick presets to countdown limit when `+-` step is active. Displays subtle sequence preview (`Start → End`).
  - **CSV-backed Jobs**: Missing CSV state prompts with "Select CSV file..."; loaded CSV state provides row range picker (`All` vs `From [ ] to [ ]`) and `Copies per row` stepper (removed irrelevant `5, 10, 25, 50` quick-pick presets).
- **Dynamic Template Engine (`@thermoprint/core`)**:
  - Implemented zero-dependency template engine supporting sequential counters `{{#:start+step}}` (with decimal arithmetic, zero-padding `0001`, overflow expansion, negative step countdown `{{#:100+-1}}` with stop-print underflow guard `< 0`, multi-plus fallback taking the first step `{{#:0000+5+7}}` -> `+5`, and prefix/suffix preservation e.g. `SN-0001`, `00#01`).
  - Added CSV row substitution `{{ColumnName}}` supporting RFC 4180 quoting and arbitrary column names.
  - 100/100 comprehensive unit tests passing across all counter and CSV expressions.
- **Auto-Detecting CSV/TSV Parser (`@thermoprint/core`)**:
  - Built lightweight parser with automatic delimiter sniffing (`,`, `;`, `\t`), UTF-8 BOM stripping, escaped quote handling, multiline cells, and CRLF normalization.
- **Dynamic Tape Batch Measurement (`fitBatchElements` in `dynamic-label.ts`)**:
  - Added canvas-based font measurement (`measureTextMetrics`) and dynamic re-fitting for batch printing. On continuous paper rolls, each label dynamically recalculates its length and cutter margins based on the evaluated text of the current row/counter ("Сало" vs "Рододендрон").

### 🎨 UI & Theme Alignment
- **Inspector Dropdowns (`Date` & `Fields`)**:
  - Simplified section-header action buttons to clean `Date` and `Fields` without bracket markers (`[[ ]]` and `{{ }}`), removing visual clutter.
  - Added dedicated top-right `(?)` (`HelpCircle`) button inside each dropdown header to replace the view in-place with the syntax guide, without «Back» or «✕» buttons.
  - Grouped all field tools directly under the `Fields` header: custom field name input at the top (`Field name...` + `+`/Enter), followed by loaded CSV columns, and a persistent `Import / Change CSV...` button at the bottom.
  - Overhauled counter & fields syntax guide: replaced confusing ad-hoc examples with the positional stencil (mask) philosophy, intuitive `{{Назва поля}}`, and direct in-palette link to `docs/TEMPLATES.md`.
  - Added comprehensive `docs/TEMPLATES.md` specification covering the stencil model, integer-only counter slots, padding, multi-level separators, overflow expansion, step directions, and CSV column binding.
  - Purged redundant right-hand labels ("Date", "Time", "+7 days", "4-digit (+1)") and CSV sample values from lists, preventing multi-line wrapping and visual noise.
  - Unified item colors (`text-ink-200 hover:text-accent font-mono whitespace-nowrap`) across counters, dates, and CSV fields to ensure consistent, elegant dropdown rendering.
- **Streamlined Status Bar Mode Indicator (`packages/web/src/editor/status-bar.tsx`)**:
  - Eliminated cluttered simultaneous display of `# ‹ 1 ›` and `CSV` when fields and counters coexist.
  - Implemented 3 clean mutually exclusive indicator states:
    1. **CSV Loaded**: Cyan `FileSpreadsheet` icon with `< 1/N >` pagination and click-to-open management menu.
    2. **Fields Unloaded**: Gray `FileSpreadsheet` icon (clickable to open file picker); if counters are also present in the template, preserves live `< 1/N >` counter stepping so the user can preview counter values on the canvas.
    3. **No Fields**: Slate `#` icon with `< 1/N >` counter paging when `{{#:...}}` is present, or static `#` indicator.
- **Status Bar CSV Badge & Live Preview**:
  - Refined into a seamless inline widget: `📄 X/Y < >` without outer box borders or sunken appearance, removed brackets, removed `✕` close button next to navigation controls, and moved full filename to tooltip.
- **Editor Window Drag-and-Drop**:
  - Added window-level drag-and-drop support for `.csv` and `.tsv` files.
- **Dynamic Job Classification (`hasBatchTokens`)**:
  - Decoupled single-label Date evaluation (`[[...]]`) from batch sequences (`{{...}}`). Standard labels with current dates now use the standard Print flow instead of prematurely triggering the batch pipeline.

### 🐛 Bug Fixes
- **Split Button UX & Clean CTA Action Verbs (`print-button.tsx`, `editor.tsx`)**:
  - Main split button (`Print ⌘P`) remains fully active and clickable (`bg-accent`); clicking it (or pressing `⌘P`) when CSV data is missing smoothly opens the batch flyout (`setOpen(true)`), immediately guiding the user to the file picker.
  - The flyout CTA button remains a clean action verb (`Print N labels` / `Print N copies`), simply disabled (`disabled:opacity-40 disabled:cursor-not-allowed`) when prerequisites are not met, avoiding anti-pattern transformation into a verbose status display.
  - The "Select CSV file..." upload box, missing required columns, and invalid ranges highlight with theme-compliant amber tokens (`border-amber-400/50 bg-amber-500/5 text-amber-200`).
  - Low-level `printBatch` and `print` in `editor.tsx` validate required template fields against loaded CSV data and safely abort prior to canvas rendering or GATT packet transmission.
- **Robust Multi-Script CSV Parser & Delimiter Sniffing (`csv-parser.ts`, `csv-loader.ts`)**:
  - Gated all file inputs and window drag-and-drop strictly to `.csv` and `.tsv`.
  - Added line-consistent delimiter detection across sample lines outside quoted blocks, correctly resolving `;` in European files with comma decimals (`1,50`) and `\t` in TSV files with commas in text fields.
  - State machine tolerance: unquoted quotes (e.g. `12" monitor`, `3'5"`) no longer trigger quote-capture state or swallow subsequent delimiters.
  - Preserves significant whitespace inside RFC 4180 quotes while trimming unquoted fields.
  - Collision-proof header deduplication preventing key collisions even when imported files already contain numbered headers (e.g. `Tag`, `Tag (2)`, `Tag` -> `Tag`, `Tag (2)`, `Tag (3)`).
  - Concise UTF-8 encoding verification detecting replacement character `\uFFFD` with minimal error message: `"Wrong encoding, UTF-8 required"`.
- **Counter Canvas Preview Synchronized with CSV Paging**:
  - **Root Cause**: `evaluateTemplate` in `TextElement` (`text-element.tsx`), `BarcodeElement` (`barcode-element.tsx`), and `QrElement` (`qr-element.tsx`) was hardcoded to `index: 0`. While paging through CSV records updated `csvRow`, counters remained frozen at the initial 0th value (e.g. row 30 still rendered `1` instead of `30`).
  - **Resolution**: Passed `csvPreviewRowIndex` into `evaluateTemplate({ index: csvPreviewRowIndex, csvRow: currentCsvRow })` across all canvas elements. Advancing or reversing CSV preview rows now synchronously updates both CSV columns and sequential counter values in real time, triggering text auto-width re-measurement and dynamic tape re-fitting.
- **Zundo Undo History Isolation during Batch Printing**:
  - Batch print iterations now pause temporal undo tracking (`useEditorV2Store.temporal.getState().pause()`) and resume it in the `finally` block, preventing temporary batch element states from corrupting the user's undo/redo history.
- **CI / GitHub Actions Build Fix (`@fontsource-variable` CSS imports & `bun.lock` synchronization)**:
  - **Root Cause**:
    1. In `packages/web/src/main.tsx`, `@fontsource-variable/jetbrains-mono` and `@fontsource-variable/nunito` were imported without the explicit `/index.css` extension (`import "@fontsource-variable/jetbrains-mono"`). Because `@fontsource-variable` packages specify `"main": "index.css"` without an `index.js` or `index.d.ts`, the TypeScript compiler under `"moduleResolution": "bundler"` looked for a JavaScript/TypeScript module declaration and failed with `error TS2307: Cannot find module '@fontsource-variable/jetbrains-mono' or its corresponding type declarations`, causing `tsc -b` to exit with error code 2.
    2. Additionally, several newly added font packages (`@fontsource/anonymous-pro`, `@fontsource/lxgw-wenkai-mono-tc`, `@fontsource-variable/nunito`) were present in `packages/web/package.json` but had not been synced into `bun.lock`, causing Bun installations in clean CI runners to miss their definitions.
  - **Resolution**:
    - Changed imports in `packages/web/src/main.tsx` to explicit CSS entry points: `import "@fontsource-variable/jetbrains-mono/index.css"` and `import "@fontsource-variable/nunito/index.css"`.
    - Regenerated and saved `bun.lock` with `bun install`, ensuring complete lockfile parity across all monorepo dependencies.
    - Added `--frozen-lockfile` to `deploy-web.yml` to make CI installations deterministic and catch lockfile drift early.
    - Verified clean build (`tsc -b && vite build`) via Bun with 0 errors.
- **Pixel-Perfect WYSIWYG Saved Label Previews (`SavedLabel.thumbnail`)**:
  - **Root Cause**: `LabelThumbnail` in `library-flyout.tsx` was manually reconstructing vector elements as an SVG DOM tree without element rotation transforms, missing `preserveAspectRatio="none"` on embedded image/icon data URLs, and risking `NaN` viewBox values when `label.widthPx`/`heightPx` were omitted. Consequently, `<image>` elements without `preserveAspectRatio="none"` aligned SVG icons with intrinsic 512x512 viewports according to default SVG `meet` rules, causing icons to slide down to the bottom border of the thumbnail card.
  - **Resolution**:
    - Added an optional `thumbnail` field to `SavedLabel`. When saving labels (`saveLabel`, `saveLabelAs`), the Konva stage captures a real 100% WYSIWYG PNG thumbnail (`captureThumbnail`), rendering exact typography, icons, and alignments with zero drift and instant library flyout performance.
    - Hardened the fallback SVG `LabelThumbnail`: added fallback to `mmToPx` if pixel dimensions are omitted, added `preserveAspectRatio="none"` and `xlinkHref` to `<image>`, and applied rotation transforms across all elements.
- **Connection Progress Spinner Polish & Deduplication (`Loader2`)**:
  - **Root Cause**: Printer chip displayed blinking `animate-pulse` text and an `animate-ping` dot during Bluetooth scanning and connection. Initial spinner replacement introduced two simultaneous rotating spinners when the status flyout was open (one in header chip, one in flyout banner).
  - **Resolution**: Refined the UX: header chip displays a calm accent dot (`bg-accent`) during connection without visual noise, while the rotating Lucide `Loader2 animate-spin` indicator is prominently featured inside the status flyout banner and the scanning button.
- **Workflow & Git Rule Clarification**:
  - Clarified project rule 4 in `GEMINI.md` and `code-modification` skill: `git push` is prohibited autonomously to avoid premature image rebuilds, but fully permitted when explicitly commanded and authorized by the user.
- **Die-Cut Rounded Corner Radius Restoration (`cornerRadius={10}`)**:
  - **Root Cause**: An earlier adjustment accidentally flattened all label paper corner radii to 2px, ruining the realistic rounded sticker appearance of standard die-cut / gap labels.
  - **Resolution**: Restored `cornerRadius={10}` for gap mode (die-cut thermal sticker labels) in `label-paper.tsx`, while strictly maintaining `cornerRadius={0}` for continuous tape rolls.
- **Decoupled Text Transform Handles & Zero-Drift Inspector Scaling**:
  - **Root Cause**: Text scaling logic intended for the inspector numeric input and mouse wheel was previously placed inside `TextElement`'s `useEffect`. When releasing transformer handles on the canvas (`handleTransformEnd`), the store received an updated `fontSize`, triggering the `useEffect` to recalculate position and re-center vertical coordinates around `v = h/2`, causing the text element to jump vertically by half its height and overriding the transformer's opposite-handle pinning.
  - **Resolution**:
    - Completely reverted `TextElement` (`text-element.tsx`) to its clean, decoupled state where `handleTransform` and `handleTransformEnd` independently control handle transforms and opposite-edge anchoring without lifecycle position mutations.
    - Implemented autonomous anchor-preserving `handleFontSizeChange` directly inside `TextSection` (`text-section.tsx`). When scaling via the `[ S ]` inspector field (typing, arrows, or mouse wheel), the element dynamically calculates its canvas anchor based on text alignment (`center`, `left`, `right`) and rotation, ensuring zero coordinate drift and 100.00% reversible position return without interfering with canvas handles.
- **Cutter Margin Masking for Images and Icons (`Group id="canvas-elements"`)**:
  - **Root Cause**: `ImageElement` (used for both user images and Iconify sticker icons) loads image bitmaps asynchronously via `new window.Image()`. It initially mounts a placeholder `<Group>`, which is later replaced by `<KonvaImage>` upon image load (`img.onload`). In React-Konva reconciliation, replacing a node of a different type destroys the old node and appends the new node to the end of the parent container's children. Because `<CutterEars>` was a direct sibling in `Layer id="label-group"`, the newly mounted `<KonvaImage>` was appended *after* `<CutterEars>`, granting it a higher z-index and causing images and icons to render above the white cutter margin masks rather than being clipped.
  - **Resolution**:
    - Encapsulated all canvas elements inside a dedicated `<Group id="canvas-elements">` in `Layer id="label-group"`, positioned strictly before `<CutterEars />`.
    - Guaranteed that all element nodes, async image swaps, and z-order mutations are strictly confined to `canvas-elements`, making it structurally impossible for any element to render above `<CutterEars />`.
    - Verified that dragging images, icons, QR codes, or barcodes into negative coordinates or past label width is cleanly masked by the white cut margins.
- **Standalone Relative Date Offset Fallback (`[[+7d]]`, `[[+1m]]`)**:
  - `evaluateFormatTemplate` previously required an explicit format token like `DD.MM.YYYY` and would ignore standalone offsets like `[[+7d]]`. Now defaults to standard date format `DD.MM.YYYY` when only an offset is specified.
- **Upstream URLs & Sponsor Cleanup**:
  - Replaced all outdated `tomLadder` GitHub repository and GitHub Pages URLs across `README.md` and `packages/web/README.md` with active fork addresses (`https://phanex.github.io/thermoprint/`).
  - Removed third-party sponsor heart links from top chrome desktop and mobile headers.

### 🏗️ Architecture & Refactoring
- **Step 6: Printer Store Unification & Dual-Store Decoupling**:
  - Established `usePrinterStore` as the single authoritative source of truth for all hardware peripherals, Bluetooth state, connection lifecycle, battery telemetry, and print progress.
  - Purged redundant `printer: { connected, name, battery, model }` and `connectFlow` state from `useEditorV2Store`.
  - Replaced brittle substring model extraction (`peripheral.name?.split(" ")[1]`) in `cutter-ears.tsx` and `label-paper.tsx` with canonical declarative `modelId` from `usePrinterStore`.
  - Updated keyboard shortcut handler (`⌘P`) and print button to read peripheral connection state directly from `usePrinterStore`.
  - Verified protocol density command implementations across Phomemo P12 (`1F 11 02 DD`), Marklife L11 (`1F 70 02 DD` / `10 FF 10 00`), and Marklife X2 (`1F 70 02 [3, 8, 14]`).

### 🎨 UI & Theme Alignment
- **Canvas Label Size Selector Dropdown Polish**:
  - Removed icon from `Dynamic` row in continuous label size dropdown, preserving clean typographical alignment across all items.
  - Standardized selection indication: eliminated accent dot from `Dynamic`, aligning with all preset sizes where active state is exclusively indicated by `text-accent bg-accent/10`.
  - Added active highlight (`text-accent bg-accent/10`) to `Custom...` button when an unlisted custom length is active (`isCustomActive`).
- **Horizontal Dynamic Tape Icon & Clean Tooltips**:
  - Re-oriented `TapeIcon` horizontally (3-segment strip along horizontal feed axis with progressive opacity) matching horizontal continuous tape layout.
  - Purged verbose/redundant tooltip text across canvas controls: simplified label size button to `Label size` and dynamic mode controls to concise `Dynamic length` (removing "active / click to disable" clutter).
- **Step 5: Dynamic Tape Mode (`isDynamic`) & Content-Fitting Canvas**:
  - **Pure Printable Canvas (`[0 .. widthPx]`) & Bounding-Box Fitting**:
    - The printable canvas strictly represents the printable dots from `x = 0` to `x = widthPx`. Point `(0, 0)` is the first printable dot, ensuring 1:1 raster alignment for Bluetooth printing without requiring virtual margin offsets or raster slicing.
    - Minimum dynamic label length is strictly `tapeWidthMm + 1` mm (e.g. 13 mm for 12 mm tape), mathematically guaranteeing `length > height` ($13 > 12$) to prevent orientation flipping in the UI.
    - Width calculation: `contentWidthPx = Math.max(1, maxX - minX)`, `rawContentMm = Math.ceil(pxToMm(contentWidthPx))`, `widthMm = Math.max(tapeWidthMm + 1, rawContentMm)`, `widthPx = mmToPx(widthMm)`.
    - All elements are shifted as a single unified block to snap the leftmost element flush to `x = 0` (`shiftX = 0 - minX`, `el.x = Math.round(el.x + shiftX)`).
  - **Konva-Level Cutter Margins (Ears) & Layered Masking**:
    - Replaced disconnected HTML overlay `<div>` elements with a dedicated Konva `<CutterEars />` component inside `<Layer id="label-group">`.
    - Left ear covers `[-leadPx .. 0]`, right ear covers `[widthPx .. widthPx + trailPx]` with opaque white backing, 45° diagonal hatching, dashed cut lines at `x = 0` and `x = widthPx`, and `listening={false}`.
    - Layer stacking order: `LabelPaper` (bottom) -> `Elements` -> `CutterEars` (masks overflow elements) -> `Selection Transformer` (always on top via `moveToTop()`, ensuring selection handles remain grab-able even when elements slide into cutter margin zones).
  - **Debounced Action-End Fitting**:
    - Removed immediate/synchronous geometry recalculations from Zustand store mutations (`addElement`, `updateElement`, `updateElements`, `updateElementLive`, `removeSelected`, `duplicateSelected`), eliminating infinite re-render loops and font measurement feedback cycles.
    - Added single-pass debounced fitting (`scheduleDynamicFit(600)`): during active dragging (`handleDragMove`), elements can be dragged anywhere (even under ears) without canvas jitter or jumping; 600 ms after user action ends (`handleDragEnd`, `onTransformEnd`, font measurement), canvas cleanly resizes, shifts elements to `x = 0`, and re-centers.
  - **Dynamic Ribbon Selector & Quick-Toggle Button `[ ▤ ]`**:
    - Activated the canvas pill `[ ▤ ]` button with design token styling (`bg-accent/15 border-accent/40 text-accent` when active; `bg-ink-850/95 border-white/8 text-ink-300` when inactive).
    - Activated the `Dynamic` option in the canvas label size dropdown, completely removing the disabled state and "Soon" tag.
    - Updated the label size button to render `Dynamic · {len} mm` when active, providing instant visual feedback on current cut length.
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
