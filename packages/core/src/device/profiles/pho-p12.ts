import type { DeviceProfile, LabelSizePreset } from "../types.js";

const continuousSizes: LabelSizePreset[] = [
  { widthMm: 30, heightMm: 12 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 50, heightMm: 12 },
  { widthMm: 60, heightMm: 12 },
  { widthMm: 80, heightMm: 12 },
];

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
  namePrefixes: [
    "P12 PRO",
    "P12PRO",
    "p12 pro",
    "p12pro",
    "Phomemo P12",
    "phomemo p12",
    "Pho-P12",
    "pho-p12",
    "Phomemo",
    "phomemo",
    "P12",
    "p12",
  ],
  cutterMargins: {
    leadMm: 9,
    trailMm: 9,
  },
  labelConfig: {
    supportedPaperTypes: ["continuous"],
    defaultPaperType: "continuous",
    gapSizes: [],
    continuousSizes,
    defaultSize: { widthMm: 40, heightMm: 12 },
  },
};
