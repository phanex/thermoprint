import { Group, Rect, Line } from "react-konva";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { isElementOffCanvas } from "../../label/dynamic-label.ts";
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
 * Renders dashed amber ghost boxes for elements completely outside the printable canvas bounds.
 * Enables direct click-to-select and drag-to-move recovery back onto the printable label.
 */
export function OffCanvasGhostOverlay() {
  const elements = useEditorV2Store((s) => s.elements);
  const label = useEditorV2Store((s) => s.label);

  const offCanvasElements = elements.filter((el) =>
    isElementOffCanvas(el, label.widthPx, label.heightPx),
  );

  if (offCanvasElements.length === 0) return null;

  return (
    <Group id="canvas-off-screen-ghosts">
      {offCanvasElements.map((el) => (
        <OffCanvasGhostItem key={`ghost-${el.id}`} element={el} />
      ))}
    </Group>
  );
}
