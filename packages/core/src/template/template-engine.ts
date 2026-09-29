// Template engine for Thermoprint: dynamic counters ({{#:...}}) and CSV fields ({{Field}})

export interface EvaluationContext {
  /** 0-based label index in the print sequence (0 = first label) */
  index: number;
  /** Optional CSV row data (column name -> string value) */
  csvRow?: Record<string, string>;
  /** When true, missing CSV fields are collected into missingFields */
  validateCsv?: boolean;
}

export interface EvaluationResult {
  /** The evaluated template string */
  text: string;
  /** True if a counter decremented below 0 and printing must stop */
  stopPrint?: boolean;
  /** Reason description if printing was stopped */
  stopReason?: string;
  /** Missing CSV field names if validateCsv was enabled */
  missingFields?: string[];
}

export interface CounterEvaluation {
  text: string;
  stopPrint?: boolean;
  stopReason?: string;
}

/**
 * Evaluates a single counter expression inside {{#: ... }}
 *
 * Syntax:
 * - Prefix/Suffix: Any non-numeric characters surrounding the number (e.g. "SN-", "-A", "#", "№")
 * - Operator:
 *   - `+-` : Decrement (stops if < 0)
 *   - `+`  : Increment
 *   - none : Default increment +1
 * - Multi-plus fallback: e.g. `0000+5+7` uses step +5 and ignores `+7`
 * - WYSIWYG base: label index 0 prints the exact start value (e.g. `0000`, `001`, `100`, `15.0`)
 * - `#` character: treated as a normal literal text symbol (e.g. `{{#:###}}` -> `###1`, `###2`)
 */
export function evaluateCounter(expr: string, index: number): CounterEvaluation {
  const trimmed = expr.trim();
  if (!trimmed) {
    // Empty counter expression {{#:}} defaults to 1, 2, 3...
    return { text: String(1 + index) };
  }

  let left: string;
  let stepRaw: string;
  let isDecrement = false;

  // 1. Detect decrement (+-) vs increment (+)
  if (trimmed.includes("+-")) {
    const parts = trimmed.split("+-");
    left = parts[0];
    isDecrement = true;
    // Fallback for multiple pluses: take only the first token before any further '+'
    stepRaw = parts[1].split("+")[0].trim() || "1";
  } else if (trimmed.includes("+")) {
    const parts = trimmed.split("+");
    left = parts[0];
    isDecrement = false;
    // Fallback for multiple pluses: take parts[1] (first step), ignoring subsequent
    stepRaw = parts[1].trim() || "1";
  } else {
    left = trimmed;
    isDecrement = false;
    stepRaw = "1";
  }

  // 2. Parse left into [prefix, numberStr, suffix]
  // We match the last numeric group in left (supporting optional decimal . fraction)
  const match = left.match(/^([\s\S]*?)(?:(?<!\d))(\d+(?:\.\d+)?)(?!.*\d)([\s\S]*)$/);

  if (!match) {
    // No digits at all in left (e.g. "###" or "SN-")
    // Prefix is left, number starts at 1, suffix is empty
    const prefix = left;
    const stepInt = parseInt(stepRaw, 10) || 1;
    const currentInt = 1 + index * (isDecrement ? -stepInt : stepInt);

    if (currentInt < 0) {
      return {
        text: `${prefix}0`,
        stopPrint: true,
        stopReason: "Counter reached 0",
      };
    }

    return { text: `${prefix}${currentInt}` };
  }

  const prefix = match[1];
  const numberStr = match[2];
  const suffix = match[3];

  // 3. Decimal calculation vs Integer calculation
  if (numberStr.includes(".")) {
    const decParts = numberStr.split(".");
    const decimals = decParts[1].length;
    const multiplier = Math.pow(10, decimals);

    const startInt = Math.round(parseFloat(numberStr) * multiplier);
    const stepFloat = parseFloat(stepRaw);
    const stepInt = isNaN(stepFloat) ? 1 : Math.round(stepFloat * multiplier);
    const signedStep = isDecrement ? -stepInt : stepInt;

    const currentInt = startInt + index * signedStep;

    if (currentInt < 0) {
      return {
        text: `${prefix}${(0).toFixed(decimals)}${suffix}`,
        stopPrint: true,
        stopReason: "Counter reached 0",
      };
    }

    const currentVal = (currentInt / multiplier).toFixed(decimals);
    return { text: `${prefix}${currentVal}${suffix}` };
  }

  // Integer calculation
  // Leading zeros are preserved only if the starting number explicitly started with '0'
  const hasLeadingZero = numberStr.startsWith("0");
  const padding = hasLeadingZero ? numberStr.length : 1;
  const startInt = parseInt(numberStr, 10);
  const stepInt = parseInt(stepRaw, 10) || 1;
  const signedStep = isDecrement ? -stepInt : stepInt;

  const currentInt = startInt + index * signedStep;

  if (currentInt < 0) {
    return {
      text: `${prefix}${"0".padStart(padding, "0")}${suffix}`,
      stopPrint: true,
      stopReason: "Counter reached 0",
    };
  }

  const formattedNum = String(currentInt).padStart(padding, "0");
  return { text: `${prefix}${formattedNum}${suffix}` };
}

/**
 * Calculates the maximum number of prints possible before a decrement counter stops (< 0).
 * Returns null if the expression is not a countdown counter (i.e. does not have '+-').
 */
export function getMaxCountdownCopies(expr: string): number | null {
  const trimmed = expr.trim();
  if (!trimmed.includes("+-")) {
    return null;
  }

  const parts = trimmed.split("+-");
  const left = parts[0];
  const stepRaw = parts[1].split("+")[0].trim() || "1";

  const match = left.match(/^([\s\S]*?)(?:(?<!\d))(\d+(?:\.\d+)?)(?!.*\d)([\s\S]*)$/);

  if (!match) {
    const stepInt = parseInt(stepRaw, 10) || 1;
    if (stepInt <= 0) return null;
    return Math.floor(1 / stepInt) + 1;
  }

  const numberStr = match[2];

  if (numberStr.includes(".")) {
    const decParts = numberStr.split(".");
    const decimals = decParts[1].length;
    const multiplier = Math.pow(10, decimals);
    const startInt = Math.round(parseFloat(numberStr) * multiplier);
    const stepFloat = parseFloat(stepRaw);
    const stepInt = isNaN(stepFloat) ? 1 : Math.round(stepFloat * multiplier);
    if (stepInt <= 0) return null;
    return Math.max(1, Math.floor(startInt / stepInt) + 1);
  }

  const startInt = parseInt(numberStr, 10);
  const stepInt = parseInt(stepRaw, 10) || 1;
  if (stepInt <= 0) return null;
  return Math.max(1, Math.floor(startInt / stepInt) + 1);
}

/**
 * Replaces all {{#:...}} counters and {{Field}} variables in a template string.
 */
export function evaluateTemplate(template: string, context: EvaluationContext): EvaluationResult {
  if (!template || !template.includes("{{")) {
    return { text: template };
  }

  let stopPrint = false;
  let stopReason: string | undefined;
  const missingFields: string[] = [];

  const text = template.replace(/\{\{(.*?)\}\}/g, (_match, rawContent) => {
    const raw = rawContent.trim();

    // Check if it's a counter (starts with "#:")
    if (raw.startsWith("#:")) {
      const counterExpr = raw.slice(2);
      const evalResult = evaluateCounter(counterExpr, context.index);
      if (evalResult.stopPrint) {
        stopPrint = true;
        stopReason = evalResult.stopReason;
      }
      return evalResult.text;
    }

    // Otherwise it's a CSV field
    const fieldName = raw;
    if (context.csvRow && fieldName in context.csvRow) {
      return context.csvRow[fieldName] ?? "";
    }

    if (context.validateCsv) {
      missingFields.push(fieldName);
    }

    // Default to keeping the placeholder text when not populated
    return `{{${fieldName}}}`;
  });

  return {
    text,
    stopPrint: stopPrint || undefined,
    stopReason,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
  };
}

/**
 * Checks if a string contains dynamic placeholders: {{...}} or [[...]]
 */
export function hasDynamicTokens(text?: string): boolean {
  if (!text) return false;
  return /\{\{.*?\}\}/.test(text) || /\[\[.*?\]\]/.test(text);
}

/**
 * Checks if a string contains sequential batch tokens that change per label: {{...}}
 * Note: Date tokens [[...]] are static for a single print job, not batch sequences.
 */
export function hasBatchTokens(text?: string): boolean {
  if (!text) return false;
  return /\{\{.*?\}\}/.test(text);
}

/**
 * Extracts all counter expressions and CSV field names from a template string.
 */
export function extractPlaceholders(template?: string): { counters: string[]; fields: string[] } {
  const counters: string[] = [];
  const fields: string[] = [];
  if (!template) return { counters, fields };

  const matches = template.matchAll(/\{\{(.*?)\}\}/g);
  for (const match of matches) {
    const raw = match[1].trim();
    if (raw.startsWith("#:")) {
      counters.push(raw.slice(2));
    } else {
      fields.push(raw);
    }
  }

  return { counters, fields };
}
