# Admin Requests Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Role and Event admin queues into one `/admin/requests` hub with Coach | Organizer | Events tabs, pending badges, poll-driven toasts, and FE-only browser push readiness.

**Architecture:** Extract existing role/event pages into panels under `AdminRequestsPage`. A shared `useAdminPendingCounts` hook polls pending role requests and `pending_review` events while an admin session is active. Header shows one Admin link + total badge; tabs show per-bucket badges. Toast utility compares count snapshots. Push subscribe client + SW push handlers no-op without `VITE_VAPID_PUBLIC_KEY` / backend.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Testing Library, react-router-dom v7, axios `api` client, existing VitePWA (`vite-plugin-pwa`)

## Global Constraints

- No new npm dependencies (toast is a tiny custom component)
- Admin UI only when `user.is_admin === true`
- Top tabs: `coach` | `organizer` | `events` (query `?tab=`)
- Events sub-tabs unchanged: Pending / Live / Rejected
- Badges count **pending only** (coach + organizer + `pending_review` events)
- Poll interval 30s; pause when `document.visibilityState !== 'visible'`
- No toast on first successful count fetch (baseline only)
- Old paths redirect: `/admin/role-requests` → `?tab=coach`, `/admin/event-requests` → `?tab=events`
- Nav label: **Admin** → `/admin/requests`
- Reuse existing admin APIs in `src/api/admin.ts` (no new backend routes required)
- Mirror existing admin tokens (`max-w-xl`, `font-display`, `bg-cobalt`, `border-border`, `bg-surface`, `shadow-soft`)
- Out of scope: real server push delivery, WebSockets, rejection reasons, bulk actions, `GET /admin/pending-counts`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/components/AdminPendingBadge.tsx` | Count pill (`99+` cap); hide at 0 |
| `src/components/ToastHost.tsx` | Minimal toast region + `showToast` / `subscribeToasts` |
| `src/lib/adminNotifications.ts` | Diff counts → toast message strings; apply baseline |
| `src/hooks/useAdminPendingCounts.ts` | Poll + visibility pause; expose counts + `refresh` |
| `src/pages/Admin/RoleRequestsPanel.tsx` | Pending role list filtered by elevated role |
| `src/pages/Admin/EventRequestsPanel.tsx` | Event visibility tabs + actions (from EventRequestsPage) |
| `src/pages/Admin/AdminRequestsPage.tsx` | Shell: title, top tabs, `?tab=` sync, panels |
| `src/push/adminPush.ts` | SW register helper + optional push subscribe POST |
| `public/admin-push-sw.js` | Imported by Workbox: `push` + `notificationclick` handlers |
| `src/config.ts` | Optional `VITE_VAPID_PUBLIC_KEY` |
| `vite.config.ts` | `workbox.importScripts: ['admin-push-sw.js']` |
| `src/App.tsx` | `/admin/requests` + redirects; remove old page elements |
| `src/components/AppHeader.tsx` | Single Admin link + badge; mount counts/toasts for admins |
| `src/pages/Admin/RoleRequestsPage.tsx` | Delete after migrate (or leave unused — prefer delete) |
| `src/pages/Admin/EventRequestsPage.tsx` | Delete after migrate |
| `src/test/admin-pending-badge.test.tsx` | Badge display rules |
| `src/test/admin-notifications.test.ts` | Diff → messages; no toast on baseline |
| `src/test/admin-requests-page.test.tsx` | Tabs, role filter, events panel smoke |
| `src/test/admin-pending-counts.test.tsx` | Hook poll + increase detection path via notifications |
| `src/test/admin-role-requests.test.tsx` | Retarget to RoleRequestsPanel |
| `src/test/admin-event-requests.test.tsx` | Retarget to EventRequestsPanel |
| `src/test/admin-header-badge.test.tsx` | Header Admin link + total badge |

---

### Task 1: AdminPendingBadge

**Files:**
- Create: `src/components/AdminPendingBadge.tsx`
- Test: `src/test/admin-pending-badge.test.tsx`

**Interfaces:**
- Consumes: none
- Produces: `AdminPendingBadge({ count: number; label?: string })` — renders nothing when `count <= 0`; shows `99+` when `count > 99`; otherwise decimal string. Optional `label` for `aria-label` context (e.g. "pending").

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AdminPendingBadge from '../components/AdminPendingBadge';

describe('AdminPendingBadge', () => {
  test('renders nothing when count is 0', () => {
    const { container } = render(<AdminPendingBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows count and caps at 99+', () => {
    const { rerender } = render(<AdminPendingBadge count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    rerender(<AdminPendingBadge count={100} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/admin-pending-badge.test.tsx`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement badge**

```tsx
// src/components/AdminPendingBadge.tsx
type Props = { count: number; label?: string };

export default function AdminPendingBadge({ count, label = 'pending' }: Props) {
  if (count <= 0) return null;
  const text = count > 99 ? '99+' : String(count);
  return (
    <span
      className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-cobalt px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${count} ${label}`}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/admin-pending-badge.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPendingBadge.tsx src/test/admin-pending-badge.test.tsx
git commit -m "feat: AdminPendingBadge for request counts"
```

---

### Task 2: ToastHost + adminNotifications

**Files:**
- Create: `src/components/ToastHost.tsx`
- Create: `src/lib/adminNotifications.ts`
- Test: `src/test/admin-notifications.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type AdminPendingCounts = { coach: number; organizer: number; events: number; total: number }`
  - `export function emptyCounts(): AdminPendingCounts`
  - `export function buildIncreaseMessages(prev: AdminPendingCounts, next: AdminPendingCounts): string | null` — returns combined human message or null if no increases
  - `export function showToast(message: string): void`
  - `export function subscribeToasts(listener: (msg: string | null) => void): () => void`
  - `ToastHost` component — mounts listener, shows latest message ~4s, `role="status"`

Message rules:
- Delta per bucket = `max(0, next - prev)`
- Labels: coach → "coach request(s)", organizer → "organizer request(s)", events → "event request(s)"
- Singular if delta === 1 else plural
- Join multiple with `", "`
- Example: prev coach 0 → next 2 ⇒ `"2 new coach requests"`
- Example: coach +1 and events +1 ⇒ `"1 new coach request, 1 new event request"`

- [ ] **Step 1: Write failing unit tests for messages**

```ts
import { describe, expect, test } from 'vitest';
import {
  buildIncreaseMessages,
  emptyCounts,
  type AdminPendingCounts,
} from '../lib/adminNotifications';

describe('buildIncreaseMessages', () => {
  test('returns null when nothing increased', () => {
    const c = { coach: 1, organizer: 0, events: 2, total: 3 };
    expect(buildIncreaseMessages(c, c)).toBeNull();
    expect(
      buildIncreaseMessages(c, { ...c, coach: 0, total: 2 }),
    ).toBeNull();
  });

  test('describes single and multiple increases', () => {
    const prev = emptyCounts();
    expect(
      buildIncreaseMessages(prev, {
        coach: 2,
        organizer: 0,
        events: 0,
        total: 2,
      }),
    ).toBe('2 new coach requests');
    expect(
      buildIncreaseMessages(prev, {
        coach: 1,
        organizer: 0,
        events: 1,
        total: 2,
      }),
    ).toBe('1 new coach request, 1 new event request');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/admin-notifications.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement adminNotifications + ToastHost**

```ts
// src/lib/adminNotifications.ts
export type AdminPendingCounts = {
  coach: number;
  organizer: number;
  events: number;
  total: number;
};

export function emptyCounts(): AdminPendingCounts {
  return { coach: 0, organizer: 0, events: 0, total: 0 };
}

const LABELS: { key: keyof Pick<AdminPendingCounts, 'coach' | 'organizer' | 'events'>; one: string; many: string }[] = [
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

type Listener = (message: string | null) => void;
const listeners = new Set<Listener>();

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(message: string): void {
  for (const l of listeners) l(message);
}
```

```tsx
// src/components/ToastHost.tsx
import { useEffect, useState } from 'react';
import { subscribeToasts } from '../lib/adminNotifications';

const DISMISS_MS = 4000;

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeToasts(setMessage), []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm font-medium text-navy shadow-soft"
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/admin-notifications.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminNotifications.ts src/components/ToastHost.tsx src/test/admin-notifications.test.ts
git commit -m "feat: admin toast host and increase message builder"
```

---

### Task 3: useAdminPendingCounts hook

**Files:**
- Create: `src/hooks/useAdminPendingCounts.ts`
- Test: `src/test/admin-pending-counts.test.tsx`

**Interfaces:**
- Consumes: `listAdminRoleRequests`, `listAdminEvents` from `../api/admin`; `buildIncreaseMessages`, `emptyCounts`, `showToast`, `AdminPendingCounts` from `../lib/adminNotifications`
- Produces:
  - `useAdminPendingCounts(enabled: boolean): { counts: AdminPendingCounts; refresh: () => Promise<void>; loading: boolean }`
  - When `enabled` is false: no fetch, counts stay empty, no timers
  - When enabled: fetch immediately; poll every 30_000 ms only if `document.visibilityState === 'visible'`; on `visibilitychange` to visible, refresh once
  - First successful snapshot: store as baseline, **do not** toast
  - Later successful snapshots: if `buildIncreaseMessages(prev, next)` non-null → `showToast(msg)` then update baseline to next
  - On fetch error: keep last counts; do not toast
  - `total` always `coach + organizer + events`

Fetch implementation:

```ts
async function fetchCounts(): Promise<AdminPendingCounts> {
  const [roles, events] = await Promise.all([
    listAdminRoleRequests('pending'),
    listAdminEvents('pending_review'),
  ]);
  const coach = roles.filter((r) => r.role === 'coach').length;
  const organizer = roles.filter((r) => r.role === 'organizer').length;
  const eventsCount = events.length;
  return {
    coach,
    organizer,
    events: eventsCount,
    total: coach + organizer + eventsCount,
  };
}
```

- [ ] **Step 1: Write failing hook tests**

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';
import * as adminApi from '../api/admin';
import * as notes from '../lib/adminNotifications';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
}));

describe('useAdminPendingCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(notes, 'showToast').mockImplementation(() => {});
  });

  test('loads counts when enabled and does not toast on first fetch', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 1,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'A', email: 'a@b.c' },
      },
    ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([]);

    const { result } = renderHook(() => useAdminPendingCounts(true));

    await waitFor(() => expect(result.current.counts.coach).toBe(1));
    expect(result.current.counts.total).toBe(1);
    expect(notes.showToast).not.toHaveBeenCalled();
  });

  test('toasts when refresh sees an increase', async () => {
    vi.mocked(adminApi.listAdminRoleRequests)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 2,
          role: 'organizer',
          status: 'pending',
          note: null,
          created_at: '2026-08-17T00:00:00Z',
          user: { id: 2, name: 'B', email: 'b@b.c' },
        },
      ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([]);

    const { result } = renderHook(() => useAdminPendingCounts(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(notes.showToast).toHaveBeenCalledWith('1 new organizer request');
    expect(result.current.counts.organizer).toBe(1);
  });

  test('does not fetch when disabled', async () => {
    renderHook(() => useAdminPendingCounts(false));
    expect(adminApi.listAdminRoleRequests).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/admin-pending-counts.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement hook**

```ts
// src/hooks/useAdminPendingCounts.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { listAdminEvents, listAdminRoleRequests } from '../api/admin';
import {
  buildIncreaseMessages,
  emptyCounts,
  showToast,
  type AdminPendingCounts,
} from '../lib/adminNotifications';

const POLL_MS = 30_000;

async function fetchCounts(): Promise<AdminPendingCounts> {
  const [roles, events] = await Promise.all([
    listAdminRoleRequests('pending'),
    listAdminEvents('pending_review'),
  ]);
  const coach = roles.filter((r) => r.role === 'coach').length;
  const organizer = roles.filter((r) => r.role === 'organizer').length;
  const eventsCount = events.length;
  return {
    coach,
    organizer,
    events: eventsCount,
    total: coach + organizer + eventsCount,
  };
}

export function useAdminPendingCounts(enabled: boolean): {
  counts: AdminPendingCounts;
  refresh: () => Promise<void>;
  loading: boolean;
} {
  const [counts, setCounts] = useState<AdminPendingCounts>(emptyCounts);
  const [loading, setLoading] = useState(enabled);
  const baselineReady = useRef(false);
  const prevRef = useRef<AdminPendingCounts>(emptyCounts());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await fetchCounts();
      if (baselineReady.current) {
        const msg = buildIncreaseMessages(prevRef.current, next);
        if (msg) showToast(msg);
      } else {
        baselineReady.current = true;
      }
      prevRef.current = next;
      setCounts(next);
    } catch {
      // keep last counts; silent
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      baselineReady.current = false;
      prevRef.current = emptyCounts();
      setCounts(emptyCounts());
      setLoading(false);
      return;
    }

    void refresh();

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, refresh]);

  return { counts, refresh, loading };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/admin-pending-counts.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAdminPendingCounts.ts src/test/admin-pending-counts.test.tsx
git commit -m "feat: useAdminPendingCounts poll hook with toast on increase"
```

---

### Task 4: RoleRequestsPanel (extract + filter)

**Files:**
- Create: `src/pages/Admin/RoleRequestsPanel.tsx`
- Modify: `src/test/admin-role-requests.test.tsx` (import panel; add filter test)
- Delete later: `RoleRequestsPage.tsx` (Task 6)

**Interfaces:**
- Consumes: `approveRoleRequest`, `listAdminRoleRequests`, `rejectRoleRequest`; `ElevatedRole`, `AdminRoleRequest`
- Produces: `RoleRequestsPanel({ role: ElevatedRole; onChanged?: () => void })`
  - Loads pending once on mount (and when `role` changes optional — same list can be refetched)
  - Filters `items` where `r.role === role`
  - On approve/reject success: remove id; call `onChanged?.()`
  - Empty: `No pending coach requests.` / `No pending organizer requests.`
  - Do **not** render page-level `h1` (shell owns title)

- [ ] **Step 1: Update tests to target panel + add coach filter**

Replace import with `RoleRequestsPanel`. Wrap:

```tsx
render(
  <MemoryRouter>
    <RoleRequestsPanel role="organizer" />
  </MemoryRouter>,
);
// and role="coach" for reject test
```

Add test:

```tsx
test('filters to the requested role only', async () => {
  vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
    {
      id: 1,
      role: 'coach',
      status: 'pending',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 1, name: 'Coach Only', email: 'c@e.com' },
    },
    {
      id: 2,
      role: 'organizer',
      status: 'pending',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 2, name: 'Org Only', email: 'o@e.com' },
    },
  ]);

  render(
    <MemoryRouter>
      <RoleRequestsPanel role="coach" />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Coach Only')).toBeInTheDocument();
  expect(screen.queryByText('Org Only')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm test -- src/test/admin-role-requests.test.tsx`

- [ ] **Step 3: Implement RoleRequestsPanel**

Copy logic from `RoleRequestsPage.tsx`; add `role` prop filter; empty copy by role; optional `onChanged`; drop outer `h1`/subtitle (keep list UI).

```tsx
import { useEffect, useState } from 'react';
import {
  approveRoleRequest,
  listAdminRoleRequests,
  rejectRoleRequest,
} from '../../api/admin';
import type { AdminRoleRequest, ElevatedRole } from '../../api/types';

type Props = { role: ElevatedRole; onChanged?: () => void };

export default function RoleRequestsPanel({ role, onChanged }: Props) {
  const [items, setItems] = useState<AdminRoleRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await listAdminRoleRequests('pending');
      setItems(data.filter((r) => r.role === role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when role tab changes
  }, [role]);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await rejectRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const empty =
    role === 'coach'
      ? 'No pending coach requests.'
      : 'No pending organizer requests.';

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
            >
              <p className="font-display font-bold text-navy">{r.user.name}</p>
              <p className="text-sm text-muted">{r.user.email}</p>
              {r.note ? <p className="mt-1 text-sm text-muted">{r.note}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void approve(r.id)}
                  className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void reject(r.id)}
                  className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/admin-role-requests.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin/RoleRequestsPanel.tsx src/test/admin-role-requests.test.tsx
git commit -m "feat: RoleRequestsPanel filtered by coach or organizer"
```

---

### Task 5: EventRequestsPanel (extract)

**Files:**
- Create: `src/pages/Admin/EventRequestsPanel.tsx`
- Modify: `src/test/admin-event-requests.test.tsx` — import `EventRequestsPanel`; add `onChanged` optional smoke if easy
- Keep card/actions identical to current `EventRequestsPage` body (no page `h1`)

**Interfaces:**
- Consumes: same APIs as EventRequestsPage
- Produces: `EventRequestsPanel({ onChanged?: () => void })` — call `onChanged` after successful approve/reject/delete

- [ ] **Step 1: Point tests at EventRequestsPanel**

```tsx
import EventRequestsPanel from '../pages/Admin/EventRequestsPanel';
// render <EventRequestsPanel /> instead of EventRequestsPage
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- src/test/admin-event-requests.test.tsx`

- [ ] **Step 3: Move implementation**

Copy `EventRequestsPage.tsx` → `EventRequestsPanel.tsx`:
- Export default `EventRequestsPanel`
- Remove outer title/subtitle (`h1` + first `p`)
- Keep tablist + list + actions
- After successful approve/reject/delete, call `onChanged?.()`
- Props: `{ onChanged?: () => void }`

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/admin-event-requests.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin/EventRequestsPanel.tsx src/test/admin-event-requests.test.tsx
git commit -m "feat: EventRequestsPanel extracted from event requests page"
```

---

### Task 6: AdminRequestsPage + routes + delete old pages

**Files:**
- Create: `src/pages/Admin/AdminRequestsPage.tsx`
- Create: `src/test/admin-requests-page.test.tsx`
- Modify: `src/App.tsx`
- Delete: `src/pages/Admin/RoleRequestsPage.tsx`, `src/pages/Admin/EventRequestsPage.tsx`

**Interfaces:**
- Consumes: panels; `useSearchParams` from react-router; `AdminPendingBadge`; optional `counts` via props **or** call `useAdminPendingCounts(true)` on page for tab badges (header will also call hook — **prefer single provider** in Task 7; for this task page may call hook itself for tab badges only, then Task 7 consolidates)
- **Decision for implementer:** Page owns `useAdminPendingCounts(true)` and passes `counts` + `refresh` into badges and `onChanged={refresh}` on panels. Header in Task 7 will use a small React context to avoid double poll.

Actually avoid double poll from the start:

**Also create in this task:**

- `src/admin/AdminPendingCountsContext.tsx`:
  - `AdminPendingCountsProvider({ children })` — if `user?.is_admin` then enable hook, else disabled
  - `useAdminPendingCountsContext(): { counts, refresh, loading }`

Wire provider in `App.tsx` inside `AuthProvider` (around routes + header is already outside main — put provider wrapping both header and main, inside AuthProvider).

```tsx
// App structure
<AuthProvider>
  <AdminPendingCountsProvider>
    <ToastHost />
    <AppHeader />
    <main>...</main>
  </AdminPendingCountsProvider>
</AuthProvider>
```

Provider implementation uses `useAuth().user?.is_admin === true` as `enabled`.

- [ ] **Step 1: Write AdminRequestsPage tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AdminRequestsPage from '../pages/Admin/AdminRequestsPage';
import * as adminApi from '../api/admin';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';

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
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- src/test/admin-requests-page.test.tsx`

- [ ] **Step 3: Implement context + page + App routes**

`src/admin/AdminPendingCountsContext.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';
import { emptyCounts, type AdminPendingCounts } from '../lib/adminNotifications';

type Ctx = {
  counts: AdminPendingCounts;
  refresh: () => Promise<void>;
  loading: boolean;
};

const AdminPendingCountsContext = createContext<Ctx>({
  counts: emptyCounts(),
  refresh: async () => {},
  loading: false,
});

export function AdminPendingCountsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const value = useAdminPendingCounts(user?.is_admin === true);
  return (
    <AdminPendingCountsContext.Provider value={value}>
      {children}
    </AdminPendingCountsContext.Provider>
  );
}

export function useAdminPendingCountsContext(): Ctx {
  return useContext(AdminPendingCountsContext);
}
```

`AdminRequestsPage.tsx` sketch:

```tsx
import { useSearchParams } from 'react-router-dom';
import AdminPendingBadge from '../../components/AdminPendingBadge';
import { useAdminPendingCountsContext } from '../../admin/AdminPendingCountsContext';
import RoleRequestsPanel from './RoleRequestsPanel';
import EventRequestsPanel from './EventRequestsPanel';

type Tab = 'coach' | 'organizer' | 'events';

function parseTab(raw: string | null): Tab {
  if (raw === 'organizer' || raw === 'events' || raw === 'coach') return raw;
  return 'coach';
}

export default function AdminRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));
  const { counts, refresh } = useAdminPendingCountsContext();

  const setTab = (next: Tab) => {
    setParams(next === 'coach' ? {} : { tab: next }, { replace: true });
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'coach', label: 'Coach', count: counts.coach },
    { id: 'organizer', label: 'Organizer', count: counts.organizer },
    { id: 'events', label: 'Events', count: counts.events },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
        Admin requests
      </h1>
      <p className="text-sm text-muted">
        Moderate role access and event go-live.
      </p>

      <div role="tablist" aria-label="Request type" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={
                selected
                  ? 'inline-flex items-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white'
                  : 'inline-flex items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy'
              }
            >
              {t.label}
              <AdminPendingBadge count={t.count} label={`${t.label} pending`} />
            </button>
          );
        })}
      </div>

      {tab === 'coach' ? (
        <RoleRequestsPanel role="coach" onChanged={() => void refresh()} />
      ) : null}
      {tab === 'organizer' ? (
        <RoleRequestsPanel role="organizer" onChanged={() => void refresh()} />
      ) : null}
      {tab === 'events' ? (
        <EventRequestsPanel onChanged={() => void refresh()} />
      ) : null}
    </div>
  );
}
```

**Badge on selected cobalt tab:** white-on-cobalt badge may low-contrast. Use a variant prop if needed:

```tsx
// Optional: AdminPendingBadge tone="onCobalt" | "default"
// onCobalt: bg-white text-cobalt
```

Implement `tone?: 'default' | 'onCobalt'` if visual contrast fails; default stays as Task 1.

`App.tsx` changes:
- Import `AdminRequestsPage`, `AdminPendingCountsProvider`, `ToastHost`, `Navigate`
- Wrap children of `AuthProvider` with provider + `ToastHost`
- Routes:

```tsx
<Route
  path="/admin/requests"
  element={
    <RequireAuth>
      <RequireAdmin>
        <AdminRequestsPage />
      </RequireAdmin>
    </RequireAuth>
  }
/>
<Route
  path="/admin/role-requests"
  element={<Navigate to="/admin/requests?tab=coach" replace />}
/>
<Route
  path="/admin/event-requests"
  element={<Navigate to="/admin/requests?tab=events" replace />}
/>
```

Note: redirects need not be admin-gated; landing on requests still hits RequireAdmin. Prefer wrapping redirects in RequireAuth only, or leave public Navigate (harmless).

Delete old page files.

- [ ] **Step 4: Run page + role + event tests**

Run: `npm test -- src/test/admin-requests-page.test.tsx src/test/admin-role-requests.test.tsx src/test/admin-event-requests.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin/AdminPendingCountsContext.tsx src/pages/Admin/AdminRequestsPage.tsx src/App.tsx src/components/ToastHost.tsx src/test/admin-requests-page.test.tsx
git add -u src/pages/Admin/RoleRequestsPage.tsx src/pages/Admin/EventRequestsPage.tsx
git commit -m "feat: merged Admin requests page with coach/organizer/events tabs"
```

---

### Task 7: AppHeader single Admin link + badge

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Create: `src/test/admin-header-badge.test.tsx`

**Interfaces:**
- Consumes: `useAdminPendingCountsContext`, `AdminPendingBadge`
- Produces: one NavLink **Admin** → `/admin/requests` (desktop + mobile) with total badge; remove Role requests / Event requests links
- Active state: `isActive` when path starts with `/admin`

```tsx
const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
  linkClass({ isActive: isActive || location.pathname.startsWith('/admin') });
// Or NavLink `className` fn checking isActive || pathname.startsWith('/admin')
```

- [ ] **Step 1: Write header test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AppHeader from '../components/AppHeader';
import { AdminPendingCountsProvider } from '../admin/AdminPendingCountsContext';
import * as adminApi from '../api/admin';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
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

// ThemeToggle may need ThemeProvider — wrap if tests fail
import { ThemeProvider } from '../theme/ThemeContext';

describe('AppHeader admin badge', () => {
  beforeEach(() => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 1,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'A', email: 'a@b.c' },
      },
    ]);
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([
      {
        id: 11,
        title: 'E',
        description: '',
        event_type: 'open_play',
        skill_level: 'all_levels',
        barangay: null,
        city: 'X',
        starts_at: '2026-09-01T18:00:00+08:00',
        photo_url: null,
        visibility: 'pending_review',
        is_owner: false,
        my_application: null,
        created_by: { id: 3, name: 'C' },
      },
    ]);
  });

  test('shows Admin link with total pending badge', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AdminPendingCountsProvider>
            <AppHeader />
          </AdminPendingCountsProvider>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const links = await screen.findAllByRole('link', { name: /admin/i });
    expect(links.length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /role requests/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /event requests/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/2 pending/i).length).toBeGreaterThan(0);
    });
  });
});
```

Adjust aria expectations to match `AdminPendingBadge` (`aria-label={`${count} pending`}` → `"2 pending"`).

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- src/test/admin-header-badge.test.tsx`

- [ ] **Step 3: Update AppHeader**

Replace dual admin links with:

```tsx
{user.is_admin ? (
  <NavLink to="/admin/requests" className={linkClass}>
    <span className="inline-flex items-center">
      Admin
      <AdminPendingBadge count={counts.total} />
    </span>
  </NavLink>
) : null}
```

Use `const { counts } = useAdminPendingCountsContext();` at top of component (safe when provider always wraps — non-admins get empty counts).

Same for mobile menu.

- [ ] **Step 4: Run header + full admin tests**

Run: `npm test -- src/test/admin-header-badge.test.tsx src/test/admin-requests-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AppHeader.tsx src/test/admin-header-badge.test.tsx
git commit -m "feat: single Admin nav link with pending badge"
```

---

### Task 8: Browser push FE readiness

**Files:**
- Modify: `src/config.ts` — add `VAPID_PUBLIC_KEY`
- Create: `src/push/adminPush.ts`
- Create: `public/admin-push-sw.js`
- Modify: `vite.config.ts` — `workbox.importScripts: ['/admin-push-sw.js']` (path as required by plugin; often relative to public root)
- Modify: `src/pages/Admin/AdminRequestsPage.tsx` or provider — call `ensureAdminPushRegistration()` once when admin mounts (fire-and-forget)
- Test: `src/test/admin-push.test.ts` — unit test pure helpers (urlBase64ToUint8Array / subscribe no-op without key)

**Interfaces:**
- `export const VAPID_PUBLIC_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY`
- `export async function ensureAdminPushRegistration(): Promise<void>` — no-op if no `serviceWorker` or no VAPID key
- `export async function subscribeAdminPush(): Promise<boolean>` — subscribe + `POST /admin/push-subscriptions` via `api`; return false on any failure

`public/admin-push-sw.js`:

```js
self.addEventListener('push', (event) => {
  let title = 'Hampas admin';
  let body = 'You have a new request';
  let url = '/admin/requests';
  try {
    if (event.data) {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.url) url = data.url;
    }
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin/requests';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
```

`adminPush.ts` sketch:

```ts
import { api } from '../api/client';
import { VAPID_PUBLIC_KEY } from '../config';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureAdminPushRegistration(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    await navigator.serviceWorker.ready;
    await subscribeAdminPush();
  } catch {
    // silent
  }
}

export async function subscribeAdminPush(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await api.post('/admin/push-subscriptions', sub.toJSON());
    return true;
  } catch {
    return false;
  }
}
```

Call from `AdminPendingCountsProvider` when enabled becomes true (once):

```ts
useEffect(() => {
  if (user?.is_admin) void ensureAdminPushRegistration();
}, [user?.is_admin]);
```

vite.config workbox:

```ts
workbox: {
  navigateFallbackDenylist: [/^\/api\//],
  navigateFallback: '/offline',
  importScripts: ['admin-push-sw.js'],
},
```

- [ ] **Step 1: Test urlBase64 / no-key no-op**

```ts
import { describe, expect, test, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({ VAPID_PUBLIC_KEY: undefined }));
vi.mock('../api/client', () => ({ api: { post: vi.fn() } }));

import { subscribeAdminPush } from '../push/adminPush';

describe('subscribeAdminPush', () => {
  test('returns false without VAPID key', async () => {
    await expect(subscribeAdminPush()).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run fail then implement**

Run: `npm test -- src/test/admin-push.test.ts`

- [ ] **Step 3: Wire config, SW, vite, provider call**

- [ ] **Step 4: Run push test + `npm run build`** to ensure PWA config still builds

Run: `npm test -- src/test/admin-push.test.ts`  
Run: `npm run build`

Expected: PASS / build OK

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/push/adminPush.ts public/admin-push-sw.js vite.config.ts src/admin/AdminPendingCountsContext.tsx src/test/admin-push.test.ts
git commit -m "feat: admin web push client stub and SW push handlers"
```

---

### Task 9: Full regression + polish

**Files:**
- Any contrast fix for badge on cobalt tabs
- Ensure `npm test` and `npm run lint` clean

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all PASS; fix any broken imports from deleted pages

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: clean (or only pre-existing unrelated issues)

- [ ] **Step 3: Manual checklist (document in commit body if needed)**

1. Login as admin → one **Admin** nav item  
2. Open `/admin/requests` → Coach default  
3. Organizer / Events tabs work; event Pending/Live/Rejected intact  
4. `/admin/role-requests` and `/admin/event-requests` redirect  
5. Pending badges update after approve  
6. (Optional) mock second poll increase → toast  

- [ ] **Step 4: Final commit if polish needed**

```bash
git add -A
git commit -m "chore: admin requests merge polish and regression fixes"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Merge into `/admin/requests` | 6 |
| Tabs Coach \| Organizer \| Events | 6 |
| Events sub-tabs + actions | 5 |
| Role filter by elevated role | 4 |
| Redirects old URLs | 6 |
| Single Admin nav | 7 |
| Pending badges nav + tabs | 1, 6, 7 |
| Poll 30s + visibility | 3 |
| Toast on increase after baseline | 2, 3 |
| Refresh counts after actions | 6 |
| FE push SW + subscribe stub | 8 |
| Tests | 1–8 |
| No new backend routes required | all |

## Self-review notes

- No TBD placeholders; double-poll avoided via `AdminPendingCountsProvider`
- Badge contrast on selected tab handled with optional `tone` in Task 6
- `listAdminEvents` length used for event count (spec pagination follow-up OK)
- ToastHost mounted once in App under provider
