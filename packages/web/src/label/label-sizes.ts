import { getDevice, getRegisteredDevices } from "@thermoprint/core";
import type { TapeOption } from "@thermoprint/core";

export interface LabelSize {
  name: string;
  widthMm: number;
  heightMm: number;
  tapeWidthMm?: number;
  labelLengthMm?: number;
}

/**
 * Returns all available tape / roll widths (in mm) for a given printer model,
 * or across all known printer profiles if no printer is connected.
 */
export function getAvailableTapeWidths(modelId: string | null): number[] {
  const widths = new Set<number>();

  if (modelId) {
    const profile = getDevice(modelId);
    profile?.labelConfig?.tapes?.forEach((t) => widths.add(t.tapeWidthMm));
  } else {
    const devices = getRegisteredDevices();
    for (const dev of devices) {
      dev.labelConfig?.tapes?.forEach((t) => widths.add(t.tapeWidthMm));
    }
  }

  // Fallback to 12 if none found
  if (widths.size === 0) widths.add(12);

  return Array.from(widths).sort((a, b) => a - b);
}

/**
 * Returns all label sizes matching a specific tape / roll width (in mm).
 * Deduplicated and sorted by length (widthMm) ascending.
 */
export function getSizesForTapeWidth(
  modelId: string | null,
  tapeWidthMm: number,
  paperType?: "gap" | "continuous",
): LabelSize[] {
  const lengths = new Set<number>();

  const collectLengths = (tape: TapeOption) => {
    if (tape.tapeWidthMm === tapeWidthMm) {
      if (!paperType || paperType === "gap") {
        tape.gapLengthsMm?.forEach((len) => lengths.add(len));
      }
      if (!paperType || paperType === "continuous") {
        tape.continuousLengthsMm?.forEach((len) => lengths.add(len));
      }
    }
  };

  if (modelId) {
    const profile = getDevice(modelId);
    profile?.labelConfig?.tapes?.forEach(collectLengths);
  } else {
    const devices = getRegisteredDevices();
    for (const dev of devices) {
      dev.labelConfig?.tapes?.forEach(collectLengths);
    }
  }

  // If no lengths found for this width, provide a few standard lengths
  if (lengths.size === 0) {
    [30, 40, 50].forEach((l) => lengths.add(l));
  }

  return Array.from(lengths)
    .sort((a, b) => a - b)
    .map((len) => {
      const widthMm = Math.max(len, tapeWidthMm);
      const heightMm = Math.min(len, tapeWidthMm);
      return {
        name: `${widthMm} × ${heightMm} mm`,
        widthMm,
        heightMm,
        tapeWidthMm,
        labelLengthMm: len,
      };
    });
}

/**
 * Checks whether the specified printer (if connected) supports continuous tape.
 * Returns false if no printer is connected or if printer is gap-only.
 */
export function isContinuousSupported(
  modelId: string | null,
  tapeWidthMm?: number,
): boolean {
  if (!modelId) return false;
  const profile = getDevice(modelId);
  if (!profile?.labelConfig?.supportedPaperTypes?.includes("continuous")) {
    return false;
  }
  if (tapeWidthMm !== undefined) {
    const tape = profile.labelConfig.tapes?.find((t) => t.tapeWidthMm === tapeWidthMm);
    return tape?.continuous ?? false;
  }
  return true;
}

/**
 * Compatibility helper returning all configured label sizes.
 */
export function getLabelSizes(
  modelId: string | null,
  paperType?: "gap" | "continuous",
): LabelSize[] {
  const tapeWidths = getAvailableTapeWidths(modelId);
  const seen = new Set<string>();
  const result: LabelSize[] = [];
  for (const tw of tapeWidths) {
    const forTape = getSizesForTapeWidth(modelId, tw, paperType);
    for (const s of forTape) {
      const key = `${s.widthMm}x${s.heightMm}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
  }
  return result;
}

/**
 * Checks whether the current label dimensions and paper type are compatible
 * with the currently connected printer model.
 */
export function checkPrinterCompatibility(
  modelId: string | null,
  label: { widthMm: number; heightMm: number; tapeWidthMm?: number },
  paperType: "gap" | "continuous",
): { compatible: boolean; reason?: string } {
  if (!modelId) return { compatible: true };
  const profile = getDevice(modelId);
  if (!profile || !profile.labelConfig) return { compatible: true };

  const lc = profile.labelConfig;
  if (!lc.supportedPaperTypes.includes(paperType)) {
    return {
      compatible: false,
      reason: `${profile.name} only supports ${lc.supportedPaperTypes.join(", ")} paper`,
    };
  }

  const activeTapeWidth = label.tapeWidthMm ?? Math.min(label.widthMm, label.heightMm);
  const tape = lc.tapes?.find((t) => t.tapeWidthMm === activeTapeWidth);
  if (!tape) {
    const supportedWidths = lc.tapes?.map((t) => `${t.tapeWidthMm} mm`).join(", ") ?? "";
    return {
      compatible: false,
      reason: `${profile.name} does not support ${activeTapeWidth} mm tape (supported: ${supportedWidths})`,
    };
  }

  if (paperType === "gap" && tape.gapLengthsMm && tape.gapLengthsMm.length > 0) {
    const activeLen = Math.max(label.widthMm, label.heightMm);
    if (!tape.gapLengthsMm.includes(activeLen)) {
      return {
        compatible: false,
        reason: `${activeLen} × ${activeTapeWidth} mm is not a supported gap size for ${profile.name}`,
      };
    }
  }

  return { compatible: true };
}
