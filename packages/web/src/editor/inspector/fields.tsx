import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { getFontFamilyStack } from "../../lib/fonts.ts";

// Shared field components used across all inspector sections

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-3 py-2.5 border-b border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-ui-2xs font-mono uppercase tracking-[0.12em] text-ink-500">
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  mono,
  title,
  children,
}: {
  label: string;
  mono?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-1.5" title={title}>
      <span
        className={`text-ui-xs uppercase tracking-wider text-ink-400 shrink-0 h-7 flex items-center cursor-default ${
          mono ? "font-mono" : ""
        }`}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const formatVal = (v: number) => {
    if (isNaN(v)) return 0;
    return Number(v.toFixed(2));
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const mult = e.shiftKey ? 4 : 1;
    const rawDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if (rawDelta === 0) return;
    const delta = (rawDelta < 0 ? step : -step) * mult;
    let newVal = formatVal((value || 0) + delta);
    if (min !== undefined) newVal = Math.max(min, newVal);
    if (max !== undefined) newVal = Math.min(max, newVal);
    onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const mult = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let newVal = formatVal((value || 0) + step * mult);
      if (max !== undefined) newVal = Math.min(max, newVal);
      onChange(newVal);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let newVal = formatVal((value || 0) - step * mult);
      if (min !== undefined) newVal = Math.max(min, newVal);
      onChange(newVal);
    }
  };

  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const displayVal =
    value === undefined || value === null
      ? 0
      : Number.isInteger(value)
      ? value
      : Number(value.toFixed(decimals));

  return (
    <div className={`flex items-center h-7 rounded-md bg-ink-800 border border-white/5 focus-within:border-accent/50 px-2 gap-1 ${className}`}>
      <input
        type="number"
        value={displayVal}
        step={step}
        min={min}
        max={max}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-ui-sm text-ink-100 font-mono outline-none tabular-nums text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="text-ui-2xs font-mono text-ink-400 select-none shrink-0">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        if (autoFocus) e.target.select();
      }}
      className="w-full h-7 px-2 rounded-md bg-ink-800 border border-white/5 focus:border-accent/50 outline-none text-ui-sm text-ink-100"
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  searchable,
  previewFont,
  footer,
  anchorRef,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[] | SelectGroup[];
  placeholder?: string;
  searchable?: boolean;
  previewFont?: boolean;
  footer?: ReactNode;
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredOption, setHoveredOption] = useState<SelectOption | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    width: number;
    placeAbove: boolean;
  }>({ left: 0, top: 0, width: 0, placeAbove: false });

  // Normalize groups
  const isGrouped = options.length > 0 && "options" in options[0];
  const groups: { label?: string; options: SelectOption[] }[] = isGrouped
    ? (options as SelectGroup[])
    : [{ options: options as SelectOption[] }];

  // Find selected option
  const selectedOption = useMemo(() => {
    for (const g of groups) {
      const found = g.options.find((o) => o.value === value);
      if (found) return found;
    }
    return null;
  }, [groups, value]);

  // Position calculation
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const anchorRect = anchorRef?.current
      ? anchorRef.current.getBoundingClientRect()
      : rect;
    const spaceBelow = window.innerHeight - rect.bottom;
    const popupHeight = 320;
    const placeAbove = spaceBelow < popupHeight && rect.top > spaceBelow;
    setCoords({
      left: Math.round(anchorRect.left),
      top: Math.round(placeAbove ? rect.top - 4 : rect.bottom + 4),
      width: Math.round(anchorRect.width),
      placeAbove,
    });
  }, [anchorRef]);

  // Listeners when open
  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    const onMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, updateCoords]);

  // Filtered groups by search
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setHoveredOption(null);
    setSearch("");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateCoords();
          setIsOpen((cur) => {
            if (cur) setHoveredOption(null);
            return !cur;
          });
        }}
        className={`w-full h-7 px-2 rounded-md bg-ink-800 border hover:border-white/15 outline-none text-ui-sm text-ink-100 flex items-center justify-between transition-colors cursor-pointer select-none group ${
          isOpen ? "border-accent/50 ring-1 ring-accent/30" : "border-white/5"
        }`}
      >
        <span
          className="truncate text-left font-sans"
          style={previewFont && value ? { fontFamily: getFontFamilyStack(value) } : undefined}
        >
          {selectedOption ? selectedOption.label : value || placeholder || "Select..."}
        </span>
        <ChevronDown
          size={12}
          className={`text-ink-400 group-hover:text-ink-200 transition-transform duration-150 shrink-0 ml-1.5 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              left: coords.left,
              ...(coords.placeAbove
                ? { bottom: window.innerHeight - coords.top }
                : { top: coords.top }),
              width: coords.width || 210,
              maxHeight: 320,
            }}
            className="z-50 bg-ink-850/98 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 py-1"
          >
            {/* Font preview — fixed height bare text above search, no background */}
            {previewFont && (
              <div className="h-12 px-3 flex items-center overflow-hidden select-none shrink-0 border-b border-white/5">
                <span
                  className="text-[26px] text-ink-100 font-normal leading-none whitespace-nowrap truncate overflow-hidden"
                  style={{
                    fontFamily: getFontFamilyStack(
                      hoveredOption?.value || value || "Inter"
                    ),
                  }}
                >
                  {hoveredOption?.label || selectedOption?.label || value}
                </span>
              </div>
            )}

            {searchable && (
              <div className="px-2 pb-1.5 pt-0.5 border-b border-white/5">
                <div className="relative flex items-center">
                  <Search size={13} className="absolute left-2 text-ink-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="w-full h-6 pl-7 pr-6 rounded-md bg-ink-900 border border-white/8 text-ui-xs text-ink-100 placeholder:text-ink-500 outline-none focus:border-accent/40"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 text-ink-400 hover:text-ink-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              onMouseLeave={() => setHoveredOption(null)}
              className="overflow-y-auto flex-1 min-h-0 py-0.5 custom-scrollbar"
            >
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-3 text-center text-ui-xs text-ink-400">
                  No matching options
                </div>
              ) : (
                filteredGroups.map((group, gi) => (
                  <div
                    key={group.label || gi}
                    className="mb-1.5 first:mt-0 mt-1 border-t first:border-t-0 border-white/5 pt-1 first:pt-0"
                  >
                    {group.label && (
                      <div className="px-2.5 py-1 text-[9.5px] font-mono uppercase tracking-wider text-ink-400 font-semibold select-none flex items-center justify-between">
                        <span>{group.label}</span>
                        <span className="text-ink-500 text-[8.5px] font-mono font-normal">
                          {group.options.length}
                        </span>
                      </div>
                    )}
                    <div className="px-1 space-y-0.5 mt-0.5">
                      {group.options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelect(opt.value)}
                            onMouseEnter={() => {
                              if (previewFont) setHoveredOption(opt);
                            }}
                            className={`w-full ${
                              isGrouped && group.label ? "pl-4 pr-2" : "px-2"
                            } py-1 text-ui-sm rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer select-none group/item ${
                              isSelected
                                ? "bg-accent/15 text-accent font-medium"
                                : "text-ink-200 hover:bg-ink-700/60 hover:text-ink-50"
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected && (
                              <Check size={12} className="text-accent shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {footer && (
              <div className="border-t border-white/5 pt-1 px-1 bg-ink-900/30 shrink-0">
                {footer}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export function SegBtn({
  active,
  disabled,
  onClick,
  children,
  title,
  className = "",
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`h-6 w-[18px] flex items-center justify-center rounded-[3px] text-ui-sm transition-colors shrink-0 ${
        disabled
          ? "opacity-30 cursor-not-allowed text-ink-500"
          : active
          ? "bg-ink-700 text-accent cursor-pointer shadow-sm"
          : "text-ink-400 hover:text-ink-100 cursor-pointer"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function SegGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`h-7 flex items-center gap-0.5 p-0.5 rounded-md bg-ink-800 border border-white/5 shrink-0 ${className}`}>
      {children}
    </div>
  );
}

const CHECKER_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><rect width='8' height='8' fill='%2318181b'/><rect x='8' width='8' height='8' fill='%233f3f46'/><rect y='8' width='8' height='8' fill='%233f3f46'/><rect x='8' y='8' width='8' height='8' fill='%2318181b'/></svg>\")";

const GRAY_PRESETS = [
  { label: "6% Light", value: "#f0f0f0" },
  { label: "12%", value: "#e0e0e0" },
  { label: "25%", value: "#c0c0c0" },
  { label: "37%", value: "#a0a0a0" },
  { label: "50% Gray", value: "#808080" },
  { label: "62%", value: "#606060" },
  { label: "75%", value: "#404040" },
  { label: "87%", value: "#202020" },
  { label: "94% Dark", value: "#101010" },
];

function normalizeColor(c?: string): string {
  if (!c) return "#000000";
  const s = c.trim().toLowerCase();
  if (s === "black") return "#000000";
  if (s === "white") return "#ffffff";
  if (s === "transparent" || s === "none") return "none";
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s;
}

export function ColorInput({
  value,
  onChange,
  allowTransparent = false,
  className = "",
  contents = false,
}: {
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
  className?: string;
  contents?: boolean;
}) {
  const normValue = normalizeColor(value);
  const isBlack = normValue === "#000000";
  const isWhite = normValue === "#ffffff";
  const isNone = normValue === "none";
  const activeGray = GRAY_PRESETS.find((g) => g.value.toLowerCase() === normValue);
  const isGray = Boolean(activeGray);
  const grayDisplayColor = activeGray ? activeGray.value : "#808080";

  const displayVal = isNone ? "none" : value || "#000000";
  const [customText, setCustomText] = useState(displayVal);

  useEffect(() => {
    setCustomText(displayVal);
  }, [displayVal]);

  const handleHexChange = (text: string) => {
    setCustomText(text);
    const trimmed = text.trim().toLowerCase();
    if (
      trimmed.startsWith("#") &&
      (trimmed.length === 4 || trimmed.length === 7)
    ) {
      onChange(trimmed);
    } else if (trimmed === "none" || trimmed === "transparent") {
      onChange("none");
    }
  };

  const handleHexBlur = () => {
    const trimmed = customText.trim().toLowerCase();
    if (trimmed === "none" || trimmed === "transparent") {
      setCustomText("none");
      onChange("none");
    } else if (!trimmed.startsWith("#") && /^[0-9a-f]{3,6}$/.test(trimmed)) {
      const formatted = `#${trimmed}`;
      setCustomText(formatted);
      onChange(formatted);
    } else if (
      trimmed.startsWith("#") &&
      (trimmed.length === 4 || trimmed.length === 7)
    ) {
      onChange(trimmed);
    } else {
      setCustomText(displayVal);
    }
  };

  return (
    <div
      className={
        contents
          ? "contents"
          : `flex items-center gap-1.5 min-w-0 ${className}`
      }
    >
      {/* Quick Color Buttons: Black, White, (None) */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-ink-800 border border-white/5 shrink-0">
        {/* Black Button */}
        <button
          type="button"
          title="Black (#000000)"
          onClick={() => onChange("#000000")}
          className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition-colors ${
            isBlack
              ? "bg-ink-700 ring-1 ring-accent/60"
              : "hover:bg-ink-750 text-ink-400 hover:text-ink-100"
          }`}
        >
          <span className="w-3.5 h-3.5 rounded-[2px] bg-black border border-white/20" />
        </button>

        {/* White Button */}
        <button
          type="button"
          title="White (#ffffff)"
          onClick={() => onChange("#ffffff")}
          className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition-colors ${
            isWhite
              ? "bg-ink-700 ring-1 ring-accent/60"
              : "hover:bg-ink-750 text-ink-400 hover:text-ink-100"
          }`}
        >
          <span className="w-3.5 h-3.5 rounded-[2px] bg-white border border-black/20" />
        </button>

        {/* None / Transparent Button */}
        {allowTransparent && (
          <button
            type="button"
            title="None / Transparent"
            onClick={() => onChange("none")}
            className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition-colors ${
              isNone
                ? "bg-ink-700 ring-1 ring-accent/60"
                : "hover:bg-ink-750 text-ink-400 hover:text-ink-100"
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded-[2px] border border-white/20 shrink-0"
              style={{
                backgroundImage: CHECKER_BG,
                backgroundSize: "100% 100%",
                backgroundClip: "padding-box",
              }}
            />
          </button>
        )}

        {/* Split Gray Button with Dropdown */}
        <div
          className={`flex items-center h-6 rounded-[3px] transition-colors ${
            isGray ? "bg-ink-700 ring-1 ring-accent/60" : "hover:bg-ink-750"
          }`}
        >
          <button
            type="button"
            title={`Gray (${grayDisplayColor})`}
            onClick={() => onChange(grayDisplayColor)}
            className="w-5 h-6 flex items-center justify-center"
          >
            <span
              className="w-3.5 h-3.5 rounded-[2px] border border-white/20 transition-colors"
              style={{ backgroundColor: grayDisplayColor }}
            />
          </button>
          <div className="relative w-3.5 h-6 flex items-center justify-center -ml-0.5 cursor-pointer">
            <ChevronDown size={10} className="text-ink-400 pointer-events-none" />
            <select
              value={isGray ? normValue : ""}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
                e.target.blur();
              }}
              title="Grayscale presets"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="" disabled hidden>
                Grayscale
              </option>
              {GRAY_PRESETS.map((g) => (
                <option
                  key={g.value}
                  value={g.value}
                  className="bg-ink-850 text-ink-100"
                >
                  {g.label} ({g.value})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* HEX Input Box */}
      <div className="flex-1 min-w-[70px] flex items-center h-7 rounded-md bg-ink-800 border border-white/5 px-1.5 gap-1.5 focus-within:border-accent/50">
        <div
          className="w-4 h-4 rounded-[2px] border border-white/15 shrink-0"
          style={{
            backgroundColor: isNone ? "transparent" : normValue,
            backgroundImage: isNone ? CHECKER_BG : undefined,
            backgroundSize: isNone ? "100% 100%" : undefined,
            backgroundClip: "padding-box",
          }}
          title={isNone ? "none" : normValue}
        />
        <input
          type="text"
          value={customText}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#000000"
          className="w-full bg-transparent text-ui-xs text-ink-100 font-mono outline-none uppercase"
        />
      </div>
    </div>
  );
}
