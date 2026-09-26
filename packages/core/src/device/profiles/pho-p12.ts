import type { DeviceProfile } from "../types.js";

export const phoP12Profile: DeviceProfile = {
  modelId: "pho-p12",
  name: "Phomemo P12",
  protocolId: "pho-p12",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  packetSize: 128,
  flowControl: {
    packetDelayMs: 20,
    unmetered: true,
  },
  defaults: { density: 2, paperType: "continuous" },
  identification: {
    namePattern: /^(?!.*_ble$)(pho[_-]?p12|phomemo[\s_-]?p12|p12[\s_-]?pro.*|p12(_[0-9a-z]{4,6})?|p12)$/i,
    hasCx: false,
    hardwareId: 0xb6,
  },
  namePrefixes: [
    "P12 PRO",
    "P12PRO",
    "Phomemo P12",
    "Pho-P12",
    "P12",
  ],
  cutterMargins: {
    leadMm: 9,
    trailMm: 9,
  },
  labelConfig: {
    supportedPaperTypes: ["continuous"],
    defaultPaperType: "continuous",
    tapes: [
      {
        tapeWidthMm: 12,
        continuous: true,
        continuousLengthsMm: [30, 40, 50, 60, 80],
      },
    ],
    defaultTapeWidthMm: 12,
    defaultLabelLengthMm: 40,
    defaultSize: { widthMm: 40, heightMm: 12 },
  },
};
