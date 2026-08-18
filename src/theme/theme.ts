export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hampas-theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredPreference(storage?: Storage | null): ThemePreference {
  try {
    const raw = (storage ?? localStorage).getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function writeStoredPreference(
  preference: ThemePreference,
  storage?: Storage | null,
): void {
  try {
    (storage ?? localStorage).setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // private mode / quota — ignore
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemDark ? 'dark' : 'light';
}

export function cyclePreference(current: ThemePreference): ThemePreference {
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}

/** One-click flip: light ↔ dark (ignores system middle step). */
export function toggleResolvedTheme(resolved: ResolvedTheme): ThemePreference {
  return resolved === 'dark' ? 'light' : 'dark';
}

export function applyResolvedTheme(
  resolved: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle('dark', resolved === 'dark');
}

export function getSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
