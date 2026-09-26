import type { DeviceProfile } from "../types.js";

export const markM60Profile: DeviceProfile = {
  modelId: "mark-m60",
  name: "Marklife M60",
  protocolId: "x2",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  flowControl: {
    packetDelayMs: 1,
  },
  defaults: { density: 2, paperType: "gap" },
  namePrefixes: ["M60", "X2"],
  labelConfig: {
    supportedPaperTypes: ["gap", "continuous"],
    defaultPaperType: "gap",
    tapes: [
      { tapeWidthMm: 15, continuous: true, continuousLengthsMm: [30], gapLengthsMm: [30] },
      { tapeWidthMm: 20, continuous: true, continuousLengthsMm: [20, 30, 40], gapLengthsMm: [10, 40] },
      { tapeWidthMm: 30, continuous: true, continuousLengthsMm: [30, 40, 50], gapLengthsMm: [40, 50] },
      { tapeWidthMm: 40, continuous: true, continuousLengthsMm: [30, 40, 50], gapLengthsMm: [12, 20, 30, 50] },
      { tapeWidthMm: 50, continuous: true, continuousLengthsMm: [30, 40, 50], gapLengthsMm: [30, 40, 50] },
    ],
    defaultTapeWidthMm: 50,
    defaultLabelLengthMm: 30,
  },
};

export const m60Profile = markM60Profile;

