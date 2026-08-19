import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';
import * as adminApi from '../api/admin';
import AppHeader from '../components/AppHeader';
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

describe('AppHeader Users nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue(
      pageOf([], { total: 0, per_page: 1 }),
    );
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(
      pageOf([], { total: 0, per_page: 1 }),
    );
  });

  test('shows Users link for admin', async () => {
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

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /^users$/i }).length).toBeGreaterThan(0);
    });

    const usersLinks = screen.getAllByRole('link', { name: /^users$/i });
    expect(usersLinks[0]).toHaveAttribute('href', '/admin/users');
    expect(screen.getAllByRole('link', { name: /admin/i }).length).toBeGreaterThan(0);
  });
});
