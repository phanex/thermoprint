import { describe, expect, test } from "bun:test";
import {
  floydSteinbergDither,
  atkinsonDither,
  bayerDither,
} from "../../src/image/dither";

describe("floydSteinbergDither", () => {
  test("pure white input produces all white output", () => {
    const gray = new Float32Array([255, 255, 255, 255]);
    const result = floydSteinbergDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0])); // 0 = white
  });

  test("pure black input produces all black output", () => {
    const gray = new Float32Array([0, 0, 0, 0]);
    const result = floydSteinbergDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([1, 1, 1, 1])); // 1 = black
  });

  test("output contains only 0 and 1 values", () => {
    const width = 8;
    const height = 4;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = (i / gray.length) * 255;
    }
    const result = floydSteinbergDither(gray, width, height);
    for (let i = 0; i < result.length; i++) {
      expect(result[i] === 0 || result[i] === 1).toBe(true);
    }
  });

  test("preserves approximate luminance (50% gray → ~50% black)", () => {
    const width = 16;
    const height = 16;
    const gray = new Float32Array(width * height).fill(128);
    const result = floydSteinbergDither(gray, width, height);

    const blackCount = result.reduce((sum, v) => sum + v, 0);
    const ratio = blackCount / result.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  test("does not mutate input array", () => {
    const gray = new Float32Array([100, 100, 100, 100]);
    const original = new Float32Array(gray);
    floydSteinbergDither(gray, 2, 2);
    expect(gray).toEqual(original);
  });
});

describe("atkinsonDither", () => {
  test("pure white input produces all white output", () => {
    const gray = new Float32Array([255, 255, 255, 255]);
    const result = atkinsonDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  test("pure black input produces all black output", () => {
    const gray = new Float32Array([0, 0, 0, 0]);
    const result = atkinsonDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([1, 1, 1, 1]));
  });

  test("output contains only 0 and 1 values", () => {
    const width = 8;
    const height = 4;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = (i / gray.length) * 255;
    }
    const result = atkinsonDither(gray, width, height);
    for (let i = 0; i < result.length; i++) {
      expect(result[i] === 0 || result[i] === 1).toBe(true);
    }
  });

  test("preserves clean contrast (50% gray produces stippled output)", () => {
    const width = 16;
    const height = 16;
    const gray = new Float32Array(width * height).fill(128);
    const result = atkinsonDither(gray, width, height);

    const blackCount = result.reduce((sum, v) => sum + v, 0);
    const ratio = blackCount / result.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });

  test("does not mutate input array", () => {
    const gray = new Float32Array([100, 100, 100, 100]);
    const original = new Float32Array(gray);
    atkinsonDither(gray, 2, 2);
    expect(gray).toEqual(original);
  });
});

describe("bayerDither", () => {
  test("pure white input produces all white output", () => {
    const gray = new Float32Array([255, 255, 255, 255]);
    const result = bayerDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  test("pure black input produces all black output", () => {
    const gray = new Float32Array([0, 0, 0, 0]);
    const result = bayerDither(gray, 2, 2);
    expect(result).toEqual(new Uint8Array([1, 1, 1, 1]));
  });

  test("output contains only 0 and 1 values across full 8x8 matrix", () => {
    const width = 8;
    const height = 8;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = (i / gray.length) * 255;
    }
    const result = bayerDither(gray, width, height);
    for (let i = 0; i < result.length; i++) {
      expect(result[i] === 0 || result[i] === 1).toBe(true);
    }
  });

  test("50% gray produces exact 50% halftone pattern", () => {
    const width = 8;
    const height = 8;
    const gray = new Float32Array(width * height).fill(128);
    const result = bayerDither(gray, width, height);

    const blackCount = result.reduce((sum, v) => sum + v, 0);
    // In an 8x8 Bayer matrix, 32 elements are < 128 and 32 are >= 128
    expect(blackCount).toBe(32);
  });
});
