import { useRef } from "react";
import { Shape } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

import { useElementDrag } from "../use-element-drag.ts";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function RectElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Shape>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);

  const p = element.props as {
    shapeType?: "rect" | "ellipse" | "polygon" | "star";
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    sides?: number;
    points?: number;
    depth?: number;
  };

  const hasStroke =
    Boolean(p.stroke) &&
    p.stroke !== "none" &&
    p.stroke !== "transparent" &&
    (p.strokeWidth ?? 0) > 0;

  const hasFill =
    Boolean(p.fill) &&
    p.fill !== "none" &&
    p.fill !== "transparent";

  return (
    <>
      <Shape
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill={hasFill ? p.fill : undefined}
        fillEnabled={hasFill}
        stroke={hasStroke ? p.stroke : undefined}
        strokeWidth={hasStroke ? (p.strokeWidth ?? 2) : 0}
        strokeEnabled={hasStroke}
        strokeScaleEnabled={false}
        draggable
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        sceneFunc={(ctx, shape) => {
          const w = shape.width();
          const h = shape.height();
          const shapeType = p.shapeType || "rect";

          ctx.beginPath();
          if (shapeType === "ellipse") {
            ctx.ellipse(
              w / 2,
              h / 2,
              Math.max(0, w / 2),
              Math.max(0, h / 2),
              0,
              0,
              Math.PI * 2
            );
          } else if (shapeType === "polygon") {
            const sides = Math.max(3, Math.min(20, p.sides ?? 3));
            const cx = w / 2;
            const cy = h / 2;
            const rx = w / 2;
            const ry = h / 2;
            for (let i = 0; i < sides; i++) {
              const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
              const px = cx + rx * Math.cos(angle);
              const py = cy + ry * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          } else if (shapeType === "star") {
            const points = Math.max(3, Math.min(20, p.points ?? 5));
            const depthFactor = Math.max(
              0.1,
              Math.min(0.9, (p.depth ?? 50) / 100)
            );
            const cx = w / 2;
            const cy = h / 2;
            const rx = w / 2;
            const ry = h / 2;
            const innerRx = rx * depthFactor;
            const innerRy = ry * depthFactor;
            const total = points * 2;
            for (let i = 0; i < total; i++) {
              const isOuter = i % 2 === 0;
              const r_x = isOuter ? rx : innerRx;
              const r_y = isOuter ? ry : innerRy;
              const angle = -Math.PI / 2 + (i * Math.PI) / points;
              const px = cx + r_x * Math.cos(angle);
              const py = cy + r_y * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
          } else {
            // Rectangle with optional cornerRadius
            const r = Math.max(0, Math.min(p.cornerRadius ?? 0, w / 2, h / 2));
            if (r > 0) {
              ctx.moveTo(r, 0);
              ctx.lineTo(w - r, 0);
              ctx.arcTo(w, 0, w, r, r);
              ctx.lineTo(w, h - r);
              ctx.arcTo(w, h, w - r, h, r);
              ctx.lineTo(r, h);
              ctx.arcTo(0, h, 0, h - r, r);
              ctx.lineTo(0, r);
              ctx.arcTo(0, 0, r, 0, r);
            } else {
              ctx.rect(0, 0, w, h);
            }
          }
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        onTransformEnd={() => {
          const node = ref.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          updateElement(element.id, {
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: Math.max(5, Math.round(element.width * scaleX)),
            height: Math.max(5, Math.round(element.height * scaleY)),
            rotation: Math.round(node.rotation()),
          });
        }}
      />
      <ElementWrapper nodeRef={ref as React.RefObject<Konva.Node>} isSelected={isSelected} />
    </>
  );
}
