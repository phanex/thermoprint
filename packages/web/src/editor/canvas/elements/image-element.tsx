import { useEffect, useState, useMemo, useRef } from "react";
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

  const p = element.props as {
    src?: string;
    flipH?: boolean;
    flipV?: boolean;
    invert?: boolean;
  };

  const flipH = Boolean(p.flipH);
  const flipV = Boolean(p.flipV);

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

  // Compute pixel buffer with flip and invert applied directly in-memory
  const displayImage = useMemo(() => {
    if (!image) return null;
    if (!flipH && !flipV && !p.invert) return image;
    try {
      const w = image.naturalWidth || image.width;
      const h = image.naturalHeight || image.height;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return image;

      ctx.save();
      if (flipH) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      if (flipV) {
        ctx.translate(0, h);
        ctx.scale(1, -1);
      }
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      if (p.invert) {
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = 255 - d[i];
          d[i + 1] = 255 - d[i + 1];
          d[i + 2] = 255 - d[i + 2];
        }
        ctx.putImageData(id, 0, 0);
      }
      return c;
    } catch {
      return image;
    }
  }, [image, flipH, flipV, p.invert]);

  if (!displayImage) {
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
        image={displayImage}
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
          const newW = Math.max(5, Math.round(node.width() * scaleX));
          const newH = Math.max(5, Math.round(node.height() * scaleY));
          node.scaleX(1);
          node.scaleY(1);
          updateElement(element.id, {
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: newW,
            height: newH,
            rotation: Math.round(node.rotation()),
          });
        }}
      />
      <ElementWrapper
        nodeRef={ref}
        isSelected={isSelected}
        deps={[
          displayImage,
          element.x,
          element.y,
          element.width,
          element.height,
          element.rotation,
          p.src,
        ]}
      />
    </>
  );
}
