import { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo, forwardRef } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useEditorV2Store, type BaseElement } from "../../store/editor-store.ts";
import { mmToPx } from "../../utils/px-mm.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import {
  getAvailableTapeWidths,
  getSizesForTapeWidth,
  isContinuousSupported,
  checkPrinterCompatibility,
  isTapeWidthSupported,
} from "../../label/label-sizes.ts";
import { getDevice } from "@thermoprint/core";
import { ChevronDown, Minus, Plus, X, PrinterX } from "lucide-react";
import { LabelPaper } from "./label-paper.tsx";
import { TextElement } from "./elements/text-element.tsx";
import { RectElement } from "./elements/rect-element.tsx";
import { LineElement } from "./elements/line-element.tsx";
import { QrElement } from "./elements/qr-element.tsx";
import { BarcodeElement } from "./elements/barcode-element.tsx";
import { ImageElement } from "./elements/image-element.tsx";

function TapeIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="3" width="10" height="5" rx="1" />
      <rect x="7" y="10" width="10" height="5" rx="1" opacity="0.55" />
      <rect x="7" y="17" width="10" height="4" rx="1" opacity="0.3" />
    </svg>
  );
}

function LabelSizeSelector({
  originX,
  originY,
  displayW,
  displayH,
  containerRef,
}: {
  originX: number;
  originY: number;
  displayW: number;
  displayH: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [tapeWidthOpen, setTapeWidthOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const modelId = usePrinterStore((s) => s.modelId);
  const profile = useMemo(() => (modelId ? getDevice(modelId) : null), [modelId]);
  const compat = checkPrinterCompatibility(modelId, label, paperType);

  const modelWidths = useMemo(() => getAvailableTapeWidths(modelId), [modelId]);
  const allWidths = useMemo(() => getAvailableTapeWidths(null), []);
  const currentTapeWidth = label.tapeWidthMm ?? Math.min(label.widthMm, label.heightMm);
  const showTapeWidthPill = !modelId || modelWidths.length > 1 || !modelWidths.includes(currentTapeWidth);

  // Sizes available for the currently selected tape width
  const sizes = useMemo(
    () => getSizesForTapeWidth(null, currentTapeWidth, paperType),
    [currentTapeWidth, paperType]
  );

  const showDynamicBtn = isContinuousSupported(modelId);

  const [customLength, setCustomLength] = useState(label.widthMm);
  const [customInputStr, setCustomInputStr] = useState(String(label.widthMm));

  // Update customLength when label changes
  useEffect(() => {
    const curLen = label.widthMm === currentTapeWidth ? label.heightMm : label.widthMm;
    setCustomLength(curLen);
    setCustomInputStr(String(curLen));
  }, [label.widthMm, label.heightMm, currentTapeWidth]);

  // Close menus on outside click
  useEffect(() => {
    if (!tapeWidthOpen && !sizeOpen && !customOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTapeWidthOpen(false);
        setSizeOpen(false);
        setCustomOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tapeWidthOpen, sizeOpen, customOpen]);

  const setSize = (wMm: number, hMm: number, tapeWidthMm?: number) => {
    const widthMm = Math.max(wMm, hMm);
    const heightMm = Math.min(wMm, hMm);
    const activeTape = tapeWidthMm ?? currentTapeWidth;
    useEditorV2Store.setState({
      label: {
        widthMm,
        heightMm,
        widthPx: mmToPx(widthMm),
        heightPx: mmToPx(heightMm),
        tapeWidthMm: activeTape,
      },
    });
  };

  const handleSelectTapeWidth = (w: number) => {
    const available = getSizesForTapeWidth(null, w, paperType);
    const existingMatch = available.find(
      (s) => s.labelLengthMm === label.labelLengthMm || s.widthMm === label.widthMm || s.heightMm === label.heightMm
    );
    const selected = existingMatch ?? available[0];
    if (selected) {
      setSize(selected.widthMm, selected.heightMm, w);
    } else {
      setSize(Math.max(40, w), Math.min(40, w), w);
    }
  };

  const containerRect = containerRef.current?.getBoundingClientRect();
  const screenBottom = (containerRect?.top ?? 0) + originY + displayH + 8;
  const openUpwards = typeof window !== "undefined" && (window.innerHeight - screenBottom) < 320;

  return (
    <div
      ref={ref}
      className="absolute select-none flex items-center justify-center gap-2 z-10 pointer-events-auto"
      style={{ left: Math.round(originX + displayW / 2), top: Math.round(originY + displayH + 10), transform: "translateX(-50%)" }}
    >
      {/* 1. Incompatibility status indicator (left edge, pixel-perfect icon, not a button, no cursor-help) */}
      {!compat.compatible && Boolean(modelId) && (
        <div
          className="flex items-center justify-center text-amber-400/80 hover:text-amber-400 transition-colors select-none pr-0.5 cursor-default"
          title={profile?.name ? `Not supported by ${profile.name}` : "Not supported by current printer"}
        >
          <PrinterX size={18} strokeWidth={1.75} />
        </div>
      )}

      {/* 2. Tape Width dropdown */}
      {showTapeWidthPill && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setTapeWidthOpen((o) => !o);
              setSizeOpen(false);
              setCustomOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md border hover-fade font-mono text-ui-base font-semibold whitespace-nowrap cursor-pointer ${
              tapeWidthOpen
                ? "bg-accent/15 border-accent/40 text-accent"
                : "bg-ink-850/95 border-white/8 text-ink-200 hover:border-accent/30 hover:text-accent shadow-panel"
            }`}
            title="Tape width"
          >
            <span>{currentTapeWidth} mm</span>
            <ChevronDown
              size={13}
              className={tapeWidthOpen ? "rotate-180" : ""}
              style={{ transition: "transform 150ms ease" }}
            />
          </button>

          {tapeWidthOpen && (
            <div
              className={`absolute left-0 ${openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-28 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel overflow-hidden z-50`}
            >
              <div className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
                {allWidths.map((w) => {
                  const active = w === currentTapeWidth;
                  const isSupported = isTapeWidthSupported(modelId, w, paperType);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        handleSelectTapeWidth(w);
                        setTapeWidthOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 h-7 text-ui-sm font-mono hover-fade cursor-pointer ${
                        active
                          ? "text-accent bg-accent/10"
                          : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSupported && Boolean(modelId) ? "bg-emerald-400" : "invisible"
                          }`}
                          title={isSupported && Boolean(modelId) ? "Supported by connected printer" : undefined}
                        />
                        <span>{w} mm</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Label Size / Length dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setSizeOpen((o) => !o);
            setTapeWidthOpen(false);
            setCustomOpen(false);
          }}
          className={`flex items-center gap-1.5 px-3 h-7 rounded-md border hover-fade font-mono text-ui-base font-semibold whitespace-nowrap cursor-pointer ${
            sizeOpen
              ? "bg-accent/15 border-accent/40 text-accent"
              : "bg-ink-850/95 border-white/8 text-ink-200 hover:border-accent/30 hover:text-accent shadow-panel"
          }`}
          title="Label size"
        >
          <span>{label.widthMm} × {label.heightMm} mm</span>
          <ChevronDown
            size={13}
            className={sizeOpen ? "rotate-180" : ""}
            style={{ transition: "transform 150ms ease" }}
          />
        </button>

        {sizeOpen && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-44 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel overflow-hidden z-50`}
          >
            <div className="max-h-80 overflow-y-auto py-1">
              {sizes.map((s) => {
                const active =
                  s.widthMm === label.widthMm && s.heightMm === label.heightMm;
                const isSupported = !modelId || checkPrinterCompatibility(modelId, s, paperType).compatible;
                return (
                  <button
                    key={`${s.widthMm}x${s.heightMm}`}
                    type="button"
                    onClick={() => {
                      setSize(s.widthMm, s.heightMm, currentTapeWidth);
                      setSizeOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 h-7 text-ui-sm font-mono hover-fade cursor-pointer ${
                      active
                        ? "text-accent bg-accent/10"
                        : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isSupported && Boolean(modelId) ? "bg-emerald-400" : "invisible"
                        }`}
                        title={isSupported && Boolean(modelId) ? "Supported by connected printer" : undefined}
                      />
                      <span>{s.name}</span>
                    </div>
                  </button>
                );
              })}

              <div className="my-1 border-t border-white/5" />

              {/* Dynamic option */}
              <div
                className="w-full flex items-center justify-between px-3 h-7 text-ui-sm font-mono text-ink-500 cursor-not-allowed select-none opacity-60"
                title="Dynamic length adjusts automatically to content (Step 5)"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 shrink-0 invisible" />
                  <TapeIcon size={12} />
                  <span>Dynamic</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-white/5 rounded text-ink-400">
                  Soon
                </span>
              </div>

              {/* Custom... option */}
              <button
                type="button"
                onClick={() => {
                  setSizeOpen(false);
                  const curLen = label.widthMm === currentTapeWidth ? label.heightMm : label.widthMm;
                  setCustomLength(curLen);
                  setCustomInputStr(String(curLen));
                  setCustomOpen(true);
                }}
                className="w-full flex items-center px-3 h-7 text-ui-sm font-mono text-ink-300 hover:bg-white/5 hover:text-ink-100 hover-fade cursor-pointer"
              >
                Custom...
              </button>
            </div>
          </div>
        )}

        {/* Custom Length micro-dialog popover */}
        {customOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-ink-850 border border-white/10 rounded-lg shadow-panel p-2.5 z-50 select-none outline-none"
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const step = e.shiftKey ? 5 : 1;
              const rawDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
              if (rawDelta === 0) return;
              const delta = rawDelta < 0 ? step : -step;
              const next = Math.max(10, Math.min(300, customLength + delta));
              setCustomLength(next);
              setCustomInputStr(String(next));
              setSize(next, currentTapeWidth, currentTapeWidth);
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
                Custom Length
              </span>
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="text-ink-400 hover:text-ink-100 p-0.5 cursor-pointer outline-none"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 flex items-center bg-ink-800 border border-white/8 rounded px-2 h-7">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={customInputStr}
                  onChange={(e) => {
                    const text = e.target.value.replace(/[^0-9]/g, "");
                    setCustomInputStr(text);
                    const val = parseInt(text, 10);
                    if (!isNaN(val) && val >= 10 && val <= 300) {
                      setCustomLength(val);
                      setSize(val, currentTapeWidth, currentTapeWidth);
                    }
                  }}
                  onBlur={() => {
                    const val = parseInt(customInputStr, 10);
                    const clamped = isNaN(val) ? 40 : Math.max(10, Math.min(300, val));
                    setCustomLength(clamped);
                    setCustomInputStr(String(clamped));
                    setSize(clamped, currentTapeWidth, currentTapeWidth);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const step = e.shiftKey ? 5 : 1;
                    const rawDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
                    if (rawDelta === 0) return;
                    const delta = rawDelta < 0 ? step : -step;
                    const next = Math.max(10, Math.min(300, customLength + delta));
                    setCustomLength(next);
                    setCustomInputStr(String(next));
                    setSize(next, currentTapeWidth, currentTapeWidth);
                  }}
                  className="w-full bg-transparent font-mono text-ui-sm text-right pr-1 outline-none text-ink-100"
                />
                <span className="text-ui-xs font-mono text-ink-400 shrink-0">mm</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = Math.max(10, customLength - 5);
                  setCustomLength(next);
                  setCustomInputStr(String(next));
                  setSize(next, currentTapeWidth, currentTapeWidth);
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-ink-800 border border-white/8 hover:bg-ink-750 text-ink-300 hover:text-ink-100 cursor-pointer"
                title="-5 mm"
              >
                <Minus size={12} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = Math.min(300, customLength + 5);
                  setCustomLength(next);
                  setCustomInputStr(String(next));
                  setSize(next, currentTapeWidth, currentTapeWidth);
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-ink-800 border border-white/8 hover:bg-ink-750 text-ink-300 hover:text-ink-100 cursor-pointer"
                title="+5 mm"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Dynamic button [ ▤ ] — shown ONLY if connected to a continuous-capable printer */}
      {showDynamicBtn && (
        <button
          type="button"
          disabled
          title="Dynamic length (coming in Step 5)"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ink-850/95 border border-white/8 text-ink-500 cursor-not-allowed shadow-panel opacity-60"
        >
          <TapeIcon size={13} />
        </button>
      )}
    </div>
  );
}

function renderElement(el: BaseElement, isSelected: boolean) {
  switch (el.type) {
    case "text":
      return <TextElement key={el.id} element={el} isSelected={isSelected} />;
    case "rect":
      return <RectElement key={el.id} element={el} isSelected={isSelected} />;
    case "line":
      return <LineElement key={el.id} element={el} isSelected={isSelected} />;
    case "qrcode":
      return <QrElement key={el.id} element={el} isSelected={isSelected} />;
    case "barcode":
      return <BarcodeElement key={el.id} element={el} isSelected={isSelected} />;
    case "image":
      return <ImageElement key={el.id} element={el} isSelected={isSelected} />;
    default:
      return null;
  }
}

export const Canvas = forwardRef<Konva.Stage>(function Canvas(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const spaceDown = useRef(false);
  const panStart = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  // Marquee state
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number; shift?: boolean } | null>(null);

  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const label = useEditorV2Store((s) => s.label);
  const zoom = useEditorV2Store((s) => s.zoom);
  const panX = useEditorV2Store((s) => s.panX);
  const panY = useEditorV2Store((s) => s.panY);
  const gridVisible = useEditorV2Store((s) => s.gridVisible);
  const rulersVisible = useEditorV2Store((s) => s.rulersVisible);
  const paperType = useEditorV2Store((s) => s.paperType);

  const selectOnly = useEditorV2Store((s) => s.selectOnly);
  const setZoom = useEditorV2Store((s) => s.setZoom);
  const setPan = useEditorV2Store((s) => s.setPan);

  // Track container size
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit to screen on mount and when label changes (new label, open label)
  const currentLabelId = useEditorV2Store((s) => s.currentLabelId);
  useEffect(() => {
    const padW = window.innerWidth < 768 ? 60 : 160;
    // Header (48px) + lowered dock/status (80px) + selector pills (36px) + comfortable breathing room
    const padH = window.innerWidth < 768 ? 140 : 210;
    const fitW = (size.w - padW) / label.widthPx;
    const fitH = (size.h - padH) / label.heightPx;
    const fit = Math.max(0.5, Math.min(4, Math.min(fitW, fitH)));
    setZoom(fit);
    setPan(0, window.innerWidth < 768 ? 0 : -30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLabelId, label.widthPx, label.heightPx]);

  // Space key tracking for pan mode
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) { spaceDown.current = true; setSpaceHeld(true); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { spaceDown.current = false; setSpaceHeld(false); }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Wheel zoom (cmd/ctrl + scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.002;
        const store = useEditorV2Store.getState();
        const next = store.zoom * (1 + delta);
        setZoom(next);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  // Compute label position centered in viewport
  const displayW = label.widthPx * zoom;
  const displayH = label.heightPx * zoom;
  const originX = size.w / 2 + panX - displayW / 2;
  const originY = size.h / 2 + panY - displayH / 2;

  // Stage mouse handlers — only pan and marquee; elements handle their own click/drag
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Pan with space+click or middle mouse
      if (spaceDown.current || e.evt.button === 1) {
        e.evt.preventDefault();
        const store = useEditorV2Store.getState();
        panStart.current = {
          x: e.evt.clientX,
          y: e.evt.clientY,
          panX: store.panX,
          panY: store.panY,
        };
        setPanning(true);
        return;
      }

      // Click on empty canvas → deselect + start marquee
      const target = e.target;
      const stage = target.getStage();
      if (!stage) return;

      const clickedOnStage =
        target === stage || target.attrs.id === "canvas-bg" || target.attrs.id === "label-bg";

      if (clickedOnStage) {
        if (!e.evt.shiftKey) {
          selectOnly([]);
        }
        const pointer = stage.getPointerPosition();
        if (pointer) {
          marqueeStart.current = { x: pointer.x, y: pointer.y, shift: e.evt.shiftKey };
        }
      }
    },
    [selectOnly],
  );

  // Global mouse move/up for pan and marquee
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Pan
      if (panStart.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan(panStart.current.panX + dx, panStart.current.panY + dy);
        return;
      }

      // Marquee
      if (marqueeStart.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const sx = marqueeStart.current.x;
        const sy = marqueeStart.current.y;
        setMarquee({
          x: Math.min(sx, mx),
          y: Math.min(sy, my),
          w: Math.abs(mx - sx),
          h: Math.abs(my - sy),
        });
      }
    };

    const onUp = () => {
      if (panStart.current) {
        panStart.current = null;
        setPanning(false);
      }
      if (marqueeStart.current && marquee) {
        // Determine which elements fall inside the marquee
        const store = useEditorV2Store.getState();
        const ids = store.elements
          .filter((el) => {
            // Convert element position to screen coordinates
            const elScreenX = originX + el.x * zoom;
            const elScreenY = originY + el.y * zoom;
            const elScreenW = el.width * zoom;
            const elScreenH = el.height * zoom;
            return (
              elScreenX + elScreenW > marquee.x &&
              elScreenX < marquee.x + marquee.w &&
              elScreenY + elScreenH > marquee.y &&
              elScreenY < marquee.y + marquee.h
            );
          })
          .map((el) => el.id);
        if (marqueeStart.current.shift) {
          selectOnly([...new Set([...store.selectedIds, ...ids])]);
        } else {
          selectOnly(ids);
        }
      }
      marqueeStart.current = null;
      setMarquee(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marquee, originX, originY, zoom, setPan, selectOnly]);

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-h-0 ${gridVisible ? "dot-grid" : ""} bg-ink-950 overflow-hidden`}
      style={{ cursor: panning ? "grabbing" : spaceHeld ? "grab" : "default" }}
    >
      {/* Gap mode: backing paper strip, ghost labels, perforation marks */}
      {paperType === "gap" && (() => {
        // Determine tape ribbon orientation:
        // If the physical tape width equals widthMm, the tape is horizontal across the screen,
        // and the roll unwinds vertically (along heightMm).
        // Otherwise (or if tape width equals heightMm), the tape width is vertical and unwinds horizontally.
        const activeTapeWidth = label.tapeWidthMm ?? (label.heightMm <= label.widthMm ? label.heightMm : label.widthMm);
        const vertical = label.widthMm === activeTapeWidth;
        const gap = 24 * zoom;
        const rollOverhang = 16 * zoom;
        const stride = vertical ? displayH + gap : displayW + gap;
        const span = vertical ? size.h : size.w;
        const ghostCount = Math.ceil(span / stride) + 2;
        const ghosts: { pos: number; opacity: number }[] = [];
        for (let i = 1; i <= ghostCount; i++) {
          const p = (vertical ? originY : originX) - i * stride;
          if (p + (vertical ? displayH : displayW) < -50) break;
          ghosts.push({ pos: p, opacity: Math.max(0.3, 0.8 - i * 0.1) });
        }
        for (let i = 1; i <= ghostCount; i++) {
          const p = (vertical ? originY : originX) + i * stride;
          if (p > span + 50) break;
          ghosts.push({ pos: p, opacity: Math.max(0.3, 0.8 - i * 0.1) });
        }

        // Backing ribbon — uses ink-600 for theme-aware visibility
        const ribbonColor = "var(--color-ink-600)";
        const ribbonStyle: React.CSSProperties = vertical
          ? {
              position: "absolute", top: 0, bottom: 0,
              left: originX - rollOverhang, width: displayW + rollOverhang * 2,
              pointerEvents: "none",
              background: `linear-gradient(to right, transparent 0%, color-mix(in srgb, ${ribbonColor} 8%, transparent) 8%, color-mix(in srgb, ${ribbonColor} 12%, transparent) 50%, color-mix(in srgb, ${ribbonColor} 8%, transparent) 92%, transparent 100%)`,
              borderLeft: `1px dashed color-mix(in srgb, ${ribbonColor} 20%, transparent)`,
              borderRight: `1px dashed color-mix(in srgb, ${ribbonColor} 20%, transparent)`,
            }
          : {
              position: "absolute", left: 0, right: 0,
              top: originY - rollOverhang, height: displayH + rollOverhang * 2,
              pointerEvents: "none",
              background: `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, ${ribbonColor} 8%, transparent) 8%, color-mix(in srgb, ${ribbonColor} 12%, transparent) 50%, color-mix(in srgb, ${ribbonColor} 8%, transparent) 92%, transparent 100%)`,
              borderTop: `1px dashed color-mix(in srgb, ${ribbonColor} 20%, transparent)`,
              borderBottom: `1px dashed color-mix(in srgb, ${ribbonColor} 20%, transparent)`,
            };

        const activePos = vertical ? originY : originX;
        return (
          <>
            <div style={ribbonStyle} />
            {/* Perforation marks */}
            {ghosts.concat([{ pos: activePos, opacity: 0 }]).map((g, i) =>
              vertical ? (
                <div key={`perf-${i}`} style={{
                  position: "absolute",
                  left: originX - 2 * zoom,
                  top: g.pos + displayH + gap / 2 - 0.5,
                  width: displayW + 4 * zoom,
                  height: 1,
                  background: "var(--color-ink-700)",
                  pointerEvents: "none",
                }} />
              ) : (
                <div key={`perf-${i}`} style={{
                  position: "absolute",
                  left: g.pos + displayW + gap / 2 - 0.5,
                  top: originY - 2 * zoom,
                  width: 1,
                  height: displayH + 4 * zoom,
                  background: "var(--color-ink-700)",
                  pointerEvents: "none",
                }} />
              ),
            )}
            {/* Ghost labels */}
            {ghosts.map((g, i) => (
              <div key={`ghost-${i}`} style={{
                position: "absolute",
                left: vertical ? originX : g.pos,
                top: vertical ? g.pos : originY,
                width: displayW, height: displayH,
                borderRadius: 6 * zoom,
                background: "#ffffff",
                opacity: g.opacity,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                pointerEvents: "none",
              }} />
            ))}
          </>
        );
      })()}

      <Stage
        ref={(node) => {
          stageRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        width={size.w}
        height={size.h}
        onMouseDown={handleStageMouseDown}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Background layer — click to deselect */}
        <Layer>
          <Rect
            id="canvas-bg"
            x={0}
            y={0}
            width={size.w}
            height={size.h}
            fill="transparent"
          />
        </Layer>

        {/* Paper + elements layer */}
        <Layer
          id="label-group"
          x={originX}
          y={originY}
          scaleX={zoom}
          scaleY={zoom}
        >
          <LabelPaper />
          {elements.map((el) =>
            renderElement(el, selectedIds.includes(el.id)),
          )}
        </Layer>
      </Stage>

      {/* Marquee selection rectangle (HTML overlay) */}
      {marquee && marquee.w > 2 && marquee.h > 2 && (
        <div
          style={{
            position: "absolute",
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
            border: "1px solid var(--color-accent)",
            background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Rulers overlay — hidden on mobile */}
      {rulersVisible && window.innerWidth >= 768 && (() => {
        const pxPerMm = mmToPx(1);
        return (
          <>
            {/* Top ruler */}
            <div
              className="absolute top-0 left-0 right-0 h-8 bg-ink-900/80 border-b border-ink-700/50 font-mono text-ui-xs text-ink-400 pointer-events-none"
              style={{ backdropFilter: "blur(4px)" }}
            >
              <div className="relative w-full h-full">
                {Array.from({ length: Math.ceil(label.widthMm) + 1 }).map((_, mm) => {
                  const x = originX + mm * pxPerMm * zoom;
                  if (x < 0 || x > size.w) return null;
                  const major = mm % 5 === 0;
                  return (
                    <div key={mm} style={{ position: "absolute", left: x, top: major ? 8 : 18, bottom: 0 }}>
                      <div style={{ width: 1, height: major ? 12 : 5, background: "var(--color-ink-500)" }} />
                      {major && (
                        <div style={{ position: "absolute", left: 4, top: -5, whiteSpace: "nowrap" }}>{mm}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Left ruler */}
            <div
              className="absolute top-0 left-0 bottom-0 w-8 bg-ink-900/80 border-r border-ink-700/50 font-mono text-ui-xs text-ink-400 pointer-events-none"
              style={{ backdropFilter: "blur(4px)" }}
            >
              <div className="relative w-full h-full">
                {Array.from({ length: Math.ceil(label.heightMm) + 1 }).map((_, mm) => {
                  const y = originY + mm * pxPerMm * zoom;
                  if (y < 0 || y > size.h) return null;
                  const major = mm % 5 === 0;
                  return (
                    <div key={mm} style={{ position: "absolute", top: y, left: major ? 8 : 18, right: 0 }}>
                      <div style={{ height: 1, width: major ? 12 : 5, background: "var(--color-ink-500)" }} />
                      {major && (
                        <div style={{ position: "absolute", top: -9, left: -5 }}>{mm}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );
      })()}

      {/* Label size selector */}
      <LabelSizeSelector
        originX={originX}
        originY={originY}
        displayW={displayW}
        displayH={displayH}
        containerRef={containerRef}
      />
    </div>
  );
});
