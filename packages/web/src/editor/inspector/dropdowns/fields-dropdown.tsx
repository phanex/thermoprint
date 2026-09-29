import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, FileSpreadsheet, Plus, ExternalLink } from "lucide-react";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { loadCsvFile } from "../../../lib/csv-loader.ts";

const COUNTER_PRESETS = [
  "{{#:0001}}",
  "{{#:01}}",
  "{{#:1}}",
  "{{#:001+5}}",
  "{{#:100+-1}}",
];

interface Props {
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (token: string) => void;
}

export function FieldsDropdown({ triggerRef, onClose, onSelect }: Props) {
  const [view, setView] = useState<"presets" | "help">("presets");
  const [customField, setCustomField] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const csvData = useEditorV2Store((s) => s.csvData);

  const csvHeaders = csvData && csvData.length > 0 ? Object.keys(csvData[0]) : [];

  useEffect(() => {
    if (!triggerRef.current) return;
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
  }, [triggerRef]);

  // Close on outside click
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

  const handlePick = (token: string) => {
    onSelect(token);
    onClose();
  };

  const handleCustomFieldSubmit = () => {
    const trimmed = customField.trim();
    if (!trimmed) return;
    const clean = trimmed.replace(/^\{\{/, "").replace(/\}\}$/, "").trim();
    if (clean) {
      handlePick(`{{${clean}}}`);
    }
  };

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

  return createPortal(
    <div
      ref={ref}
      style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
      className={`fixed ${view === "help" ? "w-80 p-3.5" : "w-56 py-1"} max-h-[calc(100vh-80px)] overflow-y-auto bg-ink-900 border border-white/10 rounded-lg shadow-2xl z-[9999] select-none text-ui-xs text-ink-300 font-sans leading-relaxed`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {view === "presets" ? (
        <>
          {/* Header with Help icon */}
          <div className="flex items-center justify-between px-3 py-1 border-b border-white/5 text-ink-400">
            <span className="font-mono uppercase tracking-wider text-ui-2xs">Fields & Counters</span>
            <button
              type="button"
              onClick={() => setView("help")}
              className="p-0.5 rounded text-ink-400 hover:text-accent transition-colors cursor-pointer"
              title="Syntax & examples"
            >
              <HelpCircle size={13} />
            </button>
          </div>

          {/* Counters Section */}
          <div className="px-3 pt-2 pb-0.5 font-mono uppercase tracking-wider text-ink-400 text-ui-2xs">
            Counters
          </div>
          {COUNTER_PRESETS.map((expr) => (
            <button
              key={expr}
              type="button"
              onClick={() => handlePick(expr)}
              className="w-full px-3 py-1.5 text-left text-ink-200 hover:text-accent hover:bg-white/5 transition-colors cursor-pointer font-mono whitespace-nowrap"
            >
              {expr}
            </button>
          ))}

          <div className="my-1 border-t border-white/5" />

          {/* Fields Section (CSV) */}
          <div className="px-3 pt-1 pb-1 font-mono uppercase tracking-wider text-ink-400 text-ui-2xs flex items-center justify-between">
            <span>Fields</span>
            {csvHeaders.length > 0 && (
              <span className="text-ink-500 text-[10px]">{csvHeaders.length} cols</span>
            )}
          </div>

          {/* Direct Field Name Input grouped directly under Fields header */}
          <div className="px-2 pb-1.5">
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Field name..."
                value={customField}
                onChange={(e) => setCustomField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomFieldSubmit();
                }}
                className="flex-1 min-w-0 h-6.5 bg-ink-800 border border-white/10 rounded px-2 text-ui-xs font-mono text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent/50"
              />
              <button
                type="button"
                onClick={handleCustomFieldSubmit}
                disabled={!customField.trim()}
                className="h-6.5 px-2 bg-accent/15 hover:bg-accent text-accent hover:text-on-accent rounded text-ui-xs font-medium transition-colors disabled:opacity-30 disabled:hover:bg-accent/15 disabled:hover:text-accent cursor-pointer flex items-center justify-center"
                title="Insert field"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Loaded CSV Columns */}
          {csvHeaders.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-t border-white/5 py-0.5">
              {csvHeaders.map((header) => (
                <button
                  key={header}
                  type="button"
                  onClick={() => handlePick(`{{${header}}}`)}
                  className="w-full px-3 py-1.5 text-left text-ink-200 hover:text-accent hover:bg-white/5 transition-colors cursor-pointer font-mono truncate"
                  title={`{{${header}}}`}
                >
                  {`{{${header}}}`}
                </button>
              ))}
            </div>
          )}

          {/* Import / Change CSV button at the bottom */}
          <div className="pt-1 mt-0.5 border-t border-white/5 px-1 pb-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-2 py-1.5 text-left flex items-center gap-1.5 text-ink-400 hover:text-accent hover:bg-white/5 rounded transition-colors cursor-pointer text-ui-2xs font-sans"
              title={csvData ? "Select another CSV / TSV file" : "Import CSV or TSV data"}
            >
              <FileSpreadsheet size={13} className="text-accent shrink-0" />
              <span className="truncate">
                {csvData ? "Change CSV file..." : "Import CSV / TSV file..."}
              </span>
            </button>
          </div>
        </>
      ) : (
        <div>
          {/* Header without Back/Close buttons */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
            <span className="font-semibold text-ink-100 text-ui-sm">Syntax</span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handlePick("{{#:0001}}")}
                className="font-mono text-accent text-ui-xs hover:underline cursor-pointer"
                title="Insert counter"
              >
                {"{{#:}}"}
              </button>
              <span className="text-ink-600">&middot;</span>
              <button
                type="button"
                onClick={() => handlePick("{{}}")}
                className="font-mono text-accent text-ui-xs hover:underline cursor-pointer"
                title="Insert empty {{}}"
              >
                {"{{}}"}
              </button>
            </div>
          </div>

          {/* Counters */}
          <div className="mb-3 text-ui-xs space-y-1.5">
            <div className="font-mono uppercase tracking-wider text-ink-300 font-semibold">
              Counters: <span className="text-accent font-normal font-mono lowercase">{"{{#:pattern+step}}"}</span>
            </div>
            <div className="text-ink-400 space-y-1 text-ui-2xs">
              <div className="text-ink-300 font-medium">Positional stencil & digits:</div>
              <div>
                Non-digit characters (letters, hyphens, dots, slashes) remain fixed as a stencil. Digits define initial number and padding:
              </div>
              <div className="font-mono text-ink-200">
                1 (1, 2...), 001 (001, 002...), 100 (starts at 100), SN-0001 (SN-0002...), 1.01 (1.02, after 1.99 &rarr; 2.00).
              </div>

              <div className="text-ink-300 font-medium pt-1">Step & direction:</div>
              <div className="space-y-0.5 font-sans">
                <div><span className="font-mono text-ink-200">+1</span> — default increment.</div>
                <div><span className="font-mono text-ink-200">+N</span> — custom step (+5, +10).</div>
                <div><span className="font-mono text-ink-200">+-N</span> — countdown to 0 (stops printing at 0).</div>
              </div>
            </div>
          </div>

          {/* Fields (CSV) */}
          <div className="pt-2.5 border-t border-white/10 text-ui-xs space-y-1">
            <div className="font-mono uppercase tracking-wider text-ink-300 font-semibold">
              Table fields: <button type="button" onClick={() => handlePick("{{Field name}}")} className="text-accent hover:underline cursor-pointer font-normal font-mono lowercase">{"{{Field name}}"}</button>
            </div>
            <div className="text-ink-400 text-ui-2xs">
              Substitutes the column value for each row (e.g. <span className="font-mono text-ink-300">{"{{SKU}}"}</span>, <span className="font-mono text-ink-300">{"{{Price}}"}</span>).
            </div>
          </div>

          {/* Docs Link */}
          <div className="pt-2 mt-2.5 border-t border-white/10 flex items-center justify-between text-ui-2xs">
            <a
              href="https://github.com/phanex/thermoprint/blob/main/docs/TEMPLATES.md"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline flex items-center gap-1.5"
            >
              <span>Documentation on GitHub</span>
              <ExternalLink size={11} className="shrink-0" />
            </a>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
