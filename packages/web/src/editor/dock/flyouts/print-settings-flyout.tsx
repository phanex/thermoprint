import { useState, useMemo, useEffect } from "react";
import { Settings, X, ChevronDown, Minus, Plus } from "lucide-react";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { usePrinterStore } from "../../../store/printer-store.ts";
import { getDevice } from "@thermoprint/core";
import { mmToPx } from "../../../utils/px-mm.ts";
import {
  getAvailableTapeWidths,
  getSizesForTapeWidth,
  getLabelSizes,
  checkPrinterCompatibility,
} from "../../../label/label-sizes.ts";

interface Props {
  onClose: () => void;
}

export function PrintSettingsFlyout({ onClose }: Props) {
  const printSettings = useEditorV2Store((s) => s.printSettings);
  const paperType = useEditorV2Store((s) => s.paperType);
  const label = useEditorV2Store((s) => s.label);
  const isConnected = usePrinterStore((s) => s.isConnected);
  const modelId = usePrinterStore((s) => s.modelId);
  const uiScale = useEditorV2Store((s) => s.uiScale);
  const setUiScale = useEditorV2Store((s) => s.setUiScale);
  const theme = useEditorV2Store((s) => s.theme);
  const mode = useEditorV2Store((s) => s.mode);
  const setTheme = useEditorV2Store((s) => s.setTheme);
  const setMode = useEditorV2Store((s) => s.setMode);

  const [tapeFilterOpen, setTapeFilterOpen] = useState(false);
  const [selectedWidth, setSelectedWidth] = useState<number | "all">("all");
  const [customOpen, setCustomOpen] = useState(false);

  const themes = [
    { id: "cyan",     name: "Cyan",     swatch: "#2ad0ff" },
    { id: "amber",    name: "Amber",    swatch: "#ff9f40" },
    { id: "graphite", name: "Graphite", swatch: "#e6e6eb" },
    { id: "violet",   name: "Violet",   swatch: "#a78bfa" },
    { id: "forest",   name: "Forest",   swatch: "#6ecc93" },
    { id: "paper",    name: "Paper",    swatch: "#e2bc7a" },
  ];

  const profile = modelId ? getDevice(modelId) : null;
  const currentTape = label.tapeWidthMm ?? (label.heightMm <= label.widthMm ? label.heightMm : label.widthMm);
  const curLength = label.widthMm === currentTape ? label.heightMm : label.widthMm;

  const [customLength, setCustomLength] = useState(curLength);
  const [customInputStr, setCustomInputStr] = useState(String(curLength));

  useEffect(() => {
    const len = label.widthMm === currentTape ? label.heightMm : label.widthMm;
    setCustomLength(len);
    setCustomInputStr(String(len));
  }, [label.widthMm, label.heightMm, currentTape]);

  const allTapeWidths = useMemo(() => getAvailableTapeWidths(null), []);
  const supportedTapeWidths = useMemo(() => getAvailableTapeWidths(modelId), [modelId]);

  const availableSizes = useMemo(() => {
    if (selectedWidth === "all") {
      return getLabelSizes(null, paperType);
    }
    return getSizesForTapeWidth(null, selectedWidth, paperType);
  }, [selectedWidth, paperType]);

  const isCurrentPreset = availableSizes.some(
    (s) => s.widthMm === label.widthMm && s.heightMm === label.heightMm,
  );

  const compat = checkPrinterCompatibility(modelId, label, paperType);

  const updateSettings = (patch: Partial<typeof printSettings>) =>
    useEditorV2Store.setState((s) => ({
      printSettings: { ...s.printSettings, ...patch },
    }));

  const setPaperType = (pt: "gap" | "continuous") => {
    useEditorV2Store.setState({ paperType: pt });
    const tw = selectedWidth !== "all" ? selectedWidth : currentTape;
    const sizes = getSizesForTapeWidth(null, tw, pt);
    const currentValid = sizes.some(
      (s) => s.widthMm === label.widthMm && s.heightMm === label.heightMm,
    );
    if (!currentValid && sizes.length > 0) {
      const def = sizes[0];
      useEditorV2Store.setState({
        label: {
          widthMm: def.widthMm,
          heightMm: def.heightMm,
          widthPx: mmToPx(def.widthMm),
          heightPx: mmToPx(def.heightMm),
          tapeWidthMm: tw,
        },
      });
    }
    usePrinterStore.getState().updateSettings({ paperType: pt });
  };

  const setLabelSize = (widthMm: number, heightMm: number, tapeWidthMm?: number) => {
    const w = Math.max(widthMm, heightMm);
    const h = Math.min(widthMm, heightMm);
    const tw = tapeWidthMm ?? (selectedWidth !== "all" ? selectedWidth : h);
    useEditorV2Store.setState({
      label: {
        widthMm: w,
        heightMm: h,
        widthPx: mmToPx(w),
        heightPx: mmToPx(h),
        tapeWidthMm: tw,
      },
    });
  };

  const handleUiScaleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 0.1 : 0.05;
    const delta = e.deltaY < 0 ? step : -step;
    const next = Math.min(1.4, Math.max(0.8, Number((uiScale + delta).toFixed(2))));
    setUiScale(next);
  };

  const handleThresholdWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 10 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    const next = Math.min(255, Math.max(0, printSettings.threshold + delta));
    updateSettings({ threshold: next });
  };

  return (
    <div className="fixed inset-x-2 bottom-20 max-h-[85vh] overflow-y-auto md:max-h-none md:inset-auto md:absolute md:bottom-[130px] md:left-1/2 md:-translate-x-1/2 md:w-[560px] bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-40 custom-scrollbar">
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-accent" />
          <span className="text-ui-base font-semibold text-ink-100">
            Print settings
          </span>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100 cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: System & Output Settings */}
        <div className="space-y-3">
          {/* Interface size */}
          <div onWheel={handleUiScaleWheel}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                Interface size
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ui-xs font-mono text-ink-100 tabular-nums">
                  {Math.round(uiScale * 100)}%
                </span>
                {uiScale !== 1 && (
                  <button
                    onClick={() => setUiScale(1)}
                    className="text-ui-2xs font-mono text-ink-400 hover:text-accent hover-fade cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.4}
              step={0.05}
              value={uiScale}
              onChange={(e) => setUiScale(parseFloat(e.target.value))}
              onWheel={handleUiScaleWheel}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-ui-2xs font-mono text-ink-500 mt-0.5">
              <span>80%</span>
              <span>140%</span>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Theme */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                Theme
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded bg-ink-800 border border-white/5">
                <button
                  type="button"
                  onClick={() => setMode("dark")}
                  className={`px-2 py-0.5 text-ui-2xs font-mono rounded-[3px] transition-colors cursor-pointer ${
                    mode === "dark" ? "bg-ink-700 text-accent" : "text-ink-400 hover:text-ink-200"
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setMode("light")}
                  className={`px-2 py-0.5 text-ui-2xs font-mono rounded-[3px] transition-colors cursor-pointer ${
                    mode === "light" ? "bg-ink-700 text-accent" : "text-ink-400 hover:text-ink-200"
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {themes.map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-1.5 h-7 px-2 rounded-md border hover-fade cursor-pointer ${
                      active
                        ? "bg-accent/10 border-accent/40 text-accent"
                        : "bg-ink-800 border-white/5 text-ink-200 hover:border-white/15"
                    }`}
                    title={`${t.name} theme`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/20"
                      style={{ background: t.swatch }}
                    />
                    <span className="text-ui-2xs font-medium">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Density */}
          <div>
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
              Density
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-ink-800 border border-white/5">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => updateSettings({ density: d })}
                  className={`flex-1 h-6 rounded-[3px] text-ui-xs font-medium cursor-pointer ${
                    printSettings.density === d
                      ? "bg-ink-700 text-accent"
                      : "text-ink-300 hover:text-ink-100"
                  }`}
                >
                  {["Light", "Normal", "Dark"][d - 1]}
                </button>
              ))}
            </div>
          </div>

          {/* Dither */}
          <div>
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
              Dither
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { v: "floyd-steinberg", l: "Floyd-S" },
                { v: "threshold", l: "Threshold" },
                { v: "none", l: "None" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => updateSettings({ ditherMode: o.v as any })}
                  className={`h-6 rounded-md text-ui-2xs font-medium border cursor-pointer ${
                    printSettings.ditherMode === o.v
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-ink-800 text-ink-300 border-white/5 hover:text-ink-100"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div onWheel={handleThresholdWheel}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                Threshold
              </div>
              <div className="text-ui-xs font-mono text-ink-100 tabular-nums">
                {printSettings.threshold}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              value={printSettings.threshold}
              onChange={(e) => updateSettings({ threshold: Number(e.target.value) })}
              onWheel={handleThresholdWheel}
              className="w-full accent-accent cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Media / Paper & Label Size */}
        <div className="space-y-3 flex flex-col h-full">
          {/* Paper type */}
          <div>
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
              Paper type
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-ink-800 border border-white/5">
              {(["gap", "continuous"] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPaperType(pt)}
                  className={`flex-1 h-7 rounded-[4px] text-ui-xs font-medium transition-colors cursor-pointer ${
                    paperType === pt
                      ? "bg-ink-700 text-accent"
                      : "text-ink-300 hover:text-ink-100"
                  }`}
                >
                  {pt === "gap" ? "Gap (die-cut)" : "Continuous"}
                </button>
              ))}
            </div>
          </div>

          {/* Label size with Tape width filter dropdown */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                Label size
              </div>
              {/* Tape width filter dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTapeFilterOpen((o) => !o)}
                  className="flex items-center gap-1 px-2 h-6 rounded bg-ink-800 border border-white/5 hover:border-white/15 text-ui-2xs font-mono text-ink-300 hover:text-ink-100 cursor-pointer"
                  title="Filter by tape width"
                >
                  <span>{selectedWidth === "all" ? "All widths" : `${selectedWidth} mm`}</span>
                  <ChevronDown size={11} className={tapeFilterOpen ? "rotate-180" : ""} />
                </button>
                {tapeFilterOpen && (
                  <div className="absolute right-0 top-full mt-1 w-28 bg-ink-850 border border-white/10 rounded-lg shadow-panel py-1 z-50">
                    <button
                      type="button"
                      onClick={() => { setSelectedWidth("all"); setTapeFilterOpen(false); }}
                      className={`w-full text-left px-2.5 h-6 text-ui-2xs font-mono flex items-center justify-between cursor-pointer ${
                        selectedWidth === "all" ? "text-accent bg-accent/10" : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
                      }`}
                    >
                      <span>All widths</span>
                      {selectedWidth === "all" && <span className="text-accent">✓</span>}
                    </button>
                    {allTapeWidths.map((w) => {
                      const isSupported = !modelId || supportedTapeWidths.includes(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => { setSelectedWidth(w); setTapeFilterOpen(false); }}
                          className={`w-full text-left px-2.5 h-6 text-ui-2xs font-mono flex items-center justify-between cursor-pointer ${
                            selectedWidth === w ? "text-accent bg-accent/10" : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSupported && Boolean(modelId) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Supported by connected printer" />
                            )}
                            <span>{w} mm</span>
                          </div>
                          {selectedWidth === w && <span className="text-accent">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sizes Grid */}
            <div
              className="grid grid-cols-2 gap-1.5 content-start max-h-[260px] overflow-y-auto pr-1 custom-scrollbar"
              onWheel={(e) => e.stopPropagation()}
            >
              {availableSizes.map((s) => {
                const active = s.widthMm === label.widthMm && s.heightMm === label.heightMm;
                const isSupported = !modelId || checkPrinterCompatibility(modelId, s, paperType).compatible;
                return (
                  <button
                    key={`${s.widthMm}x${s.heightMm}`}
                    type="button"
                    onClick={() => setLabelSize(s.widthMm, s.heightMm, s.tapeWidthMm)}
                    className={`h-7 px-1.5 rounded-md text-ui-xs font-mono border hover-fade flex items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-ink-800 text-ink-300 border-white/5 hover:text-ink-100 hover:bg-ink-750"
                    }`}
                  >
                    {isSupported && Boolean(modelId) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Supported by connected printer" />
                    )}
                    <span>{s.widthMm} × {s.heightMm} mm</span>
                  </button>
                );
              })}

              {/* Custom Length button for Continuous paper */}
              {paperType === "continuous" && (
                <div className="relative col-span-2">
                  <button
                    type="button"
                    onClick={() => setCustomOpen((o) => !o)}
                    className={`w-full h-7 rounded-md text-ui-xs font-mono border hover-fade cursor-pointer ${
                      !isCurrentPreset
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-ink-800 text-ink-300 border-white/5 hover:text-ink-100 hover:bg-ink-750"
                    }`}
                  >
                    {!isCurrentPreset ? `Custom: ${curLength} mm` : "Custom..."}
                  </button>

                  {/* Custom length popover */}
                  {customOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-ink-850 border border-white/10 rounded-lg shadow-panel p-2.5 z-50 select-none"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                          Custom Length
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomOpen(false)}
                          className="text-ink-400 hover:text-ink-100 p-0.5 cursor-pointer"
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
                            value={customInputStr}
                            onChange={(e) => {
                              const text = e.target.value.replace(/[^0-9]/g, "");
                              setCustomInputStr(text);
                              const val = parseInt(text, 10);
                              if (!isNaN(val) && val >= 10 && val <= 300) {
                                setCustomLength(val);
                                setLabelSize(val, currentTape, currentTape);
                              }
                            }}
                            onBlur={() => {
                              const val = parseInt(customInputStr, 10);
                              const clamped = isNaN(val) ? 40 : Math.max(10, Math.min(300, val));
                              setCustomLength(clamped);
                              setCustomInputStr(String(clamped));
                              setLabelSize(clamped, currentTape, currentTape);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              const step = e.shiftKey ? 5 : 1;
                              const delta = e.deltaY < 0 ? step : -step;
                              const next = Math.max(10, Math.min(300, customLength + delta));
                              setCustomLength(next);
                              setCustomInputStr(String(next));
                              setLabelSize(next, currentTape, currentTape);
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
                            setLabelSize(next, currentTape, currentTape);
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
                            setLabelSize(next, currentTape, currentTape);
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer summary row */}
      <div className="px-3.5 py-2 border-t border-white/5 flex items-center justify-between text-ui-2xs font-mono text-ink-400">
        <div>
          <span>Printer: </span>
          <span className="text-ink-200">
            {isConnected ? (profile?.name || modelId || "Connected") : "Not connected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-200">
            {label.widthMm} × {label.heightMm} mm · {paperType === "gap" ? "Gap" : "Continuous"}
          </span>
          {!compat.compatible && Boolean(modelId) && (
            <span
              className="text-amber-400/90 font-medium"
              title={profile?.name ? `Not supported by ${profile.name}` : "Not supported by current printer"}
            >
              · Not supported by printer
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
