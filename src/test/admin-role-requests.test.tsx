import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RoleRequestsPage from '../pages/Admin/RoleRequestsPage';
import * as adminApi from '../api/admin';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
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

describe('RoleRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending requests and approves one', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 7,
        role: 'organizer',
        status: 'pending',
        note: 'I run Angeles courts',
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
      },
    ]);
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
        <RoleRequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Jem Player')).toBeInTheDocument();
    expect(screen.getByText('organizer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(adminApi.approveRoleRequest).toHaveBeenCalledWith(7));
  });

  test('rejects a request', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 8,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 2, name: 'Sam', email: 'sam@example.com' },
      },
    ]);
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
        <RoleRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Sam');
    await user.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => expect(adminApi.rejectRoleRequest).toHaveBeenCalledWith(8));
  });
});
