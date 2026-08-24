import axios from 'axios';

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: unknown; errors?: Record<string, string[] | string> }
      | undefined;
    if (data?.errors && typeof data.errors === 'object') {
      for (const val of Object.values(data.errors)) {
        if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
        if (typeof val === 'string' && val.trim()) return val;
      }
    }
    if (data && typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
