# Technology Stack: Thermoprint

## Monorepo Architecture
- **Root**: Yarn Workspaces (`packages/*`), Bun-compatible.
- **Languages**: TypeScript 5.9 (ESM, strict typechecking).

## Packages
### 1. `@thermoprint/core`
- **Role**: Hardware-agnostic engine, image pipeline, printer protocol implementations, BLE flow control.
- **Dependencies**: `fflate` (compression).
- **Tooling & Test**: Bun test (`bun test`), TypeScript (`tsc --noEmit`).
- **Design Pattern**: Dependency Injection via `BleTransport` interface.

### 2. `@thermoprint/web`
- **Role**: Browser WYSIWYG editor and printing client.
- **Framework & Build**: React 19, Vite 8, TypeScript.
- **Styling**: Tailwind CSS v4 (ink theme tokens).
- **Canvas Rendering**: Konva, `react-konva`.
- **State Management**: Zustand, Zundo (temporal history / undo-redo).
- **Hardware Integration**: Web Bluetooth API (`@types/web-bluetooth`).
- **Utilities**: `jsbarcode`, `qrcode`, `lucide-react`, `@fontsource/*`.
