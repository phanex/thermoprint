import { useRef, useState, useEffect, useMemo } from "react";
import { FileSpreadsheet, ChevronLeft, ChevronRight, X, FolderOpen, Hash } from "lucide-react";
import { extractPlaceholders, getMaxCountdownCopies } from "@thermoprint/core";
import { useEditorV2Store } from "../store/editor-store.ts";
import { loadCsvFile } from "../lib/csv-loader.ts";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/i.test(navigator.userAgent || navigator.platform);
const modKey = isMac ? "Cmd" : "Ctrl";

export function StatusBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvMenuRef = useRef<HTMLDivElement>(null);
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);

  const label = useEditorV2Store((s) => s.label);
  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const paperType = useEditorV2Store((s) => s.paperType);
  const dirty = useEditorV2Store((s) => s.currentLabelDirty || s.currentLabelId === null);
  const csvData = useEditorV2Store((s) => s.csvData);
  const csvFileName = useEditorV2Store((s) => s.csvFileName);
  const csvPreviewRowIndex = useEditorV2Store((s) => s.csvPreviewRowIndex);
  const setCsvPreviewRowIndex = useEditorV2Store((s) => s.setCsvPreviewRowIndex);
  const clearCsv = useEditorV2Store((s) => s.clearCsv);

  // Close CSV menu on outside click
  useEffect(() => {
    if (!csvMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (csvMenuRef.current && !csvMenuRef.current.contains(e.target as Node)) {
        setCsvMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [csvMenuOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await loadCsvFile(file);
      if (!res.success) {
        alert(res.error || "Failed to load CSV");
      }
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const { counters, csvFields } = useMemo(() => {
    const allCounters = new Set<string>();
    const allCsv = new Set<string>();
    for (const el of elements) {
      if (el.type === "text" && typeof el.props.text === "string") {
        const p = extractPlaceholders(el.props.text);
        p.counters.forEach((c) => allCounters.add(c));
        p.fields.forEach((f) => allCsv.add(f));
      }
      if ((el.type === "barcode" || el.type === "qrcode") && typeof el.props.content === "string") {
        const p = extractPlaceholders(el.props.content);
        p.counters.forEach((c) => allCounters.add(c));
        p.fields.forEach((f) => allCsv.add(f));
      }
    }
    return { counters: Array.from(allCounters), csvFields: Array.from(allCsv) };
  }, [elements]);

  const maxCountdownCopies = useMemo(() => {
    let minLimit: number | null = null;
    for (const c of counters) {
      const limit = getMaxCountdownCopies(c);
      if (limit !== null) {
        if (minLimit === null || limit < minLimit) {
          minLimit = limit;
        }
      }
    }
    return minLimit;
  }, [counters]);

  const hasCsvData = csvData !== null && csvData.length > 0;
  const hasCounters = counters.length > 0;

  const sel = elements.filter((e) => selectedIds.includes(e.id));

  return (
    <div
      className={`hidden md:flex absolute bottom-0 left-0 right-0 h-6 px-3 items-center justify-between text-ui-xs font-mono text-ink-300 bg-ink-900/90 border-t border-white/8 backdrop-blur-sm select-none ${
        csvMenuOpen ? "z-40" : "z-10"
      }`}
    >
      {/* Left: Document info */}
      <div className="flex items-center gap-3">
        <span>
          {label.widthMm}×{label.heightMm} mm
        </span>
        <span className="text-ink-600">/</span>
        <span title={paperType === "gap" ? "Gap paper (die-cut labels)" : label.isDynamic ? "Continuous tape (Dynamic length)" : "Continuous tape"}>
          {paperType === "gap" ? "GAP" : label.isDynamic ? "CONT (DYN)" : "CONT"}
        </span>
        <span className="text-ink-600">/</span>
        <span>{elements.length} elements</span>
        {sel.length === 1 && (
          <span className="text-accent ml-1">
            {sel[0].type.toUpperCase()} · {Math.round(sel[0].width)}×
            {Math.round(sel[0].height)}px · ({Math.round(sel[0].x)},{" "}
            {Math.round(sel[0].y)})
          </span>
        )}
        {sel.length > 1 && (
          <span className="text-accent ml-1">{sel.length} selected</span>
        )}
      </div>

      {/* Center: Keyboard shortcuts */}
      <div className="flex items-center gap-3 text-ink-400">
        <span>
          <span className="text-ink-200 font-semibold">Space</span> pan
        </span>
        <span className="text-ink-600">•</span>
        <span>
          <span className="text-ink-200 font-semibold">{modKey}+scroll</span> zoom
        </span>
        <span className="text-ink-600">•</span>
        <button
          onClick={() => useEditorV2Store.setState({ paletteOpen: true })}
          className="hover:text-accent hover-fade flex items-center gap-1 cursor-pointer outline-none"
          title={`Click or press ${modKey}+K to open Command Palette`}
        >
          <span className="text-ink-200 font-semibold">{modKey}+K</span> commands
        </button>
      </div>

      {/* Right: CSV status and Save state */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv"
          className="hidden"
          onChange={handleFileChange}
        />

        {hasCsvData ? (
          <div
            ref={csvMenuRef}
            className="relative flex items-center gap-1.5 text-ink-300 font-mono text-ui-2xs select-none"
          >
            {/* Clickable file trigger */}
            <button
              type="button"
              onClick={() => setCsvMenuOpen((o) => !o)}
              className="flex items-center gap-1 text-ink-300 hover:text-accent transition-colors cursor-pointer"
              title={csvFileName || "CSV"}
            >
              <FileSpreadsheet size={12} className="text-accent shrink-0" />
            </button>

            {/* Clean pagination */}
            <div className="flex items-center gap-0.5" title={csvFileName || "CSV"}>
              <button
                type="button"
                onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex - 1)}
                disabled={csvPreviewRowIndex <= 0}
                className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                title="Previous row"
              >
                <ChevronLeft size={11} />
              </button>
              <span className="text-ink-200 tabular-nums px-0.5">
                {csvPreviewRowIndex + 1}/{csvData.length}
              </span>
              <button
                type="button"
                onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex + 1)}
                disabled={csvPreviewRowIndex >= csvData.length - 1}
                className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                title="Next row"
              >
                <ChevronRight size={11} />
              </button>
            </div>

            {/* Micro-flyout */}
            {csvMenuOpen && (
              <div className="absolute bottom-7 right-0 min-w-48 bg-ink-850 border border-white/10 rounded-lg shadow-panel p-1.5 z-50 font-sans">
                <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/5 mb-1 text-ui-xs font-mono text-ink-200">
                  <FileSpreadsheet size={13} className="text-accent shrink-0" />
                  <span className="truncate max-w-[170px]" title={csvFileName || undefined}>
                    {csvFileName || "data.csv"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ink-750 text-ink-300 hover:text-ink-100 text-ui-xs transition-colors cursor-pointer text-left"
                >
                  <FolderOpen size={13} className="shrink-0 text-ink-400" />
                  <span>Open CSV...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvMenuOpen(false);
                    clearCsv();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ink-750 text-ink-300 hover:text-ink-100 text-ui-xs transition-colors cursor-pointer text-left"
                >
                  <X size={13} className="shrink-0 text-ink-400" />
                  <span>Remove CSV</span>
                </button>
              </div>
            )}
          </div>
        ) : csvFields.length > 0 ? (
          /* State 2: Template has CSV fields, but no CSV is loaded -> Gray CSV icon. If counters exist, keep counter stepper! */
          <div className="flex items-center gap-1 text-ink-300 font-mono text-ui-2xs select-none">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-ink-400 hover:text-accent transition-colors cursor-pointer"
              title="Import CSV or TSV data to populate fields"
            >
              <FileSpreadsheet size={12} className="shrink-0" />
              {!hasCounters && <span>CSV</span>}
            </button>

            {hasCounters && (
              <div className="flex items-center gap-0.5" title="Preview counter step (CSV data not loaded)">
                <button
                  type="button"
                  onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex - 1)}
                  disabled={csvPreviewRowIndex <= 0}
                  className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                  title="Previous step"
                >
                  <ChevronLeft size={11} />
                </button>
                <span className="text-ink-200 tabular-nums px-0.5">
                  {maxCountdownCopies !== null
                    ? `${csvPreviewRowIndex + 1}/${maxCountdownCopies}`
                    : `${csvPreviewRowIndex + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex + 1)}
                  disabled={maxCountdownCopies !== null && csvPreviewRowIndex >= maxCountdownCopies - 1}
                  className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                  title="Next step"
                >
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* State 3: No CSV fields -> Show number icon (#) */
          <div className="flex items-center gap-1 text-ink-300 font-mono text-ui-2xs select-none">
            <span
              className={`flex items-center ${hasCounters ? "text-ink-400" : "text-ink-500"}`}
              title={hasCounters ? "Counter sequence preview" : "No dynamic fields"}
            >
              <Hash size={12} className="shrink-0" />
            </span>

            {hasCounters && (
              <div className="flex items-center gap-0.5" title="Preview counter step">
                <button
                  type="button"
                  onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex - 1)}
                  disabled={csvPreviewRowIndex <= 0}
                  className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                  title="Previous step"
                >
                  <ChevronLeft size={11} />
                </button>
                <span className="text-ink-200 tabular-nums px-0.5">
                  {maxCountdownCopies !== null
                    ? `${csvPreviewRowIndex + 1}/${maxCountdownCopies}`
                    : `${csvPreviewRowIndex + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => setCsvPreviewRowIndex(csvPreviewRowIndex + 1)}
                  disabled={maxCountdownCopies !== null && csvPreviewRowIndex >= maxCountdownCopies - 1}
                  className="p-0.5 hover:text-accent disabled:opacity-25 disabled:hover:text-ink-400 cursor-pointer transition-colors"
                  title="Next step"
                >
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>
        )}

        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dirty ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className={dirty ? "text-ink-300" : "text-ink-400"}>
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
        </span>
      </div>
    </div>
  );
}
