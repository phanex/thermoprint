import { describe, expect, test } from "bun:test";
import { processImage } from "../../src/image/pipeline";

describe("processImage", () => {
  test("processes a white RGBA image to empty bitmap", () => {
    const image = {
      data: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]),
      width: 2,
      height: 1,
    };
    const result = processImage(image);
    expect(result.bytesPerRow).toBe(1);
    expect(result.data[0]).toBe(0x00); // all white
  });

  test("processes a black RGBA image to full bitmap", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
                            0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]),
      width: 8,
      height: 1,
    };
    const result = processImage(image);
    expect(result.data[0]).toBe(0xff); // all black
  });

  test("threshold mode works", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]),
      width: 2,
      height: 1,
    };
    const result = processImage(image, { dither: "threshold" });
    expect(result.bytesPerRow).toBe(1);
    // First pixel black (0x80), second white
    expect(result.data[0]).toBe(0x80);
  });

  test("atkinson mode works", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]),
      width: 2,
      height: 1,
    };
    const result = processImage(image, { dither: "atkinson" });
    expect(result.bytesPerRow).toBe(1);
    expect(result.data[0]).toBe(0x80);
  });

  test("bayer mode works", () => {
    const image = {
      data: new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]),
      width: 2,
      height: 1,
    };
    const result = processImage(image, { dither: "bayer" });
    expect(result.bytesPerRow).toBe(1);
    expect(result.data[0]).toBe(0x80);
  });

  test("invert option flips white to black and black to white", () => {
    const whiteImage = {
      data: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]),
      width: 2,
      height: 1,
    };
    const invertedWhite = processImage(whiteImage, { invert: true });
    // Inverted white should produce black pixels (first two bits 1, rest zero-padded = 0xC0)
    expect(invertedWhite.data[0]).toBe(0xc0);

    const blackImage = {
      data: new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]),
      width: 2,
      height: 1,
    };
    const invertedBlack = processImage(blackImage, { invert: true });
    // Inverted black should produce white pixels
    expect(invertedBlack.data[0]).toBe(0x00);
  });

  test("output dimensions match input", () => {
    const width = 16;
    const height = 4;
    const image = {
      data: new Uint8Array(width * height * 4),
      width,
      height,
    };
    const result = processImage(image);
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.bytesPerRow).toBe(2);
    expect(result.data.length).toBe(2 * height);
  });
});
