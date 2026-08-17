# Admin requests merge design

## Goal

Unify Role requests and Event requests into one admin hub with tabs **Coach | Organizer | Events**, show pending counts on nav and tabs, toast when new pending work appears, and leave the frontend ready for browser push once a backend exists.

## Problem

- Admins juggle two nav links and two pages for related moderation work.
- Role requests mix coach and organizer in one list.
- There is no pending count badge or “something new arrived” signal while an admin is in the app.
- Browser push was requested but this repo has no service worker, VAPID flow, or push API yet.

## Scope

### In scope

- Single admin page at `/admin/requests` with top tabs: **Coach | Organizer | Events**
- Events tab retains sub-tabs: **Pending | Live | Rejected** and existing approve/reject/edit/delete behavior
- Coach / Organizer tabs: pending role requests filtered by `role`
- One header nav entry for admins with total pending badge
- Per-tab pending badges (pending only; live/rejected never count)
- Poll pending counts while admin session is active; toast on count increase after baseline
- Redirects from `/admin/role-requests` and `/admin/event-requests`
- FE-only browser push readiness (SW skeleton + subscribe client no-op / graceful when backend missing)
- Tests updated/added for merge, badges, toasts, redirects

### Out of scope

- Real server-side push delivery (VAPID keys, subscription store, send-on-create)
- WebSockets / Laravel Echo realtime
- Rejection reasons, bulk actions
- Non-admin notification UX
- Changing backend role-request or event-moderation contracts (unless a gap blocks FE)

## Decisions (approved)

| Topic | Choice |
|-------|--------|
| Approach | Single page, client filter for roles, poll + toast, FE push prep |
| Tabs | Coach \| Organizer \| Events |
| Badge scope | Pending only (coach + organizer + `pending_review` events) |
| Notifications | Badge + in-app toast now; browser push FE-ready only |
| Old URLs | Redirect with `?tab=` |

## Information architecture & routing

### Routes

| Path | Behavior |
|------|----------|
| `/admin/requests` | Main hub; `RequireAuth` → `RequireAdmin` |
| `/admin/requests?tab=coach` | Default when `tab` omitted |
| `/admin/requests?tab=organizer` | Organizer pending roles |
| `/admin/requests?tab=events` | Event moderation panel |
| `/admin/role-requests` | Redirect → `/admin/requests?tab=coach` |
| `/admin/event-requests` | Redirect → `/admin/requests?tab=events` |

### Navigation

When `user.is_admin`:

- Replace separate **Role requests** and **Event requests** links with one **Admin** (label: **Admin** or **Requests** — implement as **Admin**).
- Desktop and mobile menus both use the single link.
- Badge on the link: sum of pending coach + pending organizer + pending events; hide when `0`; display `99+` when `> 99`.

### Top tabs

| Tab id | Label | Content |
|--------|-------|---------|
| `coach` | Coach | Pending `AdminRoleRequest` where `role === 'coach'` |
| `organizer` | Organizer | Pending where `role === 'organizer'` |
| `events` | Events | Event requests panel (existing UX) |

Each top tab shows its own pending count badge when `> 0`.

### Events sub-tabs (unchanged behavior)

- **Pending** (`pending_review`): Approve / Reject
- **Live**: Edit link + Delete
- **Rejected**: read-only cards

## Frontend architecture

| Piece | Responsibility |
|-------|----------------|
| `src/pages/Admin/AdminRequestsPage.tsx` | Shell: title, subtitle, top tabs, query `tab` sync, hosts panels |
| `src/pages/Admin/RoleRequestsPanel.tsx` | List + approve/reject for one elevated role (extracted from `RoleRequestsPage`) |
| `src/pages/Admin/EventRequestsPanel.tsx` | Event visibility tabs + actions (extracted from `EventRequestsPage`) |
| `src/hooks/useAdminPendingCounts.ts` | Poll pending role list + pending events; expose counts + increase deltas |
| `src/components/AdminPendingBadge.tsx` (optional small helper) | Count pill UI shared by nav and tabs |
| `src/lib/adminNotifications.ts` | Baseline snapshot; detect increases; fire toast copy; call push stub if wired |
| `src/push/adminPush.ts` + SW skeleton | Register SW; `subscribeAdminPush` posts subscription when endpoint exists; otherwise no-op |
| `src/api/admin.ts` | Existing APIs only for v1 (`listAdminRoleRequests`, `listAdminEvents`, approve/reject) |
| `src/App.tsx` | New route + redirects; drop direct old page routes (or keep as redirect-only) |
| `src/components/AppHeader.tsx` | Single Admin link + total badge; mount count polling for admins |
| Tests | `admin-requests*.test.tsx`; update/remove obsolete page tests |

Remove or thin `RoleRequestsPage.tsx` / `EventRequestsPage.tsx` to re-exports/redirects only if needed during migration; prefer panels + one page.

### Visual language

Match existing admin pages: `font-display`, `border-border`, `bg-surface`, `bg-cobalt`, `shadow-soft`, `role="alert"` errors. Operate mode — scannable queue.

### Page UX

1. Title: **Admin requests**
2. Subtitle: moderate role access and event go-live
3. Top tablist: Coach | Organizer | Events with badges
4. Switching top tab updates `?tab=` (replace, not full navigation stack spam)
5. Coach/Organizer empty copy: “No pending coach requests.” / “No pending organizer requests.”
6. Role cards: name, email, note (if any), Approve / Reject; busy disable per row
7. Events panel: existing empty strings and actions
8. After successful role/event action on page: refresh pending counts (or decrement optimistically then reconcile)

## Data flow

### Role tabs

```
Open Coach or Organizer tab
  → listAdminRoleRequests('pending')
  → filter by role
  → render cards

Approve / Reject
  → existing admin role APIs
  → remove from local list
  → refresh pending counts
```

One fetch can serve both role tabs if the page caches the pending role list and filters; switching coach ↔ organizer need not refetch unless stale. Refetch on mount and after actions is enough; optional share with count hook.

### Events tab

```
Same as current EventRequestsPage:
  sub-tab → listAdminEvents(visibility)
  approve / reject / delete → existing APIs → drop from local list
  live → edit link to /events/:id/edit
```

### Pending counts

```
Admin session (header mounted, user.is_admin)
  → fetch pending roles + listAdminEvents('pending_review')
  → counts = {
      coach: roles.filter(r => r.role === 'coach').length,
      organizer: roles.filter(r => r.role === 'organizer').length,
      events: pendingEvents.length,
      total: sum
    }
  → on first successful fetch: store baseline, no toast
  → on later fetch: if any bucket increased, toast and update baseline
  → poll every 30s while document.visibilityState === 'visible'
  → skip interval tick when hidden; refresh on become visible
```

**Poll failure:** do not toast; keep last good counts; retry next interval.

**Pagination note:** `listAdminEvents` returns unwrapped page `data` (default page size 50). Counts use returned array length for v1. If totals exceed one page later, switch to `meta.total` when the client exposes it — document as follow-up, not blocking.

### Toasts

- Library: use whatever the app already uses for transient messages; if none, a minimal fixed toast region (accessible, auto-dismiss ~4s) is acceptable — prefer one shared pattern, not ad-hoc alerts.
- Copy examples:
  - Single bucket: “1 new coach request”
  - Multiple: “2 new coach requests, 1 new event request”
- No toast on first load or when counts only decrease.

### Browser push (FE-ready only)

1. Add a minimal service worker (e.g. `public/sw.js` or Vite PWA entry) that:
   - Handles `push` by showing `self.registration.showNotification` when a payload exists
   - Handles `notificationclick` → focus/open `/admin/requests`
2. `adminPush.ts`:
   - `ensureAdminPushRegistration()` — register SW if supported
   - `subscribeAdminPush()` — `pushManager.subscribe` when VAPID public key is configured via env (e.g. `VITE_VAPID_PUBLIC_KEY`); POST subscription JSON to a documented future endpoint (e.g. `POST /api/admin/push-subscriptions`); if key or endpoint missing, return quietly
3. Call subscribe opportunistically once for admins after login (or from Admin page mount) — never block UI on failure
4. Spec for backend (not implemented here):
   - Store subscriptions per admin user
   - On new pending role request or event `pending_review`, send Web Push to admin subscribers
   - Payload should include type (`coach` | `organizer` | `event`) and optional id for deep link

## Error handling

| Case | Behavior |
|------|----------|
| Panel list load fail | Inline `role="alert"` on panel |
| Approve/reject/delete fail | Inline alert; row re-enabled |
| Count poll fail | Silent; keep last counts |
| Toast system fail | Ignore (counts still update) |
| Push subscribe fail | Silent no-op |

## Testing

- Mock `listAdminRoleRequests`, role approve/reject, `listAdminEvents`, event approve/reject/delete
- Admin auth context
- Default tab coach; `?tab=organizer` / `events`
- Coach tab only shows coach rows; organizer only organizer
- Events panel: pending approve/reject; live edit/delete; tab visibility param
- Header badge equals sum of pending buckets
- First count fetch: no toast; second fetch with higher coach count: toast once
- Redirects from old paths
- Non-admin still blocked by `RequireAdmin`

## Success criteria

1. Admins open one **Admin** nav item with correct total pending badge
2. Tabs Coach | Organizer | Events work; role filter and event moderation match prior behavior
3. Pending badges on tabs; live/rejected do not inflate counts
4. New pending while polling → badge updates and toast (after baseline)
5. Old URLs redirect to the merged page
6. Push client/SW present and safe without backend
7. Tests pass

## Phasing

1. Extract panels + `AdminRequestsPage` + routes/redirects + nav merge
2. `useAdminPendingCounts` + badges + toast on increase
3. SW + push subscribe stub + env key optional
4. Tests + manual check as admin with sample pending role and event

## Backend follow-ups (documented only)

- Optional: `GET /admin/pending-counts` returning `{ coach, organizer, events }` to avoid dual list fetches
- Web Push: VAPID, subscription CRUD, send on new requests
- If event list is paginated beyond 50 pending, expose total for accurate badges
