export interface IconSearchResult {
  icons: string[];
  total: number;
  collections: Record<
    string,
    {
      name: string;
      author?: { name: string };
      palette?: boolean;
    }
  >;
}

export interface CollectionDetails {
  prefix: string;
  title: string;
  total: number;
  categories: Record<string, string[]>;
  variants: string[];
  uncategorized: string[];
}

export interface PopularCollectionInfo {
  prefix: string;
  name: string;
  total: string;
}

export interface AllCollectionItem {
  prefix: string;
  name: string;
  total: number;
  category: string;
  sampleIcon?: string;
  palette?: boolean;
}

export const POPULAR_COLLECTIONS: PopularCollectionInfo[] = [
  { prefix: "lucide", name: "Lucide Icons", total: "1,780+" },
  { prefix: "tabler", name: "Tabler Icons", total: "6,100+" },
  { prefix: "material-symbols", name: "Material Symbols", total: "15,600+" },
  { prefix: "ph", name: "Phosphor Icons", total: "9,000+" },
  { prefix: "mdi", name: "Material Design Icons", total: "7,400+" },
  { prefix: "ri", name: "Remix Icon", total: "3,200+" },
  { prefix: "boxicons", name: "Boxicons", total: "3,700+" },
  { prefix: "fa7-solid", name: "Font Awesome", total: "2,000+" },
  { prefix: "solar", name: "Solar Icons", total: "7,600+" },
  { prefix: "bi", name: "Bootstrap Icons", total: "2,000+" },
];

const EXCLUDED_PREFIXES = new Set([
  "line-md",
  "svg-spinners",
  "twemoji",
  "noto",
  "emojione",
  "emojione-v1",
  "emojione-monotone",
  "fxemoji",
  "openmoji",
  "flat-color-icons",
  "logos",
  "vscode-icons",
  "skill-icons",
  "circle-flags",
  "flag",
  "flagpack",
  "cib",
]);

export async function searchIcons(
  query: string,
  prefix?: string,
  limit = 64
): Promise<IconSearchResult> {
  const searchTerm = query.trim();
  if (!searchTerm && !prefix) {
    return { icons: [], total: 0, collections: {} };
  }

  let url = `https://api.iconify.design/search?query=${encodeURIComponent(
    searchTerm || "a"
  )}&limit=${limit}`;

  if (prefix) {
    url += `&prefix=${encodeURIComponent(prefix)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch icons: ${res.statusText}`);
    }
    const data = await res.json();

    const icons: string[] = data.icons || [];
    const collections: Record<string, { name: string; palette?: boolean }> =
      data.collections || {};

    const filteredIcons = icons.filter((icon) => {
      const p = icon.split(":")[0];
      if (EXCLUDED_PREFIXES.has(p)) return false;
      if (collections[p] && collections[p].palette === true) return false;
      return true;
    });

    return {
      icons: filteredIcons,
      total: data.total || filteredIcons.length,
      collections,
    };
  } catch (err) {
    console.error("Iconify search error:", err);
    return { icons: [], total: 0, collections: {} };
  }
}

export async function fetchAllCollectionsGrouped(): Promise<{
  grouped: Record<string, AllCollectionItem[]>;
  collectionsMap: Record<string, AllCollectionItem>;
}> {
  try {
    const res = await fetch("https://api.iconify.design/collections");
    if (!res.ok) return { grouped: {}, collectionsMap: {} };
    const data = await res.json();

    const grouped: Record<string, AllCollectionItem[]> = {};
    const collectionsMap: Record<string, AllCollectionItem> = {};

    for (const [prefix, info] of Object.entries(data as Record<string, any>)) {
      if (EXCLUDED_PREFIXES.has(prefix) || info.palette === true) continue;

      const catName = info.category || "General";
      if (!grouped[catName]) grouped[catName] = [];

      const sample = info.samples?.[0]
        ? `${prefix}:${info.samples[0]}`
        : undefined;

      const item: AllCollectionItem = {
        prefix,
        name: info.name || prefix,
        total: info.total || 0,
        category: catName,
        sampleIcon: sample,
        palette: info.palette,
      };

      grouped[catName].push(item);
      collectionsMap[prefix] = item;
    }

    return { grouped, collectionsMap };
  } catch (err) {
    console.error("Error fetching all collections:", err);
    return { grouped: {}, collectionsMap: {} };
  }
}

function detectCollectionVariants(iconList: string[]): string[] {
  const suffixCounts: Record<string, number> = {};

  const knownSuffixes = [
    "outline-rounded",
    "outline-sharp",
    "outline",
    "rounded",
    "sharp",
    "filled",
    "fill",
    "duotone",
    "twotone",
    "bold",
    "light",
    "thin",
    "line",
    "solid",
    "regular",
  ];

  for (const icon of iconList) {
    const lower = icon.toLowerCase();
    for (const suf of knownSuffixes) {
      if (lower.endsWith(`-${suf}`) || lower.endsWith(`_${suf}`)) {
        const title = suf
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        suffixCounts[title] = (suffixCounts[title] || 0) + 1;
        break;
      }
    }
  }

  return Object.keys(suffixCounts).filter((k) => suffixCounts[k] >= 5);
}

export async function fetchCollectionDetails(
  prefix: string
): Promise<CollectionDetails | null> {
  try {
    const res = await fetch(
      `https://api.iconify.design/collection?prefix=${encodeURIComponent(prefix)}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    const categories: Record<string, string[]> = data.categories || {};
    const uncategorized: string[] = data.uncategorized || [];

    const allIconsInCollection = [
      ...Object.values(categories).flat(),
      ...uncategorized,
    ];

    const variants = detectCollectionVariants(allIconsInCollection);

    return {
      prefix: data.prefix,
      title: data.title || prefix,
      total: data.total || allIconsInCollection.length,
      categories,
      variants,
      uncategorized,
    };
  } catch (err) {
    console.error("Error fetching collection details:", err);
    return null;
  }
}

export async function fetchIconWithColorDataUrl(
  iconName: string,
  colorHex = "#000000"
): Promise<string> {
  const cleanName = iconName.includes(":")
    ? iconName.replace(":", "/")
    : iconName;

  const targetColor = colorHex || "#000000";
  const url = `https://api.iconify.design/${cleanName}.svg?color=${encodeURIComponent(targetColor)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch SVG for ${iconName}`);
  }

  let svgText = await res.text();

  // Ensure explicit 512x512 dimensions for browser naturalWidth calculation
  if (!svgText.includes('width=')) {
    svgText = svgText.replace('<svg', '<svg width="512" height="512"');
  } else {
    svgText = svgText
      .replace(/width="[^"]*"/i, 'width="512"')
      .replace(/height="[^"]*"/i, 'height="512"');
  }

  svgText = svgText
    .replace(/currentColor/gi, targetColor)
    .replace(/fill="none"/gi, 'fill="none"')
    .replace(/fill="(?!none)[^"]*"/gi, `fill="${targetColor}"`);

  if (!svgText.includes('fill=') && !svgText.includes('stroke=')) {
    svgText = svgText.replace('<svg', `<svg fill="${targetColor}"`);
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

export async function fetchIconAsBlackDataUrl(iconName: string): Promise<string> {
  return fetchIconWithColorDataUrl(iconName, "#000000");
}
