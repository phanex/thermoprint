import { Group, Rect } from "react-konva";
import { mmToPx } from "@thermoprint/core";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { getActiveCutterMargins } from "../../label/dynamic-label.ts";

/**
 * Pure white tape ear masks:
 * - Left ear: [-leadPx .. 0]
 * - Right ear: [widthPx .. widthPx + trailPx]
 *
 * Sits directly on the tape level above elements to cleanly mask
 * any element content sliding into the unprintable cut margins.
 * Completely pure white (#ffffff), no shadows, no borders, no corner radius.
 */
export function CutterEars() {
  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const modelId = usePrinterStore((s) => s.modelId);

  if (paperType !== "continuous") return null;

  const margins = getActiveCutterMargins(
    modelId,
    label.tapeWidthMm,
    "continuous",
  );
  if (!margins) return null;

  const leadPx = mmToPx(margins.leadMm);
  const trailPx = mmToPx(margins.trailMm);
  const w = label.widthPx;
  const h = label.heightPx;

  return (
    <Group listening={false}>
      {/* Pure white left ear mask (straight 90-degree cut) */}
      {leadPx > 0 && (
        <Rect
          x={-leadPx}
          y={0}
          width={leadPx}
          height={h}
          fill="#ffffff"
          cornerRadius={0}
        />
      )}

      {/* Pure white right ear mask (straight 90-degree cut) */}
      {trailPx > 0 && (
        <Rect
          x={w}
          y={0}
          width={trailPx}
          height={h}
          fill="#ffffff"
          cornerRadius={0}
        />
      )}
    </Group>
  );
}
