import { Sticker, RefreshCw, ImageIcon } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { addImageEl } from "../../../lib/keyboard.ts";

interface Props {
  element: BaseElement;
}

export function ImageSection({ element }: Props) {
  const isIcon = Boolean(element.props.iconName);
  const iconName = (element.props.iconName as string) || "";
  const collectionName = (element.props.collectionName as string) || "";
  const collectionPrefix = (element.props.collection as string) || null;

  const handleReplaceIcon = () => {
    window.dispatchEvent(
      new CustomEvent("thermoprint:open-icons", {
        detail: {
          initialPrefix: collectionPrefix,
          targetElementId: element.id,
        },
      })
    );
  };

  return (
    <div className="p-3 border-b border-white/5 space-y-3">
      <div className="text-ui-xs font-semibold text-ink-400 uppercase tracking-wider">
        {isIcon ? "Icon Properties" : "Image Properties"}
      </div>

      {isIcon ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-ui-sm">
            <span className="text-ink-400">Name:</span>
            <span className="font-mono text-ink-100 font-medium truncate max-w-[140px]">
              {iconName}
            </span>
          </div>

          {collectionName && (
            <div className="flex items-center justify-between text-ui-sm">
              <span className="text-ink-400">Collection:</span>
              <span className="text-accent font-medium truncate max-w-[140px]">
                {collectionName}
              </span>
            </div>
          )}

          <button
            onClick={handleReplaceIcon}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-ui-sm font-semibold transition-colors mt-2"
          >
            <RefreshCw size={13} />
            <span>Replace Icon</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleReplaceIcon}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors"
          >
            <Sticker size={13} className="text-accent" />
            <span>Replace with Icon</span>
          </button>
          <button
            onClick={addImageEl}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors"
          >
            <ImageIcon size={13} />
            <span>Replace with Image File</span>
          </button>
        </div>
      )}
    </div>
  );
}
