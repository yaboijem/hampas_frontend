import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';
import * as adminApi from '../api/admin';
import * as notes from '../lib/adminNotifications';
import { pageOf } from './adminPaginated';

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
    vi.mocked(adminApi.listAdminRoleRequests).mockImplementation(async (params) => {
      const p = typeof params === 'string' ? {} : params;
      if (p?.role === 'coach') {
        return pageOf([], { total: 1, per_page: 1, last_page: 1 });
      }
      return pageOf([], { total: 0, per_page: 1, last_page: 1 });
    });
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(
      pageOf([], { total: 0, per_page: 1, last_page: 1 }),
    );

    const { result } = renderHook(() => useAdminPendingCounts(true));

    await waitFor(() => expect(result.current.counts.coach).toBe(1));
    expect(result.current.counts.total).toBe(1);
    expect(notes.showToast).not.toHaveBeenCalled();
  });

  test('toasts when refresh sees an increase', async () => {
    let organizerTotal = 0;
    vi.mocked(adminApi.listAdminRoleRequests).mockImplementation(async (params) => {
      const p = typeof params === 'string' ? {} : params;
      if (p?.role === 'organizer') {
        return pageOf([], { total: organizerTotal, per_page: 1, last_page: 1 });
      }
      return pageOf([], { total: 0, per_page: 1, last_page: 1 });
    });
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(
      pageOf([], { total: 0, per_page: 1, last_page: 1 }),
    );

    const { result } = renderHook(() => useAdminPendingCounts(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    organizerTotal = 1;
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
