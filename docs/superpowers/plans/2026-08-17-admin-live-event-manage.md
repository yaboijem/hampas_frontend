# Admin Live Event Manage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins can update and delete any live event via existing event APIs, event detail chrome, and the admin Live tab.

**Architecture:** Expand `EventController::update` / `destroy` to allow owner OR `is_admin`. Frontend gates manage UI with `is_owner || (is_admin && visibility === 'live')`. Reuse `updateEvent` / `deleteEvent` and `EditEventPage`; no new admin write routes.

**Tech Stack:** Laravel (PHPUnit), React 19, TypeScript, Vitest, Testing Library, react-router, axios

## Global Constraints

- No new dependencies
- No new `/admin/events/{id}` write routes — use `PUT/DELETE /api/events/{event}`
- Manage applications stays owner-only
- Admin product chrome only for **live** events (backend still allows admin on any visibility)
- Hard delete with existing confirm copy
- Out of scope: bulk actions, audit log, soft-delete, applications management for admin

---

## File Structure

| File | Responsibility |
|------|----------------|
| `M:\hampas_backend\app\Http\Controllers\EventController.php` | Owner-or-admin on update/destroy |
| `M:\hampas_backend\tests\Feature\EventTest.php` | Admin can update/delete non-owned live event |
| `src/pages/Events/EventDetailPage.tsx` | `canManage` Edit/Delete; apps owner-only |
| `src/test/event-detail.test.tsx` | Admin live manage tools |
| `src/pages/Admin/EventRequestsPage.tsx` | Live tab Edit + Delete |
| `src/test/admin-event-requests.test.tsx` | Live tab edit link + delete |

---

### Task 1: Backend — admin may update/delete any event

**Files:**
- Modify: `M:\hampas_backend\app\Http\Controllers\EventController.php` (`update`, `destroy`)
- Modify: `M:\hampas_backend\tests\Feature\EventTest.php`

**Interfaces:**
- Consumes: `$request->user()->id`, `$request->user()->is_admin`, `$event->created_by`
- Produces: same HTTP contracts; 403 only when neither owner nor admin

- [ ] **Step 1: Add failing admin ownership tests to `EventTest.php`**

After `test_only_owner_can_update_event`, add:

```php
    public function test_admin_can_update_and_delete_non_owned_live_event(): void
    {
        [$owner] = $this->authUser(withPriorLiveEvent: true);
        $admin = User::factory()->create([
            'birth_date' => '1990-01-01',
            'gender' => 'other',
            'is_admin' => true,
        ]);
        $adminToken = $admin->createToken('spa')->plainTextToken;

        $event = Event::create([
            'created_by' => $owner->id,
            'title' => 'Owner live event',
            'description' => 'x',
            'event_type' => 'league',
            'skill_level' => 'intermediate',
            'city' => 'Angeles City',
            'starts_at' => now()->addDays(4),
            'visibility' => 'live',
        ]);

        $this->withToken($adminToken)->putJson("/api/events/{$event->id}", $this->payload([
            'title' => 'Admin corrected title',
        ]))
            ->assertStatus(200)
            ->assertJsonPath('title', 'Admin corrected title');

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'title' => 'Admin corrected title',
            'created_by' => $owner->id,
        ]);

        $this->withToken($adminToken)->deleteJson("/api/events/{$event->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('events', ['id' => $event->id]);
    }
```

Keep existing `test_only_owner_can_update_event` (non-admin non-owner still 403).

- [ ] **Step 2: Run test — expect FAIL**

From `M:\hampas_backend`:

```bash
php artisan test --filter=test_admin_can_update_and_delete_non_owned_live_event
```

Expected: FAIL with 403 on put or delete

- [ ] **Step 3: Update authorization in `EventController.php`**

In both `update` and `destroy`, replace:

```php
abort_unless((int) $event->created_by === $request->user()->id, 403);
```

with:

```php
$user = $request->user();
abort_unless(
    (int) $event->created_by === (int) $user->id || (bool) $user->is_admin,
    403
);
```

Do not change validation, photo handling, or response shapes.

- [ ] **Step 4: Run EventTest — expect PASS**

```bash
php artisan test --filter=EventTest
```

Expected: all EventTest cases PASS including the new admin case and existing non-owner 403

- [ ] **Step 5: Commit (backend repo)**

```bash
cd M:\hampas_backend
git add app/Http/Controllers/EventController.php tests/Feature/EventTest.php
git commit -m "feat: allow admin to update and delete any event"
```

---

### Task 2: Event detail — admin manage chrome + tests

**Files:**
- Modify: `src/pages/Events/EventDetailPage.tsx`
- Modify: `src/test/event-detail.test.tsx`

**Interfaces:**
- Consumes: `useAuth().user` (`is_admin`), `event.is_owner`, `event.visibility`
- Produces: `canManage = is_owner || (is_admin && visibility === 'live')`
- Manage applications link only when `event.is_owner`

- [ ] **Step 1: Extend `src/test/event-detail.test.tsx` for admin**

The file currently hardcodes `is_admin: false` in `vi.mock('../auth/AuthContext')`. Replace the mock with a hoisted mutable user so tests can flip admin:

At top of file (replace existing AuthContext mock and keep events mock):

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EventDetailPage from '../pages/Events/EventDetailPage';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

const authState = vi.hoisted(() => ({
  user: {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false,
  },
}));

vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  deleteEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
```

In `beforeEach`, reset admin flag:

```tsx
beforeEach(() => {
  vi.mocked(eventsApi.getEvent).mockReset();
  vi.mocked(eventsApi.deleteEvent).mockReset();
  authState.user = {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male',
    is_admin: false,
  };
});
```

Add test at end of describe:

```tsx
  test('admin sees edit and delete on non-owned live event but not manage applications', async () => {
    authState.user = {
      ...authState.user,
      is_admin: true,
    };
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      is_owner: false,
      visibility: 'live',
    });
    renderDetail();

    expect(await screen.findByRole('link', { name: /edit event/i })).toHaveAttribute(
      'href',
      '/events/7/edit',
    );
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /manage applications/i }),
    ).not.toBeInTheDocument();
  });

  test('admin does not see manage tools on non-owned pending event', async () => {
    authState.user = {
      ...authState.user,
      is_admin: true,
    };
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      ...baseEvent,
      title: 'Still Pending',
      is_owner: false,
      visibility: 'pending_review',
    });
    renderDetail();

    expect(await screen.findByRole('heading', { name: /still pending/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit event/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete event/i })).not.toBeInTheDocument();
  });
```

Note: non-owned pending may 404 from public API in production; test still documents UI gate if the page has an event object.

- [ ] **Step 2: Run event-detail tests — expect FAIL on admin live tools**

```bash
npm test -- src/test/event-detail.test.tsx
```

Expected: FAIL — admin does not see Edit/Delete

- [ ] **Step 3: Update `EventDetailPage.tsx`**

1. Import and use auth:

```tsx
import { useAuth } from '../../auth/AuthContext';
```

Inside component (after hooks that already exist):

```tsx
const { user } = useAuth();
```

2. After `showApplyChrome` computation:

```tsx
const canManage =
  event.is_owner ||
  (user?.is_admin === true && event.visibility === 'live');
```

3. Replace the owner-only tools block:

```tsx
      {canManage && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            to={`/events/${event.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-cobalt"
          >
            Edit event
          </Link>
          {event.is_owner ? (
            <Link
              to={`/events/${event.id}/applications`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-cobalt"
            >
              Manage applications
            </Link>
          ) : null}
          <button
            type="button"
            onClick={remove}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete event
          </button>
        </div>
      )}
```

Keep `remove` and other page behavior unchanged.

- [ ] **Step 4: Run event-detail tests — expect PASS**

```bash
npm test -- src/test/event-detail.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Events/EventDetailPage.tsx src/test/event-detail.test.tsx
git commit -m "feat: admin edit delete controls on live event detail"
```

---

### Task 3: Admin Live tab — Edit + Delete

**Files:**
- Modify: `src/pages/Admin/EventRequestsPage.tsx`
- Modify: `src/test/admin-event-requests.test.tsx`

**Interfaces:**
- Consumes: `deleteEvent` from `../../api/events`
- Consumes: `Link` from `react-router-dom`
- Live tab only: Edit link + Delete button (not Approve/Reject)

- [ ] **Step 1: Update Live-tab test in `admin-event-requests.test.tsx`**

1. Add mock for events API:

```tsx
vi.mock('../api/events', () => ({
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));
```

2. Import:

```tsx
import * as eventsApi from '../api/events';
```

3. In `beforeEach`, also `vi.mocked(eventsApi.deleteEvent).mockReset()` (or rely on `clearAllMocks`).

4. **Replace** test `'Live tab loads live visibility without action buttons'` with:

```tsx
  test('Live tab shows edit and delete for live events', async () => {
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
    vi.mocked(eventsApi.deleteEvent).mockResolvedValue(undefined);

    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

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

    expect(screen.getByRole('link', { name: /^edit$/i })).toHaveAttribute(
      'href',
      '/events/20/edit',
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(eventsApi.deleteEvent).toHaveBeenCalledWith(20));
    await waitFor(() =>
      expect(screen.queryByText('Already Live')).not.toBeInTheDocument(),
    );
  });
```

- [ ] **Step 2: Run admin-event-requests tests — expect FAIL**

```bash
npm test -- src/test/admin-event-requests.test.tsx
```

Expected: FAIL — no Edit/Delete on Live tab

- [ ] **Step 3: Implement Live manage actions on `EventRequestsPage.tsx`**

1. Imports:

```tsx
import { Link } from 'react-router-dom';
import { deleteEvent } from '../../api/events';
```

Keep existing admin API imports.

2. Add `remove` handler next to `reject`:

```tsx
  const remove = async (id: number) => {
    if (!window.confirm('Delete this event?')) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteEvent(id);
      setItems((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };
```

3. After computing `showActions`, add:

```tsx
  const showLiveManage = tab === 'live';
```

4. In the card, after the pending actions block (or restructure), add live manage UI. Replace the actions section of each card with:

```tsx
              {!showActions && !showLiveManage ? (
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
              {showLiveManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted">
                    Live
                  </p>
                  <Link
                    to={`/events/${e.id}/edit`}
                    className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === e.id}
                    onClick={() => void remove(e.id)}
                    className="rounded-[var(--radius-control)] border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
```

Remove the old single `!showActions` badge block if it would duplicate with the new structure (the snippet above replaces both the old badge and pending-only actions).

- [ ] **Step 4: Run admin + detail tests — expect PASS**

```bash
npm test -- src/test/admin-event-requests.test.tsx src/test/event-detail.test.tsx
```

Expected: PASS

- [ ] **Step 5: Lint touched FE files**

```bash
npm run lint
```

Expected: no new errors in touched files (pre-existing warnings OK)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Admin/EventRequestsPage.tsx src/test/admin-event-requests.test.tsx
git commit -m "feat: admin edit delete on live event requests tab"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Backend owner OR admin on update/destroy | Task 1 |
| Admin update/delete non-owned live (tests) | Task 1 |
| Non-admin non-owner still 403 | Task 1 (existing test) |
| Event detail Edit/Delete for admin + live | Task 2 |
| Manage applications owner-only | Task 2 |
| Admin no manage chrome on non-owned pending (UI) | Task 2 |
| Admin Live tab Edit + Delete | Task 3 |
| Reuse deleteEvent / edit route | Tasks 2–3 |
| No new admin write routes | All tasks |

## Manual smoke

1. Log in as `admin@hampas.test` / `password`
2. Ensure a live event owned by `sample@hampas.test` exists
3. Open event detail → Edit event → change title → save
4. Delete from detail or from Event requests → Live
5. Confirm non-admin organizer still cannot edit others’ events
