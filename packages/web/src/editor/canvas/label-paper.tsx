import { Rect } from "react-konva";
import { mmToPx } from "@thermoprint/core";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { getActiveCutterMargins } from "../../label/dynamic-label.ts";

export function LabelPaper() {
  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const modelId = usePrinterStore((s) => s.modelId);

  // In continuous mode, the tape is one seamless physical ribbon spanning
  // from the start of the lead margin to the end of the trail margin.
  // Straight 90-degree cut, zero corner radius.
  if (paperType === "continuous") {
    const margins = getActiveCutterMargins(
      modelId,
      label.tapeWidthMm,
      "continuous",
    );
    const leadPx = margins ? mmToPx(margins.leadMm) : 0;
    const trailPx = margins ? mmToPx(margins.trailMm) : 0;

    return (
      <Rect
        x={-leadPx}
        y={0}
        width={leadPx + label.widthPx + trailPx}
        height={label.heightPx}
        fill="#ffffff"
        cornerRadius={0}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={20}
        shadowOffsetY={4}
        listening={false}
      />
    );
  }

  // Die-cut / Gap mode: individual cut label with subtle rounded corners
  return (
    <Rect
      x={0}
      y={0}
      width={label.widthPx}
      height={label.heightPx}
      fill="#ffffff"
      cornerRadius={10}
      shadowColor="rgba(0,0,0,0.3)"
      shadowBlur={20}
      shadowOffsetY={4}
      listening={false}
    />
  );
}
