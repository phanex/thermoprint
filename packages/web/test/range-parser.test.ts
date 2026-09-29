import { describe, expect, test } from "bun:test";
import { parsePrintRanges, formatMediaDescription } from "../src/lib/range-parser.ts";

describe("Range Parser - parsePrintRanges", () => {
  test("returns empty array for empty or whitespace string", () => {
    expect(parsePrintRanges("")).toEqual([]);
    expect(parsePrintRanges("   ")).toEqual([]);
  });

  test("parses single number", () => {
    expect(parsePrintRanges("14")).toEqual([14]);
    expect(parsePrintRanges("  7  ")).toEqual([7]);
  });

  test("parses simple range", () => {
    expect(parsePrintRanges("1-5")).toEqual([1, 2, 3, 4, 5]);
  });

  test("parses mixed comma-separated list and ranges", () => {
    expect(parsePrintRanges("2, 10-13, 99")).toEqual([2, 10, 11, 12, 13, 99]);
  });

  test("deduplicates overlapping numbers and ranges", () => {
    expect(parsePrintRanges("1-3, 2, 3, 4")).toEqual([1, 2, 3, 4]);
  });

  test("returns empty array for invalid inputs", () => {
    expect(parsePrintRanges("abc")).toEqual([]);
    expect(parsePrintRanges("5-2")).toEqual([]); // descending range
    expect(parsePrintRanges("1-2-3")).toEqual([]); // malformed range
    expect(parsePrintRanges("-5")).toEqual([]);
    expect(parsePrintRanges("0")).toEqual([]); // 1-based only
    expect(parsePrintRanges("1, foo, 3")).toEqual([]); // partially invalid
  });

  test("clamps ranges to maxLimit", () => {
    expect(parsePrintRanges("1-10", 5)).toEqual([1, 2, 3, 4, 5]);
    expect(parsePrintRanges("3-8", 6)).toEqual([3, 4, 5, 6]);
  });

  test("omits numbers exceeding maxLimit", () => {
    expect(parsePrintRanges("2, 5, 10, 25", 8)).toEqual([2, 5]);
  });
});

describe("Media Formatter - formatMediaDescription", () => {
  test("formats dynamic continuous tape cleanly without redundant words", () => {
    const res = formatMediaDescription(
      { widthMm: 40, heightMm: 12, tapeWidthMm: 12, isDynamic: true },
      "continuous",
      { leadMm: 10, trailMm: 8 },
    );
    expect(res).toBe("12 mm · dynamic");
  });

  test("formats fixed continuous tape with cutter margins in landscape orientation", () => {
    const res = formatMediaDescription(
      { widthMm: 40, heightMm: 12 },
      "continuous",
      { leadMm: 10, trailMm: 8 },
    );
    expect(res).toBe("40 (+18) × 12 mm");
  });

  test("formats fixed continuous tape with cutter margins in portrait orientation", () => {
    const res = formatMediaDescription(
      { widthMm: 12, heightMm: 40 },
      "continuous",
      { leadMm: 10, trailMm: 8 },
    );
    expect(res).toBe("12 × 40 (+18) mm");
  });

  test("formats fixed continuous tape with zero cutter margins", () => {
    const res = formatMediaDescription(
      { widthMm: 40, heightMm: 12 },
      "continuous",
      { leadMm: 0, trailMm: 0 },
    );
    expect(res).toBe("40 × 12 mm");
  });

  test("formats fixed continuous tape with null cutter margins", () => {
    const res = formatMediaDescription(
      { widthMm: 40, heightMm: 12 },
      "continuous",
      null,
    );
    expect(res).toBe("40 × 12 mm");
  });

  test("formats gap / die-cut labels cleanly", () => {
    const res = formatMediaDescription(
      { widthMm: 40, heightMm: 12 },
      "gap",
      { leadMm: 10, trailMm: 8 },
    );
    expect(res).toBe("40 × 12 mm");
  });
});
