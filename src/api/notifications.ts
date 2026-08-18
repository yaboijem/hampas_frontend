import { api } from './client';
import type { AppNotification, Paginated } from './types';

export async function listNotifications(): Promise<Paginated<AppNotification>> {
  const { data } = await api.get('/me/notifications');
  return data;
}

export async function unreadNotificationCount(): Promise<{ count: number }> {
  const { data } = await api.get('/me/notifications/unread-count');
  return data;
}

export async function markNotificationsRead(
  body: { ids: number[] } | { all: true },
): Promise<void> {
  await api.post('/me/notifications/read', body);
}
