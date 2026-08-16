import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventDetailPage from '../pages/Events/EventDetailPage';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  deleteEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 9,
      name: 'Me',
      email: 'me@example.com',
      birth_date: '2000-01-01',
      gender: 'male',
      is_admin: false,
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const baseEvent: EventItem = {
  id: 7,
  title: 'Friday Night Open Play',
  description: 'Bring knee pads.',
  event_type: 'open_play',
  skill_level: 'intermediate',
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: '2026-08-20T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: false,
  distance_km: 2.4,
  my_application: null,
  created_by: { id: 3, name: 'Alex Organizer' },
};

function renderDetail(path = '/events/7') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/events" element={<div>Events list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(eventsApi.getEvent).mockReset();
  vi.mocked(eventsApi.deleteEvent).mockReset();
});

describe('EventDetailPage', () => {
  test('renders hero title, facts, chips, and sticky apply region', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue(baseEvent);
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: /friday night open play/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/bring knee pads/i)).toBeInTheDocument();
    expect(screen.getByText(/malabanias, angeles city/i)).toBeInTheDocument();
    expect(screen.getByText(/alex organizer/i)).toBeInTheDocument();
    expect(screen.getAllByText(/open play/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/intermediate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.4 km/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /back to events/i })).toHaveAttribute('href', '/events');
    expect(screen.getByTestId('event-sticky-cta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeInTheDocument();
  });

  test('shows pending review banner and owner tools', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      title: 'Awaiting Review',
      visibility: 'pending_review',
      is_owner: true,
      distance_km: undefined,
    });
    renderDetail();

    expect(await screen.findByText(/pending review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit event/i })).toHaveAttribute(
      'href',
      '/events/7/edit',
    );
    expect(screen.getByRole('link', { name: /manage applications/i })).toHaveAttribute(
      'href',
      '/events/7/applications',
    );
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
    expect(screen.queryByTestId('event-sticky-cta')).not.toBeInTheDocument();
  });

  test('report control opens for non-owners', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue(baseEvent);
    renderDetail();
    expect(await screen.findByRole('button', { name: /report this event/i })).toBeInTheDocument();
  });
});
