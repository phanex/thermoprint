// Google Web Fonts and System Fonts manager for Thermoprint

export interface FontOption {
  value: string;
  label: string;
  category: "Sans-Serif" | "Serif" | "Monospace" | "Display & Decor" | "System Fonts";
}

export interface FontGroup {
  label: string;
  options: FontOption[];
}

export function getPrimaryFontFamily(fontFamily?: string): string {
  if (!fontFamily || fontFamily === "Inter") return "Inter";
  if (fontFamily === "JetBrains Mono") return "JetBrains Mono Variable";
  if (fontFamily === "Nunito") return "Nunito Variable";
  return fontFamily;
}

export function getFontFamilyStack(fontFamily?: string): string {
  if (fontFamily === "JetBrains Mono") {
    return '"JetBrains Mono Variable", "JetBrains Mono", monospace';
  }
  if (fontFamily === "Nunito") {
    return '"Nunito Variable", "Nunito", sans-serif';
  }
  if (fontFamily === "Anonymous Pro" || fontFamily === "LXGW WenKai Mono TC") {
    return `"${fontFamily}", monospace`;
  }
  return `"${fontFamily || "Inter"}", sans-serif`;
}

export function preloadFontVariants(family?: string): void {
  if (typeof document === "undefined" || !document.fonts) return;
  const primary = getPrimaryFontFamily(family);
  const variants = [
    `normal 400 16px "${primary}"`,
    `normal 700 16px "${primary}"`,
    `italic 400 16px "${primary}"`,
    `italic 700 16px "${primary}"`,
  ];
  for (const spec of variants) {
    try {
      if (!document.fonts.check(spec)) {
        document.fonts.load(spec).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

export interface FontCapabilities {
  bold: boolean;
  italic: boolean;
}

export const FONT_CAPABILITIES: Record<string, FontCapabilities> = {
  "Inter": { bold: true, italic: true },
  "Roboto": { bold: true, italic: true },
  "Nunito": { bold: true, italic: true },
  "Roboto Condensed": { bold: true, italic: true },
  "Montserrat": { bold: true, italic: true },
  "Rubik": { bold: true, italic: true },
  "Cuprum": { bold: true, italic: true },
  "Merriweather": { bold: true, italic: true },
  "Anonymous Pro": { bold: true, italic: true },
  "JetBrains Mono": { bold: true, italic: true },
  "Georgia": { bold: true, italic: true },
  "Roboto Slab": { bold: true, italic: false },
  "Oswald": { bold: true, italic: false },
  "Unbounded": { bold: true, italic: false },
  "Yanone Kaffeesatz": { bold: true, italic: false },
  "LXGW WenKai Mono TC": { bold: true, italic: false },
  "Caveat": { bold: true, italic: false },
  "Neucha": { bold: false, italic: false },
  "Days One": { bold: false, italic: false },
  "Pacifico": { bold: false, italic: false },
  "Lobster": { bold: false, italic: false },
};

export function getFontCapabilities(fontFamily?: string): FontCapabilities {
  if (!fontFamily) return { bold: true, italic: true };
  if (FONT_CAPABILITIES[fontFamily]) return FONT_CAPABILITIES[fontFamily];
  // System fonts or user custom fonts default to allowing bold & italic
  return { bold: true, italic: true };
}

export async function ensureFontLoaded(
  family: string,
  weight: number = 400,
  italic: boolean = false
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const primary = getPrimaryFontFamily(family);
  const w = weight >= 600 ? "700" : "400";
  const s = italic ? "italic" : "normal";
  const spec = `${s} ${w} 16px "${primary}"`;
  try {
    if (document.fonts.check(spec)) return;
    await document.fonts.load(spec);
  } catch {
    // ignore
  }
}

export const BUILT_IN_FONTS: FontOption[] = [
  // Sans-Serif
  { value: "Inter", label: "Inter", category: "Sans-Serif" },
  { value: "Roboto", label: "Roboto", category: "Sans-Serif" },
  { value: "Nunito", label: "Nunito", category: "Sans-Serif" },
  { value: "Roboto Condensed", label: "Roboto Condensed", category: "Sans-Serif" },
  { value: "Montserrat", label: "Montserrat", category: "Sans-Serif" },
  { value: "Oswald", label: "Oswald", category: "Sans-Serif" },
  { value: "Rubik", label: "Rubik", category: "Sans-Serif" },
  { value: "Unbounded", label: "Unbounded", category: "Sans-Serif" },
  { value: "Yanone Kaffeesatz", label: "Yanone Kaffeesatz", category: "Sans-Serif" },
  { value: "Cuprum", label: "Cuprum", category: "Sans-Serif" },

  // Serif
  { value: "Roboto Slab", label: "Roboto Slab", category: "Serif" },
  { value: "Georgia", label: "Georgia", category: "Serif" },
  { value: "Merriweather", label: "Merriweather", category: "Serif" },

  // Monospace
  { value: "JetBrains Mono", label: "JetBrains Mono", category: "Monospace" },
  { value: "Anonymous Pro", label: "Anonymous Pro", category: "Monospace" },
  { value: "LXGW WenKai Mono TC", label: "LXGW WenKai Mono", category: "Monospace" },

  // Display & Decor
  { value: "Days One", label: "Days One", category: "Display & Decor" },
  { value: "Neucha", label: "Neucha", category: "Display & Decor" },
  { value: "Caveat", label: "Caveat", category: "Display & Decor" },
  { value: "Pacifico", label: "Pacifico", category: "Display & Decor" },
  { value: "Lobster", label: "Lobster", category: "Display & Decor" },
];

// Clear any legacy auto-load flag from previous runs
try {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("tp.systemFontsEnabled");
  }
} catch {
  /* noop */
}

export function isLocalFontAccessSupported(): boolean {
  return typeof window !== "undefined" && "queryLocalFonts" in window;
}

let _cachedSystemFonts: string[] = [];

export function getCachedSystemFonts(): string[] {
  return _cachedSystemFonts;
}

export async function fetchSystemFonts(force = false): Promise<string[]> {
  if (!force && _cachedSystemFonts.length > 0) return _cachedSystemFonts;
  if (!isLocalFontAccessSupported()) return [];
  try {
    const fonts = await (window as any).queryLocalFonts();
    const set = new Set<string>();
    for (const f of fonts) {
      if (f.family && !f.family.startsWith("@")) {
        set.add(f.family);
      }
    }
    const result = Array.from(set).sort((a, b) => a.localeCompare(b));
    _cachedSystemFonts = result;
    return result;
  } catch (err) {
    console.warn("Failed to query local fonts:", err);
    return [];
  }
}

export function groupFonts(systemFonts: string[] = []): FontGroup[] {
  const groups: Record<string, FontOption[]> = {
    "Sans-Serif": [],
    "Serif": [],
    "Monospace": [],
    "Display & Decor": [],
  };

  for (const font of BUILT_IN_FONTS) {
    if (groups[font.category]) {
      groups[font.category].push(font);
    }
  }

  const result: FontGroup[] = Object.entries(groups).map(([label, options]) => ({
    label,
    options,
  }));

  if (systemFonts.length > 0) {
    result.push({
      label: `System Fonts (${systemFonts.length})`,
      options: systemFonts.map((fam) => ({
        value: fam,
        label: fam,
        category: "System Fonts",
      })),
    });
  }

  return result;
}
