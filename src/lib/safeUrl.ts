/** Allow only http(s) absolute URLs for user-supplied links (blocks javascript:, data:, etc.). */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Same-origin path for push navigation (must start with single /). */
export function safeAppPath(raw: string | null | undefined, fallback = '/'): string {
  if (raw == null || typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('://')) return fallback;
  return value;
}
