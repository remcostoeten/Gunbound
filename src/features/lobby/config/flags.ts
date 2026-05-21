const AVAILABLE_FLAGS = new Set([
  "ae", "ar", "au", "br", "ca", "cl", "cn", "co", "cz", "de",
  "dk", "eg", "es", "fi", "fr", "gb", "gr", "hu", "id", "it",
  "jp", "kr", "mx", "my", "nl", "no", "pe", "ph", "pl", "pt",
  "ro", "ru", "sa", "se", "th", "tr", "tw", "us", "ve", "vn",
  "za"
]);

// ISO 3166-1 alpha-2 → flag SVG slug. The asset folder uses lower-case
// country codes and treats GB as the canonical "UK" sprite.
const ISO_TO_FLAG_OVERRIDES: Record<string, string> = {
  uk: "gb"
};

export function resolveFlagAsset(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim().toLowerCase();
  if (trimmed.length !== 2) return null;
  const slug = ISO_TO_FLAG_OVERRIDES[trimmed] ?? trimmed;
  if (!AVAILABLE_FLAGS.has(slug)) return null;
  return `/flags/${slug}.svg`;
}
