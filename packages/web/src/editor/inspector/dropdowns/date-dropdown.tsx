import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

const DATE_PRESETS = [
  "[[DD.MM.YYYY]]",
  "[[HH:mm]]",
  "[[DD.MM.YYYY HH:mm]]",
  "[[MMMM YYYY]]",
  "[[DD.MM.YYYY +7d]]",
  "[[DD.MM.YYYY +1m]]",
  "[[DD.MM.YYYY +1y]]",
  "[[HH:mm +12h]]",
];

interface Props {
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (token: string) => void;
}

export function DateDropdown({ triggerRef, onClose, onSelect }: Props) {
  const [view, setView] = useState<"presets" | "help">("presets");
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

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

  return createPortal(
    <div
      ref={ref}
      style={{ top: `${pos.top}px`, right: `${pos.right}px` }}
      className={`fixed ${view === "help" ? "w-80 p-3.5" : "w-52 py-1"} max-h-[calc(100vh-80px)] overflow-y-auto bg-ink-900 border border-white/10 rounded-lg shadow-2xl z-[9999] select-none text-ui-xs text-ink-300 font-sans leading-relaxed`}
    >
      {view === "presets" ? (
        <>
          <div className="flex items-center justify-between px-3 py-1 border-b border-white/5 text-ink-400">
            <span className="font-mono uppercase tracking-wider text-ui-2xs">Date & Time</span>
            <button
              type="button"
              onClick={() => setView("help")}
              className="p-0.5 rounded text-ink-400 hover:text-accent transition-colors cursor-pointer"
              title="Syntax & examples"
            >
              <HelpCircle size={13} />
            </button>
          </div>

          <div className="py-0.5">
            {DATE_PRESETS.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => handlePick(token)}
                className="w-full px-3 py-1.5 text-left text-ink-200 hover:text-accent hover:bg-white/5 transition-colors cursor-pointer font-mono whitespace-nowrap"
              >
                {token}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div>
          {/* Header without Back/Close buttons */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
            <span className="font-semibold text-ink-100 text-ui-sm">Date Syntax</span>
            <button
              type="button"
              onClick={() => handlePick("[[]]")}
              className="font-mono text-accent text-ui-xs hover:underline cursor-pointer"
              title="Insert empty [[]]"
            >
              [[]]
            </button>
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
                <button type="button" onClick={() => handlePick("[[DD]]")} className="font-mono text-accent hover:underline cursor-pointer">DD</button>
                <span className="text-ink-400 mx-1">01</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[ddd]]")} className="font-mono text-accent hover:underline cursor-pointer">ddd</button>
                <span className="text-ink-400 mx-1">Mon</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[dddd]]")} className="font-mono text-accent hover:underline cursor-pointer">dddd</button>
                <span className="text-ink-400 ml-1">Monday</span>
              </div>
              <div>
                <button type="button" onClick={() => handlePick("[[MM]]")} className="font-mono text-accent hover:underline cursor-pointer">MM</button>
                <span className="text-ink-400 mx-1">09</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[MMM]]")} className="font-mono text-accent hover:underline cursor-pointer">MMM</button>
                <span className="text-ink-400 mx-1">Sep</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[MMMM]]")} className="font-mono text-accent hover:underline cursor-pointer">MMMM</button>
                <span className="text-ink-400 ml-1">September</span>
              </div>
              <div>
                <button type="button" onClick={() => handlePick("[[YYYY]]")} className="font-mono text-accent hover:underline cursor-pointer">YYYY</button>
                <span className="text-ink-400 mx-1">2026</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[YY]]")} className="font-mono text-accent hover:underline cursor-pointer">YY</button>
                <span className="text-ink-400 ml-1">26</span>
              </div>
              <div>
                <button type="button" onClick={() => handlePick("[[HH]]")} className="font-mono text-accent hover:underline cursor-pointer">HH</button>
                <span className="text-ink-400 mx-1">24h</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[mm]]")} className="font-mono text-accent hover:underline cursor-pointer">mm</button>
                <span className="text-ink-400 mx-1">min</span> &middot;{" "}
                <button type="button" onClick={() => handlePick("[[ss]]")} className="font-mono text-accent hover:underline cursor-pointer">ss</button>
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
                onClick={() => handlePick("[[uk:ddd]]")}
                className="font-mono text-accent hover:underline cursor-pointer"
                title="Insert [[uk:ddd]]"
              >
                uk:
              </button>
              <span className="text-ink-400">&middot;</span>
              <button
                type="button"
                onClick={() => handlePick("[[en:ddd]]")}
                className="font-mono text-accent hover:underline cursor-pointer"
                title="Insert [[en:ddd]]"
              >
                en:
              </button>
              <span className="text-ink-400">&middot;</span>
              <button
                type="button"
                onClick={() => handlePick("[[de:ddd]]")}
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
                onClick={() => handlePick("[[uk:dddd, DD MMMM]]")}
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
                    onClick={() => handlePick("[[DD.MM.YYYY +7d]]")}
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
                    onClick={() => handlePick("[[DD.MM.YYYY +1m]]")}
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
                    onClick={() => handlePick("[[DD.MM.YYYY +1y]]")}
                    className="font-mono text-accent hover:underline cursor-pointer mr-1"
                  >
                    +1y
                  </button>
                  <span className="text-ink-400">years</span>
                </span>
              </div>
              <div className="mt-1">
                <span className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handlePick("[[DD+5.MM+2.YYYY+1]]")}
                    className="font-mono text-accent hover:underline cursor-pointer mr-1"
                  >
                    [[DD+5.MM+2.YYYY+1]]
                  </button>
                  <span className="text-ink-400">per component</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
