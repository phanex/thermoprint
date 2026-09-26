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
  const h = Math.max(0, el.height);
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
  if (tapeWidthMm === 12) {
    return getDevice("pho-p12")?.cutterMargins;
  }
  return undefined;
}

export interface DynamicFitResult {
  label: LabelSize;
  elements: BaseElement[];
  shiftX: number;
}

/**
 * Clean Dynamic Label Fitting:
 * - Canvas strictly represents the printable area: [0 .. widthPx].
 * - Point (0, 0) is the first printable dot.
 * - Minimum dynamic width is strictly (tapeWidthMm + 1) mm (e.g. 13 mm for 12 mm tape)
 *   to guarantee length > height and prevent orientation flipping.
 * - Width is rounded up to the nearest millimeter (Math.ceil).
 * - All elements are shifted as a block so the leftmost edge snaps flush to x = 0.
 */
export function fitDynamicLabel(
  elements: BaseElement[],
  currentLabel: LabelSize,
): DynamicFitResult {
  if (!currentLabel.isDynamic) {
    return { label: currentLabel, elements, shiftX: 0 };
  }

  const tapeWidthMm =
    currentLabel.tapeWidthMm ?? Math.min(currentLabel.widthMm, currentLabel.heightMm);
  const minLenMm = tapeWidthMm + 1; // e.g. 13 mm for 12 mm tape

  // 1. Empty canvas: default to minimum length
  if (elements.length === 0) {
    const defaultWidthPx = mmToPx(minLenMm);
    return {
      label: {
        ...currentLabel,
        widthMm: minLenMm,
        heightMm: tapeWidthMm,
        widthPx: defaultWidthPx,
        heightPx: mmToPx(tapeWidthMm),
        labelLengthMm: minLenMm,
        tapeWidthMm,
        isDynamic: true,
      },
      elements,
      shiftX: 0,
    };
  }

  // 2. Compute exact bounding box across all elements
  let minX = Infinity;
  let maxX = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
  }

  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = 0;
    maxX = mmToPx(minLenMm);
  }

  // 3. Content width in pixels and rounded up in millimeters
  const contentWidthPx = Math.max(1, maxX - minX);
  const rawContentMm = Math.ceil(pxToMm(contentWidthPx));
  const newWidthMm = Math.max(minLenMm, rawContentMm);
  const newWidthPx = mmToPx(newWidthMm);

  // 4. Shift elements so leftmost edge aligns to x = 0
  const shiftX = Math.round(0 - minX);

  const nextElements =
    shiftX === 0
      ? elements
      : elements.map((el) => ({ ...el, x: Math.round(el.x + shiftX) }));

  return {
    label: {
      ...currentLabel,
      widthMm: newWidthMm,
      heightMm: tapeWidthMm,
      widthPx: newWidthPx,
      heightPx: mmToPx(tapeWidthMm),
      labelLengthMm: newWidthMm,
      tapeWidthMm,
      isDynamic: true,
    },
    elements: nextElements,
    shiftX,
  };
}

/**
 * Backward compatibility wrapper returning only the next label config.
 */
export function computeDynamicLabel(
  elements: BaseElement[],
  currentLabel: LabelSize,
): LabelSize {
  return fitDynamicLabel(elements, currentLabel).label;
}
