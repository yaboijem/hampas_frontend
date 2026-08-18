export const EVENT_DETAIL_REFRESH = 'hampas:event-detail-refresh';

export function requestEventDetailRefresh(eventId: number): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_DETAIL_REFRESH, { detail: { eventId } }),
  );
}

export function eventIdFromDetailRefresh(event: Event): number | null {
  const detail = (event as CustomEvent<{ eventId?: number }>).detail;
  const id = detail?.eventId;
  return typeof id === 'number' ? id : null;
}
