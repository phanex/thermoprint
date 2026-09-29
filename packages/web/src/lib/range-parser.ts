/**
 * Parses Windows/standard print range strings like:
 * "1-50" -> [1, 2, ..., 50]
 * "2, 10-15, 99" -> [2, 10, 11, 12, 13, 14, 15, 99]
 * "14" -> [14]
 *
 * @param input Raw text entered by the user
 * @param maxLimit Optional maximum allowed item number (e.g. total CSV rows or countdown steps)
 * @returns Array of 1-based indices, or [] if invalid.
 */
export function parsePrintRanges(input: string, maxLimit?: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(",");
  const indices: number[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes("-")) {
      const sub = part.split("-");
      if (sub.length !== 2) return []; // malformed like 1-2-3
      const start = parseInt(sub[0].trim(), 10);
      const end = parseInt(sub[1].trim(), 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return [];
      }

      const clampedEnd = maxLimit !== undefined ? Math.min(end, maxLimit) : end;
      for (let i = start; i <= clampedEnd; i++) {
        indices.push(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 1) {
        return [];
      }
      if (maxLimit === undefined || num <= maxLimit) {
        indices.push(num);
      }
    }
  }

  // De-duplicate while preserving order
  return Array.from(new Set(indices));
}

/**
 * Formats clean, non-redundant media dimension text.
 * - Dynamic continuous: "12 mm · dynamic"
 * - Fixed continuous with cutter margins: "40 (+18) × 12 mm"
 * - Fixed die-cut / gap: "40 × 12 mm"
 */
export function formatMediaDescription(
  label: { widthMm: number; heightMm: number; tapeWidthMm?: number; isDynamic?: boolean },
  paperType: "continuous" | "gap",
  cutterMargins?: { leadMm: number; trailMm: number } | null,
): string {
  if (paperType === "continuous") {
    if (label.isDynamic) {
      const tapeW = label.tapeWidthMm ?? (label.heightMm <= label.widthMm ? label.heightMm : label.widthMm);
      return `${tapeW} mm · dynamic`;
    }
    const totalEarsMm = cutterMargins ? cutterMargins.leadMm + cutterMargins.trailMm : 0;
    if (totalEarsMm > 0) {
      if (label.widthMm >= label.heightMm) {
        return `${label.widthMm} (+${totalEarsMm}) × ${label.heightMm} mm`;
      } else {
        return `${label.widthMm} × ${label.heightMm} (+${totalEarsMm}) mm`;
      }
    }
    return `${label.widthMm} × ${label.heightMm} mm`;
  }
  return `${label.widthMm} × ${label.heightMm} mm`;
}
