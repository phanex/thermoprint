import type { DeviceProfile } from "../types.js";

export const markP15Profile: DeviceProfile = {
  modelId: "mark-p15",
  name: "Marklife P15",
  protocolId: "mark-l11",
  serviceUuid: "0000ff00-0000-1000-8000-00805f9b34fb",
  characteristics: {
    tx: "0000ff02-0000-1000-8000-00805f9b34fb",
    rx: "0000ff01-0000-1000-8000-00805f9b34fb",
    cx: "0000ff03-0000-1000-8000-00805f9b34fb",
  },
  packetSize: 95,
  flowControl: {
    packetDelayMs: 30,
  },
  defaults: { density: 2, paperType: "gap" },
  densityCommand: "thickness",
  identification: {
    namePattern: /^(marklife[\s_-]?p15|p15.*_ble|p15[rs]?|lp15|ispace_lp15|out_lpc|m1|p7|s15|s12|p1s|lpc74)$/i,
    hasCx: true,
  },
  namePrefixes: [
    "P15",
    "P15R",
    "P15S",
    "P7",
    "iSPACE_LP15",
    "OUT_LPC",
    "M1",
    "LP15",
    "S15",
    "S12",
    "P1s",
    "LPC74",
  ],
  labelConfig: {
    supportedPaperTypes: ["gap"],
    defaultPaperType: "gap",
    tapes: [
      { tapeWidthMm: 12, gapLengthsMm: [22, 30, 40] },
      { tapeWidthMm: 14, gapLengthsMm: [22, 30, 40] },
      { tapeWidthMm: 15, gapLengthsMm: [26, 30, 40, 50] },
    ],
    defaultTapeWidthMm: 12,
    defaultLabelLengthMm: 40,
    defaultSize: { widthMm: 40, heightMm: 12 },
  },
};

export const p15Profile = markP15Profile;

