# Changelog

All notable changes and improvements in this fork of **Thermoprint**.

---

## [Unreleased]

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
