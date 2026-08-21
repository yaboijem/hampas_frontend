import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await user.click(screen.getByRole('button', { name: /open menu/i }));

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /users management/i })).toBeInTheDocument();
    });

    const usersLink = screen.getByRole('menuitem', { name: /users management/i });
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('menuitem', { name: /requests/i })).toBeInTheDocument();
  });
});
