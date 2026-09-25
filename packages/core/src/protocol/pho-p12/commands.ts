import type { ImageBitmap1bpp, PrintCommand } from "../types.js";

/**
 * 6-packet initialization sequence for Phomemo P12 (soburi protocol)
 * Used to initialize print engine and tape positioning.
 */
export function initSequence(): PrintCommand[] {
  return [
    { label: "init-1", data: Uint8Array.from([0x1f, 0x11, 0x38]) },
    {
      label: "init-2",
      data: Uint8Array.from([
        0x1f, 0x11, 0x11, 0x1f, 0x11, 0x12, 0x1f, 0x11, 0x09, 0x1f, 0x11, 0x13,
      ]),
    },
    { label: "init-3", data: Uint8Array.from([0x1f, 0x11, 0x09]) },
    {
      label: "init-4",
      data: Uint8Array.from([0x1f, 0x11, 0x19, 0x1f, 0x11, 0x11]),
    },
    { label: "init-5", data: Uint8Array.from([0x1f, 0x11, 0x19]) },
    { label: "init-6", data: Uint8Array.from([0x1f, 0x11, 0x07]) },
  ];
}

/** Set print density: 1F 11 02 DD */
export function setDensity(density: number): PrintCommand {
  return {
    label: "set-density",
    data: Uint8Array.from([0x1f, 0x11, 0x02, density & 0xff]),
  };
}

/**
 * Build raster bitmap command for P12:
 * ESC @ (1B 40) + GS v 0 0 (1D 76 30 00) + widthBytes (16-bit LE) + rows (16-bit LE) + pixels
 */
export function printBitmap(image: ImageBitmap1bpp): PrintCommand {
  const { data: pixels, bytesPerRow, height } = image;
  const header = Uint8Array.from([
    0x1b,
    0x40,
    0x1d,
    0x76,
    0x30,
    0x00,
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ]);

  const command = new Uint8Array(header.length + pixels.length);
  command.set(header, 0);
  command.set(pixels, header.length);

  return { label: "print-bitmap", data: command, bulk: true };
}

/** Paper feed command: ESC d 13 (1B 64 0D) */
export function feed(): PrintCommand {
  return {
    label: "feed",
    data: Uint8Array.from([0x1b, 0x64, 0x0d]),
    bulk: true,
  };
}

/** Query battery level: 1F 11 08 */
export function getBattery(): PrintCommand {
  return { label: "get-battery", data: Uint8Array.from([0x1f, 0x11, 0x08]) };
}

/** Query firmware version: 1F 11 07 */
export function getFirmware(): PrintCommand {
  return { label: "get-firmware", data: Uint8Array.from([0x1f, 0x11, 0x07]) };
}

/** Query serial number: 1F 11 09 */
export function getSerial(): PrintCommand {
  return { label: "get-serial", data: Uint8Array.from([0x1f, 0x11, 0x09]) };
}

/** Query paper status: 1F 11 11 */
export function getPaper(): PrintCommand {
  return { label: "get-paper", data: Uint8Array.from([0x1f, 0x11, 0x11]) };
}

/** Query cover status: 1F 11 12 */
export function getCover(): PrintCommand {
  return { label: "get-cover", data: Uint8Array.from([0x1f, 0x11, 0x12]) };
}

/** Query BT module version: 1F 11 33 */
export function getBtVersion(): PrintCommand {
  return { label: "get-bt-version", data: Uint8Array.from([0x1f, 0x11, 0x33]) };
}

/** Query Bluetooth MAC address: 1F 11 20 */
export function getMac(): PrintCommand {
  return { label: "get-mac", data: Uint8Array.from([0x1f, 0x11, 0x20]) };
}
