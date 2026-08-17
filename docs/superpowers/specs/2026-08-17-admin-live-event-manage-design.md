# Admin manage live events design

## Goal

Platform admins can **update** and **delete** any **live** event, not only events they own. Surfaces: event detail page and Admin → Event requests → Live tab.

## Problem

- Backend `PUT/DELETE /events/{event}` allow only the creator (`created_by`).
- Frontend shows Edit / Delete only when `event.is_owner`.
- Admins can approve/reject visibility but cannot correct or remove abusive/wrong live listings.

## Scope

### In scope

- Backend: allow `is_admin` on existing update and destroy (in addition to owner)
- Event detail: Edit + Delete for admin when event is `live`
- Admin Event requests → **Live** tab: Edit link + Delete action
- Tests (backend + frontend)

### Out of scope

- Admin managing applications for others’ events
- Separate `/admin/events/{id}` write routes
- Soft-delete / archive model (hard delete stays as today)
- Audit log / delete reason
- Bulk edit/delete
- Changing who can create events
- Auto-re-review after admin edit (event stays `live`)

## Authorization model

| Actor | Update | Delete | Manage applications |
|-------|--------|--------|---------------------|
| Creator (owner) | Yes (any visibility they can load) | Yes | Yes |
| Admin (`is_admin`) | Yes (any event) | Yes (any event) | No (UI stays owner-only) |
| Other authenticated | No (403) | No (403) | No |

**UI rule (frontend):** show Edit/Delete when:

```
is_owner || (user.is_admin && event.visibility === 'live')
```

Backend still allows admin on non-live events so the same endpoints work if an admin opens edit via URL; product chrome only promotes **live** management for admins.

## Backend

### Files

- `app/Http/Controllers/EventController.php` — `update`, `destroy`
- `tests/Feature/...` — extend existing event update/destroy tests (or add focused cases)

### Logic

Replace owner-only checks:

```php
// Before
abort_unless((int) $event->created_by === $request->user()->id, 403);

// After
$user = $request->user();
abort_unless(
    (int) $event->created_by === (int) $user->id || (bool) $user->is_admin,
    403
);
```

No new routes. Validation and photo handling unchanged. Response shapes unchanged (`EventResource`, `204` on delete).

### Tests

1. Non-owner non-admin → update/delete **403**
2. Owner → update/delete **200/204** (existing)
3. Admin, not owner, live event → update **200**, delete **204**
4. Optional: admin non-owner pending event update **200** (documents backend allowance)

## Frontend

### Event detail (`EventDetailPage`)

- Derive `canManage = event.is_owner || (user?.is_admin === true && event.visibility === 'live')`
- Show Edit + Delete when `canManage`
- Show Manage applications only when `event.is_owner` (unchanged)
- Delete: existing confirm + `deleteEvent` + navigate away

Requires `useAuth()` for `user.is_admin` if not already used on the page.

### Edit page (`EditEventPage`)

- No special admin form. Once backend allows, admin can load `/events/:id/edit` and save via `updateEvent`.
- If load fails 403 for non-admin non-owner, existing error handling stays.

### Admin Live tab (`EventRequestsPage`)

When tab is `live`, each card adds:

- **Edit** → `Link` to `/events/{id}/edit`
- **Delete** → confirm, `deleteEvent(id)`, remove from local list on success

Pending tab keeps Approve/Reject only. Rejected tab stays read-only (no edit/delete chrome).

### API client

Reuse `updateEvent` / `deleteEvent` from `src/api/events.ts`. No new admin write helpers required.

## Data flow

```
Admin on live event detail
  → Edit → EventForm → PUT /events/{id} (admin allowed)
  → Delete → confirm → DELETE /events/{id} → redirect

Admin on Event requests → Live
  → Edit → same edit route
  → Delete → confirm → DELETE /events/{id} → card removed
```

## Success criteria

- Admin can edit another user’s live event fields and photo
- Admin can delete another user’s live event
- Non-admin non-owner still cannot
- Owner behavior unchanged
- Admin Live tab exposes Edit + Delete
- Event detail exposes Edit + Delete for admin on live events
- Tests cover backend auth and FE admin affordances

## Phasing

1. Backend auth + tests  
2. Event detail + admin Live tab UI + FE tests  
