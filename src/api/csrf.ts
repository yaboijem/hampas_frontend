import axios from 'axios';
import { API_BASE_URL } from '../config';

/** Origin for Sanctum routes (strip trailing /api). */
export function apiOrigin(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  if (base === '/api' || base.endsWith('/api')) {
    const stripped = base.slice(0, -4);
    return stripped || '';
  }
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return '';
  }
}

export async function ensureCsrfCookie(): Promise<void> {
  const origin = apiOrigin();
  await axios.get(`${origin}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}
