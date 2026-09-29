import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { evaluateCounter } from "@thermoprint/core";
import { type BatchItem } from "./print-button.tsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalLabels: number;
  copies: number;
  items: BatchItem[];
  isStatic: boolean;
  counters: string[];
  csvFields: string[];
  printerName: string;
  mediaText: string;
}

export function ConfirmPrintModal({
  isOpen,
  onClose,
  onConfirm,
  totalLabels,
  copies,
  items,
  isStatic,
  counters,
  csvFields,
  printerName,
  mediaText,
}: Props) {
  // Handle Esc to close, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onClose();
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const displayItems = items.slice(0, 100);
  const remainingCount = items.length - displayItems.length;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-950/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg max-h-[85vh] bg-ink-850 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-ink-900/60 shrink-0">
          <div>
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
              {isStatic ? "Confirm Print" : "Confirm Batch Print"}
            </div>
            <div className="text-ui-base font-semibold text-ink-50 mt-0.5">
              Print: {totalLabels}{" "}
              {isStatic
                ? totalLabels === 1
                  ? "copy"
                  : "copies"
                : totalLabels === 1
                ? "label"
                : "labels"}{" "}
              {!isStatic && copies > 1 && (
                <span className="text-ui-xs font-normal text-ink-400">
                  ({Math.round(items.length / Math.max(1, copies))} items × {copies} copies)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="text-ui-sm text-ink-300 font-medium">Are you sure?</div>

          {/* Dynamic Table Preview */}
          {!isStatic && items.length > 0 && (
            <div className="border border-white/8 rounded-lg overflow-hidden bg-ink-900/60">
              <div className="max-h-60 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-ui-xs">
                  <thead className="bg-ink-800 text-ink-300 font-mono text-ui-2xs uppercase sticky top-0 z-10 border-b border-white/8">
                    <tr>
                      <th className="px-2.5 py-1.5 w-12 text-ink-400">#</th>
                      {counters.map((c, i) => (
                        <th key={`c-${i}`} className="px-2.5 py-1.5 font-mono text-ink-300">
                          {`#:${c}`}
                        </th>
                      ))}
                      {csvFields.map((f, i) => (
                        <th key={`f-${i}`} className="px-2.5 py-1.5 font-mono text-ink-300">
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-ink-200">
                    {displayItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-2.5 py-1 text-ink-400 tabular-nums">
                          {idx + 1}
                        </td>
                        {counters.map((c, ci) => (
                          <td key={`cval-${ci}`} className="px-2.5 py-1 text-ink-200 whitespace-nowrap">
                            {evaluateCounter(c, item.index).text}
                          </td>
                        ))}
                        {csvFields.map((f, fi) => (
                          <td key={`fval-${fi}`} className="px-2.5 py-1 text-ink-200 truncate max-w-44" title={item.csvRow[f] || ""}>
                            {item.csvRow[f] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {remainingCount > 0 && (
                <div className="px-3 py-1.5 bg-ink-900 border-t border-white/5 text-center text-ui-2xs font-mono text-ink-400">
                  ... and {remainingCount} more labels
                </div>
              )}
            </div>
          )}

          {/* Info Rows */}
          <div className="space-y-1 text-ui-xs text-ink-400 pt-1">
            <div className="flex items-center justify-between">
              <span>Printer</span>
              <span className="font-mono text-ink-200">{printerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Media</span>
              <span className="font-mono text-ink-200">{mediaText}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-white/8 bg-ink-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-ui-sm text-ink-300 hover:text-ink-100 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            autoFocus
            className="flex items-center gap-2 h-8 px-4 rounded-md bg-accent text-on-accent font-semibold text-ui-sm hover:bg-accent-600 transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>
              Print {totalLabels}{" "}
              {isStatic
                ? totalLabels === 1
                  ? "copy"
                  : "copies"
                : totalLabels === 1
                ? "label"
                : "labels"}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
