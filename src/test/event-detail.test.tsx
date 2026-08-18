import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventDetailPage from '../pages/Events/EventDetailPage';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

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

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  deleteEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
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
  authState.user = {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male',
    is_admin: false,
  };
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

  test('admin sees edit and delete on non-owned live event but not manage applications', async () => {
    authState.user = {
      ...authState.user,
      is_admin: true,
    };
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      is_owner: false,
      visibility: 'live',
    });
    renderDetail();

    expect(await screen.findByRole('link', { name: /edit event/i })).toHaveAttribute(
      'href',
      '/events/7/edit',
    );
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /manage applications/i }),
    ).not.toBeInTheDocument();
  });

  test('admin does not see manage tools on non-owned pending event', async () => {
    authState.user = {
      ...authState.user,
      is_admin: true,
    };
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      title: 'Still Pending',
      is_owner: false,
      visibility: 'pending_review',
    });
    renderDetail();

    expect(await screen.findByRole('heading', { name: /still pending/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit event/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete event/i })).not.toBeInTheDocument();
  });

  test('shows organizer contact icon links below about when present', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      created_by: {
        id: 3,
        name: 'Alex Organizer',
        contact_number: '09171234567',
        contact_email: 'alex@example.com',
        facebook_url: 'https://facebook.com/alex',
        instagram_url: 'https://instagram.com/alex',
      },
    });
    renderDetail();

    expect(await screen.findByText(/alex organizer/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^contact details$/i })).toBeInTheDocument();

    const phone = screen.getByRole('link', { name: /call 09171234567/i });
    expect(phone).toHaveAttribute('href', 'tel:09171234567');

    const email = screen.getByRole('link', { name: /email alex@example.com/i });
    expect(email).toHaveAttribute('href', 'mailto:alex@example.com');

    const fb = screen.getByRole('link', { name: /^facebook$/i });
    expect(fb).toHaveAttribute('href', 'https://facebook.com/alex');
    expect(fb).toHaveAttribute('target', '_blank');

    const ig = screen.getByRole('link', { name: /^instagram$/i });
    expect(ig).toHaveAttribute('href', 'https://instagram.com/alex');
    expect(ig).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('shows public approved players when enabled', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      show_participants_publicly: true,
      approved_participants: [
        { id: 1, name: 'Ana' },
        { id: 2, name: 'Ben' },
      ],
    });
    renderDetail();
    expect(await screen.findByRole('heading', { name: /^players$/i })).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  test('hides players when roster is private', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      show_participants_publicly: false,
      approved_participants: [{ id: 1, name: 'Ana' }],
    });
    renderDetail();
    await screen.findByRole('heading', { name: /friday night open play/i });
    expect(screen.queryByRole('heading', { name: /^players$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  test('hides contact block when organizer contact is empty', async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      created_by: {
        id: 3,
        name: 'Alex Organizer',
        contact_number: null,
        contact_email: null,
        facebook_url: null,
        instagram_url: null,
      },
    });
    renderDetail();

    expect(await screen.findByText(/alex organizer/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^contact details$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^facebook$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^instagram$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /call /i })).not.toBeInTheDocument();
  });
});
