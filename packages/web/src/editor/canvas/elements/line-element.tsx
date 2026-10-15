import { useEffect, useRef } from "react";
import { Line } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";
import { useElementDrag } from "../use-element-drag.ts";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function LineElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Line>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  const p = element.props as {
    stroke?: string;
    strokeWidth?: number;
  };
  const strokeWidth = p.strokeWidth ?? 2;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Compute width dynamically from live points so there's zero closure lag or desync
    node.getSelfRect = function () {
      const pts = this.points();
      const w = pts && pts.length >= 4 ? pts[pts.length - 2] - pts[0] : 0;
      return { x: 0, y: -1, width: Math.max(5, w), height: 2 };
    };
  }, []);

  return (
    <>
      <Line
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        points={[0, 0, element.width, 0]}
        stroke={p.stroke || "#000000"}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        hitStrokeWidth={Math.max(14, strokeWidth + 8)}
        draggable
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={() => {
          const node = ref.current;
          if (!node) return;
          const scaleX = Math.abs(node.scaleX());
          node.scaleX(1);
          node.scaleY(1);
          const newWidth = Math.max(5, Math.round(element.width * scaleX));
          node.points([0, 0, newWidth, 0]);
          const tr =
            trRef.current ||
            (node as unknown as { _transformer?: Konva.Transformer })._transformer ||
            (node.getStage()?.findOne("Transformer") as Konva.Transformer | undefined);
          tr?.forceUpdate();
          node.getLayer()?.batchDraw();
          updateElement(element.id, {
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: newWidth,
            height: 0,
            rotation: Math.round(node.rotation()),
          });
        }}
      />
      <ElementWrapper
        nodeRef={ref as React.RefObject<Konva.Node>}
        transformerRef={trRef}
        isSelected={isSelected}
        enabledAnchors={["middle-left", "middle-right"]}
        borderEnabled={true}
        hideBorderRect={true}
        keepRatio={false}
        flipEnabled={false}
        ignoreStroke={true}
        boundBoxFunc={(oldBox, newBox) => {
          newBox.height = oldBox.height;
          if (Math.abs(newBox.width) < 5) return oldBox;
          return newBox;
        }}
        deps={[element.x, element.y, element.width, strokeWidth, element.rotation]}
      />
    </>
  );
}
