import { mmToPx, pxToMm, getDevice, evaluateTemplate } from "@thermoprint/core";
import type { BaseElement, LabelSize } from "../store/editor-store.ts";
import { getDisplayText } from "../lib/date-format.ts";
import { getPrimaryFontFamily } from "../lib/fonts.ts";

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

  const minLenPx = mmToPx(minLenMm);
  const contentWidthPx = Math.max(1, maxX - minX);

  // CASE 1: Content fits within the minimum tape length (contentWidthPx <= minLenPx)
  if (contentWidthPx <= minLenPx) {
    let shiftX = 0;

    if (minX < 0) {
      // Pushed into left ear: snug against left edge (minX becomes 0)
      shiftX = Math.round(0 - minX);
    } else if (maxX > minLenPx) {
      // Pushed into right ear: snug against right edge (maxX becomes minLenPx)
      shiftX = Math.round(minLenPx - maxX);
    } else {
      // Inside [0 .. minLenPx]: keep exact user positioning (e.g. centered)!
      shiftX = 0;
    }

    const nextElements =
      shiftX === 0
        ? elements
        : elements.map((el) => ({ ...el, x: Math.round(el.x + shiftX) }));

    return {
      label: {
        ...currentLabel,
        widthMm: minLenMm,
        heightMm: tapeWidthMm,
        widthPx: minLenPx,
        heightPx: mmToPx(tapeWidthMm),
        labelLengthMm: minLenMm,
        tapeWidthMm,
        isDynamic: true,
      },
      elements: nextElements,
      shiftX,
    };
  }

  // CASE 2: Content is longer than minimum tape length (contentWidthPx > minLenPx)
  // Dynamic expansion: canvas expands to fit content, snaps flush between both ears
  const rawContentMm = Math.ceil(pxToMm(contentWidthPx));
  const newWidthMm = Math.max(minLenMm, rawContentMm);
  const newWidthPx = mmToPx(newWidthMm);

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

let _measureCanvas: HTMLCanvasElement | null = null;
let _measureCtx: CanvasRenderingContext2D | null = null;

export function measureTextMetrics(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight = 400,
  italic = false,
  letterSpacing = 0,
  lineHeight = 1,
): { width: number; height: number } {
  if (typeof document === "undefined") {
    return { width: 100, height: 24 };
  }
  if (!_measureCanvas) {
    _measureCanvas = document.createElement("canvas");
    _measureCtx = _measureCanvas.getContext("2d");
  }
  if (!_measureCtx) {
    return { width: 100, height: 24 };
  }

  const style = italic ? "italic" : "normal";
  const weight = fontWeight >= 600 ? "700" : "400";
  const primaryFamily = getPrimaryFontFamily(fontFamily);
  const fontSpec = `${style} ${weight} ${fontSize}px "${primaryFamily}", sans-serif`;
  _measureCtx.font = fontSpec;

  const lines = text.split("\n");
  let maxW = 0;
  for (const line of lines) {
    const metrics = _measureCtx.measureText(line);
    let w = metrics.width;
    if (letterSpacing && line.length > 1) {
      w += (line.length - 1) * letterSpacing;
    }
    if (w > maxW) maxW = w;
  }

  const lineH = Math.ceil(fontSize * lineHeight);
  const totalH = Math.max(lineH, lines.length * lineH);

  return {
    width: Math.max(20, Math.ceil(maxW)),
    height: totalH,
  };
}

/**
 * Evaluates elements for a specific batch item and re-fits dynamic dimensions if continuous.
 */
export function fitBatchElements(
  elements: BaseElement[],
  currentLabel: LabelSize,
  context: { index: number; csvRow?: Record<string, string> },
): {
  elements: BaseElement[];
  label: LabelSize;
  shouldStop: boolean;
} {
  let shouldStop = false;

  const evaluatedElements = elements.map((el) => {
    if (el.type === "text") {
      const p = el.props as {
        text?: string;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: number;
        italic?: boolean;
        letterSpacing?: number;
        lineHeight?: number;
        uppercase?: boolean;
        datePreset?: string;
        dateLocale?: string;
        autoWidth?: boolean;
      };

      const dateEvaluated = getDisplayText(p.text ?? "", p.datePreset as any, p.dateLocale);
      const res = evaluateTemplate(dateEvaluated, context);
      if (res.stopPrint) shouldStop = true;

      const finalText = p.uppercase ? res.text.toUpperCase() : res.text;

      let nextW = el.width;
      let nextH = el.height;
      if (p.autoWidth !== false) {
        const metrics = measureTextMetrics(
          finalText,
          p.fontSize || 18,
          p.fontFamily || "Inter",
          p.fontWeight || 400,
          !!p.italic,
          p.letterSpacing || 0,
          p.lineHeight || 1,
        );
        nextW = metrics.width;
        nextH = metrics.height;
      }

      return {
        ...el,
        width: nextW,
        height: nextH,
        props: {
          ...el.props,
          text: finalText,
        },
      };
    }

    if (el.type === "barcode" || el.type === "qrcode") {
      const p = el.props as { content?: string };
      const dateEvaluated = getDisplayText(p.content ?? "");
      const res = evaluateTemplate(dateEvaluated, context);
      if (res.stopPrint) shouldStop = true;

      return {
        ...el,
        props: {
          ...el.props,
          content: res.text,
        },
      };
    }

    return el;
  });

  if (currentLabel.isDynamic) {
    const fit = fitDynamicLabel(evaluatedElements, currentLabel);
    return {
      elements: fit.elements,
      label: fit.label,
      shouldStop,
    };
  }

  return {
    elements: evaluatedElements,
    label: currentLabel,
    shouldStop,
  };
}

