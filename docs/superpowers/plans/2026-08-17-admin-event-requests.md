# Admin Event Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can moderate events via a tabbed queue (pending / live / rejected) with approve and reject actions, matching Role requests UX.

**Architecture:** Extend existing `src/api/admin.ts` against backend routes already live under `/api/admin/events`. Add `EventRequestsPage` gated by `RequireAdmin`, plus header nav. Backend needs no new routes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Testing Library, react-router, axios `api` client, Laravel Sanctum admin APIs

## Global Constraints

- No new dependencies
- Admin UI only when `user.is_admin === true`
- Tabs: Pending → `pending_review`, Live → `live`, Rejected → `rejected`
- Approve/reject buttons only on Pending tab
- Mirror `RoleRequestsPage` tokens (`max-w-xl`, `font-display`, `bg-cobalt`, `border-border`, `bg-surface`)
- Reuse `EventItem`, `Visibility`, `Paginated`, `typeLabel`, `formatEventPlace`, `formatEventWhen`
- Out of scope: edit event fields, reject reason, bulk actions, notifications, shared `/admin` shell
- Backend routes already exist — do not add duplicate routes

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/api/admin.ts` | Add list/approve/reject admin events (keep role-request fns) |
| `src/pages/Admin/EventRequestsPage.tsx` | Tabs + queue cards + actions |
| `src/App.tsx` | Route `/admin/event-requests` |
| `src/components/AppHeader.tsx` | Desktop + mobile “Event requests” nav |
| `src/test/admin-event-requests.test.tsx` | Load, tabs, approve, reject |
| Backend | No changes (`AdminEventController` + `routes/api.php` already wired) |

---

### Task 1: Admin event API client

**Files:**
- Modify: `src/api/admin.ts`

**Interfaces:**
- Consumes: `api` from `./client`; `EventItem`, `Visibility`, `Paginated` from `./types`
- Produces:
  - `listAdminEvents(visibility: Visibility): Promise<EventItem[]>`
  - `approveEvent(id: number): Promise<EventItem>`
  - `rejectEvent(id: number): Promise<EventItem>`
- Keeps existing: `listAdminRoleRequests`, `approveRoleRequest`, `rejectRoleRequest`

- [ ] **Step 1: Extend `src/api/admin.ts`**

Replace file contents with:

```ts
import { api } from './client';
import type {
  AdminRoleRequest,
  EventItem,
  Paginated,
  RoleRequestStatus,
  Visibility,
} from './types';

export async function listAdminRoleRequests(
  status: RoleRequestStatus = 'pending',
): Promise<AdminRoleRequest[]> {
  const { data } = await api.get('/admin/role-requests', { params: { status } });
  return data;
}

export async function approveRoleRequest(id: number): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/approve`);
  return data;
}

export async function rejectRoleRequest(
  id: number,
  reason?: string,
): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/reject`, {
    reason: reason ?? null,
  });
  return data;
}

export async function listAdminEvents(visibility: Visibility): Promise<EventItem[]> {
  const { data } = await api.get<Paginated<EventItem>>('/admin/events', {
    params: { visibility },
  });
  return data.data;
}

export async function approveEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/approve`);
  return data;
}

export async function rejectEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/reject`);
  return data;
}
```

Notes:
- Laravel pagination shape is `{ data: EventItem[], ... }`; unwrap to `EventItem[]` for the page.
- Approve/reject use **PATCH** (not POST), matching `routes/api.php`.

- [ ] **Step 2: Commit**

```bash
git add src/api/admin.ts
git commit -m "feat: admin event list approve reject API client"
```

---

### Task 2: EventRequestsPage + tests (TDD)

**Files:**
- Create: `src/test/admin-event-requests.test.tsx`
- Create: `src/pages/Admin/EventRequestsPage.tsx`

**Interfaces:**
- Consumes: `listAdminEvents`, `approveEvent`, `rejectEvent` from `../../api/admin`
- Consumes: `EventItem`, `Visibility` from `../../api/types`
- Consumes: `typeLabel`, `formatEventPlace`, `formatEventWhen` from `../../events/eventLabels`
- Produces: default export `EventRequestsPage`

- [ ] **Step 1: Write failing tests**

Create `src/test/admin-event-requests.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventRequestsPage from '../pages/Admin/EventRequestsPage';
import * as adminApi from '../api/admin';
import type { EventItem } from '../api/types';

vi.mock('../api/admin', () => ({
  listAdminEvents: vi.fn(),
  approveEvent: vi.fn(),
  rejectEvent: vi.fn(),
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
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

function pendingEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 11,
    title: 'Angeles Open Cup',
    description: 'Review me',
    event_type: 'tournament',
    skill_level: 'advanced',
    barangay: 'Malabanias',
    city: 'Angeles City',
    starts_at: '2026-09-01T18:00:00+08:00',
    photo_url: null,
    visibility: 'pending_review',
    is_owner: false,
    my_application: null,
    created_by: { id: 3, name: 'Sample Organizer' },
    ...overrides,
  };
}

describe('EventRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending events and approves one', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([pendingEvent()]);
    vi.mocked(adminApi.approveEvent).mockResolvedValue(
      pendingEvent({ visibility: 'live' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Angeles Open Cup')).toBeInTheDocument();
    expect(screen.getByText('Sample Organizer')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith('pending_review');

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(adminApi.approveEvent).toHaveBeenCalledWith(11));
    await waitFor(() =>
      expect(screen.queryByText('Angeles Open Cup')).not.toBeInTheDocument(),
    );
  });

  test('rejects a pending event', async () => {
    vi.mocked(adminApi.listAdminEvents).mockResolvedValue([
      pendingEvent({ id: 12, title: 'Reject Me' }),
    ]);
    vi.mocked(adminApi.rejectEvent).mockResolvedValue(
      pendingEvent({ id: 12, title: 'Reject Me', visibility: 'rejected' }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Reject Me');
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(adminApi.rejectEvent).toHaveBeenCalledWith(12));
    await waitFor(() =>
      expect(screen.queryByText('Reject Me')).not.toBeInTheDocument(),
    );
  });

  test('Live tab loads live visibility without action buttons', async () => {
    vi.mocked(adminApi.listAdminEvents).mockImplementation(async (visibility) => {
      if (visibility === 'pending_review') return [];
      if (visibility === 'live') {
        return [
          pendingEvent({
            id: 20,
            title: 'Already Live',
            visibility: 'live',
          }),
        ];
      }
      return [];
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText(/no pending events/i);
    await user.click(screen.getByRole('tab', { name: /live/i }));

    expect(await screen.findByText('Already Live')).toBeInTheDocument();
    expect(adminApi.listAdminEvents).toHaveBeenCalledWith('live');
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/test/admin-event-requests.test.tsx`

Expected: FAIL (module/page missing or incomplete)

- [ ] **Step 3: Implement `src/pages/Admin/EventRequestsPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { approveEvent, listAdminEvents, rejectEvent } from '../../api/admin';
import type { EventItem, Visibility } from '../../api/types';
import {
  formatEventPlace,
  formatEventWhen,
  typeLabel,
} from '../../events/eventLabels';

const TABS: { id: Visibility; label: string; empty: string }[] = [
  { id: 'pending_review', label: 'Pending', empty: 'No pending events.' },
  { id: 'live', label: 'Live', empty: 'No live events.' },
  { id: 'rejected', label: 'Rejected', empty: 'No rejected events.' },
];

export default function EventRequestsPage() {
  const [tab, setTab] = useState<Visibility>('pending_review');
  const [items, setItems] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (visibility: Visibility) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminEvents(visibility);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
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
      await rejectEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy = TABS.find((t) => t.id === tab)?.empty ?? 'No events.';
  const showActions = tab === 'pending_review';

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
        Event requests
      </h1>
      <p className="text-sm text-muted">Approve events before they go live.</p>

      <div role="tablist" aria-label="Event visibility" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
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
                  ? 'rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white'
                  : 'rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy'
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{emptyCopy}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
            >
              <p className="font-display font-bold text-navy">{e.title}</p>
              <p className="text-sm text-muted">{typeLabel(e.event_type)}</p>
              <p className="text-sm text-muted">
                {formatEventPlace(e.barangay, e.city)}
              </p>
              <p className="text-sm text-muted">{formatEventWhen(e.starts_at)}</p>
              <p className="mt-1 text-sm text-navy">{e.created_by.name}</p>
              {!showActions ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {e.visibility === 'live' ? 'Live' : 'Rejected'}
                </p>
              ) : null}
              {showActions ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void approve(e.id)}
                    className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void reject(e.id)}
                    className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/test/admin-event-requests.test.tsx`

Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/test/admin-event-requests.test.tsx src/pages/Admin/EventRequestsPage.tsx
git commit -m "feat: admin event requests queue page"
```

---

### Task 3: Route + header nav

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppHeader.tsx`

**Interfaces:**
- Consumes: `EventRequestsPage` default export
- Produces: route `/admin/event-requests`; nav links labeled “Event requests”

- [ ] **Step 1: Wire route in `src/App.tsx`**

Add import next to RoleRequestsPage:

```ts
import EventRequestsPage from './pages/Admin/EventRequestsPage';
```

Immediately after the `/admin/role-requests` route block, add:

```tsx
                <Route
                  path="/admin/event-requests"
                  element={
                    <RequireAuth>
                      <RequireAdmin>
                        <EventRequestsPage />
                      </RequireAdmin>
                    </RequireAuth>
                  }
                />
```

- [ ] **Step 2: Desktop nav in `src/components/AppHeader.tsx`**

Find the desktop admin block:

```tsx
              {user.is_admin ? (
                <NavLink to="/admin/role-requests" className={linkClass}>
                  Role requests
                </NavLink>
              ) : null}
```

Replace with:

```tsx
              {user.is_admin ? (
                <>
                  <NavLink to="/admin/role-requests" className={linkClass}>
                    Role requests
                  </NavLink>
                  <NavLink to="/admin/event-requests" className={linkClass}>
                    Event requests
                  </NavLink>
                </>
              ) : null}
```

- [ ] **Step 3: Mobile menu in `src/components/AppHeader.tsx`**

Find the mobile admin block:

```tsx
                      {user.is_admin ? (
                        <NavLink
                          to="/admin/role-requests"
                          role="menuitem"
                          className={menuLinkClass}
                        >
                          Role requests
                        </NavLink>
                      ) : null}
```

Replace with:

```tsx
                      {user.is_admin ? (
                        <>
                          <NavLink
                            to="/admin/role-requests"
                            role="menuitem"
                            className={menuLinkClass}
                          >
                            Role requests
                          </NavLink>
                          <NavLink
                            to="/admin/event-requests"
                            role="menuitem"
                            className={menuLinkClass}
                          >
                            Event requests
                          </NavLink>
                        </>
                      ) : null}
```

- [ ] **Step 4: Run related tests**

Run: `npm test -- src/test/admin-event-requests.test.tsx src/test/admin-role-requests.test.tsx`

Expected: PASS

- [ ] **Step 5: Lint / typecheck**

Run: `npm run lint`

If the project uses `tsc` via build: `npx tsc -b --pretty false` (or `npm run build` if preferred and time allows)

Expected: no new errors in touched files

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/AppHeader.tsx
git commit -m "feat: route and nav for admin event requests"
```

---

### Task 4: Backend contract check (no code unless broken)

**Files:**
- Verify only: `M:\hampas_backend\routes\api.php` (admin group)
- Verify only: `M:\hampas_backend\app\Http\Controllers\AdminEventController.php`
- Verify only: `M:\hampas_backend\tests\Feature\AdminEventTest.php`

**Interfaces:**
- Confirms existing:
  - `GET /api/admin/events?visibility=`
  - `PATCH /api/admin/events/{event}/approve`
  - `PATCH /api/admin/events/{event}/reject`

- [ ] **Step 1: Confirm routes present**

In `routes/api.php` under `middleware(['auth:sanctum', 'admin'])->prefix('admin')`:

```php
Route::get('/events', [AdminEventController::class, 'index']);
Route::patch('/events/{event}/approve', [AdminEventController::class, 'setVisibility'])->defaults('visibility', 'live');
Route::patch('/events/{event}/reject', [AdminEventController::class, 'setVisibility'])->defaults('visibility', 'rejected');
```

If missing, add exactly those three lines inside the admin group. Do **not** invent new paths.

- [ ] **Step 2: Run backend admin event tests**

From `M:\hampas_backend`:

```bash
php artisan test --filter=AdminEventTest
```

Expected: PASS

- [ ] **Step 3: Commit only if backend files changed**

```bash
git add routes/api.php app/Http/Controllers/AdminEventController.php
git commit -m "fix: ensure admin event moderation routes"
```

If nothing changed, skip commit.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Page `/admin/event-requests` + RequireAdmin | Task 3 |
| Tabs pending / live / rejected | Task 2 |
| List via GET admin events | Task 1–2 |
| Approve / reject pending only | Task 2 |
| Nav link Event requests | Task 3 |
| API client unwrap pagination | Task 1 |
| Tests approve/reject/tabs | Task 2 |
| Backend routes exist | Task 4 |
| Out of scope items not built | All tasks |

## Manual smoke (after implementation)

1. Log in as `admin@hampas.test` / `password`
2. Open **Event requests** in header
3. Create or seed an event with `visibility = pending_review` (organizer create flow, or tinker)
4. Approve → event disappears from Pending; appears under Live; public event detail works
5. Reject another → disappears from Pending; under Rejected; public show 404
