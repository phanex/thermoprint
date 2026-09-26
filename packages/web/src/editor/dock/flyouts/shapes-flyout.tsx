import {
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
} from "lucide-react";
import {
  addRectEl,
  addEllipseEl,
  addPolygonEl,
  addStarEl,
  addLineEl,
} from "../../../lib/keyboard.ts";

interface Props {
  onClose: () => void;
}

export function ShapesFlyout({ onClose }: Props) {
  const items = [
    {
      label: "Rectangle",
      icon: Square,
      shortcut: "R",
      fn: addRectEl,
    },
    {
      label: "Ellipse",
      icon: Circle,
      fn: addEllipseEl,
    },
    {
      label: "Polygon",
      icon: Triangle,
      fn: () => addPolygonEl(3),
    },
    {
      label: "Star",
      icon: Star,
      fn: () => addStarEl(5, 50),
    },
    {
      isDivider: true,
    },
    {
      label: "Line",
      icon: Minus,
      shortcut: "L",
      fn: addLineEl,
    },
  ];

  return (
    <div className="fixed inset-x-4 bottom-20 md:inset-auto md:absolute md:bottom-28 md:left-1/2 md:-translate-x-1/2 w-auto md:w-48 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-xl shadow-panel z-40 overflow-hidden p-1.5">
      <div className="px-2 py-1 text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
        Shapes
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => {
          if (item.isDivider) {
            return <div key={i} className="my-1 border-t border-white/5" />;
          }
          const Icon = item.icon!;
          return (
            <button
              key={item.label}
              onClick={() => {
                item.fn!();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className="text-ink-400 group-hover:text-accent transition-colors" />
                <span className="text-ui-sm font-medium">{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="min-w-[14px] h-[14px] px-1 rounded-[3px] text-[8.5px] font-mono font-semibold bg-ink-800 text-ink-400 group-hover:text-ink-200 group-hover:bg-ink-700 flex items-center justify-center">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
