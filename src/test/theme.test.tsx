import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  cyclePreference,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  toggleResolvedTheme,
  writeStoredPreference,
} from '../theme/theme';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockMatchMedia(matches: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: matchMedia });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

test('isThemePreference accepts only light|dark|system', () => {
  expect(isThemePreference('light')).toBe(true);
  expect(isThemePreference('dark')).toBe(true);
  expect(isThemePreference('system')).toBe(true);
  expect(isThemePreference('nope')).toBe(false);
  expect(isThemePreference(null)).toBe(false);
});

test('readStoredPreference defaults to system and ignores junk', () => {
  expect(readStoredPreference(localStorage)).toBe('system');
  localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  expect(readStoredPreference(localStorage)).toBe('dark');
  localStorage.setItem(THEME_STORAGE_KEY, 'garbage');
  expect(readStoredPreference(localStorage)).toBe('system');
});

test('writeStoredPreference persists value', () => {
  writeStoredPreference('light', localStorage);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
});

test('resolveTheme maps preference and system', () => {
  expect(resolveTheme('light', true)).toBe('light');
  expect(resolveTheme('dark', false)).toBe('dark');
  expect(resolveTheme('system', true)).toBe('dark');
  expect(resolveTheme('system', false)).toBe('light');
});

test('cyclePreference order is system → light → dark → system', () => {
  expect(cyclePreference('system')).toBe('light');
  expect(cyclePreference('light')).toBe('dark');
  expect(cyclePreference('dark')).toBe('system');
});

test('toggleResolvedTheme flips light and dark in one step', () => {
  expect(toggleResolvedTheme('light')).toBe('dark');
  expect(toggleResolvedTheme('dark')).toBe('light');
});

test('applyResolvedTheme toggles html.dark', () => {
  applyResolvedTheme('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  applyResolvedTheme('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});

test('ThemeProvider defaults to system and applies resolved class', () => {
  mockMatchMedia(true);

  const { result } = renderHook(() => useTheme(), { wrapper });
  expect(result.current.preference).toBe('system');
  expect(result.current.resolvedTheme).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

test('toggleTheme flips resolved theme in one click', async () => {
  mockMatchMedia(false);

  function Probe() {
    const { resolvedTheme, toggleTheme } = useTheme();
    return (
      <button type="button" onClick={toggleTheme}>
        Resolved: {resolvedTheme}
      </button>
    );
  }

  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

  expect(screen.getByRole('button', { name: /resolved: light/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /resolved: light/i }));
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(screen.getByRole('button', { name: /resolved: dark/i })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /resolved: dark/i }));
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});
