import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';
import AppHeader from '../components/AppHeader';
import * as adminApi from '../api/admin';
import * as notes from '../lib/adminNotifications';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { ThemeProvider } from '../theme/ThemeContext';
import { pageOf } from './adminPaginated';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
}));

vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn().mockResolvedValue({
    data: [],
    links: { first: null, last: null, prev: null, next: null },
    meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
  }),
  unreadNotificationCount: vi.fn().mockResolvedValue({ count: 0 }),
  markNotificationsRead: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      birth_date: '1990-01-01',
      gender: 'other' as const,
      is_admin: true,
    },
    loading: false,
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

describe('AppHeader admin badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAdminRoleRequests).mockImplementation(async (params) => {
      const p = typeof params === 'string' ? {} : params;
      if (p?.role === 'coach') {
        return pageOf([], { total: 1, per_page: 1 });
      }
      return pageOf([], { total: 0, per_page: 1 });
    });
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(
      pageOf([], { total: 1, per_page: 1 }),
    );
  });

  test('shows Admin link with total pending badge', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <NotificationsProvider>
            <AdminPendingCountsProvider>
              <AppHeader />
            </AdminPendingCountsProvider>
          </NotificationsProvider>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const links = await screen.findAllByRole('link', { name: /requests/i });
    expect(links.length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('link', { name: /role requests/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /event requests/i }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/2 pending/i).length).toBeGreaterThan(0);
    });
  });

  test('shows toast when logging out', async () => {
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <NotificationsProvider>
            <AdminPendingCountsProvider>
              <AppHeader />
            </AdminPendingCountsProvider>
          </NotificationsProvider>
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(screen.getAllByRole('button', { name: /log out/i })[0]);
    expect(toastSpy).toHaveBeenCalledWith("You've been logged\u00a0out.");
  });
});
