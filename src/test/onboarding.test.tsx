import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import OnboardingGate from '../components/OnboardingGate';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDone,
  writeOnboardingDone,
} from '../onboarding/storage';

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
  test('defines three image themes then policies', () => {
    expect(ONBOARDING_SLIDES).toHaveLength(4);
    expect(ONBOARDING_SLIDES[0]).toMatchObject({
      kind: 'image',
      imageSrc: '/courtwball.jpg',
      title: 'Discover and Play',
    });
    expect(ONBOARDING_SLIDES[1]).toMatchObject({
      kind: 'image',
      imageSrc: '/friendship.jpg',
      title: 'Find Friendship',
    });
    expect(ONBOARDING_SLIDES[2]).toMatchObject({
      kind: 'image',
      imageSrc: '/enjoy.jpg',
      title: 'Enjoy and have fun',
    });
    expect(ONBOARDING_SLIDES[3]).toMatchObject({
      kind: 'policies',
      title: 'Before you play',
      termsPath: '/terms',
      privacyPath: '/privacy',
    });
    const policies = ONBOARDING_SLIDES[3];
    if (policies.kind !== 'policies') throw new Error('expected policies slide');
    expect(policies.features.length).toBeGreaterThan(0);
    expect(policies.policies.length).toBeGreaterThan(0);
  });
});

function renderGate(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OnboardingGate />
    </MemoryRouter>,
  );
}

describe('OnboardingGate', () => {
  test('shows first slide with welcome and discover title', () => {
    renderGate();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/welcome to hampas app/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /discover and play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next slide/i })).toBeInTheDocument();
  });

  test('renders nothing when onboarding already done', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Next advances to the next slide', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /next slide/i }));
    expect(screen.getByRole('heading', { name: /find friendship/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/welcome to hampas app/i)).not.toBeInTheDocument();
  });

  test('Prev returns to the previous slide', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /next slide/i }));
    await user.click(screen.getByRole('button', { name: /previous slide/i }));
    expect(screen.getByRole('heading', { name: /discover and play/i })).toBeInTheDocument();
  });

  test('Skip jumps to policies slide', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(screen.getByRole('heading', { name: /before you play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  test('Get Started persists flag and dismisses overlay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGate();
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await vi.advanceTimersByTimeAsync(500);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
