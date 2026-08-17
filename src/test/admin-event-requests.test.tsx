import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventRequestsPage from '../pages/Admin/EventRequestsPage';
import * as adminApi from '../api/admin';
import type { EventItem } from '../api/types';

vi.mock('../api/admin', () => ({
  listAdminEvents: vi.fn(),
  approveEvent: vi.fn(),
  rejectEvent: vi.fn(),
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      birth_date: '1990-01-01',
      gender: 'other' as const,
      is_admin: true,
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

describe('EventRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending events and approves one', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([pendingEvent()]);
    vi.mocked(adminApi.approveEvent).mockResolvedValue(
      pendingEvent({ visibility: 'live' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Angeles Open Cup')).toBeInTheDocument();
    expect(screen.getByText('Sample Organizer')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith('pending_review');

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(adminApi.approveEvent).toHaveBeenCalledWith(11));
    await waitFor(() =>
      expect(screen.queryByText('Angeles Open Cup')).not.toBeInTheDocument(),
    );
  });

  test('rejects a pending event', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([
      pendingEvent({ id: 12, title: 'Reject Me' }),
    ]);
    vi.mocked(adminApi.rejectEvent).mockResolvedValue(
      pendingEvent({ id: 12, title: 'Reject Me', visibility: 'rejected' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Reject Me');
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(adminApi.rejectEvent).toHaveBeenCalledWith(12));
    await waitFor(() =>
      expect(screen.queryByText('Reject Me')).not.toBeInTheDocument(),
    );
  });

  test('Live tab loads live visibility without action buttons', async () => {
    vi.mocked(adminApi.listAdminEvents).mockImplementation(async (visibility) => {
      if (visibility === 'pending_review') return [];
      if (visibility === 'live') {
        return [
          pendingEvent({
            id: 20,
            title: 'Already Live',
            visibility: 'live',
          }),
        ];
      }
      return [];
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText(/no pending events/i);
    await user.click(screen.getByRole('tab', { name: /live/i }));

    expect(await screen.findByText('Already Live')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith('live');
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });
});
