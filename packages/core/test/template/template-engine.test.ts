import { describe, it, expect } from "bun:test";
import {
  evaluateCounter,
  getMaxCountdownCopies,
  evaluateTemplate,
  hasDynamicTokens,
  hasBatchTokens,
  extractPlaceholders,
} from "../../src/template/template-engine.js";

describe("Template Engine - evaluateCounter", () => {
  it("evaluates simple counter {{#:1}} starting from 1 with default step +1", () => {
    expect(evaluateCounter("1", 0).text).toBe("1");
    expect(evaluateCounter("1", 1).text).toBe("2");
    expect(evaluateCounter("1", 9).text).toBe("10");
  });

  it("supports zero-base start {{#:0000}}", () => {
    expect(evaluateCounter("0000", 0).text).toBe("0000");
    expect(evaluateCounter("0000", 1).text).toBe("0001");
    expect(evaluateCounter("0000", 2).text).toBe("0002");
  });

  it("evaluates padded counters {{#:01}} and expands on overflow", () => {
    expect(evaluateCounter("01", 0).text).toBe("01");
    expect(evaluateCounter("01", 1).text).toBe("02");
    expect(evaluateCounter("01", 98).text).toBe("99");
    expect(evaluateCounter("01", 99).text).toBe("100");
  });

  it("evaluates 3-digit padded counter {{#:001}}", () => {
    expect(evaluateCounter("001", 0).text).toBe("001");
    expect(evaluateCounter("001", 1).text).toBe("002");
  });

  it("evaluates start value 100 with default step", () => {
    expect(evaluateCounter("100", 0).text).toBe("100");
    expect(evaluateCounter("100", 1).text).toBe("101");
  });

  it("evaluates custom increment step {{#:001+5}}", () => {
    expect(evaluateCounter("001+5", 0).text).toBe("001");
    expect(evaluateCounter("001+5", 1).text).toBe("006");
    expect(evaluateCounter("001+5", 2).text).toBe("011");
  });

  it("handles multi-plus fallback by taking only the first step {{#:0000+5+7}}", () => {
    expect(evaluateCounter("0000+5+7", 0).text).toBe("0000");
    expect(evaluateCounter("0000+5+7", 1).text).toBe("0005");
    expect(evaluateCounter("0000+5+7", 2).text).toBe("0010");
  });

  it("evaluates decrement {{#:100+-1}} and stops print below zero", () => {
    expect(evaluateCounter("100+-1", 0).text).toBe("100");
    expect(evaluateCounter("100+-1", 1).text).toBe("99");
    expect(evaluateCounter("100+-1", 100).text).toBe("0");

    const underflow = evaluateCounter("100+-1", 101);
    expect(underflow.stopPrint).toBe(true);
    expect(underflow.stopReason).toBe("Counter reached 0");
  });

  it("evaluates zero-padded decrement {{#:05+-1}} and stops below zero", () => {
    expect(evaluateCounter("05+-1", 0).text).toBe("05");
    expect(evaluateCounter("05+-1", 1).text).toBe("04");
    expect(evaluateCounter("05+-1", 5).text).toBe("00");

    const underflow = evaluateCounter("05+-1", 6);
    expect(underflow.stopPrint).toBe(true);
  });

  it("evaluates decimal counters {{#:15.0+0.5}} with exact precision", () => {
    expect(evaluateCounter("15.0+0.5", 0).text).toBe("15.0");
    expect(evaluateCounter("15.0+0.5", 1).text).toBe("15.5");
    expect(evaluateCounter("15.0+0.5", 2).text).toBe("16.0");
    expect(evaluateCounter("15.0+0.5", 3).text).toBe("16.5");
  });

  it("evaluates decimal decrement {{#:1.0+-0.5}} and stops below zero", () => {
    expect(evaluateCounter("1.0+-0.5", 0).text).toBe("1.0");
    expect(evaluateCounter("1.0+-0.5", 1).text).toBe("0.5");
    expect(evaluateCounter("1.0+-0.5", 2).text).toBe("0.0");

    const underflow = evaluateCounter("1.0+-0.5", 3);
    expect(underflow.stopPrint).toBe(true);
  });

  it("preserves prefixes and suffixes: SN-0001, Box #01, 00#01, BOX-001-A", () => {
    expect(evaluateCounter("SN-0001", 0).text).toBe("SN-0001");
    expect(evaluateCounter("SN-0001", 1).text).toBe("SN-0002");

    expect(evaluateCounter("#001", 0).text).toBe("#001");
    expect(evaluateCounter("#001", 1).text).toBe("#002");

    expect(evaluateCounter("Box #01", 0).text).toBe("Box #01");
    expect(evaluateCounter("Box #01", 1).text).toBe("Box #02");

    expect(evaluateCounter("00#01", 0).text).toBe("00#01");
    expect(evaluateCounter("00#01", 1).text).toBe("00#02");

    expect(evaluateCounter("BOX-001-A+1", 0).text).toBe("BOX-001-A");
    expect(evaluateCounter("BOX-001-A+1", 1).text).toBe("BOX-002-A");
  });

  it("handles expressions without numbers by appending counter to prefix (e.g. ###)", () => {
    expect(evaluateCounter("###", 0).text).toBe("###1");
    expect(evaluateCounter("###", 1).text).toBe("###2");
  });
});

describe("Template Engine - evaluateTemplate", () => {
  it("evaluates inline counters in text templates", () => {
    const res = evaluateTemplate("Order #{{#:001}}", { index: 0 });
    expect(res.text).toBe("Order #001");

    const res2 = evaluateTemplate("Order #{{#:001}}", { index: 5 });
    expect(res2.text).toBe("Order #006");
  });

  it("substitutes CSV fields from csvRow", () => {
    const template = "{{Product}} - ${{Price}} (SKU: {{SKU}})";
    const csvRow = { Product: "Thermal Paper", Price: "12.50", SKU: "TP-12" };
    const res = evaluateTemplate(template, { index: 0, csvRow });
    expect(res.text).toBe("Thermal Paper - $12.50 (SKU: TP-12)");
  });

  it("allows columns named # or ## from CSV without collision", () => {
    const template = "Item #{{#}} (batch {{##}})";
    const csvRow = { "#": "42", "##": "B-9" };
    const res = evaluateTemplate(template, { index: 0, csvRow });
    expect(res.text).toBe("Item #42 (batch B-9)");
  });

  it("validates missing CSV fields when validateCsv is true", () => {
    const template = "{{Name}} - {{Missing}}";
    const csvRow = { Name: "Item" };
    const res = evaluateTemplate(template, { index: 0, csvRow, validateCsv: true });
    expect(res.missingFields).toEqual(["Missing"]);
    expect(res.text).toBe("Item - {{Missing}}");
  });

  it("combines counters, CSV fields, and stops print on underflow", () => {
    const template = "{{Name}} | {{#:01+-1}}";
    const csvRow = { Name: "Box" };

    const res0 = evaluateTemplate(template, { index: 0, csvRow });
    expect(res0.text).toBe("Box | 01");
    expect(res0.stopPrint).toBeUndefined();

    const res1 = evaluateTemplate(template, { index: 1, csvRow });
    expect(res1.text).toBe("Box | 00");
    expect(res1.stopPrint).toBeUndefined();

    const res2 = evaluateTemplate(template, { index: 2, csvRow });
    expect(res2.stopPrint).toBe(true);
  });
});

describe("Template Engine - Utilities", () => {
  it("detects dynamic tokens via hasDynamicTokens", () => {
    expect(hasDynamicTokens("Plain text")).toBe(false);
    expect(hasDynamicTokens("Item {{#:001}}")).toBe(true);
    expect(hasDynamicTokens("User {{Name}}")).toBe(true);
    expect(hasDynamicTokens("Date [[DD.MM.YYYY]]")).toBe(true);
  });

  it("detects batch tokens via hasBatchTokens and excludes date tokens", () => {
    expect(hasBatchTokens("Plain text")).toBe(false);
    expect(hasBatchTokens("Date [[DD.MM.YYYY]]")).toBe(false);
    expect(hasBatchTokens("Item {{#:001}}")).toBe(true);
    expect(hasBatchTokens("User {{Name}}")).toBe(true);
  });

  it("extracts placeholders separating counters from CSV fields", () => {
    const template = "{{#:SN-001}} | {{Name}} | {{Price}} | {{#:01+-1}}";
    const { counters, fields } = extractPlaceholders(template);
    expect(counters).toEqual(["SN-001", "01+-1"]);
    expect(fields).toEqual(["Name", "Price"]);
  });

  describe("getMaxCountdownCopies", () => {
    it("returns null for non-countdown counters", () => {
      expect(getMaxCountdownCopies("1")).toBeNull();
      expect(getMaxCountdownCopies("001")).toBeNull();
      expect(getMaxCountdownCopies("001+5")).toBeNull();
      expect(getMaxCountdownCopies("SN-0001")).toBeNull();
    });

    it("calculates correct copy limit for integer countdowns", () => {
      // 0100+-2: 100, 98, ..., 0 (51 copies)
      expect(getMaxCountdownCopies("0100+-2")).toBe(51);
      // 100+-1: 100, 99, ..., 0 (101 copies)
      expect(getMaxCountdownCopies("100+-1")).toBe(101);
      // 10+-3: 10, 7, 4, 1 (4 copies)
      expect(getMaxCountdownCopies("10+-3")).toBe(4);
      // 0+-1: 0 (1 copy)
      expect(getMaxCountdownCopies("0+-1")).toBe(1);
    });

    it("calculates correct copy limit for decimal countdowns", () => {
      // 1.5+-0.5: 1.5, 1.0, 0.5, 0.0 (4 copies)
      expect(getMaxCountdownCopies("1.5+-0.5")).toBe(4);
      // 1.0+-0.3: 1.0, 0.7, 0.4, 0.1 (4 copies)
      expect(getMaxCountdownCopies("1.0+-0.3")).toBe(4);
    });

    it("handles prefixed countdown expressions", () => {
      expect(getMaxCountdownCopies("SN-0100+-2")).toBe(51);
      expect(getMaxCountdownCopies("BOX-10+-3")).toBe(4);
    });
  });
});
