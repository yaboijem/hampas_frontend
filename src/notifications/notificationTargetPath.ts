import type { AppNotification } from '../api/types';

export function notificationTargetPath(
  n: Pick<AppNotification, 'type' | 'data'>,
): string | null {
  const eventId = n.data?.event_id;
  if (eventId == null) return null;
  if (n.type === 'application_received') {
    return `/events/${eventId}/applications`;
  }
  return `/events/${eventId}`;
}
