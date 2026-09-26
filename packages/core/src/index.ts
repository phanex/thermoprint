// Main API
export { Printer } from "./printer.js";
export { discover, discoverAll } from "./discovery.js";
export type { DiscoverOptions } from "./discovery.js";

// Errors
export { ThermoprintError, ErrorCode } from "./errors.js";

// Transport types (for consumers implementing BleTransport)
export type {
  BleTransport,
  BleConnection,
  BleService,
  BleCharacteristic,
  BlePeripheral,
  ScanOptions,
  ScanHandle,
} from "./transport/types.js";
export { FlowController } from "./transport/flow-control.js";

// Protocol types & registry (for extending with new protocols)
export type {
  PrinterProtocol,
  PrintCommand,
  PrinterResponse,
  PrintSequenceOptions,
  ImageBitmap1bpp,
} from "./protocol/types.js";
export { registerProtocol, getProtocol } from "./protocol/registry.js";
export { L11Protocol } from "./protocol/l11/protocol.js";
export { X2Protocol } from "./protocol/x2/protocol.js";
export { PhoP12Protocol } from "./protocol/pho-p12/protocol.js";

// Device types & registry (for adding new printer models)
export type {
  DeviceProfile,
  DeviceLabelConfig,
  TapeOption,
  LabelSizePreset,
  PrintOptions,
  PrinterStatus,
  PrinterEventMap,
  FlowControlOptions,
} from "./device/types.js";
export {
  registerDevice,
  findDeviceByName,
  getDevice,
  getRegisteredDevices,
} from "./device/registry.js";
export { markP15Profile, p15Profile } from "./device/profiles/mark-p15.js";
export { markP12Profile, p12Profile } from "./device/profiles/mark-p12.js";
export { markM60Profile, m60Profile } from "./device/profiles/mark-m60.js";
export { phoP12Profile } from "./device/profiles/pho-p12.js";

// Image pipeline
export type { RawImageData } from "./image/types.js";
export {
  processImage,
  toGrayscale,
  floydSteinbergDither,
  threshold,
  packBits,
} from "./image/pipeline.js";
export type { ProcessImageOptions, DitherMode } from "./image/pipeline.js";

// Debug logging
export {
  debugLog,
  getDebugLog,
  getDebugLogVersion,
  clearDebugLog,
  onDebugLogChange,
  exportDebugLog,
} from "./debug-log.js";
export type { DebugEntry } from "./debug-log.js";

// Unit conversion
export { PX_PER_MM, mmToPx, pxToMm } from "./utils/px-mm.js";
