import { describe, expect, it } from "bun:test";
import { parseCsv } from "../../src/template/csv-parser.js";

describe("CSV Parser", () => {
  it("parses standard comma-separated CSV", () => {
    const csv = "Name,Age,City\nAlice,30,Kyiv\nBob,25,Lviv";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Name", "Age", "City"]);
    expect(res.rows).toEqual([
      { Name: "Alice", Age: "30", City: "Kyiv" },
      { Name: "Bob", Age: "25", City: "Lviv" },
    ]);
  });

  it("auto-detects semicolon delimiter", () => {
    const csv = "Назва;Ціна;Артикул\nСало;150;A-01\nХліб;25;B-02";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Назва", "Ціна", "Артикул"]);
    expect(res.rows).toEqual([
      { Назва: "Сало", Ціна: "150", Артикул: "A-01" },
      { Назва: "Хліб", Ціна: "25", Артикул: "B-02" },
    ]);
  });

  it("auto-detects tab delimiter (TSV)", () => {
    const tsv = "ID\tDescription\n1\tProduct one\n2\tProduct two";
    const res = parseCsv(tsv);
    expect(res.headers).toEqual(["ID", "Description"]);
    expect(res.rows).toEqual([
      { ID: "1", Description: "Product one" },
      { ID: "2", Description: "Product two" },
    ]);
  });

  it("strips UTF-8 BOM", () => {
    const bomCsv = "\uFEFFName,Code\nTest,123";
    const res = parseCsv(bomCsv);
    expect(res.headers).toEqual(["Name", "Code"]);
    expect(res.rows).toEqual([{ Name: "Test", Code: "123" }]);
  });

  it("handles quoted fields with commas and semicolons inside quotes", () => {
    const csv = 'Title,"Notes, Extra",Price\nBook,"Hardcover, 2nd ed.",45';
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Title", "Notes, Extra", "Price"]);
    expect(res.rows).toEqual([
      { Title: "Book", "Notes, Extra": "Hardcover, 2nd ed.", Price: "45" },
    ]);
  });

  it("handles escaped quotes in RFC 4180 format", () => {
    const csv = 'Item,Quote\n1,"He said ""Hello!"" to me"';
    const res = parseCsv(csv);
    expect(res.rows[0]["Quote"]).toBe('He said "Hello!" to me');
  });

  it("handles multiline cells in quotes", () => {
    const csv = 'Item,Text\n1,"Line 1\nLine 2"';
    const res = parseCsv(csv);
    expect(res.rows[0]["Text"]).toBe("Line 1\nLine 2");
  });

  it("handles uneven rows by filling missing columns with empty string", () => {
    const csv = "A,B,C\n1,2\n3,4,5,6";
    const res = parseCsv(csv);
    expect(res.rows[0]).toEqual({ A: "1", B: "2", C: "" });
    expect(res.rows[1]).toEqual({ A: "3", B: "4", C: "5" });
  });

  it("handles empty or blank content gracefully", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
    expect(parseCsv("   \n\n  ")).toEqual({ headers: [], rows: [] });
  });

  it("handles CRLF newlines correctly", () => {
    const csv = "A,B\r\n1,2\r\n3,4\r\n";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["A", "B"]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toEqual({ A: "1", B: "2" });
    expect(res.rows[1]).toEqual({ A: "3", B: "4" });
  });

  it("accepts valid single-column CSV with concise identifier header", () => {
    const csv = "Barcode\n10001\n10002";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Barcode"]);
    expect(res.rows).toEqual([{ Barcode: "10001" }, { Barcode: "10002" }]);

    const cyrillic = "Серійний номер\nSN-01\nSN-02";
    const resCyr = parseCsv(cyrillic);
    expect(resCyr.headers).toEqual(["Серійний номер"]);
    expect(resCyr.rows).toEqual([
      { "Серійний номер": "SN-01" },
      { "Серійний номер": "SN-02" },
    ]);
  });

  it("deduplicates identical header names gracefully without collisions", () => {
    const csv = "Tag,Tag (2),Tag\nA,1,X\nB,2,Y";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Tag", "Tag (2)", "Tag (3)"]);
    expect(res.rows[0]).toEqual({ Tag: "A", "Tag (2)": "1", "Tag (3)": "X" });
  });

  it("handles European CSV with semicolons and comma decimals", () => {
    const csv = "Name;Price\nApfel;1,50\nBirne;2,30";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Name", "Price"]);
    expect(res.rows).toEqual([
      { Name: "Apfel", Price: "1,50" },
      { Name: "Birne", Price: "2,30" },
    ]);
  });

  it("handles TSV with commas inside text fields", () => {
    const tsv = "ID\tDescription\n1\tRed, blue, and green\n2\tSmall, medium, large";
    const res = parseCsv(tsv);
    expect(res.headers).toEqual(["ID", "Description"]);
    expect(res.rows).toEqual([
      { ID: "1", Description: "Red, blue, and green" },
      { ID: "2", Description: "Small, medium, large" },
    ]);
  });

  it("tolerates unquoted quotes inside field values without corrupting rows", () => {
    const csv = 'ID,Display\n1,12" monitor\n2,24" screen';
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["ID", "Display"]);
    expect(res.rows).toEqual([
      { ID: "1", Display: '12" monitor' },
      { ID: "2", Display: '24" screen' },
    ]);
  });

  it("preserves spaces inside quotes while trimming unquoted fields", () => {
    const csv = 'ID,Name,Code\n 1 , John ,"  SPACED  "';
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["ID", "Name", "Code"]);
    expect(res.rows[0]).toEqual({
      ID: "1",
      Name: "John",
      Code: "  SPACED  ",
    });
  });

  it("handles multilingual UTF-8 characters across various alphabets", () => {
    const csv = "Nom,Mädchen,Греція,ქართული,日本語\nJean,Léa,Ελλάδα,საქართველო,東京";
    const res = parseCsv(csv);
    expect(res.headers).toEqual(["Nom", "Mädchen", "Греція", "ქართული", "日本語"]);
    expect(res.rows[0]).toEqual({
      Nom: "Jean",
      Mädchen: "Léa",
      Греція: "Ελλάδα",
      ქართული: "საქართველო",
      日本語: "東京",
    });
  });
});

