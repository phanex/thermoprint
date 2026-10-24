/**
 * Floyd-Steinberg serpentine dithering.
 * Even rows process left-to-right, odd rows right-to-left.
 * Returns a Uint8Array where 0 = white, 1 = black.
 */
export function floydSteinbergDither(
  grayscale: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  // Work on a copy to avoid mutating input
  const pixels = new Float32Array(grayscale);
  const result = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const leftToRight = y % 2 === 0;
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const step = leftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += step) {
      const idx = y * width + x;
      const oldPixel = pixels[idx];
      const newPixel = oldPixel >= 128 ? 255 : 0;
      const error = oldPixel - newPixel;

      result[idx] = newPixel === 0 ? 1 : 0; // 0=white, 1=black

      // Distribute error to neighbors
      const forward = x + step;
      const hasForward =
        leftToRight ? forward < width : forward >= 0;
      const back = x - step;
      const hasBack = leftToRight ? back >= 0 : back < width;

      if (hasForward) {
        pixels[idx + step] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (hasBack) {
          pixels[(y + 1) * width + back] += error * (3 / 16);
        }
        pixels[(y + 1) * width + x] += error * (5 / 16);
        if (hasForward) {
          pixels[(y + 1) * width + forward] += error * (1 / 16);
        }
      }
    }
  }

  return result;
}

/**
 * Atkinson dithering (classic Apple Macintosh 1-bit algorithm).
 * Distributes 6/8 (75%) of quantization error to 6 neighbors, discarding 25%.
 * Preserves crisp edges, keeps highlights white and shadows black without muddy noise.
 * Returns a Uint8Array where 0 = white, 1 = black.
 */
export function atkinsonDither(
  grayscale: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const pixels = new Float32Array(grayscale);
  const result = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const oldPixel = pixels[idx];
      const newPixel = oldPixel >= 128 ? 255 : 0;
      const error = oldPixel - newPixel;

      result[idx] = newPixel === 0 ? 1 : 0; // 0=white, 1=black

      const e8 = error / 8;

      // x + 1, y
      if (x + 1 < width) pixels[idx + 1] += e8;
      // x + 2, y
      if (x + 2 < width) pixels[idx + 2] += e8;

      if (y + 1 < height) {
        const nextRow = (y + 1) * width;
        // x - 1, y + 1
        if (x - 1 >= 0) pixels[nextRow + (x - 1)] += e8;
        // x, y + 1
        pixels[nextRow + x] += e8;
        // x + 1, y + 1
        if (x + 1 < width) pixels[nextRow + (x + 1)] += e8;
      }

      // x, y + 2
      if (y + 2 < height) {
        pixels[(y + 2) * width + x] += e8;
      }
    }
  }

  return result;
}

const BAYER_8X8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

/**
 * Bayer 8x8 ordered dithering (halftone stipple pattern).
 * Thresholds each pixel against a fixed threshold matrix.
 * Returns a Uint8Array where 0 = white, 1 = black.
 */
export function bayerDither(
  grayscale: Float32Array,
  width: number,
  height: number,
): Uint8Array {
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const bayerRow = (y % 8) * 8;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const bayerVal = BAYER_8X8[bayerRow + (x % 8)];
      const threshold = ((bayerVal + 0.5) / 64) * 255;
      result[idx] = grayscale[idx] < threshold ? 1 : 0; // 0=white, 1=black
    }
  }
  return result;
}
