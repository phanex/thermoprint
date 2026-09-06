import { useEffect, useState, useRef } from "react";
import { Image as KonvaImage, Rect, Text, Group } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

import { useElementDrag } from "../use-element-drag.ts";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function ImageElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Image>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  const p = element.props as { src?: string };

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!p.src) return;
    const img = new window.Image();
    img.src = p.src;
    img.onload = () => {
      setImage(img);
      if (ref.current) {
        ref.current.getLayer()?.batchDraw();
      }
    };
  }, [p.src]);

  if (!image) {
    return (
      <>
        <Group
          ref={ref as unknown as React.RefObject<Konva.Group>}
          id={element.id}
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
          <Rect
            width={element.width}
            height={element.height}
            fill="#f0f0f0"
            stroke="#ccc"
            strokeWidth={1}
          />
          <Text
            width={element.width}
            height={element.height}
            text="IMG"
            align="center"
            verticalAlign="middle"
            fontSize={12}
            fontFamily="monospace"
            fill="#999"
            listening={false}
          />
        </Group>
        <ElementWrapper
          nodeRef={ref}
          isSelected={isSelected}
          deps={[image, element.width, element.height, p.src]}
        />
      </>
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
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      <ElementWrapper
        nodeRef={ref}
        isSelected={isSelected}
        deps={[image, element.width, element.height, p.src]}
      />
    </>
  );
}
