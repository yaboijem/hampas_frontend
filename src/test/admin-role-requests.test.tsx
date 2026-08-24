import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RoleRequestsPanel from '../pages/Admin/RoleRequestsPanel';
import * as adminApi from '../api/admin';
import { pageOf } from './adminPaginated';

vi.mock('../api/admin', () => ({
  ADMIN_PAGE_SIZE: 10,
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  isEmailVerified: (user: { is_admin?: boolean; email_verified_at?: string | null } | null) => Boolean(user?.is_admin || user?.email_verified_at),
  useAuth: () => ({
    user: {
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      birth_date: '1990-01-01',
      gender: 'other' as const,
      is_admin: true, email_verified_at: '2020-01-01',
    },
    loading: false,
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

describe('RoleRequestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending requests and approves one', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue(
      pageOf([
        {
          id: 7,
          role: 'organizer',
          status: 'pending',
          note: 'I run Angeles courts',
          created_at: '2026-08-17T00:00:00Z',
          user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
        },
      ]),
    );
    vi.mocked(adminApi.approveRoleRequest).mockResolvedValue({
      id: 7,
      role: 'organizer',
      status: 'approved',
      note: 'I run Angeles courts',
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoleRequestsPanel role="organizer" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Jem Player')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /jem player/i }));
    expect(await screen.findByText('Requested')).toBeInTheDocument();
    expect(screen.getByText(/no note provided|i run angeles courts/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(adminApi.approveRoleRequest).toHaveBeenCalledWith(7));
  });

  test('rejects a request', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue(
      pageOf([
        {
          id: 8,
          role: 'coach',
          status: 'pending',
          note: null,
          created_at: '2026-08-17T00:00:00Z',
          user: { id: 2, name: 'Sam', email: 'sam@example.com' },
        },
      ]),
    );
    vi.mocked(adminApi.rejectRoleRequest).mockResolvedValue({
      id: 8,
      role: 'coach',
      status: 'rejected',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 2, name: 'Sam', email: 'sam@example.com' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoleRequestsPanel role="coach" />
      </MemoryRouter>,
    );

    await screen.findByText('Sam');
    await user.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => expect(adminApi.rejectRoleRequest).toHaveBeenCalledWith(8));
  });

  test('loads with role filter and paginates', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockImplementation(async (params) => {
      const p = typeof params === 'string' ? { status: params } : params;
      if (p && typeof p === 'object' && p.page === 2) {
        return pageOf(
          [
            {
              id: 20,
              role: 'coach',
              status: 'pending',
              note: null,
              created_at: '2026-08-17T00:00:00Z',
              user: { id: 20, name: 'Page Two', email: 'p2@e.com' },
            },
          ],
          { current_page: 2, last_page: 2, total: 11, per_page: 10 },
        );
      }
      return pageOf(
        [
          {
            id: 1,
            role: 'coach',
            status: 'pending',
            note: null,
            created_at: '2026-08-17T00:00:00Z',
            user: { id: 1, name: 'Coach Only', email: 'c@e.com' },
          },
        ],
        { current_page: 1, last_page: 2, total: 11, per_page: 10 },
      );
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoleRequestsPanel role="coach" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Coach Only')).toBeInTheDocument();
    expect(adminApi.listAdminRoleRequests).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'coach', page: 1 }),
    );

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Page Two')).toBeInTheDocument();
    expect(adminApi.listAdminRoleRequests).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'coach', page: 2 }),
    );
  });
});
