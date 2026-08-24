import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventRequestsPanel from '../pages/Admin/EventRequestsPanel';
import * as adminApi from '../api/admin';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';
import { pageOf } from './adminPaginated';

vi.mock('../api/admin', () => ({
  ADMIN_PAGE_SIZE: 10,
  listAdminEvents: vi.fn(),
  approveEvent: vi.fn(),
  rejectEvent: vi.fn(),
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
}));

vi.mock('../api/events', () => ({
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  isEmailVerified: (user: { is_admin?: boolean; email_verified_at?: string | null } | null) => Boolean(user?.is_admin || user?.email_verified_at),
  useAuth: () => ({
    user: {
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      birth_date: '1990-01-01',
      gender: 'other' as const,
      is_admin: true, email_verified_at: '2020-01-01',
    },
    loading: false,
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

function pendingEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 11,
    title: 'Angeles Open Cup',
    description: 'Review me',
    event_type: 'tournament',
    skill_level: 'advanced',
    barangay: 'Malabanias',
    city: 'Angeles City',
    starts_at: '2026-09-01T18:00:00+08:00',
    photo_url: null,
    visibility: 'pending_review',
    is_owner: false,
    my_application: null,
    created_by: { id: 3, name: 'Sample Organizer' },
    ...overrides,
  };
}

describe('EventRequestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending events and approves one', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(pageOf([pendingEvent()]));
    vi.mocked(adminApi.approveEvent).mockResolvedValue(
      pendingEvent({ visibility: 'live' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPanel />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Angeles Open Cup')).toBeInTheDocument();
    expect(screen.getByText('Sample Organizer')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'pending_review', page: 1 }),
    );

    await user.click(screen.getByRole('button', { name: /angeles open cup/i }));
    expect(await screen.findByText(/review me/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open event page/i })).toHaveAttribute(
      'href',
      '/events/11',
    );

    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(adminApi.approveEvent).toHaveBeenCalledWith(11));
  });

  test('rejects a pending event', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue(
      pageOf([pendingEvent({ id: 12, title: 'Reject Me' })]),
    );
    vi.mocked(adminApi.rejectEvent).mockResolvedValue(
      pendingEvent({ id: 12, title: 'Reject Me', visibility: 'rejected' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPanel />
      </MemoryRouter>,
    );

    await screen.findByText('Reject Me');
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    await waitFor(() => expect(adminApi.rejectEvent).toHaveBeenCalledWith(12));
  });

  test('Live tab shows edit and delete for live events', async () => {
    vi.mocked(adminApi.listAdminEvents).mockImplementation(async (arg) => {
      const visibility = typeof arg === 'string' ? arg : arg.visibility;
      if (visibility === 'pending_review') return pageOf([]);
      if (visibility === 'live') {
        return pageOf([
          pendingEvent({
            id: 20,
            title: 'Already Live',
            visibility: 'live',
          }),
        ]);
      }
      return pageOf([]);
    });
    vi.mocked(eventsApi.deleteEvent).mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <EventRequestsPanel />
      </MemoryRouter>,
    );

    await screen.findByText(/no pending events/i);
    await user.click(screen.getByRole('tab', { name: /live/i }));

    expect(await screen.findByText('Already Live')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'live' }),
    );
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /^edit$/i })).toHaveAttribute(
      'href',
      '/events/20/edit',
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete event/i });
    expect(
      within(dialog).getByText(/are you sure you want to delete this event/i),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(eventsApi.deleteEvent).toHaveBeenCalledWith(20));
  });

  test('paginates event lists', async () => {
    vi.mocked(adminApi.listAdminEvents).mockImplementation(async (arg) => {
      const params = typeof arg === 'string' ? { visibility: arg, page: 1 } : arg;
      if (params.page === 2) {
        return pageOf(
          [pendingEvent({ id: 99, title: 'Event Page Two' })],
          { current_page: 2, last_page: 2, total: 11, per_page: 10 },
        );
      }
      return pageOf([pendingEvent()], {
        current_page: 1,
        last_page: 2,
        total: 11,
        per_page: 10,
      });
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPanel />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Angeles Open Cup')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(await screen.findByText('Event Page Two')).toBeInTheDocument();
  });
});
