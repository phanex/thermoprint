import { describe, expect, it } from "bun:test";
import { evaluateInstantExpressions } from "../src/lib/date-format.ts";

describe("Date Formatting Shorthands & Offsets", () => {
  const fixedDate = new Date("2026-09-30T12:00:00Z");

  it("evaluates standard date format [[DD.MM.YYYY]]", () => {
    const res = evaluateInstantExpressions("[[DD.MM.YYYY]]", fixedDate);
    expect(res).toBe("30.09.2026");
  });

  it("evaluates date with offset [[DD.MM.YYYY +7d]]", () => {
    const res = evaluateInstantExpressions("[[DD.MM.YYYY +7d]]", fixedDate);
    expect(res).toBe("07.10.2026");
  });

  it("evaluates shorthand days offset [[+7d]] defaulting to DD.MM.YYYY", () => {
    const res = evaluateInstantExpressions("[[+7d]]", fixedDate);
    expect(res).toBe("07.10.2026");
  });

  it("evaluates shorthand bare number [[+3]] defaulting to DD.MM.YYYY", () => {
    const res = evaluateInstantExpressions("[[+3]]", fixedDate);
    expect(res).toBe("03.10.2026");
  });

  it("evaluates shorthand month offset [[+1m]] defaulting to DD.MM.YYYY", () => {
    const res = evaluateInstantExpressions("[[+1m]]", fixedDate);
    expect(res).toBe("30.10.2026");
  });

  it("evaluates shorthand year offset [[+1y]] defaulting to DD.MM.YYYY", () => {
    const res = evaluateInstantExpressions("[[+1y]]", fixedDate);
    expect(res).toBe("30.09.2027");
  });

  it("evaluates shorthand hour offset [[+2h]] defaulting to HH:mm", () => {
    const res = evaluateInstantExpressions("[[+2h]]", fixedDate);
    // 12:00 + 2h -> 14:00 (local time representation)
    const expectedHour = (fixedDate.getHours() + 2) % 24;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    expect(res).toBe(`${pad(expectedHour)}:00`);
  });

  it("preserves non-date brackets [[unknown]]", () => {
    const res = evaluateInstantExpressions("[[unknown]]", fixedDate);
    expect(res).toBe("[[unknown]]");
  });
});
