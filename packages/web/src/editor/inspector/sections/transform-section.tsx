import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, NumInput } from "../fields.tsx";

interface Props {
  element: BaseElement;
}

export function TransformSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const label = useEditorV2Store((s) => s.label);

  const update = (patch: Partial<BaseElement>) =>
    updateElement(element.id, patch);

  const alignH = () =>
    update({ x: Math.round((label.widthPx - element.width) / 2) });
  const alignV = () =>
    update({ y: Math.round((label.heightPx - element.height) / 2) });
  const alignBoth = () =>
    update({
      x: Math.round((label.widthPx - element.width) / 2),
      y: Math.round((label.heightPx - element.height) / 2),
    });

  const fitToLabel = () => {
    const p = element.props as { naturalWidth?: number; naturalHeight?: number };
    const marginFactor = 0.9; // 90% of label size (10% padding)
    const maxW = label.widthPx * marginFactor;
    const maxH = label.heightPx * marginFactor;

    let newW = maxW;
    let newH = maxH;

    if (element.type === "qrcode") {
      const size = Math.round(Math.min(maxW, maxH));
      newW = size;
      newH = size;
    } else if (p.naturalWidth && p.naturalHeight) {
      const ratio = Math.min(maxW / p.naturalWidth, maxH / p.naturalHeight);
      newW = Math.round(p.naturalWidth * ratio);
      newH = Math.round(p.naturalHeight * ratio);
    } else if (element.type === "barcode") {
      newW = Math.round(maxW);
      newH = Math.round(Math.min(maxH, maxW * 0.45));
    } else if (element.width && element.height) {
      const ratio = Math.min(maxW / element.width, maxH / element.height);
      newW = Math.round(element.width * ratio);
      newH = Math.round(element.height * ratio);
    } else {
      newW = Math.round(maxW);
      newH = Math.round(maxH);
    }

    update({
      width: newW,
      height: newH,
      x: Math.round((label.widthPx - newW) / 2),
      y: Math.round((label.heightPx - newH) / 2),
    });
  };

  const rotateAroundCenter = (newDeg: number) => {
    const oldRad = ((element.rotation || 0) * Math.PI) / 180;
    const newRad = (newDeg * Math.PI) / 180;

    const dx = element.width / 2;
    const dy = element.height / 2;

    // 1. Current center in canvas coordinates
    const cx = element.x + dx * Math.cos(oldRad) - dy * Math.sin(oldRad);
    const cy = element.y + dx * Math.sin(oldRad) + dy * Math.cos(oldRad);

    // 2. New top-left corner that keeps the exact same center
    const newX = cx - (dx * Math.cos(newRad) - dy * Math.sin(newRad));
    const newY = cy - (dx * Math.sin(newRad) + dy * Math.cos(newRad));

    update({
      rotation: Math.round(newDeg),
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
    });
  };

  return (
    <Section title="Transform">
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="X" mono>
          <NumInput value={element.x} onChange={(v) => update({ x: v })} suffix="px" />
        </Field>
        <Field label="Y" mono>
          <NumInput value={element.y} onChange={(v) => update({ y: v })} suffix="px" />
        </Field>
        <Field label="W" mono>
          <NumInput value={element.width} onChange={(v) => update({ width: v })} suffix="px" />
        </Field>
        <Field label="H" mono>
          <NumInput value={element.height} onChange={(v) => update({ height: v })} suffix="px" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
        <Field label="Rot" mono>
          <NumInput value={element.rotation} onChange={rotateAroundCenter} suffix="°" />
        </Field>
        <div className="flex items-center gap-1">
          <button
            onClick={alignH}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Center horizontally"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1.5" y="2.5" width="3" height="8" rx="1" strokeWidth="1" />
              <line x1="6.5" y1="1" x2="6.5" y2="12" strokeWidth="1" />
              <rect x="8.5" y="3.5" width="3" height="6" rx="1" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={alignV}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Center vertically"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2.5" y="1.5" width="8" height="3" rx="1" strokeWidth="1" />
              <line x1="1" y1="6.5" x2="12" y2="6.5" strokeWidth="1" />
              <rect x="3.5" y="8.5" width="6" height="3" rx="1" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={alignBoth}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Center both"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1.5 4.5V2C1.5 1.7 1.7 1.5 2 1.5H4.5" strokeWidth="1.2" />
              <path d="M9.5 1.5H12C12.3 1.5 12.5 1.7 12.5 2V4.5" strokeWidth="1.2" />
              <path d="M1.5 9.5V12C1.5 12.3 1.7 12.5 2 12.5H4.5" strokeWidth="1.2" />
              <path d="M9.5 12.5H12C12.3 12.5 12.5 12.3 12.5 12V9.5" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={fitToLabel}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Fit to label / Maximize"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1.5 4.5V2C1.5 1.7 1.7 1.5 2 1.5H4.5" strokeWidth="1.2" />
              <path d="M9.5 1.5H12C12.3 1.5 12.5 1.7 12.5 2V4.5" strokeWidth="1.2" />
              <path d="M1.5 9.5V12C1.5 12.3 1.7 12.5 2 12.5H4.5" strokeWidth="1.2" />
              <path d="M9.5 12.5H12C12.3 12.5 12.5 12.3 12.5 12V9.5" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>
    </Section>
  );
}
