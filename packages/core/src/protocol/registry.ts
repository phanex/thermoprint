import type { PrinterProtocol } from "./types.js";
import { MarkL11Protocol } from "./mark-l11/protocol.js";
import { MarkX2Protocol } from "./mark-x2/protocol.js";
import { PhoP12Protocol } from "./pho-p12/protocol.js";
import { ThermoprintError, ErrorCode } from "../errors.js";

type ProtocolFactory = () => PrinterProtocol;

const protocols = new Map<string, ProtocolFactory>();

export function registerProtocol(id: string, factory: ProtocolFactory): void {
  protocols.set(id, factory);
}

export function getProtocol(id: string): PrinterProtocol {
  const factory = protocols.get(id);
  if (!factory) {
    throw new ThermoprintError(
      ErrorCode.UNKNOWN_PROTOCOL,
      `Unknown protocol: ${id}`,
    );
  }
  return factory();
}

export function getRegisteredProtocolIds(): string[] {
  return [...protocols.keys()];
}

// Register built-in protocols (vendor-prefixed standard)
registerProtocol("mark-l11", () => new MarkL11Protocol());
registerProtocol("mark-x2", () => new MarkX2Protocol());
registerProtocol("pho-p12", () => new PhoP12Protocol());

// Backward-compatible aliases
registerProtocol("l11", () => new MarkL11Protocol());
registerProtocol("x2", () => new MarkX2Protocol());
