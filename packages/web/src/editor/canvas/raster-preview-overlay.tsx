import { useEffect, useState, useRef, useCallback } from "react";
import { Image as KonvaImage, Group } from "react-konva";
import Konva from "konva";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { capturePrintheadBitmap } from "./capture.ts";

export function RasterPreviewOverlay() {
  const elements = useEditorV2Store((s) => s.elements);
  const label = useEditorV2Store((s) => s.label);
  const printSettings = useEditorV2Store((s) => s.printSettings);
  const paperType = useEditorV2Store((s) => s.paperType);

  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isStale, setIsStale] = useState(false);
  const isInteractingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const generatePreview = useCallback(() => {
    try {
      const stage = Konva.stages[0];
      if (!stage) return;

      const w = label.widthPx;
      const h = label.heightPx;
      if (w <= 0 || h <= 0) return;

      // Generate composite 1-bit thermal printhead bitmap:
      // Non-raster elements (shapes, text) use Bayer 8x8; photos use selected dither
      const bitmap = capturePrintheadBitmap(stage, w, h, elements, {
        dither: printSettings.ditherMode || "floyd-steinberg",
        threshold: printSettings.threshold ?? 128,
      });

      // Unpack 1bpp bitmap to an RGBA canvas for display (1 = black, 0 = white)
      const display = document.createElement("canvas");
      display.width = w;
      display.height = h;
      const dCtx = display.getContext("2d");
      if (!dCtx) return;
      const outImg = dCtx.createImageData(w, h);
      const outData = outImg.data;

      for (let y = 0; y < h; y++) {
        const rowStart = y * bitmap.bytesPerRow;
        const pxRowStart = y * w * 4;
        for (let x = 0; x < w; x++) {
          const byteIdx = rowStart + (x >> 3);
          const bitIdx = 7 - (x & 7);
          const isBlack = (bitmap.data[byteIdx] >> bitIdx) & 1;
          const pxOffset = pxRowStart + x * 4;
          const val = isBlack ? 0 : 255;
          outData[pxOffset] = val;
          outData[pxOffset + 1] = val;
          outData[pxOffset + 2] = val;
          outData[pxOffset + 3] = 255;
        }
      }
      dCtx.putImageData(outImg, 0, 0);

      setPreviewCanvas(display);
      setIsStale(false);
    } catch (err) {
      console.warn("Failed to generate raster preview:", err);
    }
  }, [elements, label.widthPx, label.heightPx, printSettings.ditherMode, printSettings.threshold]);

  // Hook into Konva stage drag & transform events: hide preview during motion AND during post-motion debounce
  useEffect(() => {
    const stage = Konva.stages[0];
    if (!stage) return;

    const onStart = () => {
      isInteractingRef.current = true;
      setIsStale(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onEnd = () => {
      isInteractingRef.current = false;
      // Keep isStale true so the old stale preview is NEVER displayed while waiting for the timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isInteractingRef.current) {
          generatePreview();
        }
      }, 1000);
    };

    stage.on("dragstart transformstart", onStart);
    stage.on("dragend transformend", onEnd);

    return () => {
      stage.off("dragstart transformstart", onStart);
      stage.off("dragend transformend", onEnd);
    };
  }, [generatePreview]);

  // Handle data updates (elements, size, settings) with 1000ms debounce
  useEffect(() => {
    if (isInteractingRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Immediate generation on first activation
      const initialTimer = setTimeout(() => {
        generatePreview();
      }, 50);
      return () => clearTimeout(initialTimer);
    }

    // Mark current preview as stale so the old preview is not shown while waiting for debounce
    setIsStale(true);

    // Debounce subsequent updates by 1000ms
    timerRef.current = setTimeout(() => {
      if (!isInteractingRef.current) {
        generatePreview();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [elements, label.widthPx, label.heightPx, printSettings.ditherMode, printSettings.threshold, generatePreview]);

  if (isStale || !previewCanvas) return null;

  const w = label.widthPx;
  const h = label.heightPx;

  return (
    <Group
      id="canvas-raster-preview"
      listening={false}
      clipFunc={(ctx) => {
        ctx.beginPath();
        if (paperType === "continuous") {
          ctx.rect(0, 0, w, h);
        } else {
          const r = Math.min(10, w / 2, h / 2);
          if (typeof (ctx as unknown as { roundRect?: Function }).roundRect === "function") {
            (ctx as unknown as { roundRect: Function }).roundRect(0, 0, w, h, r);
          } else {
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.arcTo(w, 0, w, r, r);
            ctx.lineTo(w, h - r);
            ctx.arcTo(w, h, w - r, h, r);
            ctx.lineTo(r, h);
            ctx.arcTo(0, h, 0, h - r, r);
            ctx.lineTo(0, r);
            ctx.arcTo(0, 0, r, 0, r);
            ctx.closePath();
          }
        }
      }}
    >
      <KonvaImage
        image={previewCanvas}
        x={0}
        y={0}
        width={w}
        height={h}
        listening={false}
      />
    </Group>
  );
}
