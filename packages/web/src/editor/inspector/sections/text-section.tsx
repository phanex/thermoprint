import { useState, useEffect, useMemo, useRef } from "react";
import {
  RefreshCw,
  Laptop,
  CalendarClock,
  Hash,
} from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import {
  Section,
  Field,
  NumInput,
  Select,
  SegBtn,
  SegGroup,
  ColorInput,
} from "../fields.tsx";
import {
  groupFonts,
  fetchSystemFonts,
  isLocalFontAccessSupported,
  getCachedSystemFonts,
  preloadFontVariants,
  ensureFontLoaded,
} from "../../../lib/fonts.ts";
import { DateDropdown } from "../dropdowns/date-dropdown.tsx";
import { FieldsDropdown } from "../dropdowns/fields-dropdown.tsx";

interface Props {
  element: BaseElement;
}

export function TextSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const fieldsBtnRef = useRef<HTMLButtonElement>(null);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false);
  const fontRowRef = useRef<HTMLDivElement>(null);

  const [systemFonts, setSystemFonts] = useState<string[]>(() =>
    getCachedSystemFonts(),
  );
  const [loadingFonts, setLoadingFonts] = useState(false);

  const handleLoadSystemFonts = async () => {
    setLoadingFonts(true);
    try {
      const fonts = await fetchSystemFonts(true);
      setSystemFonts(fonts);
    } finally {
      setLoadingFonts(false);
    }
  };

  const fontGroups = useMemo(() => groupFonts(systemFonts), [systemFonts]);

  const p = element.props as {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: number;
    fill?: string;
    align?: string;
    italic?: boolean;
    uppercase?: boolean;
    datePreset?: string;
    dateLocale?: string;
    lineHeight?: number;
  };

  useEffect(() => {
    preloadFontVariants(p.fontFamily || "Inter");
  }, [p.fontFamily]);

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  const insertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const cur = p.text || "";
      update({ text: cur && cur !== "Text" ? `${cur} ${token}` : token, datePreset: undefined });
      return;
    }
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const current = p.text || "";
    if (current === "Text" || current === "") {
      update({ text: token, datePreset: undefined });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(token.length, token.length);
      }, 0);
      return;
    }
    const next = current.slice(0, start) + token + current.slice(end);
    update({ text: next, datePreset: undefined });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleFontChange = async (v: string) => {
    preloadFontVariants(v);
    await ensureFontLoaded(v, p.fontWeight || 400, !!p.italic);
    update({ fontFamily: v });
  };

  const handleBoldToggle = async () => {
    const nextWeight = (p.fontWeight || 400) >= 600 ? 400 : 700;
    await ensureFontLoaded(p.fontFamily || "Inter", nextWeight, !!p.italic);
    update({ fontWeight: nextWeight });
  };

  const handleItalicToggle = async () => {
    const nextItalic = !p.italic;
    await ensureFontLoaded(p.fontFamily || "Inter", p.fontWeight || 400, nextItalic);
    update({ italic: nextItalic });
  };

  const fontBaseRef = useRef<{
    id: string;
    align: string;
    rotation: number;
    text: string;
    baseFontSize: number;
    baseWidth: number;
    baseHeight: number;
    anchor: { x: number; y: number };
    lastX: number;
    lastY: number;
  } | null>(null);

  const handleFontSizeChange = (newFontSize: number) => {
    const curAlign = (p.align as "left" | "center" | "right") || "left";
    const curRot = element.rotation || 0;
    const curText = p.text || "";
    const curFontSize = Math.max(1, p.fontSize || 18);

    const rad = (curRot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const isValidBase =
      fontBaseRef.current &&
      fontBaseRef.current.id === element.id &&
      fontBaseRef.current.align === curAlign &&
      fontBaseRef.current.rotation === curRot &&
      fontBaseRef.current.text === curText &&
      Math.abs(fontBaseRef.current.lastX - element.x) < 0.5 &&
      Math.abs(fontBaseRef.current.lastY - element.y) < 0.5;

    if (!isValidBase) {
      const u =
        curAlign === "center"
          ? element.width / 2
          : curAlign === "right"
          ? element.width
          : 0;
      const v = element.height / 2;
      const anchorX = element.x + u * cos - v * sin;
      const anchorY = element.y + u * sin + v * cos;

      fontBaseRef.current = {
        id: element.id,
        align: curAlign,
        rotation: curRot,
        text: curText,
        baseFontSize: curFontSize,
        baseWidth: element.width,
        baseHeight: element.height,
        anchor: { x: anchorX, y: anchorY },
        lastX: element.x,
        lastY: element.y,
      };
    }

    const base = fontBaseRef.current!;
    const scale = newFontSize / base.baseFontSize;
    const autoWidth = (p as any).autoWidth !== false;
    const newWidth = autoWidth
      ? Math.max(20, Math.round(base.baseWidth * scale))
      : element.width;
    const newHeight = Math.max(10, Math.round(base.baseHeight * scale));

    const uNew =
      curAlign === "center"
        ? newWidth / 2
        : curAlign === "right"
        ? newWidth
        : 0;
    const vNew = newHeight / 2;

    const nextX = Number((base.anchor.x - (uNew * cos - vNew * sin)).toFixed(2));
    const nextY = Number((base.anchor.y - (uNew * sin + vNew * cos)).toFixed(2));

    base.lastX = nextX;
    base.lastY = nextY;

    updateElement(element.id, {
      x: nextX,
      y: nextY,
      width: newWidth,
      height: newHeight,
      props: { fontSize: newFontSize },
    });
  };

  return (
    <>
      <Section
        title="Text"
        action={
          <div className="flex items-center gap-2">
            {/* Date dropdown button */}
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => {
                setDateMenuOpen((o) => !o);
                setFieldsMenuOpen(false);
              }}
              className="text-[11px] font-mono text-accent hover:text-accent-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Date presets & syntax"
            >
              <CalendarClock size={13} />
              <span>Date</span>
            </button>

            {/* Fields dropdown button */}
            <button
              ref={fieldsBtnRef}
              type="button"
              onClick={() => {
                setFieldsMenuOpen((o) => !o);
                setDateMenuOpen(false);
              }}
              className="text-[11px] font-mono text-accent hover:text-accent-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Counters & CSV fields"
            >
              <Hash size={13} />
              <span>Fields</span>
            </button>
          </div>
        }
      >
        {/* 2-line Textarea with native input colors and fixed size */}
        <div>
          <textarea
            ref={textareaRef}
            value={p.text ?? ""}
            onChange={(e) => update({ text: e.target.value, datePreset: undefined })}
            placeholder="Text..."
            rows={2}
            className="w-full px-2.5 py-1.5 text-ui-sm font-sans bg-ink-800 border border-white/5 focus:border-accent/50 rounded-md text-ink-100 placeholder:text-ink-500 outline-none resize-none min-h-[46px] leading-relaxed transition-colors"
          />
        </div>

        {dateMenuOpen && (
          <DateDropdown
            triggerRef={dateBtnRef}
            onClose={() => setDateMenuOpen(false)}
            onSelect={insertToken}
          />
        )}

        {fieldsMenuOpen && (
          <FieldsDropdown
            triggerRef={fieldsBtnRef}
            onClose={() => setFieldsMenuOpen(false)}
            onSelect={insertToken}
          />
        )}
      </Section>

      <Section title="Font">
        {/* Row 1: Font dropdown + style buttons + alignment buttons */}
        <div ref={fontRowRef} className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <Select
              anchorRef={fontRowRef}
              value={p.fontFamily || "Inter"}
              onChange={handleFontChange}
              options={fontGroups}
              searchable={true}
              previewFont={true}
              footer={
                isLocalFontAccessSupported() ? (
                  <button
                    type="button"
                    onClick={handleLoadSystemFonts}
                    disabled={loadingFonts}
                    className="w-full py-1 px-2 rounded-md text-[11px] font-mono text-accent hover:bg-accent/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loadingFonts ? (
                      <RefreshCw size={14} className="animate-spin text-accent" />
                    ) : (
                      <Laptop size={14} className="text-accent" />
                    )}
                    <span>
                      {loadingFonts
                        ? "Loading fonts..."
                        : systemFonts.length > 0
                        ? `Reload System Fonts (${systemFonts.length})`
                        : "+ Add System Fonts"}
                    </span>
                  </button>
                ) : null
              }
            />
          </div>
          <SegGroup className="shrink-0">
            <SegBtn
              active={(p.fontWeight || 400) >= 600}
              onClick={handleBoldToggle}
              title="Bold"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 2.5h4a2.25 2.25 0 0 1 0 4.5H3.5v-4.5Z" strokeWidth="1.3" />
                <path d="M3.5 7h4.5a2.5 2.5 0 0 1 0 5H3.5V7Z" strokeWidth="1.3" />
              </svg>
            </SegBtn>
            <SegBtn
              active={!!p.italic}
              onClick={handleItalicToggle}
              title="Italic"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5.5" y1="2.5" x2="10.5" y2="2.5" strokeWidth="1.3" />
                <line x1="3.5" y1="11.5" x2="8.5" y2="11.5" strokeWidth="1.3" />
                <line x1="8.5" y1="2.5" x2="5.5" y2="11.5" strokeWidth="1.3" />
              </svg>
            </SegBtn>
            <SegBtn
              active={!!p.uppercase}
              onClick={() => update({ uppercase: !p.uppercase })}
              title="All Caps (TT)"
            >
              <span className="font-bold text-[11px] font-mono leading-none">TT</span>
            </SegBtn>
          </SegGroup>
          <SegGroup className="shrink-0">
            <SegBtn
              active={p.align === "left" || !p.align}
              onClick={() => update({ align: "left" })}
              title="Align Left"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round">
                <line x1="2" y1="3.5" x2="12" y2="3.5" strokeWidth="1.2" />
                <line x1="2" y1="7.5" x2="8" y2="7.5" strokeWidth="1.2" />
                <line x1="2" y1="11.5" x2="10" y2="11.5" strokeWidth="1.2" />
              </svg>
            </SegBtn>
            <SegBtn
              active={p.align === "center"}
              onClick={() => update({ align: "center" })}
              title="Align Center"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round">
                <line x1="2" y1="3.5" x2="12" y2="3.5" strokeWidth="1.2" />
                <line x1="4" y1="7.5" x2="10" y2="7.5" strokeWidth="1.2" />
                <line x1="3" y1="11.5" x2="11" y2="11.5" strokeWidth="1.2" />
              </svg>
            </SegBtn>
            <SegBtn
              active={p.align === "right"}
              onClick={() => update({ align: "right" })}
              title="Align Right"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeLinecap="round">
                <line x1="2" y1="3.5" x2="12" y2="3.5" strokeWidth="1.2" />
                <line x1="6" y1="7.5" x2="12" y2="7.5" strokeWidth="1.2" />
                <line x1="4" y1="11.5" x2="12" y2="11.5" strokeWidth="1.2" />
              </svg>
            </SegBtn>
          </SegGroup>
        </div>

        {/* Row 2: S + L + T */}
        <div className="grid grid-cols-[1.1fr_1fr_1.25fr] gap-1.5 mt-1.5">
          <Field label="S" mono title="Font size">
            <NumInput
              value={p.fontSize || 18}
              onChange={handleFontSizeChange}
              suffix="px"
              min={4}
              max={999}
            />
          </Field>
          <Field label="L" mono title="Line height">
            <NumInput
              value={p.lineHeight || 1}
              onChange={(v) => update({ lineHeight: v })}
              step={0.02}
              min={0.5}
              max={3}
            />
          </Field>
          <Field label="T" mono title="Letter spacing">
            <NumInput
              value={p.letterSpacing || 0}
              onChange={(v) => update({ letterSpacing: v })}
              suffix="px"
              step={0.1}
            />
          </Field>
        </div>

        <div className="border-t border-white/5 my-2" />

        {/* Color inline */}
        <div>
          <Field label="Color">
            <ColorInput
              value={p.fill || "#000000"}
              onChange={(v) => update({ fill: v })}
            />
          </Field>
        </div>
      </Section>
    </>
  );
}
