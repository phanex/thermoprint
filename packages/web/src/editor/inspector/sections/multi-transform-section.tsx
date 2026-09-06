import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Focus,
} from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, NumInput } from "../fields.tsx";

interface Props {
  elements: BaseElement[];
}

export function MultiTransformSection({ elements }: Props) {
  const updateElements = useEditorV2Store((s) => s.updateElements);
  const label = useEditorV2Store((s) => s.label);

  const minX = Math.min(...elements.map((e) => e.x));
  const minY = Math.min(...elements.map((e) => e.y));
  const maxX = Math.max(...elements.map((e) => e.x + e.width));
  const maxY = Math.max(...elements.map((e) => e.y + e.height));
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  const updateX = (newX: number) => {
    const dx = newX - minX;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { x: Math.round(e.x + dx) };
    });
    updateElements(patches);
  };

  const updateY = (newY: number) => {
    const dy = newY - minY;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { y: Math.round(e.y + dy) };
    });
    updateElements(patches);
  };

  const updateW = (newW: number) => {
    if (width <= 0) return;
    const scale = newW / width;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = {
        x: Math.round(minX + (e.x - minX) * scale),
        width: Math.max(1, Math.round(e.width * scale)),
      };
    });
    updateElements(patches);
  };

  const updateH = (newH: number) => {
    if (height <= 0) return;
    const scale = newH / height;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = {
        y: Math.round(minY + (e.y - minY) * scale),
        height: Math.max(1, Math.round(e.height * scale)),
      };
    });
    updateElements(patches);
  };

  const alignLeft = () => {
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { x: minX };
    });
    updateElements(patches);
  };

  const alignCenterH = () => {
    const centerX = (minX + maxX) / 2;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { x: Math.round(centerX - e.width / 2) };
    });
    updateElements(patches);
  };

  const alignRight = () => {
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { x: maxX - e.width };
    });
    updateElements(patches);
  };

  const alignTop = () => {
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { y: minY };
    });
    updateElements(patches);
  };

  const alignCenterV = () => {
    const centerY = (minY + maxY) / 2;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { y: Math.round(centerY - e.height / 2) };
    });
    updateElements(patches);
  };

  const alignBottom = () => {
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { y: maxY - e.height };
    });
    updateElements(patches);
  };

  const centerOnLabel = () => {
    const targetX = Math.round((label.widthPx - width) / 2);
    const targetY = Math.round((label.heightPx - height) / 2);
    const dx = targetX - minX;
    const dy = targetY - minY;
    const patches: Record<string, Partial<BaseElement>> = {};
    elements.forEach((e) => {
      patches[e.id] = { x: e.x + dx, y: e.y + dy };
    });
    updateElements(patches);
  };

  const distributeH = () => {
    if (elements.length < 3) return;
    const sorted = [...elements].sort((a, b) => a.x - b.x);
    const leftmost = sorted[0];
    const rightmost = sorted[sorted.length - 1];
    const totalW = sorted.reduce((sum, el) => sum + el.width, 0);
    const span = rightmost.x + rightmost.width - leftmost.x;
    const totalGaps = span - totalW;
    const gap = totalGaps / (sorted.length - 1);

    const patches: Record<string, Partial<BaseElement>> = {};
    let currentX = leftmost.x + leftmost.width + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      patches[sorted[i].id] = { x: Math.round(currentX) };
      currentX += sorted[i].width + gap;
    }
    updateElements(patches);
  };

  const distributeV = () => {
    if (elements.length < 3) return;
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    const topmost = sorted[0];
    const bottommost = sorted[sorted.length - 1];
    const totalH = sorted.reduce((sum, el) => sum + el.height, 0);
    const span = bottommost.y + bottommost.height - topmost.y;
    const totalGaps = span - totalH;
    const gap = totalGaps / (sorted.length - 1);

    const patches: Record<string, Partial<BaseElement>> = {};
    let currentY = topmost.y + topmost.height + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      patches[sorted[i].id] = { y: Math.round(currentY) };
      currentY += sorted[i].height + gap;
    }
    updateElements(patches);
  };

  return (
    <>
      <Section title="Selection Bounds">
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="X" mono>
            <NumInput value={minX} onChange={updateX} suffix="px" />
          </Field>
          <Field label="Y" mono>
            <NumInput value={minY} onChange={updateY} suffix="px" />
          </Field>
          <Field label="W" mono>
            <NumInput value={width} onChange={updateW} suffix="px" />
          </Field>
          <Field label="H" mono>
            <NumInput value={height} onChange={updateH} suffix="px" />
          </Field>
        </div>
      </Section>

      <Section title="Align & Distribute">
        <div className="flex flex-col gap-1.5">
          {/* Horizontal Align */}
          <div className="flex items-center gap-1">
            <button
              onClick={alignLeft}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align left"
            >
              <AlignHorizontalJustifyStart size={15} />
            </button>
            <button
              onClick={alignCenterH}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align center horizontally"
            >
              <AlignHorizontalJustifyCenter size={15} />
            </button>
            <button
              onClick={alignRight}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align right"
            >
              <AlignHorizontalJustifyEnd size={15} />
            </button>
            <button
              onClick={distributeH}
              disabled={elements.length < 3}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 disabled:opacity-30 disabled:hover:bg-ink-800 disabled:hover:text-ink-300 flex items-center justify-center transition-colors"
              title={elements.length < 3 ? "Distribute horizontally (needs 3+ elements)" : "Distribute horizontally"}
            >
              <AlignHorizontalDistributeCenter size={15} />
            </button>
          </div>

          {/* Vertical Align */}
          <div className="flex items-center gap-1">
            <button
              onClick={alignTop}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align top"
            >
              <AlignVerticalJustifyStart size={15} />
            </button>
            <button
              onClick={alignCenterV}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align center vertically"
            >
              <AlignVerticalJustifyCenter size={15} />
            </button>
            <button
              onClick={alignBottom}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center transition-colors"
              title="Align bottom"
            >
              <AlignVerticalJustifyEnd size={15} />
            </button>
            <button
              onClick={distributeV}
              disabled={elements.length < 3}
              className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 disabled:opacity-30 disabled:hover:bg-ink-800 disabled:hover:text-ink-300 flex items-center justify-center transition-colors"
              title={elements.length < 3 ? "Distribute vertically (needs 3+ elements)" : "Distribute vertically"}
            >
              <AlignVerticalDistributeCenter size={15} />
            </button>
          </div>

          {/* Center on label */}
          <button
            onClick={centerOnLabel}
            className="w-full h-7 mt-0.5 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center gap-1.5 text-ui-xs font-medium transition-colors"
            title="Center selection on label"
          >
            <Focus size={14} />
            <span>Center on label</span>
          </button>
        </div>
      </Section>
    </>
  );
}
