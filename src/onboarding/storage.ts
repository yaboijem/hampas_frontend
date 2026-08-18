export const ONBOARDING_STORAGE_KEY = 'hampas-onboarding-done';

export function readOnboardingDone(storage?: Storage | null): boolean {
  try {
    return (storage ?? localStorage).getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingDone(storage?: Storage | null): void {
  try {
    (storage ?? localStorage).setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // private mode / quota — ignore
  }
}
