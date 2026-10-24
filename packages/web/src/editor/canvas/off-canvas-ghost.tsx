import { Group, Rect, Line } from "react-konva";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { isElementBleeding } from "../../label/dynamic-label.ts";
import { useElementDrag } from "./use-element-drag.ts";
import type { BaseElement } from "../../store/editor-store.ts";

function OffCanvasGhostItem({ element }: { element: BaseElement }) {
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  if (element.type === "line") {
    const strokeWidth = (element.props as { strokeWidth?: number })?.strokeWidth ?? 2;
    return (
      <Group
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        draggable
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <Line
          points={[0, 0, element.width, 0]}
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
          dash={[4, 4]}
          hitStrokeWidth={Math.max(14, strokeWidth + 10)}
        />
      </Group>
    );
  }

  const w = Math.max(10, element.width);
  const h = Math.max(10, element.height);

  return (
    <Group
      x={element.x}
      y={element.y}
      width={w}
      height={h}
      rotation={element.rotation}
      draggable
      onClick={handleClick}
      onTap={handleTap}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Interactive hit surface: subtle amber tint so user sees where to grab */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill="rgba(245, 158, 11, 0.08)"
        hitStrokeWidth={10}
      />

      {/* Dashed amber/orange warning outline (crisp 1px screen stroke matching selection border) */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        stroke="#f59e0b"
        strokeWidth={1}
        strokeScaleEnabled={false}
        dash={[4, 4]}
        listening={false}
      />
    </Group>
  );
}

/**
 * Renders dashed amber ghost boxes for elements extending beyond the printable canvas bounds
 * (either bleeding partially outside or parked completely off-canvas).
 *
 * Uses an inverse non-zero winding clip to strictly exclude the printable label interior,
 * guaranteeing the white label remains 100% pristine while showing clear amber warning outlines
 * in the workspace for all bleeding or parked content.
 */
export function OffCanvasGhostOverlay() {
  const elements = useEditorV2Store((s) => s.elements);
  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const rasterPreviewVisible = useEditorV2Store((s) => s.rasterPreviewVisible);

  // In live printhead raster preview mode ("eye" toggle), suppress editor bleed warnings
  // so the user sees a 100% clean simulation of the physical printed tape without ear clutter.
  if (rasterPreviewVisible) return null;

  const bleedingElements = elements.filter((el) =>
    isElementBleeding(el, label.widthPx, label.heightPx),
  );

  if (bleedingElements.length === 0) return null;

  return (
    <Group
      id="canvas-off-screen-ghosts"
      clipFunc={(ctx) => {
        const w = label.widthPx;
        const h = label.heightPx;
        ctx.beginPath();
        // 1. Outer boundary box covering entire canvas/workspace (clockwise)
        ctx.rect(-100000, -100000, 200000, 200000);

        // 2. Inner hole for the printable label (counter-clockwise)
        if (paperType === "continuous") {
          ctx.moveTo(w, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(0, h);
          ctx.lineTo(w, h);
          ctx.closePath();
        } else {
          const r = Math.min(10, w / 2, h / 2);
          ctx.moveTo(w - r, 0);
          ctx.lineTo(r, 0);
          ctx.arcTo(0, 0, 0, r, r);
          ctx.lineTo(0, h - r);
          ctx.arcTo(0, h, r, h, r);
          ctx.lineTo(w - r, h);
          ctx.arcTo(w, h, w, h - r, r);
          ctx.lineTo(w, r);
          ctx.arcTo(w, 0, w - r, 0, r);
          ctx.closePath();
        }
      }}
    >
      {bleedingElements.map((el) => (
        <OffCanvasGhostItem key={`ghost-${el.id}`} element={el} />
      ))}
    </Group>
  );
}
