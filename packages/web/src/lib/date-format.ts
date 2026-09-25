/**
 * Date/Time token evaluation with Intl.DateTimeFormat.
 * Zero hardcoded translations — browser Intl locale drives everything.
 *
 * Syntax:
 * - Basic: [[DD.MM.YYYY]], [[HH:mm]], [[DD.MM.YYYY HH:mm]]
 * - With locale: [[uk:DD MMMM YYYY]], [[en:dddd, MMMM DD]]
 * - Offsets: [[DD.MM.YYYY +7]] (default days), [[HH:mm +45m]], [[DD.MM.YYYY +6M]], [[DD.MM.YYYY +1y]]
 * - Embedded offsets: [[DD+7.MM.YYYY]]
 */

export const DATE_PRESETS = [
  { label: "Date", token: "[[DD.MM.YYYY]]" },
  { label: "Time", token: "[[HH:mm]]" },
  { label: "Date & Time", token: "[[DD.MM.YYYY HH:mm]]" },
  { label: "Month & Year", token: "[[MMMM YYYY]]" },
];

/** Format template strings for legacy presets */
export const PRESET_FORMATS: Record<string, string> = {
  date: "DD.MM.YYYY",
  time: "HH:mm",
  datetime: "DD.MM.YYYY HH:mm",
  month_year: "MMMM YYYY",
};

export const DATE_PRESET_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & Time" },
  { value: "month_year", label: "Month & Year" },
  { value: "custom", label: "Custom" },
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Safely format locale-dependent tokens without crashing on invalid locale strings.
 */
function formatLocaleToken(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
  date: Date,
): string {
  const primary = locale && locale !== "auto" && locale.trim() ? locale.trim() : (navigator?.language ?? "en");
  try {
    return new Intl.DateTimeFormat(primary, options).format(date);
  } catch {
    const fallback = navigator?.language ?? "en";
    try {
      return new Intl.DateTimeFormat(fallback, options).format(date);
    } catch {
      return new Intl.DateTimeFormat("en", options).format(date);
    }
  }
}

type OffsetUnit = "day" | "month" | "year" | "hour" | "minute" | "second";

function applyUnitOffset(date: Date, value: number, unit: OffsetUnit): void {
  switch (unit) {
    case "day": date.setDate(date.getDate() + value); break;
    case "month": date.setMonth(date.getMonth() + value); break;
    case "year": date.setFullYear(date.getFullYear() + value); break;
    case "hour": date.setHours(date.getHours() + value); break;
    case "minute": date.setMinutes(date.getMinutes() + value); break;
    case "second": date.setSeconds(date.getSeconds() + value); break;
  }
}

/**
 * Parses suffix offsets like "+7d", "+1m", "+1y", "+12h", "+30min", or compound "+7d +12h".
 * Returns shifted date and template with all suffix offsets stripped.
 */
function parseSuffixOffset(template: string, base: Date): { template: string; date: Date } {
  const d = new Date(base);
  let cur = template.trim();
  const suffixRegex = /(?:^|\s+)([+-]\d+)([a-zA-Z]*)\s*$/;
  let match: RegExpExecArray | null;

  while ((match = suffixRegex.exec(cur)) !== null) {
    const amount = parseInt(match[1], 10);
    if (isNaN(amount)) break;

    const rawUnit = (match[2] || "").trim();
    let unit: OffsetUnit = "day";
    if (rawUnit === "h" || rawUnit === "hr") unit = "hour";
    else if (rawUnit === "min") unit = "minute";
    else if (rawUnit === "s" || rawUnit === "sec") unit = "second";
    else if (rawUnit === "m" || rawUnit === "mo" || rawUnit === "M") unit = "month";
    else if (rawUnit === "y" || rawUnit === "yr") unit = "year";
    else if (rawUnit === "d" || rawUnit === "day") unit = "day";
    else if (!rawUnit) {
      unit = "day";
    }

    applyUnitOffset(d, amount, unit);
    cur = cur.slice(0, match.index).trim();
  }

  return { template: cur, date: d };
}

/**
 * Scan template for token-embedded offsets like DD+7, MM+1, YYYY+1, HH+2, mm+30.
 * Strips them and returns cumulative shifted date.
 */
function parseEmbeddedOffsets(template: string, base: Date): { template: string; date: Date } {
  const d = new Date(base);
  const offsetRegex = /(?:MMMM|MMM|dddd|ddd|YYYY|YY|DD|MM|HH|hh|mm|ss)([+-]\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = offsetRegex.exec(template)) !== null) {
    const token = match[0].replace(match[1], "");
    const offset = parseInt(match[1], 10);
    if (isNaN(offset)) continue;

    let unit: OffsetUnit = "day";
    if (token === "YYYY" || token === "YY") unit = "year";
    else if (token === "MMMM" || token === "MMM" || token === "MM") unit = "month";
    else if (token === "DD" || token === "dddd" || token === "ddd") unit = "day";
    else if (token === "HH" || token === "hh") unit = "hour";
    else if (token === "mm") unit = "minute";
    else if (token === "ss") unit = "second";

    applyUnitOffset(d, offset, unit);
  }

  // Strip embedded offsets from tokens
  const stripped = template.replace(
    /(MMMM|MMM|dddd|ddd|YYYY|YY|DD|MM|HH|hh|mm|ss)[+-]\d+/g,
    "$1",
  );

  return { template: stripped, date: d };
}

/**
 * Evaluates a single format template string into a formatted date/time.
 */
export function evaluateFormatTemplate(
  template: string,
  date: Date = new Date(),
  locale?: string,
): string {
  // 1. Check for locale prefix e.g. "uk:DD MMMM" or "en:dddd"
  // Must be 2-3 lowercase letters followed by colon
  let activeLocale = locale;
  let cleanTemplate = template.trim();
  const localeMatch = /^([a-z]{2,3}(?:-[A-Za-z0-9]+)?):(.*)$/.exec(cleanTemplate);
  if (localeMatch && !/^(hh|mm|ss)$/i.test(localeMatch[1])) {
    activeLocale = localeMatch[1];
    cleanTemplate = localeMatch[2].trim();
  }

  // 2. Parse suffix offset e.g. "DD.MM.YYYY +7" or "HH:mm +45m"
  const suffixRes = parseSuffixOffset(cleanTemplate, date);
  cleanTemplate = suffixRes.template;
  let shiftedDate = suffixRes.date;

  // 3. Parse embedded token offsets e.g. "DD+7.MM.YYYY"
  const embeddedRes = parseEmbeddedOffsets(cleanTemplate, shiftedDate);
  cleanTemplate = embeddedRes.template;
  shiftedDate = embeddedRes.date;

  // 4. Verify that template contains at least one recognized date token
  const hasTokens = /(MMMM|MMM|dddd|ddd|YYYY|YY|DD|MM|HH|hh|mm|ss|[Aa])/.test(cleanTemplate);
  if (!hasTokens) {
    // Not a date template — return original content
    return template;
  }

  // 5. Replace tokens (longest first to prevent collision)
  let result = cleanTemplate;
  result = result.replace(/MMMM/g, formatLocaleToken(activeLocale, { month: "long" }, shiftedDate));
  result = result.replace(/MMM/g, formatLocaleToken(activeLocale, { month: "short" }, shiftedDate));
  result = result.replace(/dddd/g, formatLocaleToken(activeLocale, { weekday: "long" }, shiftedDate));
  result = result.replace(/ddd/g, formatLocaleToken(activeLocale, { weekday: "short" }, shiftedDate));
  result = result.replace(/YYYY/g, `${shiftedDate.getFullYear()}`);
  result = result.replace(/YY/g, `${shiftedDate.getFullYear()}`.slice(-2));
  result = result.replace(/DD/g, pad(shiftedDate.getDate()));
  result = result.replace(/MM/g, pad(shiftedDate.getMonth() + 1));
  result = result.replace(/HH/g, pad(shiftedDate.getHours()));
  const h12 = shiftedDate.getHours() % 12 || 12;
  result = result.replace(/hh/g, pad(h12));
  result = result.replace(/mm/g, pad(shiftedDate.getMinutes()));
  result = result.replace(/ss/g, pad(shiftedDate.getSeconds()));
  result = result.replace(/\bA\b/g, shiftedDate.getHours() >= 12 ? "PM" : "AM");
  result = result.replace(/\ba\b/g, shiftedDate.getHours() >= 12 ? "pm" : "am");

  return result;
}

/**
 * Replace all [[ ... ]] expressions in text with evaluated dates.
 * Preserves bracketed tokens like [[unknown]] if they don't contain date formats.
 */
export function evaluateInstantExpressions(
  text: string,
  date: Date = new Date(),
  fallbackLocale?: string,
): string {
  if (!text) return text;

  return text.replace(/\[\[(.*?)\]\]/g, (match, expr) => {
    try {
      const evaluated = evaluateFormatTemplate(expr, date, fallbackLocale);
      // If no tokens matched and format template returned the exact expression, keep brackets
      if (evaluated === expr.trim()) {
        return match;
      }
      return evaluated;
    } catch {
      return match;
    }
  });
}

/**
 * Get display text for canvas / render.
 * Works seamlessly with both legacy datePreset elements and modern inline [[...]] tokens.
 */
export function getDisplayText(
  text: string,
  datePreset?: string,
  dateLocale?: string,
): string {
  if (!text) return text;

  // Legacy preset support
  if (datePreset) {
    try {
      return evaluateFormatTemplate(text, new Date(), dateLocale);
    } catch {
      return text;
    }
  }

  // Modern inline evaluation
  return evaluateInstantExpressions(text, new Date(), dateLocale);
}

