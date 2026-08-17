export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

export const VAPID_PUBLIC_KEY: string | undefined =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined;
