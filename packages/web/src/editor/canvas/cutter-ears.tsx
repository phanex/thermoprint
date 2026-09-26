import { useMemo } from "react";
import { Group, Rect, Line } from "react-konva";
import { mmToPx } from "@thermoprint/core";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { getActiveCutterMargins } from "../../label/dynamic-label.ts";

/**
 * Creates a cached offscreen 8x8 striped canvas for diagonal hatching.
 */
function createHatchCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 12;
  canvas.height = 12;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = "rgba(100, 116, 139, 0.28)"; // subtle slate/gray hatching
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // 45-degree diagonal pattern
    ctx.moveTo(0, 12);
    ctx.lineTo(12, 0);
    ctx.moveTo(-6, 6);
    ctx.lineTo(6, -6);
    ctx.moveTo(6, 18);
    ctx.lineTo(18, 6);
    ctx.stroke();
  }
  return canvas;
}

export function CutterEars() {
  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const printer = useEditorV2Store((s) => s.printer);

  const hatchPattern = useMemo(() => createHatchCanvas(), []);

  if (paperType !== "continuous") return null;

  const margins = getActiveCutterMargins(
    printer.model || null,
    label.tapeWidthMm,
    "continuous",
  );
  if (!margins) return null;

  const leadPx = mmToPx(margins.leadMm);
  const trailPx = mmToPx(margins.trailMm);
  const w = label.widthPx;
  const h = label.heightPx;

  return (
    <Group listening={false}>
      {/* ================= LEFT EAR (Lead Margin) ================= */}
      {leadPx > 0 && (
        <Group x={-leadPx} y={0}>
          {/* 1. Opaque white backing: masks any elements sliding into negative space */}
          <Rect
            x={0}
            y={0}
            width={leadPx}
            height={h}
            fill="#ffffff"
            cornerRadius={[2, 0, 0, 2]}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={10}
            shadowOffsetY={2}
          />

          {/* 2. Diagonal hatching pattern overlay */}
          <Rect
            x={0}
            y={0}
            width={leadPx}
            height={h}
            fillPatternImage={hatchPattern as any}
            fillPatternRepeat="repeat"
          />

          {/* 3. Top and bottom subtle edge borders */}
          <Line
            points={[0, 0, leadPx, 0]}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1}
          />
          <Line
            points={[0, h, leadPx, h]}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1}
          />

          {/* 4. Outer left physical tape edge */}
          <Line
            points={[0, 0, 0, h]}
            stroke="rgba(100, 116, 139, 0.4)"
            dash={[3, 3]}
            strokeWidth={1}
          />

          {/* 5. Cut line at x = 0 (boundary with printable canvas) */}
          <Line
            points={[leadPx, 0, leadPx, h]}
            stroke="rgba(239, 68, 68, 0.55)" // subtle red cut indicator
            dash={[4, 3]}
            strokeWidth={1.5}
          />
        </Group>
      )}

      {/* ================= RIGHT EAR (Trail Margin) ================= */}
      {trailPx > 0 && (
        <Group x={w} y={0}>
          {/* 1. Opaque white backing: masks any elements sliding past canvas width */}
          <Rect
            x={0}
            y={0}
            width={trailPx}
            height={h}
            fill="#ffffff"
            cornerRadius={[0, 2, 2, 0]}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={10}
            shadowOffsetY={2}
          />

          {/* 2. Diagonal hatching pattern overlay */}
          <Rect
            x={0}
            y={0}
            width={trailPx}
            height={h}
            fillPatternImage={hatchPattern as any}
            fillPatternRepeat="repeat"
          />

          {/* 3. Top and bottom subtle edge borders */}
          <Line
            points={[0, 0, trailPx, 0]}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1}
          />
          <Line
            points={[0, h, trailPx, h]}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1}
          />

          {/* 4. Cut line at x = w (boundary with printable canvas) */}
          <Line
            points={[0, 0, 0, h]}
            stroke="rgba(239, 68, 68, 0.55)" // subtle red cut indicator
            dash={[4, 3]}
            strokeWidth={1.5}
          />

          {/* 5. Outer right physical tape edge */}
          <Line
            points={[trailPx, 0, trailPx, h]}
            stroke="rgba(100, 116, 139, 0.4)"
            dash={[3, 3]}
            strokeWidth={1}
          />
        </Group>
      )}
    </Group>
  );
}
