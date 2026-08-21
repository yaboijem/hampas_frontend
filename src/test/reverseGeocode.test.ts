import { afterEach, describe, expect, test, vi } from 'vitest';
import { reverseGeocode } from '../lib/reverseGeocode';

describe('reverseGeocode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns display_name on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ display_name: 'Malabanias, Angeles City, Pampanga, Philippines' }),
      }),
    );

    await expect(reverseGeocode(15.145, 120.588)).resolves.toBe(
      'Malabanias, Angeles City, Pampanga, Philippines',
    );
  });

  test('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(reverseGeocode(15.145, 120.588)).resolves.toBeNull();
  });

  test('returns null when ok is false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(reverseGeocode(15.145, 120.588)).resolves.toBeNull();
  });
});
