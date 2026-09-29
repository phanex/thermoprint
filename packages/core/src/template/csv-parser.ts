/**
 * Lightweight, zero-dependency CSV parser with auto-delimiter detection,
 * BOM stripping, quote handling according to RFC 4180, and resilience against
 * unquoted quotes (e.g. 12" display).
 */

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Detects the most probable delimiter (, ; or \t) by analyzing consistency
 * across sample lines while respecting quoted blocks.
 */
function detectDelimiter(text: string): string {
  const candidates = [',', ';', '\t'] as const;
  const lineCounts: Record<string, number[]> = { ',': [], ';': [], '\t': [] };

  let inQuotes = false;
  let currentCounts = { ',': 0, ';': 0, '\t': 0 };
  let linesCollected = 0;

  for (let i = 0; i < text.length && linesCollected < 15; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (ch === ',') currentCounts[',']++;
      else if (ch === ';') currentCounts[';']++;
      else if (ch === '\t') currentCounts['\t']++;
      else if (ch === '\n') {
        lineCounts[','].push(currentCounts[',']);
        lineCounts[';'].push(currentCounts[';']);
        lineCounts['\t'].push(currentCounts['\t']);
        currentCounts = { ',': 0, ';': 0, '\t': 0 };
        linesCollected++;
      }
    }
  }

  // Include last partial line if under limit
  if (
    linesCollected < 15 &&
    (currentCounts[','] > 0 || currentCounts[';'] > 0 || currentCounts['\t'] > 0 || linesCollected === 0)
  ) {
    lineCounts[','].push(currentCounts[',']);
    lineCounts[';'].push(currentCounts[';']);
    lineCounts['\t'].push(currentCounts['\t']);
  }

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lineCounts[delim];
    if (counts.length === 0) continue;
    const headerCount = counts[0];
    if (headerCount === 0) continue; // Multi-column delimiter must be in the header row

    // Score: header count * 10, bonus for consistency across rows
    let score = headerCount * 10;
    for (let r = 1; r < counts.length; r++) {
      if (counts[r] === headerCount) {
        score += 8; // perfectly consistent row
      } else if (counts[r] > 0) {
        score += 2;
      } else {
        score -= 5; // row missing this delimiter
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Parses raw CSV/TSV text into structured headers and row objects.
 */
export function parseCsv(rawText: string): CsvParseResult {
  if (!rawText || !rawText.trim()) {
    return { headers: [], rows: [] };
  }

  // 1. Strip UTF-8 BOM if present
  let text = rawText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // 2. Normalize newlines
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip leading blank lines
  text = text.replace(/^\n+/, '');

  // Detect delimiter
  const delimiter = detectDelimiter(text);

  // 3. State machine tokenization
  const grid: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let cellQuoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === delimiter) {
        const val = cellQuoted ? currentCell : currentCell.trim();
        currentRow.push(val);
        currentCell = '';
        cellQuoted = false;
      } else if (ch === '\n') {
        const val = cellQuoted ? currentCell : currentCell.trim();
        currentRow.push(val);
        currentCell = '';
        cellQuoted = false;
        if (currentRow.some((c) => c.length > 0)) {
          grid.push(currentRow);
        }
        currentRow = [];
      } else if (ch === '"') {
        if (!cellQuoted && currentCell.trim() === '') {
          // Opening quote for field
          cellQuoted = true;
          inQuotes = true;
          currentCell = ''; // discard any leading whitespace before quote
        } else {
          // Literal quote inside unquoted text
          currentCell += '"';
        }
      } else {
        // Character outside quotes
        if (cellQuoted && !inQuotes) {
          // Whitespace after closing quote before delimiter/newline is ignored
          if (ch !== ' ' && ch !== '\t') {
            currentCell += ch;
          }
        } else {
          currentCell += ch;
        }
      }
    }
  }

  // Final cell and row if file didn't end with newline
  if (currentCell.length > 0 || currentRow.length > 0) {
    const val = cellQuoted ? currentCell : currentCell.trim();
    currentRow.push(val);
    if (currentRow.some((c) => c.length > 0)) {
      grid.push(currentRow);
    }
  }

  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  // Header row deduplication & normalization
  const rawHeaders = grid[0];
  const headers: string[] = [];
  const existingNames = new Set<string>();

  for (let idx = 0; idx < rawHeaders.length; idx++) {
    const raw = rawHeaders[idx].trim();
    let name = raw || `Column${idx + 1}`;
    if (existingNames.has(name)) {
      let counter = 2;
      while (existingNames.has(`${name} (${counter})`)) {
        counter++;
      }
      name = `${name} (${counter})`;
    }
    existingNames.add(name);
    headers.push(name);
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const rowValues = grid[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      rowObj[header] = c < rowValues.length ? rowValues[c] : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}
