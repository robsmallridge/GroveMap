export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * GroveMap treemap data palette — "muted categorical".
 * All hues sit at roughly L 0.77 / C 0.12 so no single folder reads
 * louder than its size warrants. Green-weighted, on-brand.
 */
const COLORS = [
  "oklch(0.78 0.13 150)",
  "oklch(0.76 0.13 168)",
  "oklch(0.75 0.12 188)",
  "oklch(0.78 0.12 120)",
  "oklch(0.80 0.12 95)",
  "oklch(0.80 0.12 70)",
  "oklch(0.74 0.11 250)",
  "oklch(0.72 0.12 300)",
];

export function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}
