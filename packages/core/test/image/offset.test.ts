import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { shiftBitmapCrossFeed } from "../../src/image/offset.js";
import type { ImageBitmap1bpp } from "../../src/protocol/types.js";

describe("shiftBitmapCrossFeed", () => {
  it("returns the exact same image reference when offset is 0", () => {
    const data = new Uint8Array([0x80, 0x01]);
    const img: ImageBitmap1bpp = { data, width: 16, height: 1, bytesPerRow: 2 };
    const result = shiftBitmapCrossFeed(img, 0);
    assert.equal(result, img);
    assert.equal(result.data, data);
  });

  it("shifts dots to the right (positive offset) across byte boundaries", () => {
    // 16 dots width (2 bytes)
    // Dot 0 is bit 7 of byte 0 (0x80)
    // Dot 5 is bit 2 of byte 0 (0x04)
    // Dot 15 is bit 0 of byte 1 (0x01)
    const data = new Uint8Array([0x84, 0x01]);
    const img: ImageBitmap1bpp = { data, width: 16, height: 1, bytesPerRow: 2 };

    // Shift by +3 dots:
    // Dot 0 -> Dot 3: bit 4 of byte 0 (0x10)
    // Dot 5 -> Dot 8: bit 7 of byte 1 (0x80)
    // Dot 15 -> Dot 18 (clipped out since width is 16)
    const shifted = shiftBitmapCrossFeed(img, 3);
    assert.equal(shifted.data[0], 0x10);
    assert.equal(shifted.data[1], 0x80);
    assert.equal(shifted.width, 16);
    assert.equal(shifted.height, 1);
  });

  it("shifts dots to the left (negative offset) and clips underflows", () => {
    // 16 dots width (2 bytes)
    // Dot 3 is bit 4 of byte 0 (0x10)
    // Dot 8 is bit 7 of byte 1 (0x80)
    const data = new Uint8Array([0x10, 0x80]);
    const img: ImageBitmap1bpp = { data, width: 16, height: 1, bytesPerRow: 2 };

    // Shift by -3 dots:
    // Dot 3 -> Dot 0: bit 7 of byte 0 (0x80)
    // Dot 8 -> Dot 5: bit 2 of byte 0 (0x04)
    const shifted = shiftBitmapCrossFeed(img, -3);
    assert.equal(shifted.data[0], 0x84);
    assert.equal(shifted.data[1], 0x00);
  });

  it("clips all dots when offset exceeds width", () => {
    const data = new Uint8Array([0xff, 0xff]);
    const img: ImageBitmap1bpp = { data, width: 16, height: 1, bytesPerRow: 2 };

    const shiftedRight = shiftBitmapCrossFeed(img, 20);
    assert.equal(shiftedRight.data[0], 0x00);
    assert.equal(shiftedRight.data[1], 0x00);

    const shiftedLeft = shiftBitmapCrossFeed(img, -20);
    assert.equal(shiftedLeft.data[0], 0x00);
    assert.equal(shiftedLeft.data[1], 0x00);
  });

  it("preserves multi-row row offsets independently", () => {
    // 2 rows, each 8 dots (1 byte)
    // Row 0: Dot 0 (0x80)
    // Row 1: Dot 1 (0x40)
    const data = new Uint8Array([0x80, 0x40]);
    const img: ImageBitmap1bpp = { data, width: 8, height: 2, bytesPerRow: 1 };

    // Shift by +2:
    // Row 0: Dot 0 -> Dot 2 (0x20)
    // Row 1: Dot 1 -> Dot 3 (0x10)
    const shifted = shiftBitmapCrossFeed(img, 2);
    assert.equal(shifted.data[0], 0x20);
    assert.equal(shifted.data[1], 0x10);
  });
});
