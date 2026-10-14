/**
 * Cutter ears visual masks:
 * Previously rendered unshadowed pure white Rects over the tape margins [-leadPx..0] and [w..w+trailPx].
 * Under fractional canvas zoom, those overlay Rects caused subpixel height anti-aliasing seams.
 *
 * Content clipping is now handled natively on <Group id="canvas-elements">, so elements
 * never bleed into the margins, and LabelPaper renders as one single seamless shaded ribbon.
 */
export function CutterEars() {
  return null;
}
