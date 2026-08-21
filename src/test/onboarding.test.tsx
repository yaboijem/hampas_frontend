import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import OnboardingGate from '../components/OnboardingGate';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDone,
  writeOnboardingDone,
} from '../onboarding/storage';

function LocationPath() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('onboarding storage', () => {
  test('readOnboardingDone is false when missing or junk', () => {
    expect(readOnboardingDone(localStorage)).toBe(false);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'yes');
    expect(readOnboardingDone(localStorage)).toBe(false);
  });

  test('writeOnboardingDone persists and read returns true', () => {
    writeOnboardingDone(localStorage);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(readOnboardingDone(localStorage)).toBe(true);
  });
});

describe('onboarding slides', () => {
  test('defines policies slide only', () => {
    expect(ONBOARDING_SLIDES).toHaveLength(1);
    expect(ONBOARDING_SLIDES[0]).toMatchObject({
      kind: 'policies',
      title: 'Before you play',
      termsPath: '/terms',
      privacyPath: '/privacy',
    });
    const policies = ONBOARDING_SLIDES[0];
    if (policies.kind !== 'policies') throw new Error('expected policies slide');
    expect(policies.features.length).toBeGreaterThan(0);
    expect(policies.policies.length).toBeGreaterThan(0);
  });
});

function renderGate(initialPath = '/') {
  const router = createMemoryRouter(
    [{ path: '*', element: <OnboardingGate /> }],
    { initialEntries: [initialPath] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

async function advancePastLoading() {
  const img = screen.getByTestId('onboarding-loading-ball').querySelector('img');
  expect(img).toBeTruthy();
  fireEvent.load(img!);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

describe('OnboardingGate', () => {
  test('renders nothing when onboarding already done', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows loading with brand ball before policies', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderGate();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('onboarding-loading-ball')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /before you play/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
  });

  test('reveals policies after min load once favicon settles', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderGate();
    await advancePastLoading();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('heading', { name: /before you play/i })).toBeInTheDocument();
    expect(screen.getByText(/important notice/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next slide/i })).not.toBeInTheDocument();
  });

  test('Get Started persists flag and dismisses overlay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGate();
    await advancePastLoading();
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Get Started navigates to /events not /login', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <>
              <LocationPath />
              <OnboardingGate />
            </>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );
    render(<RouterProvider router={router} />);
    await advancePastLoading();
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(router.state.location.pathname).toBe('/events');
    expect(screen.getByTestId('path')).toHaveTextContent('/events');
  });
});
