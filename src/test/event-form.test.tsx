import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CreateEventPage from '../pages/Events/CreateEventPage';
import EventForm, {
  defaultStartsAtLocal,
  isStartsAtAllowed,
  minStartsAtLocal,
} from '../pages/Events/EventForm';
import * as eventsApi from '../api/events';
import * as profilesApi from '../api/profiles';
import type { EventItem } from '../api/types';

function futureLocal(daysAhead = 2, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
}

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Host',
      email: 'host@example.com',
      birth_date: '2000-01-01',
      gender: 'male',
      is_admin: false,
    },
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
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(eventsApi.createEvent).mockReset();
  vi.mocked(eventsApi.updateEvent).mockReset();
  vi.mocked(profilesApi.getProfile).mockResolvedValue({
    roles: ['player', 'organizer'],
    player: null,
    coach: null,
    organizer: {},
  });
});

const existingEvent: EventItem = {
  id: 7,
  title: 'Friday Night Open Play',
  description: 'Bring knee pads.',
  event_type: 'open_play',
  skill_level: 'intermediate',
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  photo_url: 'https://example.com/storage/events/court.jpg',
  visibility: 'live',
  is_owner: true,
  my_application: null,
  created_by: { id: 3, name: 'Alex Organizer' },
};

describe('CreateEventPage', () => {
  test('submits a multipart form', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsApi.createEvent).mockResolvedValue({} as never);

    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/title/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/title/i), 'Sunday Open Play');
    await user.type(screen.getByLabelText(/description/i), 'Casual games.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'open_play');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Malabanias');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    const starts = futureLocal(3, 18);
    fireEvent.change(screen.getByLabelText(/starts at/i), { target: { value: starts } });
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('title')).toBe('Sunday Open Play');
      expect(call.get('starts_at')).toBe(starts);
    });
  });
});

describe('CreateEventPage try_out', () => {
  test('create form can submit try_out event type', async () => {
    const user = userEvent.setup();
    vi.mocked(eventsApi.createEvent).mockResolvedValue({} as never);

    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/title/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/title/i), 'Club Try Out');
    await user.type(screen.getByLabelText(/description/i), 'New member try-out.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'try_out');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Balibago');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    fireEvent.change(screen.getByLabelText(/starts at/i), {
      target: { value: futureLocal(5, 10) },
    });
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('event_type')).toBe('try_out');
      expect(call.get('title')).toBe('Club Try Out');
    });
  });
});

describe('EventForm starts_at restriction', () => {
  test('minStartsAtLocal is start of today', () => {
    const now = new Date('2026-08-18T15:30:00');
    expect(minStartsAtLocal(now)).toBe('2026-08-18T00:00');
  });

  test('isStartsAtAllowed accepts today and future, rejects past', () => {
    const now = new Date('2026-08-18T15:30:00');
    expect(isStartsAtAllowed('2026-08-18T09:00', now)).toBe(true);
    expect(isStartsAtAllowed('2026-08-19T18:00', now)).toBe(true);
    expect(isStartsAtAllowed('2026-08-17T23:59', now)).toBe(false);
  });

  test('datetime input exposes min of today and defaults to a real value', () => {
    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/starts at/i) as HTMLInputElement;
    expect(input).toHaveAttribute('min', minStartsAtLocal());
    expect(input.value).toBe(defaultStartsAtLocal());
    expect(input.value).not.toBe('');
  });

  test('rejects submit when start time is before today', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const pastIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    render(
      <MemoryRouter>
        <EventForm
          initial={{
            id: 1,
            title: 'Past Game',
            description: 'Too late.',
            event_type: 'open_play',
            skill_level: 'all_levels',
            barangay: null,
            city: 'Angeles City',
            starts_at: pastIso,
            photo_url: null,
            visibility: 'live',
            is_owner: true,
            my_application: null,
            created_by: { id: 1, name: 'Org' },
          }}
          submitLabel="Create event"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    // fireEvent.submit bypasses native min constraint so our JS guard runs
    fireEvent.submit(screen.getByRole('button', { name: /create event/i }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /start time must be today or later/i,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EventForm photo removal', () => {
  test('sends remove_photo when an existing photo is cleared', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <EventForm initial={existingEvent} submitLabel="Save changes" onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    expect(screen.getByAltText(/event photo preview/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const form = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(form.get('remove_photo')).toBe('1');
    expect(form.get('photo')).toBeNull();
  });
});
