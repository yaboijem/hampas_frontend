export type AdminPendingCounts = {
  coach: number;
  organizer: number;
  events: number;
  total: number;
};

export type ToastKind = 'success' | 'error';

export type ToastPayload = {
  message: string;
  kind: ToastKind;
};

export function emptyCounts(): AdminPendingCounts {
  return { coach: 0, organizer: 0, events: 0, total: 0 };
}

const LABELS: {
  key: keyof Pick<AdminPendingCounts, 'coach' | 'organizer' | 'events'>;
  one: string;
  many: string;
}[] = [
  { key: 'coach', one: 'coach request', many: 'coach requests' },
  { key: 'organizer', one: 'organizer request', many: 'organizer requests' },
  { key: 'events', one: 'event request', many: 'event requests' },
];

export function buildIncreaseMessages(
  prev: AdminPendingCounts,
  next: AdminPendingCounts,
): string | null {
  const parts: string[] = [];
  for (const { key, one, many } of LABELS) {
    const delta = next[key] - prev[key];
    if (delta > 0) {
      parts.push(`${delta} new ${delta === 1 ? one : many}`);
    }
  }
  return parts.length ? parts.join(', ') : null;
}

type Listener = (toast: ToastPayload | null) => void;
const listeners = new Set<Listener>();

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(message: string, kind: ToastKind = 'success'): void {
  const payload: ToastPayload = { message, kind };
  for (const l of listeners) l(payload);
}
