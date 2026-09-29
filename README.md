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
  <a href="https://phanex.github.io/thermoprint/">🌐 Web Editor</a> •
  <a href="#features">Features</a> •
  <a href="#supported-printers">Printers</a> •
  <a href="#packages">Packages</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/bun-%3E%3D1.0-black.svg" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20Browser-lightgrey.svg" alt="Platform">
</p>

---

## Features

### 🌐 Web Editor — [Open Live Editor](https://phanex.github.io/thermoprint/)

* **Direct Web Bluetooth**: Connect straight from Chrome or Edge on macOS, Linux, Windows, ChromeOS, and Android — no drivers or companion apps required.
* **Continuous Tape & Die-Cut Modes**:
  * **Auto-fit continuous tape**: Canvas dynamically expands and contracts to fit content, with accurate cutter margin guides.
  * **Die-cut labels**: Presets and custom sizes for standard thermal sticker rolls.
* **Dynamic Variables & Batch Printing**:
  * **Autonomous counters**: Multi-digit sequential numbering (`{{#:001}}`), custom steps (`+5`), countdowns (`{{#:100+-1}}`), and custom prefixes/suffixes (`{{#:SN-0001}}`).
  * **Spreadsheet data binding**: Import `.csv` or `.tsv` files to batch print labels with variable text, barcodes, and QR codes (`{{Column}}`).
  * **Live date & time**: Auto-updating timestamps and relative offsets (`[[DD.MM.YYYY]]`, `[[+7d]]`, `[[+12h]]`).
  * **Pre-print sanity check**: Batch range selector (`1-50`, `2, 10-15`) with a preview table before dispatching to hardware.
  * *(See [docs/TEMPLATES.md](docs/TEMPLATES.md) for full syntax and examples)*
* **Design Elements**:
  * **Typography**: Curated font library + local system fonts, auto-sizing, and multi-line alignment.
  * **Barcodes & QR Codes**: EAN-13, CODE-128, UPC, and QR codes with dynamic data binding.
  * **Vector Icons**: Search 200,000+ vector icons via Iconify (Lucide, Material, Tabler, etc.).
  * **Shapes & Images**: Lines, rectangles, circles, stars, and custom image uploads.
* **Templates & Local Storage**: Save labels in browser storage, export/import JSON templates, or backup the library as a ZIP archive.
* **Printer Telemetry**: Live battery status and hardware state monitoring.

---

### 💻 CLI & Automation

* **Headless Printing**: Print images and JSON label templates directly from scripts, terminal, or AI agents.
* **Discovery & Status**: Scan nearby Bluetooth printers and query battery level.
* **Configuration**: Save default printer, density, and paper settings in `~/.thermoprint/config.json`.

---

### ⚙️ Core Engine (`@thermoprint/core`)

* **Platform-Agnostic**: Shared protocols and imaging pipeline across Web, Node, Bun, and CLI.
* **Hardware Flow Control**: Credit-based packet scheduling prevents buffer overflows on thermal printheads.
* **Binarization Pipeline**: Floyd-Steinberg dithering and thresholding optimized for 1-bit thermal printheads.

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

Open **[phanex.github.io/thermoprint](https://phanex.github.io/thermoprint/)** in Google Chrome or Microsoft Edge, connect your printer via Web Bluetooth, design your label, and click **Print**.

### 💻 CLI

```bash
# Clone repository
git clone https://github.com/phanex/thermoprint.git
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

## License & Attribution

This project is licensed under the MIT License.

Originally created by [Tom Ladder](https://github.com/tomLadder/thermoprint). Forked, actively extended, and maintained by [phanex](https://github.com/phanex/thermoprint).

