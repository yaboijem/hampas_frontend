import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import ApplyButton from '../components/ApplyButton';
import EventApplicationsPage from '../pages/Applications/EventApplicationsPage';
import * as applicationsApi from '../api/applications';

vi.mock('../api/applications', () => ({
  apply: vi.fn(),
  cancelApplication: vi.fn(),
  listEventApplications: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  myApplications: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 9, name: 'Me', email: 'me@example.com', birth_date: '2000-01-01', gender: 'male', is_admin: false },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

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
    expect(await screen.findByText('pending')).toBeInTheDocument();
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

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /approve/i })[0]);

    await waitFor(() => expect(applicationsApi.approveApplication).toHaveBeenCalledWith(1, 3));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });
});
