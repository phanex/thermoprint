import type { RawImageData } from "./types.js";
import type { ImageBitmap1bpp } from "../protocol/types.js";
import { toGrayscale } from "./grayscale.js";
import { floydSteinbergDither, atkinsonDither, bayerDither } from "./dither.js";
import { threshold } from "./threshold.js";
import { packBits } from "./pack.js";

export type DitherMode =
  | "floyd-steinberg"
  | "atkinson"
  | "bayer"
  | "threshold"
  | "none";

export interface ProcessImageOptions {
  dither?: DitherMode;
  threshold?: number;
  invert?: boolean;
}

/**
 * Process an RGBA image into a 1bpp bitmap ready for printing.
 * Steps: RGBA → grayscale → dither/threshold → optional invert → 1bpp pack
 */
export function processImage(
  image: RawImageData,
  options: ProcessImageOptions = {},
): ImageBitmap1bpp {
  const {
    dither = "floyd-steinberg",
    threshold: cutoff = 128,
    invert = false,
  } = options;
  const { width, height } = image;

  const gray = toGrayscale(image);

  let binary: Uint8Array;
  switch (dither) {
    case "floyd-steinberg":
      binary = floydSteinbergDither(gray, width, height);
      break;
    case "atkinson":
      binary = atkinsonDither(gray, width, height);
      break;
    case "bayer":
      binary = bayerDither(gray, width, height);
      break;
    case "threshold":
    case "none":
      binary = threshold(gray, cutoff);
      break;
  }

  if (invert) {
    for (let i = 0; i < binary.length; i++) {
      binary[i] = binary[i] === 1 ? 0 : 1;
    }
  }

  return packBits(binary, width, height);
}

// Re-export individual functions for standalone usage
export { toGrayscale } from "./grayscale.js";
export { floydSteinbergDither, atkinsonDither, bayerDither } from "./dither.js";
export { threshold } from "./threshold.js";
export { packBits } from "./pack.js";
export { shiftBitmapCrossFeed } from "./offset.js";
export type { RawImageData } from "./types.js";
export type { ImageBitmap1bpp } from "../protocol/types.js";
