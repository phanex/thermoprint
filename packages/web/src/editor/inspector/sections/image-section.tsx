import { Sticker, ImageIcon, FlipHorizontal, FlipVertical, Eclipse, FolderOpen } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ColorInput } from "../fields.tsx";
import { fetchIconWithColorDataUrl } from "../../../lib/iconify.ts";

interface Props {
  element: BaseElement;
}

export function ImageSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const isIcon = Boolean(element.props.iconName);
  const iconName = (element.props.iconName as string) || "";
  const collectionName = (element.props.collectionName as string) || "";
  const collectionPrefix = (element.props.collection as string) || null;
  const iconFill = (element.props.fill as string) || "#000000";

  const p = element.props as {
    src?: string;
    fileName?: string;
    naturalWidth?: number;
    naturalHeight?: number;
    iconName?: string;
    collectionName?: string;
    collection?: string;
    fill?: string;
    flipH?: boolean;
    flipV?: boolean;
    invert?: boolean;
  };

  const fileName = p.fileName || "Image";
  const naturalW = p.naturalWidth || element.width;
  const naturalH = p.naturalHeight || element.height;
  const resolution = `${naturalW} × ${naturalH} px`;

  const updateProps = (patch: Record<string, unknown>) => {
    updateElement(element.id, {
      props: {
        ...element.props,
        ...patch,
      },
    });
  };

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

  const handleReplaceImageFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          // Preserve existing element width and height on canvas!
          updateElement(element.id, {
            props: {
              ...element.props,
              src: reader.result as string,
              fileName: file.name,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              iconName: undefined,
              collection: undefined,
              collectionName: undefined,
            },
          });
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleColorChange = async (newColor: string) => {
    if (!isIcon) return;
    try {
      const dataUrl = await fetchIconWithColorDataUrl(iconName, newColor);
      updateElement(element.id, {
        props: {
          ...element.props,
          fill: newColor,
          src: dataUrl,
        },
      });
    } catch {
      updateElement(element.id, {
        props: {
          ...element.props,
          fill: newColor,
        },
      });
    }
  };

  return (
    <div className="p-3 border-b border-white/5 space-y-3">
      <div className="text-ui-xs font-semibold text-ink-400 uppercase tracking-wider">
        {isIcon ? "Icon Properties" : "Image Properties"}
      </div>

      {isIcon ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Name</span>
            <span className="font-mono text-ink-100 text-ui-sm font-medium truncate flex-1 min-w-0" title={iconName}>
              {iconName}
            </span>
            <button
              type="button"
              onClick={handleReplaceIcon}
              title="Browse icon library"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-100 hover:bg-ink-750 transition-colors shrink-0 cursor-pointer"
            >
              <FolderOpen size={14} />
            </button>
          </div>

          {collectionName && (
            <div className="flex items-center gap-2">
              <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Collection</span>
              <span className="text-ink-200 text-ui-sm font-medium truncate flex-1 min-w-0" title={collectionName}>
                {collectionName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Color</span>
            <div className="flex-1 min-w-0">
              <ColorInput value={iconFill} onChange={handleColorChange} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Name</span>
            <span className="font-mono text-ink-100 text-ui-sm font-medium truncate flex-1 min-w-0" title={fileName}>
              {fileName}
            </span>
            <button
              type="button"
              onClick={handleReplaceImageFile}
              title="Choose another image"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-100 hover:bg-ink-750 transition-colors shrink-0 cursor-pointer"
            >
              <FolderOpen size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Resolution</span>
            <span className="font-mono text-ink-300 text-ui-xs tabular-nums flex-1 min-w-0">
              {resolution}
            </span>
          </div>
        </div>
      )}

      {/* Transform quick actions: Flip H, Flip V, Invert */}
      <div className="flex items-center gap-2">
        <span className="text-ui-xs uppercase tracking-wider text-ink-400 w-20 shrink-0">Transform</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateProps({ flipH: !p.flipH })}
            title="Flip horizontally"
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
              p.flipH
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-ink-800 text-ink-300 border-white/5 hover:bg-ink-750 hover:text-ink-100"
            }`}
          >
            <FlipHorizontal size={14} />
          </button>
          <button
            type="button"
            onClick={() => updateProps({ flipV: !p.flipV })}
            title="Flip vertically"
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
              p.flipV
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-ink-800 text-ink-300 border-white/5 hover:bg-ink-750 hover:text-ink-100"
            }`}
          >
            <FlipVertical size={14} />
          </button>
          <button
            type="button"
            onClick={() => updateProps({ invert: !p.invert })}
            title="Invert colors"
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
              p.invert
                ? "bg-accent/10 text-accent border-accent/30"
                : "bg-ink-800 text-ink-300 border-white/5 hover:bg-ink-750 hover:text-ink-100"
            }`}
          >
            <Eclipse size={14} />
          </button>
        </div>
      </div>

      {/* Contextual single conversion button at bottom */}
      <div className="pt-1">
        {isIcon ? (
          <button
            type="button"
            onClick={handleReplaceImageFile}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors cursor-pointer"
          >
            <ImageIcon size={14} />
            <span>Replace with Image</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReplaceIcon}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors cursor-pointer"
          >
            <Sticker size={14} />
            <span>Replace with Icon</span>
          </button>
        )}
      </div>
    </div>
  );
}
