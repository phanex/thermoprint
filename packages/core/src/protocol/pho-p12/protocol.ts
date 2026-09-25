import type {
  ImageBitmap1bpp,
  PrintCommand,
  PrinterProtocol,
  PrinterResponse,
  PrintSequenceOptions,
} from "../types.js";
import * as cmd from "./commands.js";

export class PhoP12Protocol implements PrinterProtocol {
  readonly id = "pho-p12";
  readonly expectsAck = false;

  buildPrintSequence(
    image: ImageBitmap1bpp,
    options: PrintSequenceOptions = {},
  ): PrintCommand[] {
    const { density } = options;
    const commands: PrintCommand[] = [];

    // 1. Preamble: 6-packet initialization sequence
    commands.push(...cmd.initSequence());

    // 2. Optional density
    if (density !== undefined) {
      commands.push(cmd.setDensity(density));
    }

    // 3. Raster bit image
    commands.push(cmd.printBitmap(image));

    // 4. Feed past cutter (two ESC d 13 commands per soburi protocol)
    commands.push(cmd.feed());
    commands.push(cmd.feed());

    return commands;
  }

  buildWakeup(): PrintCommand[] {
    return [{ label: "wakeup", data: Uint8Array.from([0x1f, 0x11, 0x38]) }];
  }

  buildStatusQuery(): PrintCommand {
    return cmd.getPaper();
  }

  buildBatteryQuery(): PrintCommand {
    return cmd.getBattery();
  }

  buildModelQuery(): PrintCommand {
    return cmd.getFirmware();
  }

  buildInfoQuery(
    type: "firmware" | "serial" | "mac" | "bt-version" | "bt-name" | "speed",
  ): PrintCommand {
    switch (type) {
      case "firmware":
        return cmd.getFirmware();
      case "serial":
        return cmd.getSerial();
      case "mac":
        return cmd.getMac();
      case "bt-version":
        return cmd.getBtVersion();
      case "bt-name":
        return cmd.getSerial();
      case "speed":
        return cmd.getFirmware();
    }
  }

  parseResponse(data: Uint8Array): PrinterResponse | null {
    if (data.length < 2) return null;

    // Special result response: [0x01, code]
    if (data.length === 2 && data[0] === 0x01) {
      return { type: "success", raw: data, value: data[1] };
    }

    // Standard telemetry packet: 0x1A <type> <payload...>
    if (data[0] !== 0x1a || data.length < 3) return null;

    const typeCode = data[1];

    switch (typeCode) {
      case 0x03: {
        // Temperature / overheat status
        const isOverheat = data[2] === 0xa9;
        return {
          type: "status",
          raw: data,
          value: isOverheat ? "overheating" : "ready",
        };
      }

      case 0x04: {
        // Battery level
        let batteryPercent: number;
        if (data[2] === 0xa4) batteryPercent = 10;
        else if (data[2] === 0xa3) batteryPercent = 30;
        else if (data[2] === 0xa2) batteryPercent = 50;
        else if (data[2] === 0xa1) batteryPercent = 100;
        else batteryPercent = Math.min(100, Math.max(0, data[2]));

        return {
          type: "battery",
          raw: data,
          value: batteryPercent,
        };
      }

      case 0x05: {
        // Cover status: 0x98 open, 0x99 closed
        const isOpen = data[2] === 0x98;
        return {
          type: "status",
          raw: data,
          value: isOpen ? "cover_open" : "cover_closed",
        };
      }

      case 0x06: {
        // Paper status: 0x88 out of paper, else ok
        const isOut = data[2] === 0x88;
        return {
          type: "status",
          raw: data,
          value: isOut ? "out_of_paper" : "paper_ok",
        };
      }

      case 0x07: {
        // Firmware version: dot-separated numbers
        const ver = Array.from(data.slice(2)).join(".");
        return { type: "firmware", raw: data, value: ver };
      }

      case 0x08: {
        // Serial number: ASCII string
        const sn = new TextDecoder().decode(data.slice(2)).replace(/\0/g, "").trim();
        return { type: "serial", raw: data, value: sn };
      }

      case 0x0d: {
        // MAC address: ASCII string or hex
        const mac = new TextDecoder().decode(data.slice(2)).replace(/\0/g, "").trim();
        return { type: "mac", raw: data, value: mac };
      }

      case 0x11: {
        // BT version: dot-separated numbers
        const btVer = Array.from(data.slice(2)).join(".");
        return { type: "bt-version", raw: data, value: btVer };
      }

      default:
        return null;
    }
  }
}
