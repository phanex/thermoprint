import { describe, it, expect, beforeEach } from "bun:test";
import { Printer } from "../src/printer.js";
import { getDebugLog, clearDebugLog } from "../src/debug-log.js";
import type {
  BleTransport,
  BlePeripheral,
  BleConnection,
  BleService,
  BleCharacteristic,
} from "../src/transport/types.js";

function createMockCharacteristic(props: { write?: boolean; notify?: boolean } = {}): BleCharacteristic {
  return {
    write: async () => {},
    subscribe: async () => {},
    unsubscribe: async () => {},
  };
}

function createMockConnection(options: {
  serviceFound?: boolean;
  txFound?: boolean;
  rxFound?: boolean;
  cxFound?: boolean;
} = {}): BleConnection {
  const { serviceFound = true, txFound = true, rxFound = true, cxFound = false } = options;

  const mockService: BleService = {
    getCharacteristic: async (uuid: string) => {
      if (uuid.includes("ff02") && txFound) return createMockCharacteristic({ write: true });
      if (uuid.includes("ff03") && rxFound) return createMockCharacteristic({ notify: true });
      if (uuid.includes("ff01") && rxFound) return createMockCharacteristic({ notify: true });
      return null;
    },
  };

  return {
    isConnected: true,
    discoverService: async () => (serviceFound ? mockService : null),
    disconnect: async () => {},
  };
}

function createMockTransport(connection: BleConnection): BleTransport {
  return {
    scan: async () => ({ stop: async () => {} }),
    connect: async () => connection,
  };
}

describe("Printer.connect diagnostics & error logging", () => {
  beforeEach(() => {
    clearDebugLog();
  });

  it("logs error to debugLog when device profile is unknown", async () => {
    const peripheral: BlePeripheral = { id: "p1", name: "NonExistentPrinter123", rssi: -50 };
    const transport = createMockTransport(createMockConnection());

    expect(Printer.connect(transport, peripheral)).rejects.toThrow();

    const logs = getDebugLog();
    const bleErrors = logs.filter((l) => l.tag === "BLE" && l.message.includes("failed"));
    expect(bleErrors.length).toBeGreaterThan(0);
    expect(bleErrors[0].message).toContain("UNKNOWN_DEVICE");
  });

  it("logs error to debugLog when BLE service is not found", async () => {
    const peripheral: BlePeripheral = { id: "p2", name: "Phomemo P12", rssi: -50 };
    const transport = createMockTransport(createMockConnection({ serviceFound: false }));

    expect(Printer.connect(transport, peripheral)).rejects.toThrow();

    const logs = getDebugLog();
    const bleErrors = logs.filter((l) => l.tag === "BLE" && l.message.includes("failed"));
    expect(bleErrors.length).toBeGreaterThan(0);
    expect(bleErrors[0].message).toContain("SERVICE_NOT_FOUND");
  });

  it("logs error to debugLog when TX characteristic is not found", async () => {
    const peripheral: BlePeripheral = { id: "p3", name: "Phomemo P12", rssi: -50 };
    const transport = createMockTransport(createMockConnection({ txFound: false }));

    expect(Printer.connect(transport, peripheral)).rejects.toThrow();

    const logs = getDebugLog();
    const bleErrors = logs.filter((l) => l.tag === "BLE" && l.message.includes("failed"));
    expect(bleErrors.length).toBeGreaterThan(0);
    expect(bleErrors[0].message).toContain("CHARACTERISTIC_NOT_FOUND");
  });

  it("Phomemo P12 connects successfully in write-only mode when RX notifications throw", async () => {
    const peripheral: BlePeripheral = { id: "p4", name: "Phomemo P12", rssi: -50 };
    const failingRxChar: BleCharacteristic = {
      write: async () => {},
      subscribe: async () => {
        throw new Error("GATT operation failed: Not supported on Windows WinRT");
      },
      unsubscribe: async () => {},
    };

    const mockService: BleService = {
      getCharacteristic: async (uuid: string) => {
        if (uuid.includes("ff02")) return createMockCharacteristic({ write: true });
        if (uuid.includes("ff03")) return failingRxChar;
        return null;
      },
    };

    const mockConn: BleConnection = {
      isConnected: true,
      discoverService: async () => mockService,
      disconnect: async () => {},
    };

    const transport = createMockTransport(mockConn);
    const printer = await Printer.connect(transport, peripheral);
    expect(printer).toBeDefined();
    expect(printer.isConnected).toBe(true);

    const logs = getDebugLog();
    const rxWarning = logs.find((l) => l.tag === "BLE" && l.message.includes("RX notifications not available"));
    expect(rxWarning).toBeDefined();
    await printer.disconnect();
  });

  it("Phomemo P12 recovers from hanging RX subscription via timeout and stays connected", async () => {
    const peripheral: BlePeripheral = { id: "p5", name: "Phomemo P12", rssi: -50 };
    const hangingRxChar: BleCharacteristic = {
      write: async () => {},
      subscribe: () => new Promise(() => {}), // Never resolves
      unsubscribe: async () => {},
    };

    const mockService: BleService = {
      getCharacteristic: async (uuid: string) => {
        if (uuid.includes("ff02")) return createMockCharacteristic({ write: true });
        if (uuid.includes("ff03")) return hangingRxChar;
        return null;
      },
    };

    const mockConn: BleConnection = {
      isConnected: true,
      discoverService: async () => mockService,
      disconnect: async () => {},
    };

    const transport = createMockTransport(mockConn);
    const printer = await Printer.connect(transport, peripheral);
    expect(printer).toBeDefined();
    expect(printer.isConnected).toBe(true);

    const logs = getDebugLog();
    const rxTimeout = logs.find((l) => l.tag === "BLE" && l.message.includes("timed out"));
    expect(rxTimeout).toBeDefined();
    await printer.disconnect();
  });
});
