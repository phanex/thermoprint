import { useEditorV2Store } from "../store/editor-store.ts";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/i.test(navigator.userAgent || navigator.platform);
const modKey = isMac ? "Cmd" : "Ctrl";

export function StatusBar() {
  const label = useEditorV2Store((s) => s.label);
  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const paperType = useEditorV2Store((s) => s.paperType);
  const dirty = useEditorV2Store((s) => s.currentLabelDirty || s.currentLabelId === null);

  const sel = elements.filter((e) => selectedIds.includes(e.id));

  return (
    <div className="hidden md:flex absolute bottom-0 left-0 right-0 h-6 px-3 items-center justify-between text-ui-xs font-mono text-ink-300 bg-ink-900/90 border-t border-white/8 backdrop-blur-sm z-10 select-none">
      {/* Left: Document info */}
      <div className="flex items-center gap-3">
        <span>
          {label.widthMm}×{label.heightMm} mm
        </span>
        <span className="text-ink-600">/</span>
        <span title={paperType === "gap" ? "Gap paper (die-cut labels)" : "Continuous tape"}>
          {paperType === "gap" ? "GAP" : "CONT"}
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

      {/* Right: Save state */}
      <div className="flex items-center gap-4">
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
