import { describe, it, expect } from "bun:test";
import {
  isElementOffCanvas,
  isElementBleeding,
  fitDynamicLabel,
  getElementBounds,
} from "../src/label/dynamic-label.ts";
import type { BaseElement, LabelSize } from "../src/store/editor-store.ts";
import { mmToPx } from "@thermoprint/core";

describe("Off-Canvas Element Detection (isElementOffCanvas)", () => {
  const canvasW = 320; // 40 mm at 8 dpmm
  const canvasH = 96;  // 12 mm at 8 dpmm

  it("identifies elements fully inside printable canvas as on-canvas", () => {
    const el: BaseElement = {
      id: "el-1",
      type: "text",
      x: 50,
      y: 20,
      width: 100,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(el, canvasW, canvasH)).toBe(false);
  });

  it("identifies elements partially overlapping boundary as on-canvas", () => {
    // Partially overlapping left edge (x = -30, width = 50 -> extends from -30 to +20)
    const elLeft: BaseElement = {
      id: "el-left",
      type: "text",
      x: -30,
      y: 20,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(elLeft, canvasW, canvasH)).toBe(false);

    // Partially overlapping right edge (x = 300, width = 50 -> extends from 300 to 350)
    const elRight: BaseElement = {
      id: "el-right",
      type: "text",
      x: 300,
      y: 20,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(elRight, canvasW, canvasH)).toBe(false);
  });

  it("identifies elements completely outside left edge as off-canvas", () => {
    const el: BaseElement = {
      id: "el-off-left",
      type: "text",
      x: -80,
      y: 20,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(el, canvasW, canvasH)).toBe(true);
  });

  it("identifies elements completely outside right edge as off-canvas", () => {
    const el: BaseElement = {
      id: "el-off-right",
      type: "text",
      x: 350,
      y: 20,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(el, canvasW, canvasH)).toBe(true);
  });

  it("identifies elements completely outside top or bottom edge as off-canvas", () => {
    const elTop: BaseElement = {
      id: "el-off-top",
      type: "text",
      x: 50,
      y: -50,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(elTop, canvasW, canvasH)).toBe(true);

    const elBottom: BaseElement = {
      id: "el-off-bottom",
      type: "text",
      x: 50,
      y: 120,
      width: 50,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementOffCanvas(elBottom, canvasW, canvasH)).toBe(true);
  });

  it("correctly handles rotated elements bounds", () => {
    // 90-degree rotated element at x = -40, w = 100, h = 20
    // rot 90: width extends in +Y, height extends in -X
    const elRot: BaseElement = {
      id: "el-rot",
      type: "rect",
      x: -40,
      y: 20,
      width: 100,
      height: 20,
      rotation: 90,
      props: {},
    };
    const b = getElementBounds(elRot);
    expect(b.maxX).toBeLessThanOrEqual(0);
    expect(isElementOffCanvas(elRot, canvasW, canvasH)).toBe(true);
  });
});

describe("Bleed Element Detection (isElementBleeding)", () => {
  const canvasW = 320;
  const canvasH = 96;

  it("returns false for elements completely inside printable canvas", () => {
    const el: BaseElement = {
      id: "el-inside",
      type: "rect",
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(el, canvasW, canvasH)).toBe(false);
  });

  it("returns true for elements partially sticking out left/right/top/bottom", () => {
    // Bleeding left
    const elLeft: BaseElement = {
      id: "bleed-left",
      type: "rect",
      x: -20,
      y: 10,
      width: 80,
      height: 40,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(elLeft, canvasW, canvasH)).toBe(true);

    // Bleeding right
    const elRight: BaseElement = {
      id: "bleed-right",
      type: "rect",
      x: 280,
      y: 10,
      width: 80,
      height: 40,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(elRight, canvasW, canvasH)).toBe(true);

    // Bleeding top
    const elTop: BaseElement = {
      id: "bleed-top",
      type: "rect",
      x: 50,
      y: -10,
      width: 80,
      height: 40,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(elTop, canvasW, canvasH)).toBe(true);

    // Bleeding bottom
    const elBottom: BaseElement = {
      id: "bleed-bottom",
      type: "rect",
      x: 50,
      y: 80,
      width: 80,
      height: 40,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(elBottom, canvasW, canvasH)).toBe(true);
  });

  it("detects bleeding accurately for rotated lines and diagonal elements", () => {
    const diagLine: BaseElement = {
      id: "diag-line",
      type: "line",
      x: 100,
      y: 50,
      width: 400,
      height: 0,
      rotation: 45,
      props: {},
    };
    expect(isElementBleeding(diagLine, canvasW, canvasH)).toBe(true);
  });

  it("returns true for elements parked completely off-canvas", () => {
    const elOff: BaseElement = {
      id: "parked-off",
      type: "text",
      x: -150,
      y: -50,
      width: 80,
      height: 30,
      rotation: 0,
      props: {},
    };
    expect(isElementBleeding(elOff, canvasW, canvasH)).toBe(true);
  });
});

describe("Parking Zone Dynamic Label Sizing (fitDynamicLabel)", () => {
  const baseLabel: LabelSize = {
    widthMm: 40,
    heightMm: 12,
    widthPx: mmToPx(40),
    heightPx: mmToPx(12),
    labelLengthMm: 40,
    tapeWidthMm: 12,
    isDynamic: true,
  };

  it("ignores parked off-canvas elements when calculating dynamic ribbon width", () => {
    const onCanvasElement: BaseElement = {
      id: "active-1",
      type: "text",
      x: 10,
      y: 10,
      width: mmToPx(25), // 25 mm content width
      height: mmToPx(8),
      rotation: 0,
      props: {},
    };

    const parkedFarRightElement: BaseElement = {
      id: "parked-far-right",
      type: "text",
      x: mmToPx(120), // 120 mm away (way outside 40mm canvas)
      y: 10,
      width: mmToPx(20),
      height: mmToPx(8),
      rotation: 0,
      props: {},
    };

    const result = fitDynamicLabel([onCanvasElement, parkedFarRightElement], baseLabel);

    // Label length should be sized strictly for the 25 mm active element, NOT 120+ mm!
    expect(result.label.widthMm).toBeLessThanOrEqual(30);
    expect(result.label.widthMm).toBeGreaterThanOrEqual(25);
  });

  it("handles case where all elements are parked off-canvas safely", () => {
    const parkedLeft: BaseElement = {
      id: "parked-left",
      type: "text",
      x: -150,
      y: 10,
      width: 50,
      height: 20,
      rotation: 0,
      props: {},
    };

    const result = fitDynamicLabel([parkedLeft], baseLabel);
    expect(result.label.widthMm).toBe(baseLabel.widthMm);
    expect(result.shiftX).toBe(0);
  });

  it("accurately detects line element bounds and off-canvas status", () => {
    const canvasW = 320;
    const canvasH = 96;
    // Horizontal line fully inside canvas
    const lineOnCanvas: BaseElement = {
      id: "line-on",
      type: "line",
      x: 20,
      y: 40,
      width: 100,
      height: 0,
      rotation: 0,
      props: { strokeWidth: 2 },
    };
    expect(isElementOffCanvas(lineOnCanvas, canvasW, canvasH)).toBe(false);

    // Horizontal line moved off-canvas above top edge
    const lineOffTop: BaseElement = {
      id: "line-off-top",
      type: "line",
      x: 20,
      y: -10,
      width: 100,
      height: 0,
      rotation: 0,
      props: { strokeWidth: 2 },
    };
    expect(isElementOffCanvas(lineOffTop, canvasW, canvasH)).toBe(true);

    // Horizontal line moved off-canvas below bottom edge
    const lineOffBottom: BaseElement = {
      id: "line-off-bottom",
      type: "line",
      x: 20,
      y: 120,
      width: 100,
      height: 0,
      rotation: 0,
      props: { strokeWidth: 2 },
    };
    expect(isElementOffCanvas(lineOffBottom, canvasW, canvasH)).toBe(true);
  });
});

