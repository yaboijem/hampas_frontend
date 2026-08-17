import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';
import * as adminApi from '../api/admin';
import * as notes from '../lib/adminNotifications';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
}));

describe('useAdminPendingCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(notes, 'showToast').mockImplementation(() => {});
  });

  test('loads counts when enabled and does not toast on first fetch', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 1,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'A', email: 'a@b.c' },
      },
    ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([]);

    const { result } = renderHook(() => useAdminPendingCounts(true));

    await waitFor(() => expect(result.current.counts.coach).toBe(1));
    expect(result.current.counts.total).toBe(1);
    expect(notes.showToast).not.toHaveBeenCalled();
  });

  test('toasts when refresh sees an increase', async () => {
    vi.mocked(adminApi.listAdminRoleRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 2,
          role: 'organizer',
          status: 'pending',
          note: null,
          created_at: '2026-08-17T00:00:00Z',
          user: { id: 2, name: 'B', email: 'b@b.c' },
        },
      ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([]);

    const { result } = renderHook(() => useAdminPendingCounts(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(notes.showToast).toHaveBeenCalledWith('1 new organizer request');
    expect(result.current.counts.organizer).toBe(1);
  });

  test('does not fetch when disabled', async () => {
    renderHook(() => useAdminPendingCounts(false));
    expect(adminApi.listAdminRoleRequests).not.toHaveBeenCalled();
  });
});
