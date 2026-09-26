import { useCallback } from "react";
import { Printer, findDeviceByName, type BlePeripheral } from "@thermoprint/core";
import { WebBluetoothTransport } from "../transport/web-bluetooth.ts";
import { usePrinterStore, applyModelDefaults } from "../store/printer-store.ts";
import { useEditorV2Store } from "../store/editor-store.ts";

// Module-level singletons so all callers share the same transport + printer instance
const transport = new WebBluetoothTransport();
let printer: Printer | null = null;
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

export function getPrinter(): Printer | null {
  return printer;
}

export async function connectPeripheral(peripheral: BlePeripheral): Promise<void> {
  const store = usePrinterStore;
  store.getState().setConnecting(true);
  store.getState().setError(null);
  try {
    printer = await Printer.connect(transport, peripheral);

    printer.on("disconnected", () => {
      store.getState().setConnected(false);
      useEditorV2Store.setState((s) => ({
        printer: { ...s.printer, connected: false },
      }));
      printer = null;
    });

    printer.on("progress", (p) => {
      store.getState().setPrintProgress(p);
    });

    printer.on("status", (s) => {
      store.setState({ printerStatus: s.status });
    });

    printer.on("battery", (b) => {
      if (b.battery >= 0 && b.battery <= 100) {
        store.getState().setBattery(b.battery);
        useEditorV2Store.setState((s) => ({
          printer: { ...s.printer, battery: b.battery },
        }));
      }
    });

    store.getState().setConnected(true);
    store.getState().setConnecting(false);

    const profile = findDeviceByName(peripheral.name);
    if (profile) {
      store.getState().setModelId(profile.modelId);
      store.setState({ autoDetectedModelId: profile.modelId });
      applyModelDefaults(profile.modelId);
    }

    useEditorV2Store.setState({
      printer: {
        connected: true,
        name: peripheral.name || "Printer",
        battery: store.getState().battery >= 0 ? store.getState().battery : 0,
        model: peripheral.name?.split(" ")[1] || "",
      },
    });

    if (profile?.hasBattery !== false) {
      try {
        const battery = await printer.getBattery();
        if (battery >= 0 && battery <= 100) {
          store.getState().setBattery(battery);
          useEditorV2Store.setState((s) => ({
            printer: { ...s.printer, battery },
          }));
        } else {
          store.getState().setBattery(-1);
        }
      } catch (err) {
        console.warn("[thermoprint] battery query failed:", err);
        store.getState().setBattery(-1);
      }
    } else {
      store.getState().setBattery(-1);
    }

    try {
      const model = await printer.getModel();
      if (model) {
        store.setState({ deviceModel: model });
      }
    } catch (err) {
      console.warn("[thermoprint] model query failed:", err);
    }

    // Query device info — non-critical, skip any that fail or if a print starts
    const infoQueries = [
      ["firmware", "firmware"],
      ["serial", "serial"],
    ] as const;
    for (const [key, type] of infoQueries) {
      try {
        if (printer.isPrinting) break;
        const val = await printer.getInfo(type as "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed");
        if (val) {
          store.setState((s) => ({
            deviceInfo: { ...s.deviceInfo, [key]: val },
          }));
        }
      } catch {
        // Non-critical — stop querying on first failure (printer may not support it)
        break;
      }
    }
  } catch (err) {
    store.getState().setError(err instanceof Error ? err.message : "Connection failed");
    store.getState().setConnecting(false);
    throw err;
  }
}

export async function disconnectPrinter(): Promise<void> {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
  if (printer) {
    try {
      await printer.disconnect();
    } catch {}
    printer = null;
  }
  const store = usePrinterStore;
  store.getState().setConnected(false);
  store.getState().setConnecting(false);
  store.getState().setPeripheral(null);
  store.getState().setError(null);
  useEditorV2Store.setState({
    printer: { connected: false, name: "", battery: 0, model: "" },
    printFlyoutOpen: false,
  });
}

export async function scanAndConnect(): Promise<void> {
  const store = usePrinterStore;
  store.getState().setScanning(true);
  store.getState().setError(null);
  let chosenPeripheral: BlePeripheral | null = null;
  try {
    await transport.scan((peripheral) => {
      chosenPeripheral = peripheral;
      store.getState().setPeripheral(peripheral);
      store.getState().setScanning(false);
    });
  } catch (err) {
    store.getState().setScanning(false);
    if (err instanceof Error && (err.name === "NotFoundError" || err.message?.includes("User cancelled"))) {
      // User cancelled native dialog — clean exit, no error displayed
      return;
    }
    store.getState().setError(err instanceof Error ? err.message : "Scan failed");
    return;
  }

  if (chosenPeripheral) {
    // User selected device — immediately open the chip popover right under top-left button
    useEditorV2Store.setState({ printFlyoutOpen: true });
    try {
      await connectPeripheral(chosenPeripheral);
      // Auto-dismiss after 2.5s once connected
      if (store.getState().isConnected) {
        if (autoDismissTimer) clearTimeout(autoDismissTimer);
        autoDismissTimer = setTimeout(() => {
          useEditorV2Store.setState({ printFlyoutOpen: false });
          autoDismissTimer = null;
        }, 2500);
      }
    } catch (err) {
      console.warn("[thermoprint] connect failed:", err);
    }
  }
}

export function useWebBluetooth() {
  const connect = useCallback((peripheral: BlePeripheral) => connectPeripheral(peripheral), []);
  const disconnect = useCallback(() => disconnectPrinter(), []);

  const scan = useCallback(async () => {
    const store = usePrinterStore;
    store.getState().setScanning(true);
    store.getState().setError(null);
    try {
      await transport.scan((peripheral) => {
        store.getState().setPeripheral(peripheral);
        store.getState().setScanning(false);
      });
    } catch (err) {
      store.getState().setScanning(false);
      if (err instanceof Error && (err.name === "NotFoundError" || err.message?.includes("User cancelled"))) {
        return;
      }
      store.getState().setError(err instanceof Error ? err.message : "Scan failed");
    }
  }, []);

  return { scan, connect, disconnect, scanAndConnect };
}
