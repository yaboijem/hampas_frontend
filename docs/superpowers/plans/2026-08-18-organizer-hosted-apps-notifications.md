# Organizer Hosted Events, Applications UX, Notifications & Public Roster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give organizers a Hosted events list (owned only), compact Manage Applications with flip actions + toasts, an in-app notification inbox (poll + toast for applicants), and a public/private approved-players roster toggle.

**Architecture:** Thin API clients against documented backend endpoints; pages mirror existing applications/events patterns; a small notifications context polls unread every 30s + on focus, baselines without backlog toasts, and drives the header bell. Event detail only renders Players when the API returns public names.

**Tech Stack:** React 19, React Router 7, Axios (`src/api/client`), Vitest + Testing Library, Tailwind design tokens already in the app.

**Spec:** `docs/superpowers/specs/2026-08-18-organizer-hosted-apps-notifications-design.md`

## Global Constraints

- Server enforces ownership for hosted events and applications; frontend never “filters global list” as a substitute.
- Applicant notification message: `You have been Approved by {Organizer Name} for the event "{Event Title}".` (and Rejected variant) — backend renders; frontend displays `message` as-is.
- Organizer toast on decide: `{Name} approved` / `{Name} rejected` via existing `showToast` (no server notification for organizer’s own action).
- Roster default private: missing/`false` `show_participants_publicly` means no public names.
- Poll: 30s + window focus; first poll establishes baseline (no toast spam for existing unread).
- Flip labels after decide: **Change to Rejected** / **Change to Approved** (not both Approve+Reject).
- Keep button accessible names stable for tests where possible; update tests when labels change.
- Do not commit secrets; do not push unless asked.
- Run tests with `npm test` (vitest run). Prefer file-scoped runs: `npx vitest run src/test/<file>.tsx`.

## File structure

| File | Responsibility |
|---|---|
| `src/api/types.ts` | `AppNotification`, event roster fields |
| `src/api/events.ts` | `listHostedEvents`, `setParticipantsVisibility` |
| `src/api/notifications.ts` | list / unread-count / mark-read |
| `src/pages/Events/HostedEventsPage.tsx` | Owned events list UI |
| `src/pages/Applications/EventApplicationsPage.tsx` | Compact decide UI + roster toggle + organizer toast |
| `src/pages/Events/EventDetailPage.tsx` | Public Players section |
| `src/notifications/NotificationsContext.tsx` | Poll, unread, toast dedupe, mark read |
| `src/components/NotificationsBell.tsx` | Header dropdown + badge |
| `src/pages/Notifications/NotificationsPage.tsx` | Full inbox |
| `src/components/AppHeader.tsx` | Hosted events nav + bell |
| `src/App.tsx` | Routes + provider |
| `src/test/hosted-events.test.tsx` | Hosted list tests |
| `src/test/applications.test.tsx` | Manage applications updates |
| `src/test/notifications.test.tsx` | Poll/toast/badge tests |
| `src/test/event-detail.test.tsx` | Players section tests |

---

### Task 1: Types + events/notifications API clients

**Files:**
- Modify: `src/api/types.ts`
- Modify: `src/api/events.ts`
- Create: `src/api/notifications.ts`
- Test: `src/test/api-organizer-extensions.test.ts` (lightweight unit tests of function wiring via mocked `api`)

**Interfaces:**
- Produces:
  - `AppNotification` type
  - `EventItem.show_participants_publicly?: boolean`
  - `EventItem.approved_participants?: { id: number; name: string }[]`
  - `listHostedEvents(): Promise<Paginated<EventItem>>`
  - `setParticipantsVisibility(id: number, show: boolean): Promise<{ show_participants_publicly: boolean }>`
  - `listNotifications(): Promise<Paginated<AppNotification>>` (or `{ data: AppNotification[] }` if backend is non-paginated — prefer paginated envelope matching `Paginated<T>`)
  - `unreadNotificationCount(): Promise<{ count: number }>`
  - `markNotificationsRead(body: { ids: number[] } | { all: true }): Promise<void>`

- [ ] **Step 1: Extend types**

In `src/api/types.ts`, add after `ApplicationStatus`:

```ts
export interface AppNotification {
  id: number;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
  data: {
    event_id?: number;
    application_id?: number;
    status?: 'approved' | 'rejected';
    organizer_name?: string;
    event_title?: string;
  } | null;
}
```

On `EventItem`, add:

```ts
  show_participants_publicly?: boolean;
  approved_participants?: { id: number; name: string }[];
```

- [ ] **Step 2: Events API helpers**

Append to `src/api/events.ts`:

```ts
import type { EventItem, Paginated } from './types';

export async function listHostedEvents(): Promise<Paginated<EventItem>> {
  const { data } = await api.get('/me/hosted-events');
  return data;
}

export async function setParticipantsVisibility(
  id: number,
  show_participants_publicly: boolean,
): Promise<{ show_participants_publicly: boolean }> {
  const { data } = await api.patch(`/events/${id}/participants-visibility`, {
    show_participants_publicly,
  });
  return data;
}
```

(Keep existing imports; merge `EventItem`/`Paginated` import if already present.)

- [ ] **Step 3: Notifications API module**

Create `src/api/notifications.ts`:

```ts
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
```

- [ ] **Step 4: Smoke-import check**

Run: `npx tsc -b --pretty false 2>&1 | Select-Object -First 40`  
Expected: no errors in the new/changed API files (project may have pre-existing noise; fix only errors you introduced).

- [ ] **Step 5: Commit**

```bash
git add src/api/types.ts src/api/events.ts src/api/notifications.ts
git commit -m "feat(api): hosted events, roster visibility, notifications clients"
```

---

### Task 2: Hosted Events page + route + nav

**Files:**
- Create: `src/pages/Events/HostedEventsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppHeader.tsx`
- Test: `src/test/hosted-events.test.tsx`

**Interfaces:**
- Consumes: `listHostedEvents`, `EventItem`, `formatEventWhen`, `formatEventPlace`
- Produces: route `/me/hosted-events`, nav label **Hosted events**

- [ ] **Step 1: Write failing tests**

Create `src/test/hosted-events.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import HostedEventsPage from '../pages/Events/HostedEventsPage';
import * as eventsApi from '../api/events';
import type { EventItem } from '../api/types';

vi.mock('../api/events', () => ({
  listHostedEvents: vi.fn(),
}));

const owned: EventItem = {
  id: 5,
  title: 'My Open Play',
  description: 'd',
  event_type: 'open_play',
  skill_level: 'all_levels',
  barangay: null,
  city: 'Angeles City',
  starts_at: '2026-09-01T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: true,
  my_application: null,
  created_by: { id: 1, name: 'Me' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HostedEventsPage', () => {
  test('lists owned events with manage link', async () => {
    vi.mocked(eventsApi.listHostedEvents).mockResolvedValue({
      data: [owned],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/me/hosted-events']}>
        <Routes>
          <Route path="/me/hosted-events" element={<HostedEventsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /hosted events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my open play/i })).toHaveAttribute('href', '/events/5');
    expect(screen.getByRole('link', { name: /manage applications/i })).toHaveAttribute(
      'href',
      '/events/5/applications',
    );
    expect(screen.getByRole('link', { name: /^edit$/i })).toHaveAttribute('href', '/events/5/edit');
  });

  test('empty state offers create event', async () => {
    vi.mocked(eventsApi.listHostedEvents).mockResolvedValue({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/me/hosted-events']}>
        <Routes>
          <Route path="/me/hosted-events" element={<HostedEventsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/haven.t hosted any events yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create event/i })).toHaveAttribute('href', '/events/new');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/test/hosted-events.test.tsx`  
Expected: FAIL (module not found / component missing).

- [ ] **Step 3: Implement HostedEventsPage**

Create `src/pages/Events/HostedEventsPage.tsx` following `MyApplicationsPage` patterns:

- `useEffect` → `listHostedEvents()` → `data` into state
- Loading skeletons (3 rows)
- Error `role="alert"`
- Empty dashed card + Create event CTA
- List rows: title link, when/place muted meta, visibility note if not `live`, actions View / Manage applications / Edit
- Use `formatEventWhen`, `formatEventPlace` from `src/events/eventLabels.ts`
- Shell: `mx-auto max-w-3xl space-y-4 p-6`, `h1` **Hosted events**, subtitle **Events you created**

Minimal structure:

```tsx
// imports: useEffect, useState, Link, listHostedEvents, EventItem, formatters

export default function HostedEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listHostedEvents()
      .then((res) => {
        if (!cancelled) setEvents(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hosted events.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // loading / error / empty / list UI as specified
}
```

- [ ] **Step 4: Wire route + nav**

`App.tsx`: import `HostedEventsPage`, add:

```tsx
<Route path="/me/hosted-events" element={<RequireAuth><HostedEventsPage /></RequireAuth>} />
```

`AppHeader.tsx`: next to My applications (desktop + mobile), when `user`:

```tsx
<NavLink to="/me/hosted-events" className={linkClass}>
  Hosted events
</NavLink>
```

(and matching mobile `NavLink` with `menuLinkClass` / `role="menuitem"`).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/test/hosted-events.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Events/HostedEventsPage.tsx src/App.tsx src/components/AppHeader.tsx src/test/hosted-events.test.tsx
git commit -m "feat: hosted events page and nav for organizers"
```

---

### Task 3: Compact Manage Applications + flip actions + organizer toast

**Files:**
- Modify: `src/pages/Applications/EventApplicationsPage.tsx`
- Modify: `src/test/applications.test.tsx`

**Interfaces:**
- Consumes: `approveApplication`, `rejectApplication`, `listEventApplications`, `showToast` from `src/lib/adminNotifications.ts`
- Produces: pending → Approve+Reject; approved → Change to Rejected; rejected → Change to Approved; success toast

- [ ] **Step 1: Update tests first (TDD)**

In `src/test/applications.test.tsx`:

1. Mock toast:

```ts
import * as notes from '../lib/adminNotifications';

// in beforeEach or per-test:
vi.spyOn(notes, 'showToast').mockImplementation(() => {});
```

2. Change **organizer can approve** assertions after approve:
   - Ana row should **not** show enabled Approve for Ana’s decided state
   - Prefer: after reload mock, Ana is approved → expect `getByRole('button', { name: /change to rejected/i })`
   - Ben (already approved on first load) should show **Change to Rejected**, not Approve/Reject pair
   - `expect(notes.showToast).toHaveBeenCalledWith('Ana approved')`

3. Replace **organizer can change an approved decision to rejected** test:

```tsx
test('organizer can change an approved decision to rejected', async () => {
  const user = userEvent.setup();
  const toastSpy = vi.spyOn(notes, 'showToast').mockImplementation(() => {});
  vi.mocked(applicationsApi.listEventApplications)
    .mockResolvedValueOnce({
      data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'approved' }],
    })
    .mockResolvedValueOnce({
      data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'rejected' }],
    });
  vi.mocked(applicationsApi.rejectApplication).mockResolvedValue({
    application: { id: 3, event_id: 1, user_id: 7, status: 'rejected' },
  });

  render(
    <MemoryRouter initialEntries={['/events/1/applications']}>
      <Routes>
        <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole('button', { name: /change to rejected/i }));
  await waitFor(() => expect(applicationsApi.rejectApplication).toHaveBeenCalledWith(1, 3));
  expect(await screen.findByRole('button', { name: /change to approved/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
  expect(toastSpy).toHaveBeenCalledWith('Ana rejected');
});
```

4. Approve failure test: ensure `showToast` **not** called on failure.

Also mock `getEvent` if Task 4 not done yet — for Task 3 only, either:
- defer `getEvent` until Task 4, **or**
- add `vi.mock('../api/events')` with `getEvent` resolving a minimal event so page does not break when Task 4 adds the load.

**Recommended in this task:** do not call `getEvent` yet (Task 4 adds toggle). Only compact UI + toast.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/test/applications.test.tsx`  
Expected: FAIL on new button names / toast expectations.

- [ ] **Step 3: Implement compact UI + decide toast**

Rewrite row rendering in `EventApplicationsPage.tsx`:

- Container list: `space-y-2`
- Row: `flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 shadow-soft`
- Name: `min-w-0 flex-1 truncate font-semibold text-navy text-sm`
- StatusBadge kept
- Actions:
  - `pending`: Approve + Reject (existing styles; slightly tighter `px-3`)
  - `approved`: single button **Change to Rejected** → `decide(id, 'rejected')`
  - `rejected`: single button **Change to Approved** → `decide(id, 'approved')`
- In `decide` success path after refresh:

```ts
import { showToast } from '../../lib/adminNotifications';

// after successful API + list refresh:
const label = applicants.find(...) // better: use name known before refresh
showToast(status === 'approved' ? `${name} approved` : `${name} rejected`);
```

Capture name from current row before await:

```ts
const decide = async (applicationId: number, status: 'approved' | 'rejected', name: string) => {
  ...
  try {
    if (status === 'approved') await approveApplication(eventId, applicationId);
    else await rejectApplication(eventId, applicationId);
    const { data } = await listEventApplications(eventId);
    setApplicants(data);
    showToast(status === 'approved' ? `${name} approved` : `${name} rejected`);
  } catch ...
};
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/test/applications.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Applications/EventApplicationsPage.tsx src/test/applications.test.tsx
git commit -m "feat: compact manage applications with flip actions and toast"
```

---

### Task 4: Public roster toggle on Manage Applications

**Files:**
- Modify: `src/pages/Applications/EventApplicationsPage.tsx`
- Modify: `src/test/applications.test.tsx`

**Interfaces:**
- Consumes: `getEvent`, `setParticipantsVisibility`
- Produces: checkbox/switch **Show approved players publicly**

- [ ] **Step 1: Extend applications tests**

```tsx
vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  setParticipantsVisibility: vi.fn(),
}));

import * as eventsApi from '../api/events';

// in EventApplicationsPage tests beforeEach:
vi.mocked(eventsApi.getEvent).mockResolvedValue({
  id: 1,
  title: 'Game',
  description: '',
  event_type: 'open_play',
  skill_level: 'all_levels',
  barangay: null,
  city: 'Angeles City',
  starts_at: '2026-09-01T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: true,
  my_application: null,
  created_by: { id: 1, name: 'Org' },
  show_participants_publicly: false,
});
```

Add test:

```tsx
test('toggles show approved players publicly', async () => {
  const user = userEvent.setup();
  vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({ data: [] });
  vi.mocked(eventsApi.setParticipantsVisibility).mockResolvedValue({
    show_participants_publicly: true,
  });

  render(
    <MemoryRouter initialEntries={['/events/1/applications']}>
      <Routes>
        <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const toggle = await screen.findByRole('switch', { name: /show approved players publicly/i });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  await user.click(toggle);
  await waitFor(() =>
    expect(eventsApi.setParticipantsVisibility).toHaveBeenCalledWith(1, true),
  );
  expect(toggle).toHaveAttribute('aria-checked', 'true');
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/test/applications.test.tsx`  
Expected: FAIL (no switch).

- [ ] **Step 3: Implement toggle**

On `EventApplicationsPage`:

- Parallel load: `Promise.all([listEventApplications(eventId), getEvent(eventId)])`
- State: `showPublic` boolean from `event.show_participants_publicly === true`
- Header block under subtitle:

```tsx
<label className="flex items-start gap-3 text-sm">
  <button
    type="button"
    role="switch"
    aria-checked={showPublic}
    aria-label="Show approved players publicly"
    disabled={visibilityBusy}
    onClick={() => void onToggleVisibility()}
    className={/* track styles cobalt when on */}
  />
  <span>
    <span className="font-medium text-navy">Show approved players publicly</span>
    <span className="mt-0.5 block text-xs text-muted">
      When on, anyone viewing the event can see approved names.
    </span>
  </span>
</label>
```

`onToggleVisibility`:

```ts
const next = !showPublic;
setVisibilityBusy(true);
try {
  const res = await setParticipantsVisibility(eventId, next);
  setShowPublic(res.show_participants_publicly);
} catch (err) {
  setError(err instanceof Error ? err.message : 'Could not update visibility.');
} finally {
  setVisibilityBusy(false);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/test/applications.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Applications/EventApplicationsPage.tsx src/test/applications.test.tsx
git commit -m "feat: toggle public approved players on manage applications"
```

---

### Task 5: Event detail Players section

**Files:**
- Modify: `src/pages/Events/EventDetailPage.tsx`
- Modify: `src/test/event-detail.test.tsx`

**Interfaces:**
- Consumes: `event.show_participants_publicly`, `event.approved_participants`
- Produces: **Players** section when public and length > 0

- [ ] **Step 1: Write failing tests**

In `event-detail.test.tsx`:

```tsx
test('shows public approved players when enabled', async () => {
  vi.mocked(eventsApi.getEvent).mockResolvedValue({
    ...baseEvent,
    show_participants_publicly: true,
    approved_participants: [
      { id: 1, name: 'Ana' },
      { id: 2, name: 'Ben' },
    ],
  });
  renderDetail();
  expect(await screen.findByRole('heading', { name: /^players$/i })).toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByText('Ben')).toBeInTheDocument();
});

test('hides players when roster is private', async () => {
  vi.mocked(eventsApi.getEvent).mockResolvedValue({
    ...baseEvent,
    show_participants_publicly: false,
    approved_participants: [{ id: 1, name: 'Ana' }],
  });
  renderDetail();
  await screen.findByRole('heading', { name: /friday night open play/i });
  expect(screen.queryByRole('heading', { name: /^players$/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Ana')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/test/event-detail.test.tsx`  
Expected: FAIL on Players heading.

- [ ] **Step 3: Implement section**

In `EventDetailPage`, after About/description block (before manage tools is fine), add:

```tsx
{event.show_participants_publicly &&
  event.approved_participants &&
  event.approved_participants.length > 0 && (
    <section className="mb-6" aria-labelledby="event-players-heading">
      <h2 id="event-players-heading" className="font-display text-lg font-bold text-navy">
        Players
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {event.approved_participants.map((p) => (
          <li
            key={p.id}
            className="rounded-full border border-border bg-sky-tint px-3 py-1 text-sm font-medium text-chip-text"
          >
            {p.name}
          </li>
        ))}
      </ul>
    </section>
  )}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/test/event-detail.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Events/EventDetailPage.tsx src/test/event-detail.test.tsx
git commit -m "feat: show public approved players on event detail"
```

---

### Task 6: Notifications context (poll, baseline, toast)

**Files:**
- Create: `src/notifications/NotificationsContext.tsx`
- Test: `src/test/notifications.test.tsx`

**Interfaces:**
- Consumes: `listNotifications`, `unreadNotificationCount`, `markNotificationsRead`, `showToast`, `useAuth`
- Produces:
  - `NotificationsProvider`
  - `useNotifications()` → `{ unreadCount, items, refresh, markRead, markAllRead, loading }`

Behavior rules (must implement exactly):

1. When `user` is null: no polling; clear state.
2. On user present: immediate `refreshOnce` that sets baseline:
   - Fetch unread count + latest list (first page).
   - Add all current unread ids to `seenToastIds` **without** toasting.
3. Interval 30_000 ms + `window` `focus` listener call `refreshOnce`.
4. On later refresh: for each unread item whose id ∉ `seenToastIds`, `showToast(item.message)` and add id.
5. `markRead(ids)` / `markAllRead()` call API then refresh.

- [ ] **Step 1: Write failing tests**

```tsx
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NotificationsProvider, useNotifications } from '../notifications/NotificationsContext';
import * as notifApi from '../api/notifications';
import * as notes from '../lib/adminNotifications';

vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn(),
  unreadNotificationCount: vi.fn(),
  markNotificationsRead: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: {
    id: 9,
    name: 'Me',
    email: 'me@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false,
  } as null | object,
}));

vi.mock('../auth/AuthContext', () => ({
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
      <ul>{items.map((n) => <li key={n.id}>{n.message}</li>)}</ul>
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
    is_admin: false,
  };
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

// afterEach: vi.useRealTimers()

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
      ]),
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
      .mockResolvedValueOnce(page([]))
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
        ]),
      );

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        'You have been Rejected by Org for the event "Cup".',
      ),
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});
```

Adjust fake-timer usage if flaky — prefer `shouldAdvanceTime: true` and `waitFor`.

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/test/notifications.test.tsx`  
Expected: FAIL (module missing).

- [ ] **Step 3: Implement NotificationsContext**

Create `src/notifications/NotificationsContext.tsx`:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from '../api/notifications';
import type { AppNotification } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { showToast } from '../lib/adminNotifications';

const POLL_MS = 30_000;

type Ctx = {
  unreadCount: number;
  items: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (ids: number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const baselineDone = useRef(false);
  const toastedIds = useRef(new Set<number>());

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        unreadNotificationCount(),
        listNotifications(),
      ]);
      const nextItems = listRes.data;
      setUnreadCount(countRes.count);
      setItems(nextItems);

      const unread = nextItems.filter((n) => !n.read_at);
      if (!baselineDone.current) {
        for (const n of unread) toastedIds.current.add(n.id);
        baselineDone.current = true;
      } else {
        for (const n of unread) {
          if (!toastedIds.current.has(n.id)) {
            toastedIds.current.add(n.id);
            showToast(n.message);
          }
        }
      }
    } catch {
      // silent poll failures
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setItems([]);
      baselineDone.current = false;
      toastedIds.current = new Set();
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      await markNotificationsRead({ ids });
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await markNotificationsRead({ all: true });
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ unreadCount, items, loading, refresh, markRead, markAllRead }),
    [unreadCount, items, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications requires NotificationsProvider');
  }
  return ctx;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/test/notifications.test.tsx`  
Expected: PASS. Fix timer flakiness if needed (e.g. expose test-only refresh or call focus).

- [ ] **Step 5: Commit**

```bash
git add src/notifications/NotificationsContext.tsx src/test/notifications.test.tsx
git commit -m "feat: notifications provider with poll baseline and toasts"
```

---

### Task 7: Notifications bell + full page + App wiring

**Files:**
- Create: `src/components/NotificationsBell.tsx`
- Create: `src/pages/Notifications/NotificationsPage.tsx`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/App.tsx`
- Modify: `src/test/notifications.test.tsx` (optional UI tests)

**Interfaces:**
- Consumes: `useNotifications`
- Produces: bell UI, `/me/notifications` page

- [ ] **Step 1: NotificationsBell**

```tsx
// src/components/NotificationsBell.tsx
// - only render meaningful UI when used under provider + authed header
// - button aria-label="Notifications"
// - badge when unreadCount > 0 (show count or 9+)
// - dropdown: last items (from context items slice 0..10)
// - unread rows slightly bolder
// - click item: if data.event_id navigate(`/events/${id}`); markRead([id]); close
// - footer link "See all" → /me/notifications
// - "Mark all read" button when unreadCount > 0
```

Use same menu chrome as mobile header dropdown (`border-border bg-surface shadow-soft`).

- [ ] **Step 2: NotificationsPage**

```tsx
// src/pages/Notifications/NotificationsPage.tsx
// h1 Notifications
// Mark all read
// list messages with created_at muted
// empty: You're all caught up.
// click row → event deep link + markRead
```

- [ ] **Step 3: Wire App**

In `App.tsx`, wrap inside `AuthProvider` (notifications need auth):

```tsx
import { NotificationsProvider } from './notifications/NotificationsContext';
// ...
<AuthProvider>
  <NotificationsProvider>
    <AdminPendingCountsProvider>
      ...
      <Route path="/me/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
```

In `AppHeader`, when `user`, render `<NotificationsBell />` near nav (desktop + ensure mobile access — bell can sit next to ThemeToggle so both layouts see it).

- [ ] **Step 4: UI test (lightweight)**

Add to `notifications.test.tsx` or new file: render bell with mocked provider values via real provider + mocked API; open dropdown; expect message text.

- [ ] **Step 5: Run full related suite**

Run:

```bash
npx vitest run src/test/notifications.test.tsx src/test/hosted-events.test.tsx src/test/applications.test.tsx src/test/event-detail.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/NotificationsBell.tsx src/pages/Notifications/NotificationsPage.tsx src/components/AppHeader.tsx src/App.tsx src/test/notifications.test.tsx
git commit -m "feat: notifications bell, inbox page, and app wiring"
```

---

### Task 8: Final verification + backend checklist note

**Files:** none required (optional README note — skip unless asked)

- [ ] **Step 1: Full test run**

Run: `npm test`  
Expected: all tests PASS. Fix any breakage from shared mocks (`getEvent` in applications tests, etc.).

- [ ] **Step 2: Typecheck / lint**

Run: `npm run build`  
Run: `npm run lint`  
Expected: clean for changed files.

- [ ] **Step 3: Manual checklist (for human / QA)**

Backend must implement before E2E works:

| Endpoint | Notes |
|---|---|
| `GET /me/hosted-events` | Owned only, paginated |
| `PATCH /events/{id}/participants-visibility` | `{ show_participants_publicly }` |
| `GET /events/{id}` | includes flag; `approved_participants` only if public |
| Approve/reject side effect | create applicant notification with exact message template |
| `GET /me/notifications` | paginated |
| `GET /me/notifications/unread-count` | `{ count }` |
| `POST /me/notifications/read` | `{ ids }` or `{ all: true }` |

- [ ] **Step 4: Final commit only if fixes landed**

```bash
git add -A
git status
# commit only if there are fixups
git commit -m "fix: polish organizer hosted apps notifications integration"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Hosted events nav + page, owned only | Task 2 (+ API Task 1) |
| Compact Manage Applications | Task 3 |
| Flip Change to Approved/Rejected | Task 3 |
| Organizer local toast | Task 3 |
| Applicant server notification + toast when online | Task 6–7 (backend create-on-decide is contract) |
| Bell + `/me/notifications` | Task 7 |
| Poll 30s + focus + baseline | Task 6 |
| Public/private roster default private | Task 4–5 |
| Event detail Players | Task 5 |
| Tests | Each task |
| Backend contract documented | Spec + Task 8 table |

No intentional placeholders remain. Types/names are consistent across tasks (`setParticipantsVisibility`, `AppNotification`, `listHostedEvents`, `useNotifications`).
