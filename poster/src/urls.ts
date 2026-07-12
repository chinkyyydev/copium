/**
 * Detects text that X would auto-link as a URL. Any URL in a post bumps X's
 * pay-per-post price from $0.015 to $0.20 (13×), so we flag these before
 * publishing and let a human decide. Matches http(s):// and www. links, plus
 * bare domains ending in a common TLD (which X also auto-links).
 */
const URL_RE =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|gg|ai|co|app|dev|xyz|me|tv|info|biz|social|link|click|to|ly|sh|so|wtf)\b/i;

export function containsUrl(text: string): boolean {
  return URL_RE.test(text);
}
