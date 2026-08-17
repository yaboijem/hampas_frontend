import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CreateEventPage from '../pages/Events/CreateEventPage';
import EventForm from '../pages/Events/EventForm';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(eventsApi.createEvent).mockReset();
  vi.mocked(eventsApi.updateEvent).mockReset();
});

const existingEvent: EventItem = {
  id: 7,
  title: 'Friday Night Open Play',
  description: 'Bring knee pads.',
  event_type: 'open_play',
  skill_level: 'intermediate',
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: '2026-08-20T18:00:00+08:00',
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

    await user.type(screen.getByLabelText(/title/i), 'Sunday Open Play');
    await user.type(screen.getByLabelText(/description/i), 'Casual games.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'open_play');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Malabanias');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    await user.type(screen.getByLabelText(/starts at/i), '2026-08-20T18:00');
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('title')).toBe('Sunday Open Play');
      expect(call.get('starts_at')).toBe('2026-08-20T18:00');
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

    await user.type(screen.getByLabelText(/title/i), 'Club Try Out');
    await user.type(screen.getByLabelText(/description/i), 'New member try-out.');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'try_out');
    await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
    await user.type(screen.getByLabelText(/barangay/i), 'Balibago');
    await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
    await user.type(screen.getByLabelText(/starts at/i), '2026-08-25T10:00');
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
      expect(call).toBeInstanceOf(FormData);
      expect(call.get('event_type')).toBe('try_out');
      expect(call.get('title')).toBe('Club Try Out');
    });
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
