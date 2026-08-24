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
import * as compressImageMod from '../lib/compressImage';
import type { EventItem } from '../api/types';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 15 }),
}));

vi.mock('../lib/reverseGeocode', () => ({
  reverseGeocode: vi.fn().mockResolvedValue('Mock Address, Pampanga'),
}));

vi.mock('../lib/leafletIcon', () => ({
  defaultMarkerIcon: {},
}));

function futureLocal(daysAhead = 2, hour = 18): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16);
}

vi.mock('../auth/AuthContext', () => ({
  isEmailVerified: (user: { is_admin?: boolean; email_verified_at?: string | null } | null) => Boolean(user?.is_admin || user?.email_verified_at),
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Host',
      email: 'host@example.com',
      birth_date: '2000-01-01',
      gender: 'male',
      is_admin: false, email_verified_at: '2020-01-01',
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

vi.mock('../lib/compressImage', () => ({
  compressImage: vi.fn(async (file: File) => file),
}));

beforeEach(() => {
  vi.mocked(eventsApi.createEvent).mockReset();
  vi.mocked(eventsApi.updateEvent).mockReset();
  vi.mocked(compressImageMod.compressImage).mockReset();
  vi.mocked(compressImageMod.compressImage).mockImplementation(async (file: File) => file);
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
  venue_name: 'Friday Court',
  location_address: 'Malabanias, Angeles City',
  latitude: 15.145,
  longitude: 120.588,
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
    await user.type(screen.getByLabelText(/venue name/i), 'Capel Open Court');
    const starts = futureLocal(3, 18);
    fireEvent.change(screen.getByLabelText(/starts at/i), { target: { value: starts } });
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('title')).toBe('Sunday Open Play');
      expect(call.get('starts_at')).toBe(starts);
      expect(call.get('venue_name')).toBe('Capel Open Court');
      expect(call.get('latitude')).toBeTruthy();
      expect(call.get('longitude')).toBeTruthy();
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
    await user.type(screen.getByLabelText(/venue name/i), 'Angeles Club Court');
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
            venue_name: 'Old Court',
            latitude: 15.145,
            longitude: 120.588,
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

describe('EventForm photo compression', () => {
  test('compresses picked photo and submits compressed file', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const original = new File([new Uint8Array(80)], 'court.png', { type: 'image/png' });
    const compressed = new File([new Uint8Array(40)], 'court.jpg', { type: 'image/jpeg' });
    vi.mocked(compressImageMod.compressImage).mockResolvedValue(compressed);

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText(/^photo$/i);
    await user.upload(input, original);

    await waitFor(() => {
      expect(compressImageMod.compressImage).toHaveBeenCalledWith(original);
    });

    await user.type(screen.getByLabelText(/title/i), 'Sunday Open Play');
    await user.type(screen.getByLabelText(/description/i), 'Casual games.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'open_play');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Malabanias');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    await user.type(screen.getByLabelText(/venue name/i), 'Photo Court');
    fireEvent.change(screen.getByLabelText(/starts at/i), {
      target: { value: futureLocal(3, 18) },
    });
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const form = onSubmit.mock.calls[0]?.[0] as FormData;
    expect(form.get('photo')).toBe(compressed);
  });

  test('shows size error when compress rejects oversized result', async () => {
    const user = userEvent.setup();
    vi.mocked(compressImageMod.compressImage).mockRejectedValue(
      new Error('Image must be 5MB or smaller.'),
    );
    const big = new File([new Uint8Array(100)], 'big.png', { type: 'image/png' });

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    await user.upload(screen.getByLabelText(/^photo$/i), big);

    expect(await screen.findByRole('alert')).toHaveTextContent('Image must be 5MB or smaller.');
  });

  test('shows process error when compress fails generically', async () => {
    const user = userEvent.setup();
    vi.mocked(compressImageMod.compressImage).mockRejectedValue(new Error('decode boom'));
    const bad = new File([new Uint8Array(20)], 'x.png', { type: 'image/png' });

    render(
      <MemoryRouter>
        <EventForm submitLabel="Create event" onSubmit={vi.fn()} />
      </MemoryRouter>,
    );

    await user.upload(screen.getByLabelText(/^photo$/i), bad);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not process that image. Try another photo.',
    );
  });
});
