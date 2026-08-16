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

test('cyclePreference updates storage and class', async () => {
  mockMatchMedia(false);

  function Probe() {
    const { preference, cyclePreference: cycle } = useTheme();
    return (
      <button type="button" onClick={cycle}>
        Theme: {preference[0].toUpperCase() + preference.slice(1)}
      </button>
    );
  }

  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

  const button = screen.getByRole('button', { name: /theme: system/i });
  await user.click(button);
  expect(screen.getByRole('button', { name: /theme: light/i })).toBeInTheDocument();
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);

  await user.click(screen.getByRole('button', { name: /theme: light/i }));
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});
