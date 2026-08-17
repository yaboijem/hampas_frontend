import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';
import AdminRequestsPage from '../pages/Admin/AdminRequestsPage';
import * as adminApi from '../api/admin';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
  approveEvent: vi.fn(),
  rejectEvent: vi.fn(),
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminPendingCountsProvider>
        <Routes>
          <Route path="/admin/requests" element={<AdminRequestsPage />} />
        </Routes>
      </AdminPendingCountsProvider>
    </MemoryRouter>,
  );
}

describe('AdminRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 1,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'Coach A', email: 'c@e.com' },
      },
      {
        id: 2,
        role: 'organizer',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 2, name: 'Org B', email: 'o@e.com' },
      },
    ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([
      {
        id: 11,
        title: 'Pending Cup',
        description: '',
        event_type: 'tournament',
        skill_level: 'all_levels',
        barangay: null,
        city: 'Angeles City',
        starts_at: '2026-09-01T18:00:00+08:00',
        photo_url: null,
        visibility: 'pending_review',
        is_owner: false,
        my_application: null,
        created_by: { id: 3, name: 'Creator' },
      },
    ]);
  });

  test('defaults to coach tab', async () => {
    renderAt('/admin/requests');
    expect(await screen.findByText('Coach A')).toBeInTheDocument();
    expect(screen.queryByText('Org B')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Cup')).not.toBeInTheDocument();
  });

  test('organizer and events tabs switch content', async () => {
    const user = userEvent.setup();
    renderAt('/admin/requests');
    await screen.findByText('Coach A');

    await user.click(screen.getByRole('tab', { name: /organizer/i }));
    expect(await screen.findByText('Org B')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /events/i }));
    expect(await screen.findByText('Pending Cup')).toBeInTheDocument();
  });

  test('respects ?tab=events', async () => {
    renderAt('/admin/requests?tab=events');
    expect(await screen.findByText('Pending Cup')).toBeInTheDocument();
  });
});
