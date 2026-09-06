import { useEffect, useState, useMemo, useRef } from "react";
import { Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import JsBarcode from "jsbarcode";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

import { useElementDrag } from "../use-element-drag.ts";
import { normalizeBarcodeContent } from "../../../lib/barcode-utils.ts";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function BarcodeElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Image>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  const p = element.props as {
    content?: string;
    format?: string;
    displayValue?: boolean;
    pixelPerfect?: boolean;
  };

  const format = p.format || "CODE128";
  const rawContent = p.content ?? "1234567890";
  const showVal = p.displayValue ?? true;
  const isPixelPerfect = !!p.pixelPerfect;

  const cacheKey = useMemo(
    () => `${rawContent}|${format}|${showVal}|${isPixelPerfect}|${element.width}|${element.height}`,
    [rawContent, format, showVal, isPixelPerfect, element.width, element.height],
  );

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    document.fonts.load('16px "OCR-B"').then(() => setFontLoaded(true)).catch(() => setFontLoaded(true));
  }, []);

  useEffect(() => {
    try {
      const marginPx = 2;
      const content = normalizeBarcodeContent(rawContent, format);

      // 1. Measure module count using test render with 0 margin
      const testCanvas = document.createElement("canvas");
      JsBarcode(testCanvas, content, {
        format,
        displayValue: false,
        margin: 0,
        width: 1,
        height: 10,
      });

      const modules = testCanvas.width > 0 ? testCanvas.width : 100;

      // 2. Module width: integer dots for pixel-perfect mode, continuous for smooth mode
      const dotBarWidth = Math.max(
        1,
        Math.round((element.width - marginPx * 2) / modules),
      );
      const barWidth = isPixelPerfect
        ? dotBarWidth
        : Math.max(0.5, (element.width - marginPx * 2) / modules);

      // 3. Render at 4x oversampling (SCALE = 4) for razor-sharp canvas rendering
      const SCALE = 4;
      const barWidth4x = barWidth * SCALE;
      const margin4x = marginPx * SCALE;
      const H4x = element.height * SCALE;

      let fontSz4x = 0;
      let textMargin4x = 0;
      let barH = H4x;
      let bottomPad4x = 0;

      if (showVal) {
        // Legible, large digits (~30% of element height, capped by horizontal module width)
        const fontSz = Math.min(
          Math.round(element.height * 0.30),
          Math.max(12, Math.round(barWidth * 12)),
        );
        fontSz4x = Math.max(12 * SCALE, fontSz * SCALE);

        const capHeight4x = Math.round(fontSz4x * 0.70);
        const gap4x = Math.max(2, Math.round(1.5 * SCALE)); // 1.5px gap between bars and text
        bottomPad4x = Math.max(2, Math.round(1.5 * SCALE)); // 1.5px bottom pad for descenders

        barH = Math.max(10 * SCALE, H4x - capHeight4x - gap4x - bottomPad4x);
        textMargin4x = gap4x + capHeight4x - fontSz4x;
      }

      const canvas = document.createElement("canvas");
      JsBarcode(canvas, content, {
        format,
        displayValue: showVal,
        fontSize: fontSz4x,
        fontOptions: "",
        font: '"OCR-B", monospace',
        textMargin: textMargin4x,
        margin: 0,
        marginLeft: margin4x,
        marginRight: margin4x,
        marginBottom: bottomPad4x,
        width: barWidth4x,
        height: barH,
        background: "#ffffff",
        lineColor: "#000000",
      } as any);

      // Only snap element width if user explicitly enabled pixelPerfect mode
      if (isPixelPerfect) {
        const naturalWidth = Math.round(canvas.width / SCALE);
        if (Math.abs(element.width - naturalWidth) > 1) {
          updateElement(element.id, { width: naturalWidth });
        }
      }

      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setImage(img);
    } catch {
      // If error occurs, clear image so outdated canvas is not shown
      setImage(null);
    }
  }, [cacheKey, updateElement, element.id, element.width, element.height, rawContent, format, showVal, isPixelPerfect, fontLoaded]);

  if (!image) {
    return (
      <Rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth={1}
      />
    );
  }

  return (
    <>
      <KonvaImage
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        image={image}
        draggable
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={() => {
          const node = ref.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          const rawW = Math.max(20, node.width() * scaleX);
          const rawH = Math.max(15, element.height * scaleY);

          let finalW = Math.round(rawW);
          if (isPixelPerfect) {
            try {
              const content = normalizeBarcodeContent(rawContent, format);
              const testCanvas = document.createElement("canvas");
              JsBarcode(testCanvas, content, {
                format,
                displayValue: false,
                margin: 0,
                width: 1,
                height: 10,
              });
              const modules = testCanvas.width > 0 ? testCanvas.width : 100;
              const dotW = Math.max(1, Math.round((rawW - 4) / modules));
              finalW = modules * dotW + 4;
            } catch {}
          }

          updateElement(element.id, {
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: finalW,
            height: Math.round(rawH),
            rotation: node.rotation(),
          });
        }}
      />
      <ElementWrapper nodeRef={ref} isSelected={isSelected} deps={[image]} />
    </>
  );
}
