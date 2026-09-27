<h1 align="center">🖨️ thermoprint</h1>

<p align="center">
  <strong>Modern, open-source label designer and printing engine for Phomemo, Marklife, and Bluetooth thermal printers</strong>
</p>

<p align="center">
  Visual WYSIWYG label editor in the browser, powerful CLI for automation and AI agents, and a platform-agnostic TypeScript core.<br/>
  No server or drivers required — everything runs 100% locally via Web Bluetooth (browser) or Noble (Node/Bun).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Phomemo_P12-supported-blue.svg" alt="Phomemo P12">
  <img src="https://img.shields.io/badge/Marklife_P15-supported-009688.svg" alt="Marklife P15">
  <img src="https://img.shields.io/badge/Marklife_P12-supported-009688.svg" alt="Marklife P12">
  <img src="https://img.shields.io/badge/Marklife_X2-supported-orange.svg" alt="Marklife X2">
  <img src="https://img.shields.io/badge/Marklife_M60-supported-orange.svg" alt="Marklife M60">
  <img src="https://img.shields.io/badge/L11_/_X2_/_P12-protocols-lightgrey.svg" alt="Multi-protocol">
</p>

<p align="center">
  <a href="https://tomladder.github.io/thermoprint/">🌐 Web Editor</a> •
  <a href="#features">Features</a> •
  <a href="#supported-printers">Printers</a> •
  <a href="#packages">Packages</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <a href="https://github.com/sponsors/tomLadder"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-ff69b4.svg" alt="Sponsor"></a>
  <img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/bun-%3E%3D1.0-black.svg" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20Browser-lightgrey.svg" alt="Platform">
</p>

---

## Features

### 🌐 Web Editor — [Open Live Editor](https://tomladder.github.io/thermoprint/)

* **Zero-Driver Web Bluetooth**: Direct connection from Chrome or Edge on macOS, Linux, Windows, ChromeOS, and Android.
* **Dynamic Continuous Tape Mode (`isDynamic`)**:
  * **Content-Aware Auto-Length**: Canvas dynamically expands and contracts to snuggly fit your elements.
  * **Cutter Margin Simulation ("Ears")**: Real-world lead and trail cut margins (`[-leadPx .. 0]`, `[widthPx .. widthPx + trailPx]`) visualized with physical hatching and cut lines.
* **Realistic Die-Cut Labels**: Subtle rounded corner radius (`cornerRadius=10`) simulating thermal die-cut sticker rolls.
* **Vector Icon Browser (`C` shortcut)**:
  * Full integration with **Iconify** providing 200+ icon collections with over 200,000 vector icons (Lucide, Material Symbols, Tabler, Carbon, Phosphor, Font Awesome, etc.).
  * Instant vector search and real-time black rasterization optimized for high-contrast thermal heads.
* **Advanced Typography Engine**:
  * **Cyrillic & Latin Support**: Built-in Google Fonts (Inter, Roboto, JetBrains Mono, Caveat, Neucha, Unbounded, Merriweather, Montserrat, Pacifico, Lobster) + local system font access.
  * **Live Dynamic Date & Time Variables**: Tokens like `[[DD.MM.YYYY]]`, `[[HH:mm]]`, `[[MMMM YYYY]]`, and smart relative offsets (`[[DD.MM.YYYY +7d]]`, `+1m`, `+1y`) re-evaluated at print time.
  * **Zero-Drift Anchor Scaling**: Numeric `[ S ]` size input and mouse wheel scrubbing scale anchored to text alignment (`center`, `left`, `right`) and rotation with 100.00% reversible coordinates.
  * **Opposite-Handle Scaling**: Vertical transformer handles scale font size proportionally pinned from the opposite edge.
  * **Typographical Controls**: Uppercase TT toggle, bold, italic, line height, letter spacing, and word wrap.
* **Barcodes & QR Codes**: EAN-13, CODE-128, UPC, and QR codes with configurable error correction levels.
* **Shapes & Line Tools**: Rectangles, circles, triangles, stars, and dividers with custom stroke widths and dash patterns.
* **Library & Template Management**:
  * Instant WYSIWYG PNG previews captured directly from the canvas engine.
  * Export/import templates as JSON or backup entire libraries as ZIP archives.
* **Hardware Connection & Feedback**:
  * Rotating connection spinner (`Loader2`) during BLE handshake and GATT discovery.
  * Live battery level indicator with pixel-art battery gauges.

---

### 💻 CLI & Automation

* **Discover & Connect**: Scan and inspect nearby Bluetooth printers with detailed telemetry.
* **Headless Rendering & Printing**: Print images, labels, and vector templates straight from scripts or AI agents.
* **Configuration**: Set default printer, darkness density, dithering algorithm, and label size.

---

### ⚙️ Core Engine (`@thermoprint/core`)

* **Platform-Agnostic**: Injectable `BleTransport` (Noble for Node/Bun, Web Bluetooth for browser, or custom).
* **High-Quality Image Pipeline**: RGBA → Grayscale → Floyd-Steinberg Dithering / Thresholding → 1-bit raster bit packing.
* **Credit-Based Backpressure**: Hardware flow control prevents printer buffer overflow during high-speed printing.
* **Declarative Device Profiles**: Standardized `DeviceIdentification` with regex name matching and GATT presence detection.

---

## Supported Printers

| Vendor | Model | Protocol ID | Print Width | Paper Types | Status |
|--------|-------|-------------|-------------|-------------|--------|
| **Phomemo** | **P12 / P12-Pro** | `pho-p12` | 96 px (12 mm) | Continuous tape | ✅ Fully Supported |
| **Phomemo** | **D30** | `pho-p12` | 96 px (12 mm) | Gap & Continuous | ✅ Fully Supported |
| **Marklife** | **P15** | `mark-l11` | 384 px (48 mm) | Gap & Continuous | ✅ Fully Supported |
| **Marklife** | **P12** | `mark-l11` | 384 px (48 mm) | Gap & Continuous | ✅ Fully Supported |
| **Marklife** | **P7** | `mark-l11` | 384 px (48 mm) | Gap & Continuous | ✅ Fully Supported |
| **Marklife** | **X2** | `mark-x2` | 384 px (48 mm) | Gap & Continuous | ✅ Fully Supported |
| **Marklife** | **M60** | `mark-x2` | 384 px (48 mm) | Gap & Continuous | ✅ Fully Supported |
| **Generic** | Other L11 / X2 / P12 | Auto-detected | Varies | Gap & Continuous | ✅ Compatible |

---

## Packages

```
thermoprint/
  packages/
    core/     @thermoprint/core  — protocols, imaging pipeline, device profiles
    cli/      @thermoprint/cli   — terminal CLI (Noble + sharp)
    web/      @thermoprint/web   — browser WYSIWYG editor (React 19 + Konva.js)
```

| Package | Description | Transport |
|---------|-------------|-----------|
| `@thermoprint/core` | Shared protocols, image processing, device profiles | Injectable `BleTransport` |
| `@thermoprint/cli` | Terminal interface and automation engine | `@stoprocent/noble` (Node / Bun) |
| `@thermoprint/web` | Browser label editor with canvas and template engine | Web Bluetooth API |

---

## Quick Start

### 🌐 Web Editor (No Install Needed)

Open **[tomladder.github.io/thermoprint](https://tomladder.github.io/thermoprint/)** in Google Chrome or Microsoft Edge, connect your printer via Web Bluetooth, design your label, and click **Print**.

### 💻 CLI

```bash
# Clone repository
git clone https://github.com/tomLadder/thermoprint.git
cd thermoprint

# Install dependencies
bun install

# Discover nearby printers (requires Bluetooth enabled)
bun run packages/cli/src/index.ts discover

# Print an image file
bun run packages/cli/src/index.ts print label.png --density 2
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Web Editor (React 19 + Konva.js)             │
│   Toolbar → Canvas → Dynamic Fit → Print via Web BLE    │
├─────────────────────────────────────────────────────────┤
│              CLI (Commander + Chalk + Ora)              │
├─────────────────────────────────────────────────────────┤
│              Printer Orchestrator (Core)                │
│         connect · print · telemetry · discovery         │
├──────────┬───────────────────────┬──────────────────────┤
│  Image   │       Protocols       │        Device        │
│ Pipeline │ (pho-p12 / mark-l11)  │       Registry       │
├──────────┴───────────────────────┴──────────────────────┤
│              FlowController                             │
│         Credit-based BLE packet chunking                │
├─────────────────────────────────────────────────────────┤
│         BleTransport (injected)                         │
│     Noble · Web Bluetooth · custom                      │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

* **Runtime:** [Bun](https://bun.sh)
* **Language:** TypeScript 5.9 (strict mode, modern ESNext)
* **Web UI:** [React 19](https://react.dev) + [Konva.js](https://konvajs.org) + [Zustand](https://zustand.docs.pmnd.rs) + [Tailwind CSS 4](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev)
* **Vector Graphics:** [Iconify API](https://iconify.design) (200+ collections)
* **BLE Transports:** [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) (Web), [@stoprocent/noble](https://github.com/nicedoc/noble) (CLI)
* **Image Processing:** HTML5 Canvas (Web), [sharp](https://sharp.pixelplumbing.com) (CLI)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<p align="center">
  <sub>Forked & supercharged with 🖨️ and TypeScript</sub>
</p>
