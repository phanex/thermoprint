import type { ImageBitmap1bpp } from "../protocol/types.js";

/**
 * Shifts a 1bpp bitmap along the tape width (cross-feed / X axis).
 * In 1bpp bitmaps, width is the line length across the thermal printhead,
 * and height is the number of feed lines along the tape.
 *
 * - Positive offset: shifts dots towards higher indices (e.g. from 0 towards width - 1).
 * - Negative offset: shifts dots towards lower indices (e.g. towards 0).
 * - Vacated dots are filled with 0 (blank/white).
 * - Dots shifted out of bounds [0, width) are clipped.
 *
 * @param image The 1bpp source bitmap.
 * @param offsetDots Number of dots to shift (+/-). 0 returns original image without copying.
 */
export function shiftBitmapCrossFeed(
  image: ImageBitmap1bpp,
  offsetDots: number,
): ImageBitmap1bpp {
  if (offsetDots === 0) return image;

  const { data, width, height, bytesPerRow } = image;
  const out = new Uint8Array(data.length);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * bytesPerRow;
    for (let srcX = 0; srcX < width; srcX++) {
      const dstX = srcX + offsetDots;
      if (dstX < 0 || dstX >= width) continue;

      const srcByteIdx = rowOffset + (srcX >> 3);
      const srcBit = 7 - (srcX & 7);
      if ((data[srcByteIdx] >> srcBit) & 1) {
        const dstByteIdx = rowOffset + (dstX >> 3);
        const dstBit = 7 - (dstX & 7);
        out[dstByteIdx] |= 1 << dstBit;
      }
    }
  }

  return { data: out, width, height, bytesPerRow };
}
