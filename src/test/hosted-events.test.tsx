import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import HostedEventsPage from '../pages/Events/HostedEventsPage';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

vi.mock('../api/events', () => ({
  listHostedEvents: vi.fn(),
}));

const owned: EventItem = {
  id: 5,
  title: 'My Open Play',
  description: 'd',
  event_type: 'open_play',
  skill_level: 'all_levels',
  barangay: null,
  city: 'Angeles City',
  starts_at: '2026-09-01T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: true,
  my_application: null,
  created_by: { id: 1, name: 'Me' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HostedEventsPage', () => {
  test('lists owned events with manage link', async () => {
    vi.mocked(eventsApi.listHostedEvents).mockResolvedValue({
      data: [owned],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/me/hosted-events']}>
        <Routes>
          <Route path="/me/hosted-events" element={<HostedEventsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /hosted events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my open play/i })).toHaveAttribute('href', '/events/5');
    expect(screen.getByRole('link', { name: /manage applications/i })).toHaveAttribute(
      'href',
      '/events/5/applications',
    );
    expect(screen.getByRole('link', { name: /^edit$/i })).toHaveAttribute('href', '/events/5/edit');
  });

  test('empty state offers create event', async () => {
    vi.mocked(eventsApi.listHostedEvents).mockResolvedValue({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/me/hosted-events']}>
        <Routes>
          <Route path="/me/hosted-events" element={<HostedEventsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/haven.t hosted any events yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create event/i })).toHaveAttribute('href', '/events/new');
  });
});
