import { SquareArrowOutUpRight } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, NumInput, ColorInput, Select } from "../fields.tsx";

interface Props {
  element: BaseElement;
}

export function ShapeSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);

  const p = element.props as {
    shapeType?: "rect" | "ellipse" | "polygon" | "star";
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    cornerRadius?: number;
    sides?: number;
    points?: number;
    depth?: number;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  const shapeType = p.shapeType || (element.type === "line" ? "line" : "rect");

  const makeSquare = () => {
    const label = useEditorV2Store.getState().label;
    const target = Math.round(Math.max(element.width, element.height));
    const size = Math.min(target, Math.max(label.widthPx, label.heightPx));
    const dx = Math.round((element.width - size) / 2);
    const dy = Math.round((element.height - size) / 2);
    updateElement(element.id, {
      x: element.x + dx,
      y: element.y + dy,
      width: size,
      height: size,
    });
  };

  return (
    <Section title={element.type === "line" ? "Line" : "Shape"}>
      <div className="space-y-3">
        {/* Shape Type Selector for 2D shapes */}
        {element.type === "rect" && (
          <div className="grid grid-cols-[auto_1fr] gap-x-2 items-center">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
              Shape
            </span>
            <Select
              value={shapeType}
              onChange={(v) => {
                const patch: Record<string, unknown> = { shapeType: v };
                if (v === "polygon" && p.sides === undefined) patch.sides = 3;
                if (v === "star") {
                  if (p.points === undefined) patch.points = 5;
                  if (p.depth === undefined) patch.depth = 50;
                }
                update(patch);
              }}
              options={[
                { value: "rect", label: "Rectangle" },
                { value: "ellipse", label: "Ellipse" },
                { value: "polygon", label: "Polygon" },
                { value: "star", label: "Star" },
              ]}
            />
          </div>
        )}

        {/* Rectangle Corner Radius + 1:1 Reset */}
        {element.type === "rect" && shapeType === "rect" && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
                Radius
              </span>
              <div className="w-[54px]" title="Corner radius">
                <NumInput
                  value={p.cornerRadius ?? 0}
                  onChange={(v) => update({ cornerRadius: v })}
                  suffix="px"
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={makeSquare}
              title="Reset to 1:1 square proportions"
              className="w-7 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 hover:border-white/10 text-ink-300 hover:text-ink-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <SquareArrowOutUpRight size={13} />
            </button>
          </div>
        )}

        {/* Polygon Sides + 1:1 Reset */}
        {element.type === "rect" && shapeType === "polygon" && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
                Sides
              </span>
              <div className="w-[54px]" title="Number of vertices">
                <NumInput
                  value={p.sides ?? 3}
                  onChange={(v) => update({ sides: Math.max(3, Math.min(20, v)) })}
                  min={3}
                  max={20}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={makeSquare}
              title="Reset to 1:1 regular proportions"
              className="w-7 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 hover:border-white/10 text-ink-300 hover:text-ink-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <SquareArrowOutUpRight size={13} />
            </button>
          </div>
        )}

        {/* Ellipse 1:1 Circle Reset */}
        {element.type === "rect" && shapeType === "ellipse" && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={makeSquare}
              title="Reset to 1:1 circle proportions"
              className="w-7 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 hover:border-white/10 text-ink-300 hover:text-ink-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <SquareArrowOutUpRight size={13} />
            </button>
          </div>
        )}

        {/* Star Points & Depth + 1:1 Reset */}
        {element.type === "rect" && shapeType === "star" && (
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
                Points
              </span>
              <div className="w-[48px]" title="Number of points">
                <NumInput
                  value={p.points ?? 5}
                  onChange={(v) => update({ points: Math.max(3, Math.min(20, v)) })}
                  min={3}
                  max={20}
                />
              </div>
              <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium ml-1">
                Depth
              </span>
              <div className="w-[54px]" title="Inner depth percentage">
                <NumInput
                  value={p.depth ?? 50}
                  onChange={(v) => update({ depth: Math.max(10, Math.min(90, v)) })}
                  suffix="%"
                  min={10}
                  max={90}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={makeSquare}
              title="Reset to 1:1 regular proportions"
              className="w-7 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 hover:border-white/10 text-ink-300 hover:text-ink-50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <SquareArrowOutUpRight size={13} />
            </button>
          </div>
        )}

        {/* Stroke Block */}
        <div className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-1.5 items-center">
          <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
            Stroke
          </span>
          <div className="w-[54px]" title="Stroke thickness">
            <NumInput
              value={p.strokeWidth ?? 2}
              onChange={(v) => update({ strokeWidth: v })}
              suffix="px"
              min={1}
              max={50}
            />
          </div>
          <ColorInput
            value={p.stroke || (element.type === "line" ? "#000000" : "none")}
            onChange={(v) => update({ stroke: v })}
            allowTransparent={element.type !== "line"}
            contents
          />
        </div>

        {/* Fill Block (for 2D shapes) */}
        {element.type === "rect" && (
          <div className="space-y-1.5 pt-1">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 font-medium">
              Fill
            </span>
            <ColorInput
              value={p.fill || "none"}
              onChange={(v) => update({ fill: v })}
              allowTransparent
            />
          </div>
        )}
      </div>
    </Section>
  );
}
