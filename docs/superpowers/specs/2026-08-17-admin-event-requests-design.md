# Admin event requests design

## Goal

Give platform admins a frontend queue to moderate events awaiting review: list by visibility tab, approve to `live`, or reject to `rejected`. Match the existing Role requests admin UX patterns.

## Problem

- Backend already exposes admin event moderation under `auth:sanctum` + `admin`.
- Frontend only ships Role requests (`/admin/role-requests`). Admins cannot review pending events in the app.

## Scope

### In scope

- Admin-only page with tabs: **Pending** | **Live** | **Rejected**
- List events for the selected visibility
- Approve / reject actions on **pending** items only
- Nav link for `is_admin` users
- Frontend API client + tests
- Confirm backend routes (already present; no new backend routes required unless gaps found)

### Out of scope

- Editing event fields from the admin queue
- Rejection reason / notes
- Bulk approve/reject
- Notifications to organizers
- Shared `/admin` shell refactor (optional later)
- Non-admin event owner “resubmit” flow changes

## Backend (existing contracts)

Prefix: `/api/admin` · middleware: `auth:sanctum`, `admin`

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/admin/events?visibility=` | Optional `visibility` ∈ `pending_review` \| `live` \| `rejected`. Paginated `EventResource` collection (default page size 50). Ordered by `starts_at`. Includes `creator` relation. |
| `PATCH` | `/admin/events/{event}/approve` | Sets `visibility` → `live`. Returns `EventResource`. |
| `PATCH` | `/admin/events/{event}/reject` | Sets `visibility` → `rejected`. Returns `EventResource`. |

Non-admin → `403`. Public show of rejected events remains not found (existing product rule).

**No new backend routes in this work** unless implementation discovers a broken or missing contract; then fix only what the FE needs.

## Frontend architecture

Mirror Role requests; do not introduce a shared admin framework yet.

| Piece | Responsibility |
|-------|----------------|
| `src/api/admin.ts` | Add `listAdminEvents`, `approveEvent`, `rejectEvent` |
| `src/pages/Admin/EventRequestsPage.tsx` | Tabs + list + actions |
| `src/App.tsx` | Route `/admin/event-requests` behind `RequireAdmin` |
| `src/components/AppHeader.tsx` | Nav link “Event requests” when `user.is_admin` |
| `src/test/admin-event-requests.test.tsx` | Load tabs, approve, reject |

Reuse existing types: `EventItem`, `Visibility` from `src/api/types.ts`.

### API client behavior

- `listAdminEvents(visibility: Visibility)` → `GET /admin/events` with `params: { visibility }`
- Response is **Laravel paginated**: unwrap `data` array (same pattern as other list endpoints if already unwrapped elsewhere; otherwise unwrap here).
- `approveEvent(id)` → `PATCH /admin/events/{id}/approve` → returns event
- `rejectEvent(id)` → `PATCH /admin/events/{id}/reject` → returns event

### Page UX

1. Title: **Event requests**
2. Subtitle: short line that admins approve events before they go live
3. Tabs control filter:
   - **Pending** → `pending_review` (default on load)
   - **Live** → `live`
   - **Rejected** → `rejected`
4. Switching tabs reloads list; clear prior error; show loading while fetching
5. Each card shows at least:
   - Title
   - Event type (human-readable label if helpers exist; else raw with light formatting)
   - City (and barangay if present)
   - Starts at (locale-friendly datetime)
   - Creator name (`created_by.name`)
   - Visibility badge when not on Pending tab (optional if tab already implies state)
6. **Pending** only: **Approve** and **Reject** buttons
   - Disable both while that row’s id is busy
   - On success: remove item from current list (stays off pending; does not auto-jump tabs)
7. **Live** / **Rejected**: read-only cards (no approve/reject)
8. States:
   - Loading copy
   - Empty: “No pending events.” / “No live events.” / “No rejected events.” per tab
   - Top-level `role="alert"` for load/action errors

Visual language: same tokens/classes as `RoleRequestsPage` (`font-display`, `border-border`, `bg-surface`, `bg-cobalt`, etc.). Operate mode — scannable queue, not marketing chrome.

### Navigation

When `user.is_admin`:

- Keep **Role requests** → `/admin/role-requests`
- Add **Event requests** → `/admin/event-requests`

Desktop and mobile header menus both get the link (same places Role requests already appears).

### Routing

```
/admin/event-requests  →  RequireAuth → RequireAdmin → EventRequestsPage
```

Same gate stack as role requests.

## Data flow

```
Admin opens page
  → listAdminEvents('pending_review')
  → render cards

Tab change
  → listAdminEvents(selectedVisibility)
  → replace list

Approve(id)
  → approveEvent(id)
  → filter id out of local list

Reject(id)
  → rejectEvent(id)
  → filter id out of local list
```

## Testing

- Mock `listAdminEvents` / `approveEvent` / `rejectEvent`
- Admin user in auth context
- Assert pending list renders title + creator
- Approve removes card and calls API with id
- Reject removes card and calls API with id
- Optional: tab switch requests `live` / `rejected` visibility param

## Success criteria

- Admin can open **Event requests** from nav
- Pending queue loads from backend
- Approve makes event live (backend); card leaves pending list
- Reject marks rejected; card leaves pending list
- Live/Rejected tabs list corresponding events read-only
- Non-admin cannot reach the route (existing `RequireAdmin`)
- Backend routes remain the existing three; FE tests pass

## Phasing

1. Frontend API + page + nav + tests against existing backend
2. Manual check with `admin@hampas.test` and a `pending_review` event
