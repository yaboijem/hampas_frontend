import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import App from '../App';
import ToastHost from '../components/ToastHost';
import { showToast } from '../lib/adminNotifications';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/storage';

const root = resolve(import.meta.dirname, '../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('safe-area foundation', () => {
  test('index.html viewport enables cover fit for insets', () => {
    const html = read('index.html');
    expect(html).toMatch(/viewport-fit\s*=\s*cover/);
    expect(html).toMatch(/width\s*=\s*device-width/);
  });

  test('offline.html viewport enables cover fit for insets', () => {
    const html = read('public/offline.html');
    expect(html).toMatch(/viewport-fit\s*=\s*cover/);
  });

  test('index.css defines required safe-area utilities', () => {
    const css = read('src/index.css');
    for (const name of [
      'pt-safe',
      'pb-safe',
      'px-safe',
      'pb-safe-max-3',
      'pb-safe-max-5',
      'p-safe-max-4',
      'px-header-safe',
      'px-main-safe',
      'top-safe-offset-4',
      'right-safe-offset-4',
      'bottom-safe-offset-4',
      'top-safe-below-header',
      'max-h-safe-notif',
    ]) {
      expect(css).toContain(`.${name}`);
    }
    expect(css).toContain('safe-area-inset-top');
    expect(css).toContain('safe-area-inset-bottom');
    expect(css).toContain('safe-area-inset-left');
    expect(css).toContain('safe-area-inset-right');
  });
});

describe('safe-area shell', () => {
  test('header and main use safe-area utilities', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: /main/i });
    const header = nav.closest('header');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/\bpt-safe\b/);
    expect(nav.className).toMatch(/\bpx-header-safe\b/);

    const main = document.querySelector('main');
    expect(main).toBeTruthy();
    expect(main!.className).toMatch(/\bpx-main-safe\b/);
    expect(main!.className).not.toMatch(/\bpx-4\b/);
    expect(main!.className).not.toMatch(/\bsm:px-6\b/);
  });
});

describe('safe-area floating chrome', () => {
  test('ToastHost offsets use safe-area utilities', () => {
    render(<ToastHost />);
    act(() => {
      showToast('Safe area toast');
    });
    const el = screen.getByRole('status');
    expect(el.className).toMatch(/\btop-safe-offset-4\b/);
    expect(el.className).toMatch(/\bright-safe-offset-4\b/);
    expect(el.className).not.toMatch(/\btop-4\b/);
    expect(el.className).not.toMatch(/\bright-4\b/);
  });

  test('EventDetail sticky CTA uses shared pb-safe-max-3', () => {
    const src = read('src/pages/Events/EventDetailPage.tsx');
    expect(src).toContain('pb-safe-max-3');
    expect(src).not.toMatch(/pb-\[max\(0\.75rem,\s*env\(safe-area-inset-bottom\)\)\]/);
  });

  test('InstallPrompt uses safe-area offset utilities', () => {
    const src = read('src/components/InstallPrompt.tsx');
    expect(src).toContain('bottom-safe-offset-4');
    expect(src).toContain('right-safe-offset-4');
  });
});

describe('safe-area overlays', () => {
  test('bottom-sheet style modals use p-safe-max-4 on scrim', () => {
    expect(read('src/components/DeleteEventModal.tsx')).toContain('p-safe-max-4');
    expect(read('src/pages/Applications/EventApplicationsPage.tsx')).toContain('p-safe-max-4');
    expect(read('src/components/ReportModal.tsx')).toContain('p-safe-max-4');
  });

  test('OnboardingGate pads chrome for safe areas', () => {
    const src = read('src/components/OnboardingGate.tsx');
    expect(src).toMatch(/pt-safe|p-safe-max-4/);
    expect(src).toMatch(/pb-safe|pb-safe-max-3|pb-safe-max-5|p-safe-max-4/);
  });

  test('NotificationsBell mobile panel accounts for header safe top', () => {
    const src = read('src/components/NotificationsBell.tsx');
    expect(src).toContain('top-safe-below-header');
    expect(src).toContain('max-h-safe-notif');
  });
});
