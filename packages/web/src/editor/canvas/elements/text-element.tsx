import { useRef, useEffect, useCallback } from "react";
import { Text } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";
import { getDisplayText } from "../../../lib/date-format.ts";
import {
  getPrimaryFontFamily,
  getFontFamilyStack,
  preloadFontVariants,
} from "../../../lib/fonts.ts";

import { useElementDrag } from "../use-element-drag.ts";

const TEXT_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "middle-left",
  "middle-right",
  "top-center",
  "bottom-center",
];

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function TextElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const widthRef = useRef(element.width);
  widthRef.current = element.width;
  const heightRef = useRef(element.height);
  heightRef.current = element.height;

  const updateElement = useEditorV2Store((s) => s.updateElement);
  const { handleDragStart, handleDragMove, handleDragEnd, handleClick, handleTap } =
    useElementDrag(element.id);
  const editingTextId = useEditorV2Store((s) => s.editingTextId);

  const isEditing = editingTextId === element.id;

  const p = element.props as {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: number;
    lineHeight?: number;
    fill?: string;
    align?: string;
    italic?: boolean;
    uppercase?: boolean;
    datePreset?: string;
    dateLocale?: string;
    autoWidth?: boolean;
  };

  const evaluated = getDisplayText(p.text ?? "", p.datePreset as any, p.dateLocale);
  const displayText = p.uppercase ? evaluated.toUpperCase() : evaluated;

  const fontStyle =
    [p.italic ? "italic" : "", (p.fontWeight || 400) >= 600 ? "bold" : ""]
      .filter(Boolean)
      .join(" ") || "normal";

  // Auto-measure width & height and re-calculate Konva text metrics on font load
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let cancelled = false;

    const refreshLayout = () => {
      if (cancelled || !ref.current) return;
      const n = ref.current;
      // Force Konva to clear cached lines and recalculate with the loaded font
      (n as any)._setTextData();
      const minH = Math.ceil((p.fontSize || 18) * (p.lineHeight || 1));
      let nextW = element.width;
      let nextH = Math.max(minH, Math.ceil(n.height()));
      if (p.autoWidth !== false) {
        const measured = (n as any).measureSize(displayText);
        if (measured && typeof measured.width === "number") {
          nextW = Math.max(20, Math.ceil(measured.width));
          nextH = Math.max(minH, Math.ceil(measured.height));
        }
      }
      const wChanged = Math.abs(nextW - widthRef.current) > 0.5;
      const hChanged = Math.abs(nextH - heightRef.current) > 0.5;
      if (wChanged || hChanged) {
        widthRef.current = nextW;
        heightRef.current = nextH;
        updateElement(element.id, { width: nextW, height: nextH });
      }
      n.getLayer()?.batchDraw();
    };

    const weight = (p.fontWeight || 400) >= 600 ? "700" : "400";
    const style = p.italic ? "italic" : "normal";
    const primaryFamily = getPrimaryFontFamily(p.fontFamily);
    const fontSpec = `${style} ${weight} 16px "${primaryFamily}"`;

    let isReady = false;
    try {
      isReady = !document.fonts || document.fonts.check(fontSpec);
    } catch {
      isReady = true;
    }

    if (isReady) {
      // Font is already loaded: measure and update immediately
      refreshLayout();
    } else {
      // Font is still loading in browser: do NOT recalculate height prematurely
      // using fallback font metrics, which causes temporary word wrap and layout twitching.
      document.fonts
        .load(fontSpec)
        .catch(() => {})
        .finally(() => {
          if (!cancelled) refreshLayout();
        });
    }

    document.fonts?.ready.then(() => {
      if (!cancelled) refreshLayout();
    });

    // Preload sibling variants in background so subsequent bold/italic toggles are instant
    preloadFontVariants(primaryFamily);

    return () => {
      cancelled = true;
    };
  }, [
    displayText,
    p.fontSize,
    p.fontFamily,
    p.fontWeight,
    p.italic,
    p.letterSpacing,
    p.lineHeight,
    element.width,
    element.id,
    updateElement,
  ]);

  const startEditing = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const stage = node.getStage();
    if (!stage) return;

    useEditorV2Store.setState({ editingTextId: element.id });

    // Measure position BEFORE hiding
    const absPos = node.getAbsolutePosition();
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    const scale = node.getAbsoluteScale();

    // Hide the Konva text while editing
    node.hide();
    node.getLayer()?.batchDraw();

    const textarea = document.createElement("textarea");
    textarea.value = p.text || "";
    const borderWidth = 2;
    textarea.style.position = "fixed";
    textarea.style.left = `${stageRect.left + absPos.x - borderWidth}px`;
    textarea.style.top = `${stageRect.top + absPos.y - borderWidth}px`;
    textarea.style.width = `${element.width * scale.x}px`;
    textarea.style.height = `${element.height * scale.y}px`;
    textarea.style.boxSizing = "content-box";
    const scaledFontSize = (p.fontSize || 18) * scale.y;
    textarea.style.fontSize = `${scaledFontSize}px`;
    textarea.style.fontFamily = getFontFamilyStack(p.fontFamily);
    // Match Konva's fontStyle exactly: "normal", "bold", "italic", or "italic bold"
    const isBold = fontStyle.includes("bold");
    const isItalic = fontStyle.includes("italic");
    textarea.style.fontWeight = isBold ? "bold" : "normal";
    textarea.style.fontStyle = isItalic ? "italic" : "normal";
    textarea.style.letterSpacing = `${(p.letterSpacing || 0) * scale.x}px`;
    textarea.style.color = p.fill || "#000000";
    textarea.style.textAlign = (p.align as string) || "left";
    textarea.style.border = "2px solid var(--color-accent)";
    textarea.style.borderRadius = "2px";
    textarea.style.background = "rgba(255,255,255,0.95)";
    textarea.style.outline = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.lineHeight = `${node.lineHeight()}`;
    textarea.style.wordBreak = "break-word";
    textarea.style.whiteSpace = "pre-wrap";
    textarea.style.zIndex = "1000";
    textarea.style.transformOrigin = "left top";
    if (element.rotation) {
      textarea.style.transform = `rotate(${element.rotation}deg)`;
    }

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // Auto-resize height only on input (not on creation to avoid initial growth)
    const autoSize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    textarea.addEventListener("input", autoSize);

    const commit = () => {
      const newText = textarea.value;
      updateElement(element.id, { props: { text: newText } });
      useEditorV2Store.setState({ editingTextId: null });
      document.body.removeChild(textarea);
      node.show();
      node.getLayer()?.batchDraw();
    };

    textarea.addEventListener("blur", commit);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Cancel — restore original text
        textarea.removeEventListener("blur", commit);
        useEditorV2Store.setState({ editingTextId: null });
        document.body.removeChild(textarea);
        node.show();
        node.getLayer()?.batchDraw();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
    });
  }, [element, p, updateElement]);

  // Handle transforms:
  // 1. Side handles (middle-left, middle-right): change text wrap width live (Figma style), scale stays 1.0.
  // 2. Vertical handles (top-center, bottom-center): scale font size & dimensions proportionally from opposite edge (Phomemo style), scaleX = scaleY.
  const handleTransform = useCallback(() => {
    const node = ref.current;
    const tr = trRef.current;
    if (!node || !tr) return;

    const anchor = tr.getActiveAnchor();
    const isSideH = anchor === "middle-left" || anchor === "middle-right";
    const isSideV = anchor === "top-center" || anchor === "bottom-center";

    if (isSideH) {
      const scaleX = node.scaleX();
      const newWidth = Math.max(20, Math.round(node.width() * scaleX));
      node.setAttrs({
        width: newWidth,
        scaleX: 1,
        scaleY: 1,
      });
    } else if (isSideV) {
      const scale = node.scaleY();
      node.scaleX(scale);

      const deltaW = element.width * (scale - 1);
      const align = (p.align as "left" | "center" | "right") || "left";
      const dxLocal =
        align === "center"
          ? -deltaW / 2
          : align === "right"
          ? -deltaW
          : 0;

      const rot = element.rotation || 0;
      const rad = (rot * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      if (anchor === "bottom-center") {
        node.x(element.x + dxLocal * cos);
        node.y(element.y + dxLocal * sin);
      } else if (anchor === "top-center") {
        const dyLocal = -element.height * (scale - 1);
        node.x(element.x + dxLocal * cos - dyLocal * sin);
        node.y(element.y + dxLocal * sin + dyLocal * cos);
      }
    }
  }, [element.height, element.rotation, element.width, element.x, element.y, p.align]);

  const handleTransformEnd = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const tr = trRef.current;
    const anchor = tr?.getActiveAnchor();
    const isSideH = anchor === "middle-left" || anchor === "middle-right";

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    if (isSideH) {
      // Side handle: commit width, height auto-updates, preserve manual width
      updateElement(element.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.max(20, Math.round(node.width())),
        height: node.height(),
        rotation: Math.round(node.rotation()),
        props: { ...element.props, autoWidth: false },
      });
    } else {
      // Corner handle or vertical handle: proportional font scaling
      const newFontSize = Math.max(4, Math.round((p.fontSize || 18) * scaleY));
      const newWidth = Math.max(20, Math.round(node.width() * scaleX));
      updateElement(element.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: newWidth,
        height: node.height(),
        rotation: Math.round(node.rotation()),
        props: { fontSize: newFontSize },
      });
    }
  }, [element.id, p.fontSize, updateElement]);

  return (
    <>
      <Text
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        rotation={element.rotation}
        text={displayText}
        fontSize={p.fontSize || 18}
        fontFamily={getFontFamilyStack(p.fontFamily)}
        fontStyle={fontStyle}
        letterSpacing={p.letterSpacing || 0}
        lineHeight={p.lineHeight || 1}
        fill={p.fill || "#000000"}
        align={(p.align as "left" | "center" | "right") || "left"}
        wrap="word"
        draggable={!isEditing}
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDblClick={startEditing}
        onDblTap={startEditing}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />
      {!isEditing && (
        <ElementWrapper
          nodeRef={ref}
          transformerRef={trRef}
          isSelected={isSelected}
          enabledAnchors={TEXT_ANCHORS}
          keepRatio={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 10) {
              return oldBox;
            }
            return newBox;
          }}
          deps={[
            element.width,
            element.height,
            displayText,
            p.fontSize,
            p.fontFamily,
            p.fontWeight,
            p.italic,
            p.lineHeight,
          ]}
        />
      )}
    </>
  );
}
