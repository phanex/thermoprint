import { parseCsv, extractPlaceholders } from "@thermoprint/core";
import { useEditorV2Store } from "../store/editor-store.ts";

export interface CsvLoadResult {
  success: boolean;
  rowCount?: number;
  fileName?: string;
  missingFields?: string[];
  error?: string;
}

/**
 * Standardized procedure for importing and validating CSV/TSV files into the editor.
 * Checks file integrity, parses rows/headers, compares against existing template fields,
 * and updates the editor store.
 */
export async function loadCsvFile(file: File): Promise<CsvLoadResult> {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".csv") && !fileName.endsWith(".tsv")) {
    return {
      success: false,
      error: "Invalid file format. Only .csv and .tsv files are supported.",
    };
  }

  try {
    const text = await file.text();
    if (text.includes("\uFFFD")) {
      return {
        success: false,
        error: "Wrong encoding, UTF-8 required",
      };
    }

    const res = parseCsv(text);

    if (!res.headers || res.headers.length === 0 || !res.rows || res.rows.length === 0) {
      return {
        success: false,
        error: "CSV file contains no data rows",
      };
    }

    // Check template fields against CSV headers
    const elements = useEditorV2Store.getState().elements;
    const templateFields = new Set<string>();

    for (const el of elements) {
      if (el.type === "text" && typeof el.props.text === "string") {
        extractPlaceholders(el.props.text).fields.forEach((f) => templateFields.add(f));
      }
      if ((el.type === "barcode" || el.type === "qrcode") && typeof el.props.content === "string") {
        extractPlaceholders(el.props.content).fields.forEach((f) => templateFields.add(f));
      }
    }

    const headers = new Set(res.headers);
    const missingFields: string[] = [];
    for (const f of templateFields) {
      if (!headers.has(f)) {
        missingFields.push(f);
      }
    }

    // Set CSV data in store
    useEditorV2Store.getState().setCsvData(res.rows, file.name);

    return {
      success: true,
      rowCount: res.rows.length,
      fileName: file.name,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to parse CSV file.",
    };
  }
}
