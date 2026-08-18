import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ApplyButton from '../components/ApplyButton';
import EventApplicationsPage from '../pages/Applications/EventApplicationsPage';
import MyApplicationsPage from '../pages/Applications/MyApplicationsPage';
import * as applicationsApi from '../api/applications';
import * as eventsApi from '../api/events';
import * as notes from '../lib/adminNotifications';
import type { EventItem } from '../api/types';

vi.mock('../api/applications', () => ({
  apply: vi.fn(),
  cancelApplication: vi.fn(),
  listEventApplications: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  deleteEventApplication: vi.fn(),
  myApplications: vi.fn(),
}));

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  setParticipantsVisibility: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 9, name: 'Me', email: 'me@example.com', birth_date: '2000-01-01', gender: 'male', is_admin: false },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const baseEvent: EventItem = {
  id: 1,
  title: 'Game',
  description: '',
  event_type: 'open_play',
  skill_level: 'all_levels',
  barangay: null,
  city: 'Angeles City',
  starts_at: '2026-09-01T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: true,
  my_application: null,
  created_by: { id: 1, name: 'Org' },
  show_participants_publicly: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(eventsApi.getEvent).mockResolvedValue(baseEvent);
});

describe('ApplyButton', () => {
  test('applies to a live event', async () => {
    const user = userEvent.setup();
    vi.mocked(applicationsApi.apply).mockResolvedValue({
      application: { id: 1, event_id: 1, user_id: 9, status: 'pending' },
    });

    render(
      <MemoryRouter>
        <ApplyButton eventId={1} isOwner={false} visibility="live" myApplication={null} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(applicationsApi.apply).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel application/i })).toBeInTheDocument();
  });

  test('cancels a pending application', async () => {
    const user = userEvent.setup();
    vi.mocked(applicationsApi.cancelApplication).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ApplyButton eventId={1} isOwner={false} visibility="live" myApplication={{ id: 5, status: 'pending' }} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /cancel application/i }));
    await waitFor(() => expect(applicationsApi.cancelApplication).toHaveBeenCalledWith(1));
  });
});

describe('EventApplicationsPage', () => {
  test('organizer can approve an applicant', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(applicationsApi.listEventApplications)
      .mockResolvedValueOnce({
        data: [
          { id: 3, user: { id: 7, name: 'Ana' }, status: 'pending' },
          { id: 4, user: { id: 8, name: 'Ben' }, status: 'approved' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: 3, user: { id: 7, name: 'Ana' }, status: 'approved' },
          { id: 4, user: { id: 8, name: 'Ben' }, status: 'approved' },
        ],
      });
    vi.mocked(applicationsApi.approveApplication).mockResolvedValue({
      application: { id: 3, event_id: 1, user_id: 7, status: 'approved' },
    });

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^applications$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to event/i })).toHaveAttribute('href', '/events/1');
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /change to rejected/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(applicationsApi.approveApplication).toHaveBeenCalledWith(1, 3));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /change to rejected/i }).length).toBe(2);
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(toastSpy).toHaveBeenCalledWith('Ana approved');
  });

  test('organizer can change an approved decision to rejected', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(applicationsApi.listEventApplications)
      .mockResolvedValueOnce({
        data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'approved' }],
      })
      .mockResolvedValueOnce({
        data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'rejected' }],
      });
    vi.mocked(applicationsApi.rejectApplication).mockResolvedValue({
      application: { id: 3, event_id: 1, user_id: 7, status: 'rejected' },
    });

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /change to rejected/i }));
    await waitFor(() => expect(applicationsApi.rejectApplication).toHaveBeenCalledWith(1, 3));
    expect(await screen.findByRole('button', { name: /change to approved/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(toastSpy).toHaveBeenCalledWith('Ana rejected');
  });

  test('shows empty state when no applicants', async () => {
    vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({ data: [] });

    render(
      <MemoryRouter initialEntries={['/events/2/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to event/i })).toHaveAttribute('href', '/events/2');
  });

  test('organizer can remove an applicant with x', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({
      data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'pending' }],
    });
    vi.mocked(applicationsApi.deleteEventApplication).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /remove ana/i })[0]!);
    await waitFor(() => expect(applicationsApi.deleteEventApplication).toHaveBeenCalledWith(1, 3));
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(toastSpy).toHaveBeenCalledWith('Ana removed');
  });

  test('reloads applicants when application_received refresh is requested', async () => {
    const { requestEventApplicationsRefresh } = await import(
      '../notifications/eventApplicationsRefresh'
    );
    vi.mocked(applicationsApi.listEventApplications)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: 9, user: { id: 7, name: 'Ana' }, status: 'pending' }],
      });

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
    requestEventApplicationsRefresh(1);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(applicationsApi.listEventApplications).toHaveBeenCalledTimes(2);
  });

  test('surfaces approve failure', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({
      data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'pending' }],
    });
    vi.mocked(applicationsApi.approveApplication).mockRejectedValue(new Error('Approve failed.'));

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /approve/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/approve failed/i);
    expect(toastSpy).toHaveBeenCalledWith('Approve failed.', 'error');
  });

  test('toggles show approved players publicly', async () => {
    const user = userEvent.setup();
    vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({ data: [] });
    vi.mocked(eventsApi.setParticipantsVisibility).mockResolvedValue({
      show_participants_publicly: true,
    });

    render(
      <MemoryRouter initialEntries={['/events/1/applications']}>
        <Routes>
          <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const toggle = await screen.findByRole('switch', { name: /show approved players publicly/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    await waitFor(() =>
      expect(eventsApi.setParticipantsVisibility).toHaveBeenCalledWith(1, true),
    );
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

describe('MyApplicationsPage', () => {
  test('lists applications and cancels pending', async () => {
    const user = userEvent.setup();
    const event = {
      id: 11,
      title: 'Friday League',
      description: 'x',
      event_type: 'league' as const,
      skill_level: 'intermediate' as const,
      barangay: null,
      city: 'Angeles City',
      starts_at: '2026-09-01T18:00:00.000Z',
      photo_url: null,
      visibility: 'live' as const,
      is_owner: false,
      my_application: null,
      created_by: { id: 1, name: 'Org' },
    };

    vi.mocked(applicationsApi.myApplications)
      .mockResolvedValueOnce({
        data: [{ id: 20, status: 'pending', event }],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(applicationsApi.cancelApplication).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/me/applications']}>
        <Routes>
          <Route path="/me/applications" element={<MyApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /my applications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /friday league/i })).toHaveAttribute('href', '/events/11');
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(applicationsApi.cancelApplication).toHaveBeenCalledWith(11));
    expect(await screen.findByText(/not applied to any events/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse events/i })).toHaveAttribute('href', '/events');
  });

  test('can delete an approved application from the list', async () => {
    const user = userEvent.setup();
    const event = {
      id: 12,
      title: 'Saturday Cup',
      description: 'x',
      event_type: 'open_play' as const,
      skill_level: 'all_levels' as const,
      barangay: null,
      city: 'Angeles City',
      starts_at: '2026-09-02T18:00:00.000Z',
      photo_url: null,
      visibility: 'live' as const,
      is_owner: false,
      my_application: null,
      created_by: { id: 1, name: 'Org' },
    };
    vi.mocked(applicationsApi.myApplications)
      .mockResolvedValueOnce({ data: [{ id: 21, status: 'approved', event }] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(applicationsApi.cancelApplication).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/me/applications']}>
        <Routes>
          <Route path="/me/applications" element={<MyApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(applicationsApi.cancelApplication).toHaveBeenCalledWith(12));
    expect(await screen.findByText(/not applied to any events/i)).toBeInTheDocument();
  });

  test('shows empty state when none', async () => {
    vi.mocked(applicationsApi.myApplications).mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <MyApplicationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/not applied to any events/i)).toBeInTheDocument();
  });
});
