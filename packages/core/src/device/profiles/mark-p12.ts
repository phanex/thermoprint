import type { DeviceProfile } from "../types.js";

export const markP12Profile: DeviceProfile = {
  modelId: "mark-p12",
  name: "Marklife P12",
  protocolId: "l11",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  packetSize: 90,
  flowControl: {
    packetDelayMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["p12_", "P12_", "Marklife P12", "marklife p12", "LP90", "P11"],
  labelConfig: {
    supportedPaperTypes: ["gap", "continuous"],
    defaultPaperType: "gap",
    tapes: [
      {
        tapeWidthMm: 12,
        continuous: true,
        continuousLengthsMm: [22, 30, 40],
        gapLengthsMm: [22, 30, 40],
      },
      {
        tapeWidthMm: 14,
        continuous: true,
        continuousLengthsMm: [22, 30, 40],
        gapLengthsMm: [22, 30, 40],
      },
      {
        tapeWidthMm: 15,
        continuous: true,
        continuousLengthsMm: [26, 30, 40, 50],
        gapLengthsMm: [26, 30, 40, 50],
      },
    ],
    defaultTapeWidthMm: 12,
    defaultLabelLengthMm: 40,
  },
};

export const p12Profile = markP12Profile;

