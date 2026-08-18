import { beforeEach, describe, expect, test } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDone,
  writeOnboardingDone,
} from '../onboarding/storage';
import { ONBOARDING_SLIDES } from '../onboarding/slides';

beforeEach(() => {
  localStorage.clear();
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
