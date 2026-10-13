// URL helpers shared by the item and thawed screens.

/**
 * A safe external link for an "open" button: http(s) URLs as-is, a bare domain gets https://,
 * anything else (javascript:, mailto:, garbage) is null.
 */
export function openableUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^\s/?#]*[a-z\d]/i.test(trimmed)) return trimmed;
  if (/^[a-z\d-]+(\.[a-z\d-]+)+(?::\d+)?([/?#]\S*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
