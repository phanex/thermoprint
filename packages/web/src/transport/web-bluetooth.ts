import type {
  BleTransport,
  BleConnection,
  BleService,
  BleCharacteristic,
  BlePeripheral,
  ScanOptions,
  ScanHandle,
} from "@thermoprint/core";
import { getRegisteredDevices, debugLog } from "@thermoprint/core";

/** Expand a short UUID to full 128-bit form for Web Bluetooth */
function expandUuid(uuid: string): string {
  const stripped = uuid.replace(/-/g, "").toLowerCase();
  if (stripped.length === 4) {
    return `0000${stripped}-0000-1000-8000-00805f9b34fb`;
  }
  if (stripped.length === 32) {
    return `${stripped.slice(0, 8)}-${stripped.slice(8, 12)}-${stripped.slice(12, 16)}-${stripped.slice(16, 20)}-${stripped.slice(20)}`;
  }
  return uuid.toLowerCase();
}

class WebBluetoothCharacteristic implements BleCharacteristic {
  private listener: ((data: Uint8Array) => void) | null = null;
  private handler: ((e: Event) => void) | null = null;

  constructor(
    private readonly char: BluetoothRemoteGATTCharacteristic,
  ) {}

  async write(data: Uint8Array, withoutResponse: boolean): Promise<void> {
    const buffer = new Uint8Array(data).buffer as ArrayBuffer;
    if (withoutResponse) {
      await this.char.writeValueWithoutResponse(buffer);
    } else {
      await this.char.writeValueWithResponse(buffer);
    }
  }

  async subscribe(listener: (data: Uint8Array) => void): Promise<void> {
    this.listener = listener;
    this.handler = (e: Event) => {
      const target = e.target as BluetoothRemoteGATTCharacteristic;
      if (target.value) {
        this.listener?.(new Uint8Array(target.value.buffer));
      }
    };
    this.char.addEventListener("characteristicvaluechanged", this.handler);
    await this.char.startNotifications();
  }

  async unsubscribe(): Promise<void> {
    await this.char.stopNotifications();
    if (this.handler) {
      this.char.removeEventListener("characteristicvaluechanged", this.handler);
    }
    this.listener = null;
    this.handler = null;
  }
}

class WebBluetoothService implements BleService {
  constructor(
    private readonly service: BluetoothRemoteGATTService,
  ) {}

  async getCharacteristic(uuid: string): Promise<BleCharacteristic | null> {
    const candidates: BluetoothCharacteristicUUID[] = [];
    const stripped = uuid.replace(/-/g, "").toLowerCase();
    if (stripped.startsWith("0000") && stripped.length === 32) {
      const shortHex = parseInt(stripped.slice(4, 8), 16);
      if (!isNaN(shortHex)) {
        candidates.push(shortHex);
      }
    }
    candidates.push(expandUuid(uuid), uuid);

    for (const cand of candidates) {
      try {
        const char = await this.service.getCharacteristic(cand);
        if (char) return new WebBluetoothCharacteristic(char);
      } catch {
        // try next candidate
      }
    }
    return null;
  }
}

class WebBluetoothConnection implements BleConnection {
  private connected = true;
  private disconnectCallback: (() => void) | null = null;

  constructor(private readonly device: BluetoothDevice) {
    device.addEventListener("gattserverdisconnected", () => {
      this.connected = false;
      this.disconnectCallback?.();
    });
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  async discoverService(uuid: string): Promise<BleService | null> {
    const server = this.device.gatt;
    if (!server) return null;

    const candidates: BluetoothServiceUUID[] = [];
    const stripped = uuid.replace(/-/g, "").toLowerCase();
    if (stripped.startsWith("0000") && stripped.length === 32) {
      const shortHex = parseInt(stripped.slice(4, 8), 16);
      if (!isNaN(shortHex)) {
        candidates.push(shortHex);
      }
    }
    candidates.push(expandUuid(uuid), uuid);

    for (const cand of candidates) {
      try {
        const service = await server.getPrimaryService(cand);
        if (service) return new WebBluetoothService(service);
      } catch {
        // try next candidate
      }
    }
    return null;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      this.device.gatt?.disconnect();
      this.connected = false;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

const deviceMap = new Map<string, BluetoothDevice>();

export class WebBluetoothTransport implements BleTransport {
  async scan(
    onDiscover: (peripheral: BlePeripheral) => void,
    _options?: ScanOptions,
  ): Promise<ScanHandle> {
    const devices = getRegisteredDevices();
    const filters: BluetoothLEScanFilter[] = devices.flatMap((d) =>
      d.namePrefixes.map((prefix) => ({ namePrefix: prefix })),
    );

    const serviceUuids: BluetoothServiceUUID[] = [
      0xff00,
      0xffe0,
      0xae30,
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ...new Set(devices.map((d) => expandUuid(d.serviceUuid))),
    ];

    const device = await navigator.bluetooth.requestDevice({
      filters,
      optionalServices: serviceUuids,
    });

    const id = device.id;
    deviceMap.set(id, device);

    onDiscover({
      id,
      name: device.name ?? "",
      rssi: 0,
    });

    return { stop: async () => {} };
  }

  async connect(peripheral: BlePeripheral): Promise<BleConnection> {
    const device = deviceMap.get(peripheral.id);
    if (!device) {
      throw new Error(
        `Device "${peripheral.name}" (${peripheral.id}) not found — was it discovered?`,
      );
    }

    const server = device.gatt;
    if (!server) {
      throw new Error("GATT server not available on this device");
    }

    // Wait for device to be ready by watching advertisements (or delay fallback)
    await this.waitForDeviceReady(device);

    // Windows BLE pairing handling:
    // Some printers (e.g. Phomemo P12) trigger OS-level pairing. On Windows,
    // this displays a toast "Add a device: Tap to set up your P12".
    // While Windows initiates pairing or waits for user confirmation, the initial
    // server.connect() call often rejects immediately with NetworkError.
    // Retrying with progressive delays gives Windows time to complete the pairing handshake.
    let lastError: unknown;
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!server.connected) {
          debugLog("BLE", `connecting GATT (attempt ${attempt}/${maxAttempts})...`);
          await server.connect();
        }
        // Small delay after GATT connect before service discovery to allow GATT caching
        await new Promise((r) => setTimeout(r, 200));
        debugLog("BLE", `connected GATT successfully on attempt ${attempt}`);
        return new WebBluetoothConnection(device);
      } catch (err) {
        lastError = err;
        debugLog("BLE", `connect attempt ${attempt}/${maxAttempts} failed:`, err);
        if (attempt < maxAttempts) {
          // 600ms, 1200ms, 1800ms, 2400ms, 3000ms (~9s total window)
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }

    throw lastError;
  }

  private async waitForDeviceReady(device: BluetoothDevice, timeout = 5000): Promise<void> {
    const devAny = device as unknown as {
      watchAdvertisements?: (options?: { signal?: AbortSignal }) => Promise<void>;
    };

    if (typeof devAny.watchAdvertisements !== "function") {
      debugLog("BLE", "watchAdvertisements not supported, waiting 3000ms for OS pairing settling...");
      await new Promise((r) => setTimeout(r, 3000));
      return;
    }

    return new Promise<void>((resolve) => {
      const abortController = new AbortController();
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          abortController.abort();
          debugLog("BLE", "device ready timeout, proceeding anyway...");
          resolve();
        }
      }, timeout);

      const onAdv = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          abortController.abort();
          debugLog("BLE", "advertisement received, device is ready");
          resolve();
        }
      };

      device.addEventListener("advertisementreceived", onAdv, { once: true });

      debugLog("BLE", "watching advertisements for device ready...");
      devAny
        .watchAdvertisements({ signal: abortController.signal })
        .catch((e: Error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            debugLog("BLE", "watchAdvertisements ended:", e.message);
            resolve();
          }
        });
    });
  }
}
