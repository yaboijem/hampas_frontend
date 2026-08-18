export const EVENT_APPLICATIONS_REFRESH = 'hampas:event-applications-refresh';

export function requestEventApplicationsRefresh(eventId: number): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_APPLICATIONS_REFRESH, { detail: { eventId } }),
  );
}

export function eventIdFromApplicationsRefresh(event: Event): number | null {
  const detail = (event as CustomEvent<{ eventId?: number }>).detail;
  const id = detail?.eventId;
  return typeof id === 'number' ? id : null;
}
