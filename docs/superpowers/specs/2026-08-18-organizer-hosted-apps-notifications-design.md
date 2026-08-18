# Organizer Hosted Events, Applications UX, Notifications & Public Roster — Design

**Date:** 2026-08-18  
**Status:** Approved for planning  
**Scope:** Frontend + backend API contract (frontend repo implements UI/API client; backend repo implements endpoints)

## Problem

1. Organizers have no dedicated way to list **only events they created** (must find each event via discovery/detail).
2. **Manage Applications** keeps both Approve and Reject visible after a decision (disabled styling), which is noisy when many applicants apply.
3. Approve/reject feedback is weak: no reliable **toast for organizer**, and applicants get **no notification** at all (no in-app notification system exists).
4. There is no way for organizers to **publicly or privately** show names of approved participants on the event.

## Goals

- Nav entry + page **Hosted events** listing only the current user’s owned events.
- Compact Manage Applications rows; after a decision show a single flip action (**Change to Rejected** / **Change to Approved**).
- Organizer gets an immediate **local toast** on successful decide.
- Applicant receives a **server-backed in-app notification** with message pattern below; if they are online, also a **toast** when the client discovers the new unread item.
- Organizer can toggle **show approved players publicly** (default **private**); event detail shows a Players section only when public and names are returned by the API.
- Document backend endpoints so the API can be implemented in parallel.

## Non-goals

- WebSockets / SSE (use poll + focus refresh).
- Browser web push for application decisions (admin push remains separate).
- Bulk approve/reject, applicant search/filter, or CSV export.
- Showing emails, phones, or profile deep-links in the public roster (names only).
- Server-side notification for the organizer’s own approve/reject action (local toast only).

## Approach

**A — Server notifications + short poll (chosen):**  
Owned-events list API, compact applications UI, notification inbox with 30s/focus poll and session-deduped toasts, event flag + conditional `approved_participants` on event show.

---

## 1. Hosted Events

### Route & nav

| Item | Value |
|---|---|
| Route | `/me/hosted-events` |
| Guard | `RequireAuth` |
| Nav label | **Hosted events** |
| Placement | Desktop + mobile menu, next to **My applications** |
| Visibility | All authenticated users (empty state if none) |

### API

`GET /me/hosted-events`

- Auth required.
- Returns **only** events where `created_by_id === auth.id` (never other users’ events).
- Response shape: same paginated envelope as `GET /events` (`Paginated<EventItem>`).
- Include existing `EventItem` fields (`visibility`, `is_owner: true`, etc.).

Frontend client: `listHostedEvents(params?)` in `src/api/events.ts` (or small `src/api/hostedEvents.ts` if preferred — prefer `events.ts` to avoid sprawl).

### UI

- Page shell: `max-w-3xl`, display title **Hosted events**, subtitle e.g. “Events you created”.
- Loading: skeleton rows (match applications pattern).
- Empty: dashed card — “You haven’t hosted any events yet.” + primary **Create event** → `/events/new`.
- Row/card per event:
  - Title (link to `/events/:id`)
  - Meta: `formatEventWhen` + `formatEventPlace`
  - Visibility chip when not `live` (pending review / rejected)
  - Actions: **View** · **Manage applications** (`/events/:id/applications`) · **Edit** (`/events/:id/edit`) when owner (always true on this list)

### Security

- Server is source of truth for ownership filter.
- Frontend does not client-filter a global events list as a substitute.

---

## 2. Manage Applications UI

### Surface

Existing route: `/events/:id/applications` (`EventApplicationsPage`).

### Compact row layout

- Dense list: `space-y-2`, row `px-3 py-2`, single line where possible.
- Layout: **name** (truncate) | **StatusBadge** | **actions** (end-aligned).
- Buttons keep `min-h-11` for touch targets; prefer compact horizontal padding.
- Avoid large multi-line cards and double-stacked chrome.

### Actions by status

| Status | Controls |
|---|---|
| `pending` | **Approve** + **Reject** (current primary / secondary styles) |
| `approved` | StatusBadge + **Change to Rejected** only |
| `rejected` | StatusBadge + **Change to Approved** only |

- No simultaneous Approve+Reject after a decision.
- Flip uses existing `approveApplication` / `rejectApplication` endpoints.
- Busy state: disable the row’s action(s) while request in flight.
- On success: refresh list (or patch local row), then organizer toast (see §3).
- On failure: `role="alert"` error; **no** success toast.

### Copy / a11y

- Page `h1` remains **Applications** (nav/detail still say Manage applications).
- Accessible names: “Approve”, “Reject”, “Change to Rejected”, “Change to Approved”.
- Update `src/test/applications.test.tsx` for new labels and decided-state UI.

### Ownership errors

- If API returns 403/404 for non-owners: clear error message + link back to event or events list.

---

## 3. Toasts & in-app notifications

### Message templates

Applicant notification body (exact pattern):

- Approved: `You have been Approved by {Organizer Name} for the event "{Event Title}".`
- Rejected: `You have been Rejected by {Organizer Name} for the event "{Event Title}".`

Organizer local toast (immediate, not stored as notification):

- `{Applicant Name} approved` / `{Applicant Name} rejected`

Use existing `showToast` + `ToastHost` (top-right).

### Backend: create on decide

When organizer successfully approves or rejects an application:

1. Update application status (existing behavior).
2. Insert a **notification** row for the **applicant** (`notifiable_user_id = applicant`).
3. Payload fields at minimum:
   - `message` (rendered string above)
   - `type`: `application_decision`
   - `data`: `{ event_id, application_id, status: 'approved'|'rejected', organizer_name, event_title }`
4. Do **not** create a server notification for the organizer.

Idempotency: each decide creates a new notification (re-decide → new message). Mark previous related items read is **not** required (YAGNI).

### Notification APIs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/me/notifications` | Paginated list for current user (newest first) |
| `GET` | `/me/notifications/unread-count` | `{ count: number }` |
| `POST` | `/me/notifications/read` | Body: `{ ids: number[] }` **or** `{ all: true }` → mark read |

**Notification resource:**

```ts
interface AppNotification {
  id: number;
  message: string;
  type: string; // e.g. 'application_decision'
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

### Frontend surfaces

1. **API client** `src/api/notifications.ts` — list, unread count, mark read.
2. **Header bell** (auth only): badge = unread count; click opens dropdown of recent items (e.g. last 10).
3. **Full page** `/me/notifications` — “See all”; mark one / mark all read.
4. **Polling hook** (e.g. `useNotifications`):
   - While logged in: fetch unread count (and/or latest list) every **30s** and on **window focus**.
   - Track `toastedIds` in memory (session): for each newly seen unread id not in set → `showToast(message)` once, add id to set.
   - On login, baseline existing unread **without** toasting the entire backlog (only toast ids that appear **after** baseline snapshot, or after first successful poll establishes baseline).
5. Optional deep link: clicking a notification with `data.event_id` navigates to `/events/:id` and marks that id read.

### Organizer vs applicant toast summary

| Actor | When | Channel |
|---|---|---|
| Organizer | Immediate after successful approve/reject | Local `showToast` only |
| Applicant | When client discovers new unread notification | Server notification + toast (if online after baseline) |
| Applicant | Later visit | Inbox bell / notifications page |

---

## 4. Public / private approved players

### Default

`show_participants_publicly = false` for new events and treat missing/null as false for existing.

### Backend

- Column/field on events: `show_participants_publicly` (boolean, default false).
- Owner (or admin if already allowed to manage live events) may update:
  - Preferred dedicated endpoint: `PATCH /events/{id}/participants-visibility`  
    Body: `{ show_participants_publicly: boolean }`  
    Returns updated event (or `{ show_participants_publicly }`).
  - Alternatively fold into existing event update if multipart update is awkward for a single flag — **dedicated PATCH preferred** for simple JSON toggle from Manage Applications.
- `GET /events/{id}` (and list cards only if cheap — **detail is enough**):
  - Always include `show_participants_publicly: boolean` for owner/public consumers.
  - Include `approved_participants: { id: number; name: string }[]` **only when** `show_participants_publicly === true`.
  - When false: omit field or return `[]` — **never** include names for non-privileged callers. Owners managing applications still use applications list API, not this field.

### Organizer UI

- Toggle on **Manage Applications** page header:  
  Label: **Show approved players publicly**  
  Helper: short muted line — “When on, anyone viewing the event can see approved names.”
- Page loads event via `getEvent(id)` (in parallel with applications list) to seed toggle from `show_participants_publicly` (default false if missing).
- Wait for API on toggle (no silent optimistic permanent state); on failure revert control + alert.

### Public UI

- **Event detail**: if `show_participants_publicly` and `approved_participants?.length > 0`, section **Players** listing names (compact chips or simple list). No emails.
- If private or empty: section hidden for everyone (including owner on detail — owner uses Manage Applications for full list).

### Types

Extend `EventItem` in `src/api/types.ts`:

```ts
show_participants_publicly?: boolean;
approved_participants?: { id: number; name: string }[];
```

---

## 5. Architecture (frontend units)

| Unit | Responsibility |
|---|---|
| `listHostedEvents` | Fetch owned events only |
| `HostedEventsPage` | Render hosted list + empty/loading |
| `EventApplicationsPage` | Compact decide UI + visibility toggle + organizer toast |
| `notifications` API | CRUD-ish read path for inbox |
| `useNotifications` / provider | Poll, unread count, toast dedupe |
| Header bell + `NotificationsPage` | Inbox UX |
| `EventDetailPage` | Players section when public |
| `ToastHost` / `showToast` | Unchanged delivery; already top-right |

Data flow (decide):

```
Organizer clicks Approve
  → POST .../approve
  → on success: local toast; refresh applicants
  → backend: status update + notification for applicant
Applicant client poll
  → new unread id → toast once + badge++
  → open bell → mark read
```

---

## 6. Errors & edge cases

- Network failure on decide/toggle/list: existing alert patterns; no false toast.
- Double-click: disable actions while `busyId` set.
- Applicant applies then is decided offline: sees notification on next login (no backlog toast spam — baseline rule).
- Re-decide: new notification with updated Approved/Rejected wording.
- Private roster: names must not appear in any public event payload.

---

## 7. Testing (frontend)

| Area | Cases |
|---|---|
| Hosted events | Renders mocked owned list; empty CTA; nav link present when authed |
| Manage applications | Pending → Approve/Reject; approved → only Change to Rejected; reject path; toast on success; no toast on failure |
| Notifications | Unread badge; mark read; poll toasts only post-baseline new ids |
| Event detail | Players visible only when flag true + names; hidden when private |

Primary test files: extend `applications.test.tsx`; add `hosted-events.test.tsx`, `notifications.test.tsx`; extend `event-detail.test.tsx`.

---

## 8. Files to touch (frontend)

1. `src/App.tsx` — routes `/me/hosted-events`, `/me/notifications`
2. `src/components/AppHeader.tsx` — Hosted events link + bell
3. `src/pages/Events/HostedEventsPage.tsx` — **new**
4. `src/pages/Applications/EventApplicationsPage.tsx` — compact UI + toggle + toast
5. `src/pages/Events/EventDetailPage.tsx` — Players section
6. `src/pages/Notifications/NotificationsPage.tsx` — **new**
7. `src/components/NotificationsBell.tsx` — **new** (or inline header)
8. `src/api/events.ts` — hosted list + visibility patch
9. `src/api/notifications.ts` — **new**
10. `src/api/types.ts` — event + notification types
11. `src/hooks/useNotifications.ts` (and optional context) — **new**
12. Tests as above

Backend (separate repo — contract only here): hosted-events index, notifications CRUD/read, create-on-decide, `show_participants_publicly` + gated `approved_participants`.

---

## 9. Success criteria

- [ ] Authenticated user can open **Hosted events** and see only events they created.
- [ ] Manage Applications rows are compact; decided applicants show a single flip action, not both Approve and Reject.
- [ ] Organizer sees a success toast on approve/reject.
- [ ] Applicant gets a persisted notification with the Approved/Rejected + organizer + event message; toast when newly discovered online after baseline.
- [ ] Header bell shows unread count; full list at `/me/notifications`.
- [ ] Roster default private; toggle works; public detail shows names only when enabled and API returns them.
- [ ] Frontend tests above pass; API contract documented for backend implementation.

## 10. Open implementation notes (resolved defaults)

- Poll interval: **30 seconds** + focus.
- Toast backlog: **baseline on first poll**, no spam.
- Flip button labels: **Change to Rejected** / **Change to Approved** (not a generic “Edit” that expands both).
- Hosted nav: **all authenticated** users.
- Organizer server notification of own action: **no**.
