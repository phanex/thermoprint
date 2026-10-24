import { describe, it, expect } from "bun:test";
import { sanitizeElement } from "../src/lib/library.ts";
import {
  getElementBounds,
  getSelectionBounds,
  calculateCenterOnLabelPatches,
} from "../src/label/dynamic-label.ts";
import type { BaseElement } from "../src/store/editor-store.ts";

describe("Element Sanitization (sanitizeElement)", () => {
  it("heals extreme corrupted dimensions and coordinates from failed distribute/scale", () => {
    const corruptEl: BaseElement = {
      id: "corrupted-1",
      type: "text",
      x: 20652,
      y: -220,
      width: 34326,
      height: 48,
      rotation: 0,
      props: { text: "Corrupted text" },
    };

    const sanitized = sanitizeElement(corruptEl);
    expect(sanitized.width).toBeLessThanOrEqual(2000);
    expect(sanitized.width).toBe(200);
    expect(sanitized.x).toBe(0);
    expect(sanitized.y).toBe(-220); // parked coordinates within valid off-canvas zone are preserved
  });

  it("heals non-finite / NaN values and negative sizes", () => {
    const invalidEl: BaseElement = {
      id: "invalid-1",
      type: "rect",
      x: NaN,
      y: Infinity,
      width: -50,
      height: 0,
      rotation: NaN,
      props: {},
    };

    const sanitized = sanitizeElement(invalidEl);
    expect(sanitized.x).toBe(0);
    expect(sanitized.y).toBe(0);
    expect(sanitized.width).toBe(1); // clamped to min 1
    expect(sanitized.height).toBe(0);
    expect(sanitized.rotation).toBe(0);
  });

  it("preserves valid elements intact", () => {
    const validEl: BaseElement = {
      id: "valid-1",
      type: "barcode",
      x: 10,
      y: 15,
      width: 120,
      height: 40,
      rotation: 90,
      props: { value: "12345" },
    };

    const sanitized = sanitizeElement(validEl);
    expect(sanitized.x).toBe(10);
    expect(sanitized.y).toBe(15);
    expect(sanitized.width).toBe(120);
    expect(sanitized.height).toBe(40);
    expect(sanitized.rotation).toBe(90);
    expect(sanitized.props).toEqual({ value: "12345" });
  });
});

describe("Rotated Element Visual Centering (B14)", () => {
  const label = { widthPx: 320, heightPx: 96 }; // 40mm x 12mm continuous / gap

  function calculateCenteredPosition(el: BaseElement) {
    const b = getElementBounds(el);
    const visualCenterX = (b.minX + b.maxX) / 2;
    const visualCenterY = (b.minY + b.maxY) / 2;
    const newX = Math.round(el.x + (label.widthPx / 2 - visualCenterX));
    const newY = Math.round(el.y + (label.heightPx / 2 - visualCenterY));
    return { newX, newY };
  }

  it("centers unrotated element identically to classic formula", () => {
    const el: BaseElement = {
      id: "el-0",
      type: "rect",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      props: {},
    };

    const { newX, newY } = calculateCenteredPosition(el);
    expect(newX).toBe(Math.round((label.widthPx - el.width) / 2)); // (320 - 100) / 2 = 110
    expect(newY).toBe(Math.round((label.heightPx - el.height) / 2)); // (96 - 40) / 2 = 28

    const centeredEl = { ...el, x: newX, y: newY };
    const b = getElementBounds(centeredEl);
    expect((b.minX + b.maxX) / 2).toBe(label.widthPx / 2);
    expect((b.minY + b.maxY) / 2).toBe(label.heightPx / 2);
  });

  it("centers 90° rotated element exactly at visual center of label", () => {
    const el: BaseElement = {
      id: "el-90",
      type: "rect",
      x: 10,
      y: 10,
      width: 80,
      height: 20,
      rotation: 90,
      props: {},
    };

    const { newX, newY } = calculateCenteredPosition(el);
    const centeredEl = { ...el, x: newX, y: newY };
    const b = getElementBounds(centeredEl);

    // Visual bounds should be centered on label
    expect(Math.round((b.minX + b.maxX) / 2)).toBe(label.widthPx / 2);
    expect(Math.round((b.minY + b.maxY) / 2)).toBe(label.heightPx / 2);

    // Visual margins should be symmetric
    const leftMargin = b.minX;
    const rightMargin = label.widthPx - b.maxX;
    expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(1);

    const topMargin = b.minY;
    const bottomMargin = label.heightPx - b.maxY;
    expect(Math.abs(topMargin - bottomMargin)).toBeLessThanOrEqual(1);
  });

  it("centers 45° rotated element symmetrically", () => {
    const el: BaseElement = {
      id: "el-45",
      type: "rect",
      x: 50,
      y: 30,
      width: 60,
      height: 60,
      rotation: 45,
      props: {},
    };

    const { newX, newY } = calculateCenteredPosition(el);
    const centeredEl = { ...el, x: newX, y: newY };
    const b = getElementBounds(centeredEl);

    expect(Math.round((b.minX + b.maxX) / 2)).toBe(label.widthPx / 2);
    expect(Math.round((b.minY + b.maxY) / 2)).toBe(label.heightPx / 2);
  });

  it("centers 180° and 270° rotated elements correctly", () => {
    for (const rot of [180, 270]) {
      const el: BaseElement = {
        id: `el-${rot}`,
        type: "rect",
        x: 25,
        y: 15,
        width: 90,
        height: 35,
        rotation: rot,
        props: {},
      };

      const { newX, newY } = calculateCenteredPosition(el);
      const centeredEl = { ...el, x: newX, y: newY };
      const b = getElementBounds(centeredEl);

      expect(Math.abs((b.minX + b.maxX) / 2 - label.widthPx / 2)).toBeLessThanOrEqual(0.51);
      expect(Math.abs((b.minY + b.maxY) / 2 - label.heightPx / 2)).toBeLessThanOrEqual(0.51);
    }
  });

  it("centers line elements accurately at 0° and 90°", () => {
    // 0° horizontal line: height is 0
    const line0: BaseElement = {
      id: "line-0",
      type: "line",
      x: 10,
      y: 10,
      width: 140,
      height: 0,
      rotation: 0,
      props: { strokeWidth: 2 },
    };
    const { newX: l0X, newY: l0Y } = calculateCenteredPosition(line0);
    expect(l0X).toBe(Math.round((label.widthPx - 140) / 2)); // 90
    expect(l0Y).toBe(Math.round(label.heightPx / 2)); // 48 (line y is center)

    // 90° vertical line
    const line90: BaseElement = {
      id: "line-90",
      type: "line",
      x: 10,
      y: 10,
      width: 60,
      height: 0,
      rotation: 90,
      props: { strokeWidth: 2 },
    };
    const { newX: l90X, newY: l90Y } = calculateCenteredPosition(line90);
    const centeredLine = { ...line90, x: l90X, y: l90Y };
    const b = getElementBounds(centeredLine);
    expect(Math.round((b.minX + b.maxX) / 2)).toBe(label.widthPx / 2);
    expect(Math.round((b.minY + b.maxY) / 2)).toBe(label.heightPx / 2);
  });

  it("handles negative rotation angles (-45°, -90°)", () => {
    for (const rot of [-45, -90]) {
      const el: BaseElement = {
        id: `el-neg-${rot}`,
        type: "rect",
        x: 12,
        y: 18,
        width: 70,
        height: 30,
        rotation: rot,
        props: {},
      };

      const { newX, newY } = calculateCenteredPosition(el);
      const centeredEl = { ...el, x: newX, y: newY };
      const b = getElementBounds(centeredEl);

      expect(Math.abs((b.minX + b.maxX) / 2 - label.widthPx / 2)).toBeLessThanOrEqual(0.51);
      expect(Math.abs((b.minY + b.maxY) / 2 - label.heightPx / 2)).toBeLessThanOrEqual(0.51);
    }
  });
});

describe("getElementBounds Robustness", () => {
  it("guards against NaN / Infinity in element dimensions and coordinates", () => {
    const corruptEl: BaseElement = {
      id: "corrupt-nan",
      type: "rect",
      x: NaN,
      y: Infinity,
      width: NaN,
      height: -10,
      rotation: NaN,
      props: {},
    };

    const b = getElementBounds(corruptEl);
    expect(Number.isFinite(b.minX)).toBe(true);
    expect(Number.isFinite(b.maxX)).toBe(true);
    expect(Number.isFinite(b.minY)).toBe(true);
    expect(Number.isFinite(b.maxY)).toBe(true);
    expect(b.maxX).toBeGreaterThanOrEqual(b.minX);
    expect(b.maxY).toBeGreaterThanOrEqual(b.minY);
  });
});

describe("Rotated Element Marquee Selection (B04)", () => {
  function isElementInMarquee(
    el: BaseElement,
    marquee: { x1: number; y1: number; x2: number; y2: number },
  ) {
    const b = getElementBounds(el);
    return (
      b.maxX >= marquee.x1 &&
      b.minX <= marquee.x2 &&
      b.maxY >= marquee.y1 &&
      b.minY <= marquee.y2
    );
  }

  it("selects a 200x20 stick rotated at 45° when marquee hits its rotated bounding box", () => {
    const stick: BaseElement = {
      id: "stick-45",
      type: "rect",
      x: 100,
      y: 100,
      width: 200,
      height: 20,
      rotation: 45,
      props: {},
    };

    const b = getElementBounds(stick);
    expect(b.minX).toBeLessThan(100);
    expect(b.maxY).toBeGreaterThan(120);

    // Marquee hitting the lower-right rotated diamond tip (y in [130, 160])
    const marqueeHitTip = { x1: 220, y1: 130, x2: 250, y2: 160 };
    expect(isElementInMarquee(stick, marqueeHitTip)).toBe(true);

    // Old unrotated formula missed this tip because stick.height was only 20px (y in [100, 120])
    const oldUnrotatedHit =
      stick.x + stick.width >= marqueeHitTip.x1 &&
      stick.x <= marqueeHitTip.x2 &&
      stick.y + stick.height >= marqueeHitTip.y1 &&
      stick.y <= marqueeHitTip.y2;
    expect(oldUnrotatedHit).toBe(false);
  });
});

describe("Selection Bounds & Group Centering (calculateCenterOnLabelPatches)", () => {
  const label = { widthPx: 400, heightPx: 200 };

  it("calculates accurate aggregate selection bounds across mixed rotations", () => {
    const el1: BaseElement = {
      id: "el-1",
      type: "rect",
      x: 10,
      y: 20,
      width: 100,
      height: 40,
      rotation: 0,
      props: {},
    };
    const el2: BaseElement = {
      id: "el-2",
      type: "rect",
      x: 200,
      y: 50,
      width: 80,
      height: 30,
      rotation: 90,
      props: {},
    };

    const b1 = getElementBounds(el1); // [10..110], [20..60]
    const b2 = getElementBounds(el2); // [170..200], [50..130]

    const groupBounds = getSelectionBounds([el1, el2]);
    expect(groupBounds.minX).toBe(Math.min(b1.minX, b2.minX)); // 10
    expect(groupBounds.maxX).toBe(Math.max(b1.maxX, b2.maxX)); // 200
    expect(groupBounds.minY).toBe(Math.min(b1.minY, b2.minY)); // 20
    expect(groupBounds.maxY).toBe(Math.max(b1.maxY, b2.maxY)); // 130
    expect(groupBounds.width).toBe(190);
    expect(groupBounds.height).toBe(110);
  });

  it("centers a 90° rotated single element symmetrically on the canvas", () => {
    const el: BaseElement = {
      id: "single-90",
      type: "rect",
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rotation: 90,
      props: {},
    };

    const patches = calculateCenterOnLabelPatches([el], label.widthPx, label.heightPx);
    const centeredEl = { ...el, ...patches[el.id] };
    const b = getElementBounds(centeredEl);

    // Visual width is 40 (since rotated 90°), height is 120
    expect(b.maxX - b.minX).toBe(40);
    expect(b.maxY - b.minY).toBe(120);

    // Margins must be perfectly equal
    const leftMargin = b.minX;
    const rightMargin = label.widthPx - b.maxX;
    expect(leftMargin).toBe(rightMargin);
    expect(leftMargin).toBe((label.widthPx - 40) / 2); // (400 - 40) / 2 = 180

    const topMargin = b.minY;
    const bottomMargin = label.heightPx - b.maxY;
    expect(topMargin).toBe(bottomMargin);
    expect(topMargin).toBe((label.heightPx - 120) / 2); // (200 - 120) / 2 = 40
  });

  it("centers a multi-element selection as a single rigid group with mixed rotations", () => {
    const el1: BaseElement = {
      id: "group-1",
      type: "rect",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      props: {},
    };
    const el2: BaseElement = {
      id: "group-2",
      type: "rect",
      x: 120,
      y: 0,
      width: 80,
      height: 20,
      rotation: 90,
      props: {},
    };

    const patches = calculateCenterOnLabelPatches([el1, el2], label.widthPx, label.heightPx);
    const centered1 = { ...el1, ...patches[el1.id] };
    const centered2 = { ...el2, ...patches[el2.id] };

    const centeredGroupBounds = getSelectionBounds([centered1, centered2]);
    const leftMargin = centeredGroupBounds.minX;
    const rightMargin = label.widthPx - centeredGroupBounds.maxX;
    expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(1);

    const topMargin = centeredGroupBounds.minY;
    const bottomMargin = label.heightPx - centeredGroupBounds.maxY;
    expect(Math.abs(topMargin - bottomMargin)).toBeLessThanOrEqual(1);
  });

  it("supports horizontal-only and vertical-only centering patches", () => {
    const el: BaseElement = {
      id: "partial-1",
      type: "rect",
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      rotation: 0,
      props: {},
    };

    const hOnly = calculateCenterOnLabelPatches([el], label.widthPx, label.heightPx, {
      horizontal: true,
      vertical: false,
    });
    expect(hOnly[el.id].x).toBe((label.widthPx - 50) / 2);
    expect(hOnly[el.id].y).toBeUndefined();

    const vOnly = calculateCenterOnLabelPatches([el], label.widthPx, label.heightPx, {
      horizontal: false,
      vertical: true,
    });
    expect(vOnly[el.id].x).toBeUndefined();
    expect(vOnly[el.id].y).toBe((label.heightPx - 50) / 2);
  });
});
