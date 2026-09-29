import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Printer,
  ChevronDown,
  X,
  Plus,
  Minus,
  FileSpreadsheet,
} from "lucide-react";
import {
  extractPlaceholders,
  getMaxCountdownCopies,
} from "@thermoprint/core";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { scanAndConnect } from "../../hooks/use-web-bluetooth.ts";
import { checkPrinterCompatibility } from "../../label/label-sizes.ts";
import { loadCsvFile } from "../../lib/csv-loader.ts";
import { parsePrintRanges, formatMediaDescription } from "../../lib/range-parser.ts";
import { getActiveCutterMargins } from "../../label/dynamic-label.ts";
import { ConfirmPrintModal } from "./confirm-print-modal.tsx";

export interface BatchItem {
  index: number;
  csvRow: Record<string, string>;
  rowNumber?: number;
}

interface PrintButtonProps {
  onPrint: (copies: number) => Promise<boolean>;
  onPrintBatch: (items: BatchItem[]) => Promise<boolean>;
}

export function PrintButton({ onPrint, onPrintBatch }: PrintButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const elements = useEditorV2Store((s) => s.elements);
  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const csvData = useEditorV2Store((s) => s.csvData);
  const csvFileName = useEditorV2Store((s) => s.csvFileName);
  const csvPreviewRowIndex = useEditorV2Store((s) => s.csvPreviewRowIndex);

  const isConnected = usePrinterStore((s) => s.isConnected);
  const modelId = usePrinterStore((s) => s.modelId);
  const peripheral = usePrinterStore((s) => s.peripheral);

  // Scan document elements for dynamic tokens
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

    return {
      counters: Array.from(allCounters),
      csvFields: Array.from(allCsv),
    };
  }, [elements]);

  const hasCsv = csvFields.length > 0;
  const hasCounters = counters.length > 0;
  const isDynamic = hasCsv || hasCounters;
  const isCsvLoaded = csvData !== null && csvData.length > 0;

  // Check missing CSV fields
  const missingCsvFields = useMemo(() => {
    if (!hasCsv || !isCsvLoaded || !csvData) return [];
    const headers = new Set(Object.keys(csvData[0] || {}));
    return csvFields.filter((f) => !headers.has(f));
  }, [hasCsv, isCsvLoaded, csvData, csvFields]);

  const isCsvMissing = hasCsv && !isCsvLoaded;
  const hasMissingCsvColumns = hasCsv && isCsvLoaded && missingCsvFields.length > 0;
  const hasCsvError = isCsvMissing || hasMissingCsvColumns;

  // Maximum allowed copies if a countdown counter is present
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

  // Range input state
  const [rangeInput, setRangeInput] = useState("");

  // Copies stepper state (default 1, no presets)
  const [copies, setCopies] = useState(1);

  // Clean media description text (e.g. "12 mm · dynamic" or "40 × 12 mm" or "40 (+18) × 12 mm")
  const mediaDescription = useMemo(() => {
    const margins = getActiveCutterMargins(modelId, label.tapeWidthMm ?? 12, paperType);
    return formatMediaDescription(label, paperType, margins);
  }, [modelId, label, paperType]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Determine effective range indices
  const { effectiveIndices, isRangeInvalid } = useMemo(() => {
    const trimmed = rangeInput.trim();
    if (!trimmed) {
      // Empty field:
      // For CSV: all rows
      // For Counter: currently previewed label
      if (hasCsv && isCsvLoaded && csvData) {
        const all = Array.from({ length: csvData.length }, (_, i) => i + 1);
        return { effectiveIndices: all, isRangeInvalid: false };
      }
      if (hasCounters) {
        return { effectiveIndices: [csvPreviewRowIndex + 1], isRangeInvalid: false };
      }
      return { effectiveIndices: [1], isRangeInvalid: false };
    }

    const maxLimit = hasCsv && isCsvLoaded && csvData
      ? csvData.length
      : maxCountdownCopies !== null
      ? maxCountdownCopies
      : undefined;

    const parsed = parsePrintRanges(trimmed, maxLimit);
    if (parsed.length === 0) {
      return { effectiveIndices: [], isRangeInvalid: true };
    }
    return { effectiveIndices: parsed, isRangeInvalid: false };
  }, [rangeInput, hasCsv, isCsvLoaded, csvData, maxCountdownCopies, hasCounters, csvPreviewRowIndex]);

  // Build batch items
  const batchItems = useMemo<BatchItem[]>(() => {
    if (!isDynamic || hasCsvError) return [];

    const items: BatchItem[] = [];
    if (hasCsv && isCsvLoaded && csvData) {
      for (const itemNum of effectiveIndices) {
        const rowIdx = itemNum - 1;
        const row = csvData[rowIdx] || {};
        for (let c = 0; c < copies; c++) {
          items.push({
            index: itemNum - 1,
            csvRow: row,
            rowNumber: itemNum,
          });
        }
      }
    } else if (hasCounters) {
      for (const itemNum of effectiveIndices) {
        const counterStepIdx = itemNum - 1;
        for (let c = 0; c < copies; c++) {
          items.push({
            index: counterStepIdx,
            csvRow: {},
            rowNumber: itemNum,
          });
        }
      }
    }
    return items;
  }, [isDynamic, hasCsvError, hasCsv, isCsvLoaded, csvData, effectiveIndices, copies, hasCounters]);

  // Total labels to print
  const totalLabels = useMemo(() => {
    if (!isDynamic) return copies;
    return batchItems.length;
  }, [isDynamic, copies, batchItems.length]);

  // Can print validation
  const isPrintDisabled = useMemo(() => {
    if (hasCsvError) return true;
    if (isDynamic && (isRangeInvalid || totalLabels === 0)) return true;
    return false;
  }, [hasCsvError, isDynamic, isRangeInvalid, totalLabels]);

  // Direct print execution after confirmation (or directly if totalLabels === 1)
  const executePrintJob = useCallback(async () => {
    if (isPrintDisabled || hasCsvError) return;

    if (!isConnected) {
      scanAndConnect();
      return;
    }

    const currentModel = modelId ?? null;
    const compat = checkPrinterCompatibility(currentModel, label, paperType);
    if (!compat.compatible) {
      const ok = confirm(`Warning: ${compat.reason}\n\nDo you want to send this print job anyway?`);
      if (!ok) return;
    }

    if (isDynamic) {
      if (batchItems.length === 0) return;
      await onPrintBatch(batchItems);
    } else {
      const duration = Math.min(4500, 1200 + copies * 220);
      useEditorV2Store.getState().startPrint(copies, duration);
      try {
        const sent = await onPrint(copies);
        if (sent) {
          setTimeout(() => useEditorV2Store.getState().endPrint(), 400);
        } else {
          setTimeout(() => useEditorV2Store.getState().endPrint(), duration + 400);
        }
      } catch (err) {
        console.error("Print failed:", err);
        useEditorV2Store.getState().endPrint();
      }
    }
  }, [
    isPrintDisabled,
    isConnected,
    modelId,
    label,
    paperType,
    isDynamic,
    batchItems,
    onPrintBatch,
    copies,
    onPrint,
  ]);

  // Print exactly 1 copy of the currently previewed label (WYSIWYG on canvas)
  const handlePrintCurrent = useCallback(async () => {
    if (hasCsvError || isPrintDisabled) {
      setOpen(true);
      return;
    }

    if (!isConnected) {
      scanAndConnect();
      return;
    }

    const currentModel = modelId ?? null;
    const compat = checkPrinterCompatibility(currentModel, label, paperType);
    if (!compat.compatible) {
      const ok = confirm(`Warning: ${compat.reason}\n\nDo you want to send this print job anyway?`);
      if (!ok) return;
    }

    if (hasCsv && isCsvLoaded && csvData) {
      const row = csvData[csvPreviewRowIndex] || csvData[0] || {};
      const item: BatchItem = {
        index: csvPreviewRowIndex,
        csvRow: row,
        rowNumber: csvPreviewRowIndex + 1,
      };
      await onPrintBatch([item]);
    } else if (hasCounters) {
      const item: BatchItem = {
        index: csvPreviewRowIndex,
        csvRow: {},
        rowNumber: csvPreviewRowIndex + 1,
      };
      await onPrintBatch([item]);
    } else {
      const duration = 1420;
      useEditorV2Store.getState().startPrint(1, duration);
      try {
        const sent = await onPrint(1);
        if (sent) {
          setTimeout(() => useEditorV2Store.getState().endPrint(), 400);
        } else {
          setTimeout(() => useEditorV2Store.getState().endPrint(), duration + 400);
        }
      } catch (err) {
        console.error("Print failed:", err);
        useEditorV2Store.getState().endPrint();
      }
    }
  }, [
    hasCsvError,
    isPrintDisabled,
    isConnected,
    modelId,
    label,
    paperType,
    hasCsv,
    isCsvLoaded,
    csvData,
    hasCounters,
    csvPreviewRowIndex,
    onPrintBatch,
    onPrint,
  ]);

  // Click on Print button in flyout
  const handlePrintClick = useCallback(() => {
    if (hasCsvError || isPrintDisabled) {
      return;
    }

    if (totalLabels > 1) {
      // Multiple labels -> open confirmation modal
      setOpen(false);
      setConfirmModalOpen(true);
    } else {
      // Exactly 1 label -> print immediately
      setOpen(false);
      executePrintJob();
    }
  }, [hasCsvError, isPrintDisabled, totalLabels, executePrintJob]);

  // Keyboard event listeners (Cmd+P)
  useEffect(() => {
    const handlePrintCurrentEvent = () => {
      if (hasCsvError || isPrintDisabled) {
        setOpen(true);
        return;
      }
      handlePrintCurrent();
    };
    const handleOpenPrintEvent = () => setOpen(true);
    window.addEventListener("thermoprint:print-current", handlePrintCurrentEvent);
    window.addEventListener("thermoprint:open-print", handleOpenPrintEvent);
    return () => {
      window.removeEventListener("thermoprint:print-current", handlePrintCurrentEvent);
      window.removeEventListener("thermoprint:open-print", handleOpenPrintEvent);
    };
  }, [hasCsvError, isPrintDisabled, handlePrintCurrent]);

  const printerName = isConnected ? peripheral?.name || "Printer" : "Not connected";

  // Placeholder for range input
  const rangePlaceholder = useMemo(() => {
    if (hasCsv && isCsvLoaded && csvData) {
      return `All (${csvData.length})`;
    }
    if (hasCounters && maxCountdownCopies !== null) {
      return `max ${maxCountdownCopies}`;
    }
    if (hasCounters) {
      return String(csvPreviewRowIndex + 1);
    }
    return "1";
  }, [hasCsv, isCsvLoaded, csvData, hasCounters, maxCountdownCopies, csvPreviewRowIndex]);

  return (
    <div className="relative ml-1" ref={ref}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv"
        className="hidden"
        onChange={handleCsvFileChange}
      />

      {/* Main split button: left = print current WYSIWYG, right = batch flyout */}
      <div className="flex items-stretch rounded-md overflow-hidden shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]">
        <button
          type="button"
          onClick={handlePrintCurrent}
          className="flex items-center gap-2 h-8 pl-2.5 pr-3 bg-accent text-on-accent font-bold text-ui-base hover:bg-accent-600 hover-fade cursor-pointer transition-colors"
          title="Print current label (⌘P)"
        >
          <Printer size={15} />
          <span>Print</span>
          <kbd
            style={{
              background: "rgba(0,0,0,0.15)",
              borderColor: "rgba(0,0,0,0.15)",
              color: "var(--color-on-accent)",
            }}
          >
            ⌘P
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`w-7 flex items-center justify-center border-l border-ink-950/20 bg-accent text-on-accent hover:bg-accent-600 hover-fade cursor-pointer transition-colors ${
            open ? "bg-accent-600" : ""
          }`}
          title="Batch & Print options"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Flyout panel */}
      {open && (
        <div className="fixed right-2 top-14 md:absolute md:right-0 md:top-10 w-[calc(100vw-1rem)] md:w-76 max-w-76 bg-ink-850 border border-white/10 rounded-lg shadow-panel p-3.5 z-[60] text-ui-xs text-ink-300">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                {hasCsv ? "Batch Print" : hasCounters ? "Sequence Print" : "Print Job"}
              </div>
              <div className="text-sm font-semibold text-ink-50">
                {hasCsv ? "CSV Data Records" : hasCounters ? "Sequential Counters" : "Send to Printer"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-400 hover:text-ink-100 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3 mb-3">
            {/* RANGE INPUT (only if dynamic: counters or CSV) */}
            {isDynamic && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
                    Range
                  </span>
                  {rangeInput.trim() !== "" && !isRangeInvalid && !isCsvMissing && (
                    <span className="text-ui-2xs font-mono text-ink-400">
                      {effectiveIndices.length} {effectiveIndices.length === 1 ? "item" : "items"}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    disabled={isCsvMissing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isPrintDisabled) {
                        e.preventDefault();
                        handlePrintClick();
                      }
                    }}
                    placeholder={isCsvMissing ? "Requires CSV" : rangePlaceholder}
                    title={isCsvMissing ? "Import CSV first" : "Numbers or ranges: 1, 2, 3, 10-15"}
                    className={`w-full h-7 px-2.5 pr-7 bg-ink-900 border rounded text-ui-xs font-mono outline-none transition-colors ${
                      isCsvMissing
                        ? "border-white/5 text-ink-500 opacity-50 cursor-not-allowed"
                        : isRangeInvalid
                        ? "border-amber-400/60 text-amber-200 focus:border-amber-400"
                        : "border-white/10 text-ink-100 focus:border-accent"
                    }`}
                  />
                  {rangeInput.trim() !== "" && !isCsvMissing && (
                    <button
                      type="button"
                      onClick={() => setRangeInput("")}
                      className="absolute right-1.5 p-0.5 text-ink-400 hover:text-ink-100 rounded cursor-pointer"
                      title="Clear range"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CSV DATA ROW (only if template has CSV fields) */}
            {hasCsv && (
              <div>
                <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400 mb-1">
                  CSV Data
                </div>
                {isCsvLoaded && csvData ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 rounded bg-ink-800 border border-white/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileSpreadsheet size={13} className="text-accent shrink-0" />
                        <span className="text-ui-xs font-mono text-ink-200 truncate max-w-[130px]" title={csvFileName || undefined}>
                          {csvFileName || "data.csv"}
                        </span>
                        <span className="text-ui-2xs font-mono text-ink-400 shrink-0">
                          ({csvData.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-ui-2xs text-accent hover:underline cursor-pointer shrink-0 ml-1"
                      >
                        Change
                      </button>
                    </div>
                    {missingCsvFields.length > 0 && (
                      <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-ui-2xs">
                        Missing columns: {missingCsvFields.join(", ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-2.5 rounded border border-dashed border-amber-400/50 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/10 text-amber-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="text-amber-400" />
                    <span>Select CSV file...</span>
                  </button>
                )}
              </div>
            )}

            {/* COPIES STEPPER (standard stepper, default 1, no presets) */}
            <div>
              <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400 mb-1">
                {isDynamic ? "Copies each" : "Copies"}
              </div>
              <div className="flex items-stretch rounded bg-ink-800 border border-white/5 overflow-hidden w-36">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  disabled={copies <= 1}
                  className="w-8 flex items-center justify-center text-ink-300 hover:bg-ink-750 disabled:opacity-30 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.min(999, parseInt(e.target.value || "1", 10))))}
                  className="flex-1 bg-transparent text-center text-ui-sm font-semibold text-ink-50 outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setCopies(Math.min(999, copies + 1))}
                  className="w-8 flex items-center justify-center text-ink-300 hover:bg-ink-750 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-1 text-ui-2xs mb-3 pt-2 border-t border-white/5 text-ink-400">
            <div className="flex items-center justify-between">
              <span>Printer</span>
              <span className="font-mono text-ink-200">{printerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Media</span>
              <span className="font-mono text-ink-200">{mediaDescription}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handlePrintClick}
            disabled={isPrintDisabled}
            className="w-full h-8 rounded-md bg-accent text-on-accent font-semibold text-ui-base hover:bg-accent-600 flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-40 disabled:hover:bg-accent disabled:cursor-not-allowed"
          >
            <Printer size={15} />
            <span>
              {`Print ${totalLabels > 0 ? totalLabels : 1} ${
                !isDynamic
                  ? copies === 1
                    ? "copy"
                    : "copies"
                  : totalLabels === 1
                  ? "label"
                  : "labels"
              }`}
            </span>
          </button>
        </div>
      )}

      {/* Confirmation Modal for multi-label jobs (> 1) */}
      <ConfirmPrintModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executePrintJob}
        totalLabels={totalLabels}
        copies={copies}
        items={batchItems}
        isStatic={!isDynamic}
        counters={counters}
        csvFields={csvFields}
        printerName={printerName}
        mediaText={mediaDescription}
      />
    </div>
  );
}
