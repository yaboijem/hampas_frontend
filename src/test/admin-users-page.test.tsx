import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as adminApi from '../api/admin';
import AdminUsersPage from '../pages/Admin/AdminUsersPage';
import { pageOf } from './adminPaginated';

vi.mock('../api/admin', () => ({
  ADMIN_PAGE_SIZE: 10,
  listAdminUsers: vi.fn(),
  getAdminUser: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAdminUsers).mockResolvedValue(
      pageOf([
        {
          id: 1,
          name: 'Pat Player',
          email: 'pat@example.com',
          birth_date: '1998-01-01',
          gender: 'female',
          is_admin: false, email_verified_at: '2020-01-01',
          roles: ['player'],
          created_at: '2026-08-01T00:00:00Z',
        },
      ]),
    );
  });

  test('lists users and passes search + role filters', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Pat Player')).toBeInTheDocument();
    expect(screen.getByText('pat@example.com')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'pat');
    await waitFor(() =>
      expect(adminApi.listAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'pat', page: 1 }),
      ),
    );

    await user.click(screen.getByRole('button', { name: /^filters$/i }));
    const panel = await screen.findByRole('dialog', { name: /role filters/i });
    await user.click(within(panel).getByRole('button', { name: /^coach$/i }));
    await waitFor(() =>
      expect(adminApi.listAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ roles: ['coach'], page: 1 }),
      ),
    );
  });

  test('expands a user row to show full details', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getAdminUser).mockResolvedValue({
      id: 1,
      name: 'Pat Player',
      email: 'pat@example.com',
      birth_date: '1998-01-01',
      gender: 'female',
      is_admin: false, email_verified_at: '2020-01-01',
      roles: ['player'],
      profiles: {
        player: { positions: ['setter'], skill_level: 'beginner' },
        coach: null,
        organizer: null,
      },
      created_at: '2026-08-01T00:00:00Z',
    });

    renderPage();
    await screen.findByText('Pat Player');
    await user.click(screen.getByRole('button', { name: /pat player/i }));

    await waitFor(() => expect(adminApi.getAdminUser).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Player profile')).toBeInTheDocument();
    expect(screen.getByText(/setter/i)).toBeInTheDocument();
    expect(screen.getByText(/birth date/i)).toBeInTheDocument();
  });

  test('creates a user from the modal', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.createAdminUser).mockResolvedValue({
      id: 2,
      name: 'New User',
      email: 'new@example.com',
      birth_date: '1995-06-01',
      gender: 'other',
      is_admin: false, email_verified_at: '2020-01-01',
      roles: ['player'],
      profiles: { player: { positions: [] }, coach: null, organizer: null },
      created_at: '2026-08-19T00:00:00Z',
    });

    renderPage();
    await screen.findByText('Pat Player');
    await user.click(screen.getByRole('button', { name: /add user/i }));

    const dialog = await screen.findByRole('dialog', { name: /create user/i });
    await user.type(within(dialog).getByLabelText(/^name$/i), 'New User');
    await user.type(within(dialog).getByLabelText(/^email$/i), 'new@example.com');
    await user.type(within(dialog).getByLabelText(/^password$/i), 'Secret1!');
    await user.type(within(dialog).getByLabelText(/birth/i), '1995-06-01');
    await user.selectOptions(within(dialog).getByLabelText(/gender/i), 'other');

    const player = within(dialog).getByRole('checkbox', { name: /^player$/i });
    if (!(player as HTMLInputElement).checked) await user.click(player);

    await user.click(within(dialog).getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(adminApi.createAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User',
          email: 'new@example.com',
          password: 'Secret1!',
          roles: expect.arrayContaining(['player']),
        }),
      ),
    );
  });

  test('edits a user from the modal', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.getAdminUser).mockResolvedValue({
      id: 1,
      name: 'Pat Player',
      email: 'pat@example.com',
      birth_date: '1998-01-01',
      gender: 'female',
      is_admin: false, email_verified_at: '2020-01-01',
      roles: ['player'],
      profiles: {
        player: { positions: ['setter'], skill_level: 'beginner' },
        coach: null,
        organizer: null,
      },
      created_at: '2026-08-01T00:00:00Z',
    });
    vi.mocked(adminApi.updateAdminUser).mockResolvedValue({
      id: 1,
      name: 'Pat Updated',
      email: 'pat@example.com',
      birth_date: '1998-01-01',
      gender: 'female',
      is_admin: false, email_verified_at: '2020-01-01',
      roles: ['player'],
      profiles: {
        player: { positions: ['setter'], skill_level: 'beginner' },
        coach: null,
        organizer: null,
      },
      created_at: '2026-08-01T00:00:00Z',
    });

    renderPage();
    await screen.findByText('Pat Player');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const dialog = await screen.findByRole('dialog', { name: /edit user/i });
    const nameInput = within(dialog).getByLabelText(/^name$/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Pat Updated');
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(adminApi.updateAdminUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Pat Updated' }),
      ),
    );
  });

  test('deletes a user after confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteAdminUser).mockResolvedValue();
    renderPage();
    await screen.findByText('Pat Player');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete user/i });
    expect(within(dialog).getByText(/pat@example.com/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(adminApi.deleteAdminUser).toHaveBeenCalledWith(1));
  });
});
