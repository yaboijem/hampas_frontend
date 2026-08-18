import { beforeEach, describe, expect, test } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDone,
  writeOnboardingDone,
} from '../onboarding/storage';

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
