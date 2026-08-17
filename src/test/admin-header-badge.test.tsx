import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';
import AppHeader from '../components/AppHeader';
import * as adminApi from '../api/admin';
import { ThemeProvider } from '../theme/ThemeContext';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
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
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([
      {
        id: 11,
        title: 'E',
        description: '',
        event_type: 'open_play',
        skill_level: 'all_levels',
        barangay: null,
        city: 'X',
        starts_at: '2026-09-01T18:00:00+08:00',
        photo_url: null,
        visibility: 'pending_review',
        is_owner: false,
        my_application: null,
        created_by: { id: 3, name: 'C' },
      },
    ]);
  });

  test('shows Admin link with total pending badge', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AdminPendingCountsProvider>
            <AppHeader />
          </AdminPendingCountsProvider>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const links = await screen.findAllByRole('link', { name: /admin/i });
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
});
