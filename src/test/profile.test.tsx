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
  addRole: vi.fn(),
  updateRole: vi.fn(),
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
  });

  test('shows compact profile with editable account and roles', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: { position: 'outside_hitter', skill_level: 'intermediate' },
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
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('jem@example.com');
    expect(screen.getByLabelText(/birth date/i)).toHaveValue('2000-01-01');
    expect(screen.getByLabelText(/^gender$/i)).toHaveValue('male');
    expect(screen.getByRole('heading', { name: /player details/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('outside_hitter')).toBeInTheDocument();
  });

  test('saves account details via updateMe', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: [],
      player: null,
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
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jem Updated', email: 'jem2@example.com' }),
    );
  });

  test('adds an organizer role', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: [],
      player: null,
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.addRole).mockResolvedValue({
      role: 'organizer',
      profile: { managed_courts: 'Angeles City Sports Complex' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.selectOptions(await screen.findByLabelText(/add role/i), 'organizer');
    await user.type(screen.getByLabelText(/managed courts/i), 'Angeles City Sports Complex');
    await user.click(screen.getByRole('button', { name: /add role/i }));

    await waitFor(() =>
      expect(profilesApi.addRole).toHaveBeenCalledWith('organizer', {
        managed_courts: 'Angeles City Sports Complex',
      }),
    );
  });

  test('updates coach profile', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['coach'],
      player: null,
      coach: { achievements: 'Regionals finalist' },
      organizer: null,
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'coach',
      profile: { achievements: 'Nationals champion', bootcamp_name: 'Hampas Academy' },
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
});
