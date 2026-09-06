import { useRef } from "react";
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
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  const p = element.props as {
    stroke?: string;
    strokeWidth?: number;
  };

  return (
    <>
      <Line
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        points={[0, 0, element.width, element.height]}
        stroke={p.stroke || "#000000"}
        strokeWidth={p.strokeWidth ?? 2}
        hitStrokeWidth={Math.max(10, (p.strokeWidth ?? 2) + 8)}
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
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, element.width * scaleX),
            height: element.height * scaleY,
            rotation: node.rotation(),
          });
        }}
      />
      <ElementWrapper nodeRef={ref as React.RefObject<Konva.Node>} isSelected={isSelected} />
    </>
  );
}
