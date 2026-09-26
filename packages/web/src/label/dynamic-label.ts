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

export interface DynamicFitResult {
  label: LabelSize;
  elements: BaseElement[];
  deltaPanX: number;
}

/**
 * Fits continuous ribbon snugly around canvas elements:
 * - Zero arbitrary padding (pure bounding box of elements).
 * - Left edge of content snaps exactly flush to the end of the lead cutter margin (leadPx).
 * - Right cutter margin (trailPx) starts immediately flush to the rightmost edge of content.
 * - Compensates panX so the visual screen position of all elements remains 100% stationary (zero jumping).
 */
export function fitDynamicLabel(
  elements: BaseElement[],
  currentLabel: LabelSize,
  cutterMargins?: { leadMm: number; trailMm: number },
  zoom: number = 1,
): DynamicFitResult {
  if (!currentLabel.isDynamic) {
    return { label: currentLabel, elements, deltaPanX: 0 };
  }

  const tapeWidthMm =
    currentLabel.tapeWidthMm ?? Math.min(currentLabel.widthMm, currentLabel.heightMm);
  const leadMm = cutterMargins?.leadMm ?? 0;
  const trailMm = cutterMargins?.trailMm ?? 0;
  const leadPx = mmToPx(leadMm);
  const trailPx = mmToPx(trailMm);

  if (elements.length === 0) {
    const defaultLenMm = Math.max(30, leadMm + trailMm + 10);
    const newWidthPx = mmToPx(defaultLenMm);
    const deltaPanX = ((newWidthPx - currentLabel.widthPx) * zoom) / 2;
    return {
      label: {
        ...currentLabel,
        widthMm: defaultLenMm,
        heightMm: tapeWidthMm,
        widthPx: newWidthPx,
        heightPx: mmToPx(tapeWidthMm),
        labelLengthMm: defaultLenMm,
        tapeWidthMm,
        isDynamic: true,
      },
      elements,
      deltaPanX,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
  }

  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = leadPx;
    maxX = leadPx + 100;
  }

  // Pure fit: zero artificial padding
  const contentWidth = Math.max(1, maxX - minX);
  const targetMinX = leadPx;
  const shiftX = Math.round(targetMinX - minX);

  const nextElements =
    shiftX === 0
      ? elements
      : elements.map((el) => ({ ...el, x: Math.round(el.x + shiftX) }));

  const newWidthPx = Math.round(leadPx + contentWidth + trailPx);
  const newWidthMm = Math.max(1, Math.round(pxToMm(newWidthPx)));

  // Exact camera stabilization formula:
  // (newWidthPx - oldWidthPx) * zoom / 2 - shiftX * zoom ensures elements don't move on screen.
  const oldWidthPx = currentLabel.widthPx;
  const deltaPanX = ((newWidthPx - oldWidthPx) * zoom) / 2 - shiftX * zoom;

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
    deltaPanX,
  };
}

/**
 * Backward compatibility wrapper returning only the next label config.
 */
export function computeDynamicLabel(
  elements: BaseElement[],
  currentLabel: LabelSize,
  cutterMargins?: { leadMm: number; trailMm: number },
): LabelSize {
  return fitDynamicLabel(elements, currentLabel, cutterMargins, 1).label;
}
