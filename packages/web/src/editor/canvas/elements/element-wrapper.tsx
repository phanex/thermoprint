import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";
import { useEditorV2Store } from "../../../store/editor-store.ts";

const ACCENT_MAP: Record<string, { accent: string; accent600: string }> = {
  cyan:     { accent: "#2ad0ff", accent600: "#10b5e6" },
  amber:    { accent: "#ff9f40", accent600: "#e68a2e" },
  graphite: { accent: "#e6e6eb", accent600: "#c8c8d0" },
  violet:   { accent: "#a78bfa", accent600: "#8b6fe8" },
  forest:   { accent: "#6ecc93", accent600: "#52b878" },
  paper:    { accent: "#e2bc7a", accent600: "#c8a460" },
};

interface TransformerBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Props {
  nodeRef: React.RefObject<Konva.Node | null>;
  isSelected: boolean;
  deps?: unknown[];
  enabledAnchors?: string[];
  boundBoxFunc?: (oldBox: TransformerBox, newBox: TransformerBox) => TransformerBox;
  ignoreStroke?: boolean;
  transformerRef?: React.RefObject<Konva.Transformer | null>;
  flipEnabled?: boolean;
  keepRatio?: boolean;
}

export function ElementWrapper({
  nodeRef,
  isSelected,
  deps = [],
  enabledAnchors,
  boundBoxFunc,
  ignoreStroke,
  transformerRef,
  flipEnabled = false,
  keepRatio = true,
}: Props) {
  const localTrRef = useRef<Konva.Transformer>(null);
  const trRef = transformerRef || localTrRef;
  const theme = useEditorV2Store((s) => s.theme);
  const { accent, accent600 } = ACCENT_MAP[theme] || ACCENT_MAP.cyan;

  useEffect(() => {
    if (isSelected && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current]);
      trRef.current.moveToTop();
      trRef.current.forceUpdate();
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, nodeRef, accent, nodeRef.current, ...deps]);

  if (!isSelected) return null;

  return (
    <Transformer
      key={accent}
      ref={trRef}
      rotateEnabled={true}
      enabledAnchors={enabledAnchors}
      ignoreStroke={ignoreStroke ?? false}
      flipEnabled={flipEnabled}
      keepRatio={keepRatio}
      boundBoxFunc={
        boundBoxFunc ||
        ((oldBox, newBox) => {
          if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
            return oldBox;
          }
          return newBox;
        })
      }
      anchorSize={10}
      anchorCornerRadius={5}
      anchorStroke={accent}
      anchorStrokeWidth={1.5}
      anchorFill="#ffffff"
      borderStroke={accent}
      borderStrokeWidth={1.5}
      rotateAnchorOffset={28}
      rotateAnchorCursor="grab"
      anchorStyleFunc={(anchor: Konva.Shape) => {
        if (anchor.hasName("rotater")) {
          (anchor as unknown as Konva.Rect).cornerRadius(10);
          anchor.fill(accent);
          anchor.stroke(accent600);
          anchor.width(12);
          anchor.height(12);
          anchor.offsetX(6);
          anchor.offsetY(6);
        }
        anchor.on("mouseenter", () => {
          const stage = anchor.getStage();
          if (stage) {
            if (anchor.hasName("rotater")) {
              stage.container().style.cursor = "grab";
            } else if (
              anchor.hasName("middle-left") ||
              anchor.hasName("middle-right")
            ) {
              stage.container().style.cursor = "ew-resize";
            } else if (
              anchor.hasName("top-center") ||
              anchor.hasName("bottom-center")
            ) {
              stage.container().style.cursor = "ns-resize";
            } else {
              stage.container().style.cursor = "nwse-resize";
            }
          }
        });
        anchor.on("mouseleave", () => {
          const stage = anchor.getStage();
          if (stage) stage.container().style.cursor = "default";
        });
      }}
    />
  );
}
