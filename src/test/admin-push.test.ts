import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../config', () => ({
  VAPID_PUBLIC_KEY: undefined,
  API_BASE_URL: '/api',
}));

vi.mock('../api/client', () => ({
  api: { post: vi.fn() },
}));

import { subscribeAdminPush } from '../push/adminPush';

describe('subscribeAdminPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns false without VAPID key', async () => {
    await expect(subscribeAdminPush()).resolves.toBe(false);
  });
});
