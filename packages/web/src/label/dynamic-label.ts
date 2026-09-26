import { mmToPx, pxToMm, getDevice } from "@thermoprint/core";
import type { BaseElement, LabelSize } from "../store/editor-store.ts";

export interface ElementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculates axis-aligned bounding box coordinates for any canvas element,
 * accurately taking its rotation angle into account.
 */
export function getElementBounds(el: BaseElement): ElementBounds {
  const w = Math.max(1, el.width);
  const h = Math.max(1, el.height);
  const rot = ((el.rotation || 0) % 360 + 360) % 360;

  if (rot === 0) {
    return {
      minX: el.x,
      maxX: el.x + w,
      minY: el.y,
      maxY: el.y + h,
    };
  }

  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Four corners relative to (el.x, el.y)
  const x1 = 0;
  const y1 = 0;
  const x2 = w * cos;
  const y2 = w * sin;
  const x3 = -h * sin;
  const y3 = h * cos;
  const x4 = w * cos - h * sin;
  const y4 = w * sin + h * cos;

  return {
    minX: el.x + Math.min(x1, x2, x3, x4),
    maxX: el.x + Math.max(x1, x2, x3, x4),
    minY: el.y + Math.min(y1, y2, y3, y4),
    maxY: el.y + Math.max(y1, y2, y3, y4),
  };
}

/**
 * Resolves active physical tape cutter margins for the current printer model,
 * or defaults to Phomemo P12 (9 mm lead + 9 mm trail) for 12 mm continuous tape.
 */
export function getActiveCutterMargins(
  modelId: string | null,
  tapeWidthMm: number = 12,
  paperType: "gap" | "continuous" = "continuous",
): { leadMm: number; trailMm: number } | undefined {
  if (paperType !== "continuous") return undefined;
  if (modelId) {
    const profile = getDevice(modelId);
    return profile?.cutterMargins;
  }
  // If no printer connected, default 12mm continuous tape to pho-p12 cutter margins
  if (tapeWidthMm === 12) {
    return getDevice("pho-p12")?.cutterMargins;
  }
  return undefined;
}

/**
 * Automatically computes continuous tape length based on canvas content:
 * length = max(x + width) + padding (+ cutter margins for P12).
 *
 * Symmetrically balances left and right margins so content is aesthetically
 * centered between the feed lead-in and cutter trail-off margins.
 */
export function computeDynamicLabel(
  elements: BaseElement[],
  currentLabel: LabelSize,
  cutterMargins?: { leadMm: number; trailMm: number },
): LabelSize {
  if (!currentLabel.isDynamic) {
    return currentLabel;
  }

  const tapeWidthMm =
    currentLabel.tapeWidthMm ?? Math.min(currentLabel.widthMm, currentLabel.heightMm);
  const leadMm = cutterMargins?.leadMm ?? 0;
  const trailMm = cutterMargins?.trailMm ?? 0;
  const paddingMm = 3; // 3 mm standard breathing room
  const leadPx = mmToPx(leadMm);
  const trailPx = mmToPx(trailMm);
  const paddingPx = mmToPx(paddingMm);

  // If no elements exist on canvas, return a sensible standard continuous length (40 mm)
  if (elements.length === 0) {
    const defaultLen = 40;
    return {
      ...currentLabel,
      widthMm: defaultLen,
      heightMm: tapeWidthMm,
      widthPx: mmToPx(defaultLen),
      heightPx: mmToPx(tapeWidthMm),
      labelLengthMm: defaultLen,
      tapeWidthMm,
      isDynamic: true,
    };
  }

  let maxRightPx = -Infinity;
  let minLeftPx = Infinity;

  for (const el of elements) {
    const bounds = getElementBounds(el);
    if (bounds.maxX > maxRightPx) maxRightPx = bounds.maxX;
    if (bounds.minX < minLeftPx) minLeftPx = bounds.minX;
  }

  if (!isFinite(maxRightPx)) maxRightPx = 0;
  if (!isFinite(minLeftPx)) minLeftPx = 0;

  // Symmetric right margin:
  // If user positioned content at or past leadPx + paddingPx, mirror that whitespace
  // to the right edge before the trail margin / cutter edge.
  const leftWhitespacePx = Math.max(paddingPx, minLeftPx - leadPx);
  const rightWhitespacePx = leftWhitespacePx;

  // Total length = rightmost content edge + right whitespace + cutter trail margin
  const totalLengthPx = maxRightPx + rightWhitespacePx + trailPx;
  const lengthMm = Math.ceil(pxToMm(totalLengthPx));

  // Minimum length guarantees comfortable printable area between cutter ears:
  // For P12 with ears (9 + 9 = 18 mm), minimum is 30 mm (matching standard continuous preset).
  // For printers without ears, minimum is 20 mm. Maximum is capped at 300 mm.
  const minLenMm = cutterMargins ? Math.max(30, leadMm + trailMm + 10) : 20;
  const finalLenMm = Math.max(minLenMm, Math.min(300, lengthMm));

  return {
    ...currentLabel,
    widthMm: finalLenMm,
    heightMm: tapeWidthMm,
    widthPx: mmToPx(finalLenMm),
    heightPx: mmToPx(tapeWidthMm),
    labelLengthMm: finalLenMm,
    tapeWidthMm,
    isDynamic: true,
  };
}
