import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  RefreshCw,
  Laptop,
  CalendarClock,
  HelpCircle,
  X,
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

const DATE_PRESETS = [
  "[[DD.MM.YYYY]]",
  "[[HH:mm]]",
  "[[DD.MM.YYYY HH:mm]]",
  "[[MMMM YYYY]]",
];

const OFFSET_PRESETS = [
  "[[DD.MM.YYYY +7d]]",
  "[[DD.MM.YYYY +1m]]",
  "[[DD.MM.YYYY +1y]]",
];

function usePortalPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const update = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: Math.round(rect.bottom + 4),
        right: Math.round(window.innerWidth - rect.right),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, triggerRef]);

  return pos;
}

function DatePresetsDropdown({
  triggerRef,
  onClose,
  onSelect,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(triggerRef, true);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, triggerRef]);

  return createPortal(
    <div
      ref={ref}
      style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
      className="fixed w-44 bg-ink-900 border border-white/10 rounded-lg shadow-2xl py-1 z-[9999] overflow-hidden select-none"
    >
      {DATE_PRESETS.map((expr) => (
        <button
          key={expr}
          type="button"
          onClick={() => {
            onSelect(expr);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left font-mono text-ui-xs text-ink-200 hover:text-accent hover:bg-white/5 transition-colors cursor-pointer"
        >
          {expr}
        </button>
      ))}

      <div className="my-1 border-t border-white/5" />

      {OFFSET_PRESETS.map((expr) => (
        <button
          key={expr}
          type="button"
          onClick={() => {
            onSelect(expr);
            onClose();
          }}
          className="w-full px-3 py-1.5 text-left font-mono text-ui-xs text-ink-200 hover:text-accent hover:bg-white/5 transition-colors cursor-pointer"
        >
          {expr}
        </button>
      ))}
    </div>,
    document.body,
  );
}

function DateHelpPopover({
  triggerRef,
  onClose,
  onSelect,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(triggerRef, true);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, triggerRef]);

  return createPortal(
    <div
      ref={ref}
      style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
      className="fixed w-80 bg-ink-900 border border-white/10 rounded-lg shadow-2xl p-3.5 z-[9999] text-ui-xs text-ink-300 font-sans leading-relaxed select-none"
    >
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
        <span className="font-semibold text-ink-100 text-ui-sm">Syntax</span>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelect("[[]]")}
            className="font-mono text-accent text-ui-xs hover:underline cursor-pointer"
            title="Insert empty [[]]"
          >
            [[]]
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Date & Time */}
      <div className="mb-3">
        <div className="font-mono uppercase tracking-wider text-ink-300 font-semibold mb-0.5">
          Date & Time
        </div>
        <div className="text-ink-400 mb-1.5">
          Standard system format:
        </div>
        <div className="space-y-1">
          <div>
            <button type="button" onClick={() => onSelect("[[DD]]")} className="font-mono text-accent hover:underline cursor-pointer">DD</button>
            <span className="text-ink-400 mx-1">01</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[ddd]]")} className="font-mono text-accent hover:underline cursor-pointer">ddd</button>
            <span className="text-ink-400 mx-1">Mon</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[dddd]]")} className="font-mono text-accent hover:underline cursor-pointer">dddd</button>
            <span className="text-ink-400 ml-1">Monday</span>
          </div>
          <div>
            <button type="button" onClick={() => onSelect("[[MM]]")} className="font-mono text-accent hover:underline cursor-pointer">MM</button>
            <span className="text-ink-400 mx-1">09</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[MMM]]")} className="font-mono text-accent hover:underline cursor-pointer">MMM</button>
            <span className="text-ink-400 mx-1">Sep</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[MMMM]]")} className="font-mono text-accent hover:underline cursor-pointer">MMMM</button>
            <span className="text-ink-400 ml-1">September</span>
          </div>
          <div>
            <button type="button" onClick={() => onSelect("[[YYYY]]")} className="font-mono text-accent hover:underline cursor-pointer">YYYY</button>
            <span className="text-ink-400 mx-1">2026</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[YY]]")} className="font-mono text-accent hover:underline cursor-pointer">YY</button>
            <span className="text-ink-400 ml-1">26</span>
          </div>
          <div>
            <button type="button" onClick={() => onSelect("[[HH]]")} className="font-mono text-accent hover:underline cursor-pointer">HH</button>
            <span className="text-ink-400 mx-1">24h</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[mm]]")} className="font-mono text-accent hover:underline cursor-pointer">mm</button>
            <span className="text-ink-400 mx-1">min</span> &middot;{" "}
            <button type="button" onClick={() => onSelect("[[ss]]")} className="font-mono text-accent hover:underline cursor-pointer">ss</button>
            <span className="text-ink-400 ml-1">sec</span>
          </div>
        </div>
      </div>

      {/* Locale */}
      <div className="mb-3 pt-2.5 border-t border-white/10">
        <div className="font-mono uppercase tracking-wider text-ink-300 font-semibold mb-0.5">
          Locale
        </div>
        <div className="text-ink-400 mb-1.5">
          Language codes (affects months and days):
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect("[[uk:ddd]]")}
            className="font-mono text-accent hover:underline cursor-pointer"
            title="Insert [[uk:ddd]]"
          >
            uk:
          </button>
          <span className="text-ink-400">&middot;</span>
          <button
            type="button"
            onClick={() => onSelect("[[en:ddd]]")}
            className="font-mono text-accent hover:underline cursor-pointer"
            title="Insert [[en:ddd]]"
          >
            en:
          </button>
          <span className="text-ink-400">&middot;</span>
          <button
            type="button"
            onClick={() => onSelect("[[de:ddd]]")}
            className="font-mono text-accent hover:underline cursor-pointer"
            title="Insert [[de:ddd]]"
          >
            de:
          </button>
          <span className="text-ink-400 ml-1">etc.</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-ink-400">e.g.</span>
          <button
            type="button"
            onClick={() => onSelect("[[uk:dddd, DD MMMM]]")}
            className="font-mono text-accent hover:underline cursor-pointer text-left"
          >
            [[uk:dddd, DD MMMM]]
          </button>
        </div>
      </div>

      {/* Offsets */}
      <div className="pt-2.5 border-t border-white/10">
        <div className="font-mono uppercase tracking-wider text-ink-300 font-semibold mb-0.5">
          Offsets
        </div>
        <div className="text-ink-400 mb-1.5">
          General shift:
        </div>
        <div className="space-y-1">
          <div>
            <span className="whitespace-nowrap">
              <button
                type="button"
                onClick={() => onSelect("[[DD.MM.YYYY +7d]]")}
                className="font-mono text-accent hover:underline cursor-pointer mr-1"
              >
                +7d
              </button>
              <span className="text-ink-400">days</span>
            </span>
            <span className="text-ink-400 mx-1.5">&middot;</span>
            <span className="whitespace-nowrap">
              <button
                type="button"
                onClick={() => onSelect("[[DD.MM.YYYY +1m]]")}
                className="font-mono text-accent hover:underline cursor-pointer mr-1"
              >
                +1m
              </button>
              <span className="text-ink-400">months</span>
            </span>
            <span className="text-ink-400 mx-1.5">&middot;</span>
            <span className="whitespace-nowrap">
              <button
                type="button"
                onClick={() => onSelect("[[DD.MM.YYYY +1y]]")}
                className="font-mono text-accent hover:underline cursor-pointer mr-1"
              >
                +1y
              </button>
              <span className="text-ink-400">years</span>
            </span>
          </div>
          <div>
            <span className="whitespace-nowrap">
              <button
                type="button"
                onClick={() => onSelect("[[HH:mm +12h]]")}
                className="font-mono text-accent hover:underline cursor-pointer mr-1"
              >
                +12h
              </button>
              <span className="text-ink-400">hours</span>
            </span>
          </div>
        </div>

        <div className="text-ink-400 mt-2 mb-1">
          Individual shift:
        </div>
        <div>
          <button
            type="button"
            onClick={() => onSelect("[[DD+5.MM+2.YYYY+1]]")}
            className="font-mono text-accent hover:underline cursor-pointer"
          >
            [[DD+5.MM+2.YYYY+1]]
          </button>
          <span className="text-ink-400 mx-1.5">&middot;</span>
          <button
            type="button"
            onClick={() => onSelect("[[HH+12:mm+30]]")}
            className="font-mono text-accent hover:underline cursor-pointer"
          >
            [[HH+12:mm+30]]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface Props {
  element: BaseElement;
}

export function TextSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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

  return (
    <>
      <Section
        title="Text"
        action={
          <div className="flex items-center gap-2">
            {/* [[Date/Time]] link button */}
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => {
                setDateMenuOpen((o) => !o);
                setHelpOpen(false);
              }}
              className="text-[11px] font-mono text-accent hover:text-accent-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Insert date/time variable"
            >
              <CalendarClock size={14} />
              <span>[[Date/Time]]</span>
            </button>

            {/* (?) Help icon */}
            <button
              ref={helpBtnRef}
              type="button"
              onClick={() => {
                setHelpOpen((o) => !o);
                setDateMenuOpen(false);
              }}
              className="text-ink-400 hover:text-ink-200 transition-colors cursor-pointer flex items-center"
              title="Date syntax & examples"
            >
              <HelpCircle size={14} />
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
          <DatePresetsDropdown
            triggerRef={dateBtnRef}
            onClose={() => setDateMenuOpen(false)}
            onSelect={insertToken}
          />
        )}

        {helpOpen && (
          <DateHelpPopover
            triggerRef={helpBtnRef}
            onClose={() => setHelpOpen(false)}
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
              onChange={(v) => update({ fontSize: v })}
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
