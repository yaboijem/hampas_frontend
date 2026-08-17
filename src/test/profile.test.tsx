import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProfilePage from '../pages/Profile/ProfilePage';
import * as profilesApi from '../api/profiles';
import * as authApi from '../api/auth';

const { updateUser, mockUser } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  mockUser: {
    id: 1,
    name: 'Jem Player',
    email: 'jem@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false,
  },
}));

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  updateRole: vi.fn(),
  listMyRoleRequests: vi.fn(),
  createRoleRequest: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  updateMe: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
    updateUser,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([]);
  });

  test('player-only profile shows account and player details, not elevated editors', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: { positions: ['outside_hitter'], skill_level: 'intermediate' },
      coach: null,
      organizer: null,
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Jem Player');
    expect(screen.getByRole('heading', { name: /player details/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/outside hitter/i)).toBeChecked();
    expect(screen.getByLabelText(/^setter$/i)).not.toBeChecked();
    expect(screen.queryByRole('heading', { name: /coach details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /organizer details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add role/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request coach/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request organizer/i })).toBeInTheDocument();
  });

  test('saves multiple player positions', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: { positions: ['setter'], skill_level: 'beginner' },
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'player',
      profile: { positions: ['setter', 'libero'], skill_level: 'beginner' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/^setter$/i);
    await user.click(screen.getByLabelText(/^libero$/i));
    await user.click(screen.getByRole('button', { name: /save player/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith(
        'player',
        expect.objectContaining({
          positions: expect.arrayContaining(['setter', 'libero']),
        }),
      ),
    );
  });

  test('requests coach access', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 10,
      role: 'coach',
      status: 'pending',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /request coach/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({ role: 'coach' }),
    );
    expect(await screen.findByText(/pending/i)).toBeInTheDocument();
  });

  test('shows pending status and hides coach field editors', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([
      {
        id: 10,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.queryByLabelText(/bootcamp name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request coach/i })).not.toBeInTheDocument();
  });

  test('granted coach can save details', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player', 'coach'],
      player: {},
      coach: { achievements: 'Regionals finalist' },
      organizer: null,
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'coach',
      profile: { achievements: 'Regionals finalist', bootcamp_name: 'Hampas Academy' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /coach details/i });
    await user.type(screen.getByLabelText(/bootcamp name/i), 'Hampas Academy');
    await user.click(screen.getByRole('button', { name: /save coach/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith(
        'coach',
        expect.objectContaining({ bootcamp_name: 'Hampas Academy' }),
      ),
    );
  });

  test('saves account details via updateMe', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(authApi.updateMe).mockResolvedValue({
      user: {
        id: 1,
        name: 'Jem Updated',
        email: 'jem2@example.com',
        birth_date: '1999-06-15',
        gender: 'female',
        is_admin: false,
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/^name$/i);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Jem Updated' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'jem2@example.com' } });
    fireEvent.change(screen.getByLabelText(/birth date/i), { target: { value: '1999-06-15' } });
    await user.selectOptions(screen.getByLabelText(/^gender$/i), 'female');
    await user.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() =>
      expect(authApi.updateMe).toHaveBeenCalledWith({
        name: 'Jem Updated',
        email: 'jem2@example.com',
        birth_date: '1999-06-15',
        gender: 'female',
      }),
    );
  });
});
