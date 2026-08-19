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
  sendPasswordCode: vi.fn(),
  verifyPasswordCode: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
    updateUser,
  }),
}));

async function expand(name: RegExp | string) {
  const btn = await screen.findByRole('button', { name });
  await userEvent.click(btn);
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([]);
  });

  test('cards start collapsed; player shows selected chips when expanded in view mode', async () => {
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

    expect(await screen.findByRole('heading', { name: /hello[!,]?\s*jem player/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^setter$/i)).not.toBeInTheDocument();

    await expand(/player details/i);
    expect(screen.getByText('Outside Hitter')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^setter$/i)).not.toBeInTheDocument();
  });

  test('edit then save multiple player positions', async () => {
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

    await expand(/player details/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
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

  test('requests coach access from elevated card', async () => {
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

    await expand(/elevated access/i);
    await user.click(await screen.findByRole('button', { name: /request coach/i }));

    const dialog = await screen.findByRole('dialog', { name: /request coach access/i });
    expect(dialog).toBeInTheDocument();
    expect(profilesApi.createRoleRequest).not.toHaveBeenCalled();

    const accept = screen.getByRole('checkbox', { name: /accept/i });
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({ role: 'coach' }),
    );
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

    await expand(/elevated access/i);
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.queryByLabelText(/bootcamp name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request coach/i })).not.toBeInTheDocument();
  });

  test('granted coach can edit and save details', async () => {
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

    await expand(/coach details/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.type(screen.getByLabelText(/bootcamp name/i), 'Hampas Academy');
    await user.click(screen.getByRole('button', { name: /save coach/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith(
        'coach',
        expect.objectContaining({ bootcamp_name: 'Hampas Academy' }),
      ),
    );
  });

  test('saves account details via updateMe after expand and edit', async () => {
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

    await expand(/^account/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
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

  test('password fields stay locked until code verified; then changePassword is called', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(authApi.sendPasswordCode).mockResolvedValue({
      message: 'A 4-digit code was sent to your email.',
    });
    vi.mocked(authApi.verifyPasswordCode).mockResolvedValue({
      message: 'Code verified. You can set a new password.',
    });
    vi.mocked(authApi.changePassword).mockResolvedValue({
      message: 'Password updated.',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await expand(/^account/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^send code$/i }));
    await waitFor(() => expect(authApi.sendPasswordCode).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/4-digit code/i), '1234');
    await user.click(screen.getByRole('button', { name: /verify code/i }));
    await waitFor(() => expect(authApi.verifyPasswordCode).toHaveBeenCalledWith('1234'));

    await user.type(screen.getByLabelText(/^new password$/i), 'Newpass1!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Newpass1!');
    await user.click(screen.getByRole('button', { name: /save password/i }));

    await waitFor(() =>
      expect(authApi.changePassword).toHaveBeenCalledWith('Newpass1!', 'Newpass1!'),
    );
  });

  test('resend code shows 15s countdown and stays disabled', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(authApi.sendPasswordCode).mockResolvedValue({
      message: 'A 4-digit code was sent to your email.',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await expand(/^account/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /^send code$/i }));
    await waitFor(() => expect(authApi.sendPasswordCode).toHaveBeenCalledTimes(1));

    const resendBtn = await screen.findByRole('button', { name: /resend in \d+s/i });
    expect(resendBtn).toBeDisabled();
  });

  test('weak password keeps Save password disabled', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(authApi.sendPasswordCode).mockResolvedValue({
      message: 'A 4-digit code was sent to your email.',
    });
    vi.mocked(authApi.verifyPasswordCode).mockResolvedValue({
      message: 'Code verified. You can set a new password.',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await expand(/^account/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /^send code$/i }));
    await waitFor(() => expect(authApi.sendPasswordCode).toHaveBeenCalled());
    await user.type(screen.getByLabelText(/4-digit code/i), '1234');
    await user.click(screen.getByRole('button', { name: /verify code/i }));
    await waitFor(() => expect(authApi.verifyPasswordCode).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/^new password$/i), 'password');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'password');
    expect(screen.getByRole('button', { name: /save password/i })).toBeDisabled();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  test('organizer can add multiple managed courts', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player', 'organizer'],
      player: {},
      coach: null,
      organizer: { managed_courts: ['Court A'] },
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'organizer',
      profile: { managed_courts: ['Court A', 'Court B'] },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await expand(/organizer details/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /add managed court/i }));
    fireEvent.change(screen.getByLabelText(/managed courts 2/i), {
      target: { value: 'Court B' },
    });
    await user.click(screen.getByRole('button', { name: /save organizer/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith('organizer', {
        managed_courts: ['Court A', 'Court B'],
        contact_number: '',
        contact_email: '',
        facebook_url: '',
        instagram_url: '',
      }),
    );
  });

  test('organizer can save contact fields with courts', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player', 'organizer'],
      player: {},
      coach: null,
      organizer: {
        managed_courts: ['Court A'],
        contact_number: null,
        contact_email: null,
        facebook_url: null,
        instagram_url: null,
      },
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'organizer',
      profile: {
        managed_courts: ['Court A'],
        contact_number: '09171234567',
        contact_email: 'org@example.com',
        facebook_url: 'https://facebook.com/org',
        instagram_url: 'https://instagram.com/org',
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await expand(/organizer details/i);
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    fireEvent.change(screen.getByLabelText(/contact number/i), {
      target: { value: '09171234567' },
    });
    fireEvent.change(screen.getByLabelText(/contact email/i), {
      target: { value: 'org@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/facebook url/i), {
      target: { value: 'https://facebook.com/org' },
    });
    fireEvent.change(screen.getByLabelText(/instagram url/i), {
      target: { value: 'https://instagram.com/org' },
    });
    await user.click(screen.getByRole('button', { name: /save organizer/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith('organizer', {
        managed_courts: ['Court A'],
        contact_number: '09171234567',
        contact_email: 'org@example.com',
        facebook_url: 'https://facebook.com/org',
        instagram_url: 'https://instagram.com/org',
      }),
    );
  });
});
