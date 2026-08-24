import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NotificationsProvider, useNotifications } from '../notifications/NotificationsContext';
import * as notifApi from '../api/notifications';
import * as notes from '../lib/adminNotifications';

vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn(),
  unreadNotificationCount: vi.fn(),
  markNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false, email_verified_at: '2020-01-01',
  } as null | {
    id: number;
    name: string;
    email: string;
    birth_date: string;
    gender: 'male';
    is_admin: boolean;
  },
}));

vi.mock('../auth/AuthContext', () => ({
  isEmailVerified: (user: { is_admin?: boolean; email_verified_at?: string | null } | null) => Boolean(user?.is_admin || user?.email_verified_at),
  useAuth: () => ({
    user: auth.user,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

function Probe() {
  const { unreadCount, items } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <ul>
        {items.map((n) => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </div>
  );
}

const page = (data: unknown[]) => ({
  data,
  links: { first: null, last: null, prev: null, next: null },
  meta: { current_page: 1, last_page: 1, per_page: 15, total: data.length },
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male',
    is_admin: false, email_verified_at: '2020-01-01',
  };
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NotificationsProvider', () => {
  test('baselines without toasting existing unread', async () => {
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(notifApi.unreadNotificationCount).mockResolvedValue({ count: 1 });
    vi.mocked(notifApi.listNotifications).mockResolvedValue(
      page([
        {
          id: 10,
          message: 'You have been Approved by Org for the event "Cup".',
          type: 'application_decision',
          read_at: null,
          created_at: '2026-08-18T10:00:00Z',
          data: { event_id: 1, status: 'approved' },
        },
      ]) as never,
    );

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(toastSpy).not.toHaveBeenCalled();
  });

  test('toasts only newly seen unread after baseline', async () => {
    const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
    vi.mocked(notifApi.unreadNotificationCount)
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });
    vi.mocked(notifApi.listNotifications)
      .mockResolvedValueOnce(page([]) as never)
      .mockResolvedValue(
        page([
          {
            id: 11,
            message: 'You have been Rejected by Org for the event "Cup".',
            type: 'application_decision',
            read_at: null,
            created_at: '2026-08-18T11:00:00Z',
            data: { event_id: 1, status: 'rejected' },
          },
        ]) as never,
      );

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        'You have been Rejected by Org for the event "Cup".',
      ),
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});
