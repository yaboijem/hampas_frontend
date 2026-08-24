import axios from 'axios';

/** True if message looks like a raw HTTP/axios status dump (not user-facing). */
function looksLikeStatusLeak(message: string): boolean {
  return /status\s*code\s*\d+/i.test(message) || /\bHTTP\s*\d{3}\b/i.test(message);
}

function usableMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || looksLikeStatusLeak(trimmed)) return null;
  return trimmed;
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: unknown; errors?: Record<string, string[] | string> }
      | undefined;
    if (data?.errors && typeof data.errors === 'object') {
      for (const val of Object.values(data.errors)) {
        if (Array.isArray(val)) {
          const first = usableMessage(val[0]);
          if (first) return first;
        } else {
          const single = usableMessage(val);
          if (single) return single;
        }
      }
    }
    const bodyMessage = usableMessage(data?.message);
    if (bodyMessage) return bodyMessage;
    // Never surface axios default "Request failed with status code NNN"
    return fallback;
  }
  if (err instanceof Error) {
    const msg = usableMessage(err.message);
    if (msg) return msg;
  }
  return fallback;
}
