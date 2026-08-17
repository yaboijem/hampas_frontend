import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProfilePage from '../pages/Profile/ProfilePage';
import * as profilesApi from '../api/profiles';

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows hero, account strip, and current roles', async () => {
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
    expect(screen.getByText('Jem Player')).toBeInTheDocument();
    expect(screen.getByText('jem@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /player details/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('outside_hitter')).toBeInTheDocument();
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
