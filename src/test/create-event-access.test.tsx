import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { canCreateEvent } from '../auth/canCreateEvent';
import CreateEventControl from '../components/CreateEventControl';
import CreateEventPage from '../pages/Events/CreateEventPage';
import * as profilesApi from '../api/profiles';
import * as eventsApi from '../api/events';

const authState = vi.hoisted(() => ({
  user: {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false,
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  listMyRoleRequests: vi.fn(),
  createRoleRequest: vi.fn(),
}));

vi.mock('../api/events', () => ({
  createEvent: vi.fn(),
}));

beforeEach(() => {
  authState.user = {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male',
    is_admin: false,
  };
  vi.mocked(profilesApi.getProfile).mockReset();
  vi.mocked(profilesApi.listMyRoleRequests).mockReset();
  vi.mocked(profilesApi.createRoleRequest).mockReset();
  vi.mocked(eventsApi.createEvent).mockReset();
  vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([]);
});

describe('canCreateEvent', () => {
  test('allows admin regardless of roles', () => {
    expect(canCreateEvent({ is_admin: true }, [])).toBe(true);
    expect(canCreateEvent({ is_admin: true }, ['player'])).toBe(true);
  });

  test('allows coach or organizer', () => {
    expect(canCreateEvent({ is_admin: false }, ['player', 'coach'])).toBe(true);
    expect(canCreateEvent({ is_admin: false }, ['organizer'])).toBe(true);
  });

  test('denies player-only and signed-out', () => {
    expect(canCreateEvent({ is_admin: false }, ['player'])).toBe(false);
    expect(canCreateEvent({ is_admin: false }, [])).toBe(false);
    expect(canCreateEvent(null, ['coach'])).toBe(false);
  });
});

describe('CreateEventControl', () => {
  test('player sees access modal instead of navigating', async () => {
    const user = userEvent.setup();
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: null,
      coach: null,
      organizer: null,
    });

    render(
      <MemoryRouter>
        <CreateEventControl />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(await screen.findByRole('dialog', { name: /hosting is limited/i })).toBeInTheDocument();
    expect(screen.getByText(/only coaches and organizers can create events/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request coach access/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request organizer access/i })).toBeInTheDocument();
  });

  test('coach navigates to create form route', async () => {
    const user = userEvent.setup();
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player', 'coach'],
      player: null,
      coach: {},
      organizer: null,
    });

    render(
      <MemoryRouter initialEntries={['/events']}>
        <Routes>
          <Route path="/events" element={<CreateEventControl />} />
          <Route path="/events/new" element={<div>Create form</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(await screen.findByText('Create form')).toBeInTheDocument();
  });
});

describe('CreateEventPage gate', () => {
  test('blocks player-only direct URL and shows modal', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: null,
      coach: null,
      organizer: null,
    });

    render(
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events" element={<div>Events list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog', { name: /hosting is limited/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create event$/i })).not.toBeInTheDocument();
  });

  test('admin can open create form without profile roles', async () => {
    authState.user = { ...authState.user, is_admin: true };

    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /create event/i })).toBeInTheDocument();
    expect(profilesApi.getProfile).not.toHaveBeenCalled();
  });

  test('modal can submit coach request', async () => {
    const user = userEvent.setup();
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: null,
      coach: null,
      organizer: null,
    });
    const pending = {
      id: 1,
      role: 'coach' as const,
      status: 'pending' as const,
      note: null,
      created_at: '2026-08-18T00:00:00Z',
    };
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue(pending);
    vi.mocked(profilesApi.listMyRoleRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValue([pending]);

    render(
      <MemoryRouter>
        <CreateEventControl />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /create event/i }));
    await user.click(await screen.findByRole('button', { name: /request coach access/i }));

    expect(
      await screen.findByRole('dialog', { name: /request coach access/i }),
    ).toBeInTheDocument();
    expect(profilesApi.createRoleRequest).not.toHaveBeenCalled();

    const accept = screen.getByRole('checkbox', { name: /accept/i });
    await waitFor(() => expect(accept).not.toBeDisabled());
    await user.click(accept);
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({ role: 'coach' }),
    );
    expect(await screen.findByRole('button', { name: /coach request pending/i })).toBeDisabled();
  });
});
