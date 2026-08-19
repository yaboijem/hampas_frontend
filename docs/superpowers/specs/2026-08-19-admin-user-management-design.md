# Admin user management design

## Goal

Give admins a dedicated **Users** page to search, filter, paginate, and fully CRUD accounts (including roles and role profiles), matching the existing admin visual language on desktop and mobile. When an admin changes an existing user’s account, roles, or profiles, that user receives an in-app notification.

## Problem

- Admins can only moderate role *requests* and events; they cannot list or manage the full user base.
- There is no admin API to create users, edit details/roles/profiles, toggle `is_admin`, or delete accounts.
- Affected users are not told when an admin changes their account.

## Scope

### In scope

- New page at `/admin/users` (auth + admin only)
- Header nav link **Users** (desktop + mobile), separate from **Admin** (requests)
- Search by name/email; multi-select role filter Player | Coach | Organizer (OR)
- Server-side pagination (page size 10, reuse `AdminPagination` / `ADMIN_PAGE_SIZE`)
- Create / edit modal (sheet-friendly on small screens): account fields, `is_admin`, roles, nested profile fields
- Hard delete with confirmation
- Backend admin users CRUD under `/admin/users`
- In-app `UserNotification` to the target user on update (not on create/delete)
- Guards: no self-delete; cannot remove own admin; cannot demote/delete last admin
- FE + BE tests for core flows and guards
- Responsive UI matching existing admin theme (navy/cobalt/surface, cards, soft shadow)

### Out of scope

- Bulk actions, CSV import/export, impersonation
- Email delivery for admin-driven changes (in-app only)
- Soft-delete / ban flag (hard delete only)
- Changing the Admin requests hub tabs or pending-count badge behavior
- Browser push for user-management events
- Password-reset email flows from this screen (admin sets password directly on create/edit)

## Decisions (approved)

| Topic | Choice |
|-------|--------|
| Placement | New page + nav link (not a tab on requests) |
| CRUD depth | Full account + roles + profiles |
| Delete / admin flag | Hard delete + toggle `is_admin` with self/last-admin guards |
| UI pattern | List + modal (Approach A) |
| Role filter | OR — match any selected role; none selected = all users |
| Notify user | In-app notification on admin update of existing user |
| Layout width | Same as requests: `max-w-xl` card list (not wide desktop table) |

## Information architecture & routing

### Routes

| Path | Behavior |
|------|----------|
| `/admin/users` | User management page; `RequireAuth` → `RequireAdmin` |

No change to `/admin/requests` or legacy redirects.

### Navigation

When `user.is_admin`:

- Keep existing **Admin** link → `/admin/requests` (with pending badge).
- Add **Users** link → `/admin/users` (no badge).
- Both desktop and mobile menus.

### Page chrome

1. Title: **Users**
2. Subtitle: manage accounts, roles, and profiles
3. Primary action: **Add user**
4. Search control (same pattern as Admin requests)
5. Multi-select filter chips: Player | Coach | Organizer
6. Paginated card list

### List card

- Name (display font, bold)
- Email (muted)
- Role chips for attached roles; **Admin** chip when `is_admin`
- Actions: **Edit** | **Delete**

## Search, filter, pagination

| Control | Behavior |
|---------|----------|
| Search `q` | Case-insensitive match on `name` or `email` (trim; empty = no text filter) |
| Roles `roles[]` | Optional multi; OR semantics across `user_roles.role` |
| Page | Resets to 1 when `q` or roles change |
| `per_page` | Default 10 (`ADMIN_PAGE_SIZE`) |
| Empty (no data) | “No users yet.” + prompt to add |
| Empty (filtered) | “No matching users.” |

## Create / Edit modal

Shared form for create and edit. On small viewports, present as full-width sheet/modal consistent with existing dialogs if any; otherwise a centered modal with scrollable body.

### Account fields

| Field | Create | Edit |
|-------|--------|------|
| name | required | required |
| email | required, unique | required, unique (ignore self) |
| password | required | optional; blank keeps current |
| birth_date | required (same rules as register) | required |
| gender | required (`male` \| `female` \| `other`) | required |
| is_admin | optional boolean, default false | toggle with guards |

### Roles

- Checkboxes: Player, Coach, Organizer
- Checking a role: ensure `user_roles` row + empty role profile if missing
- Unchecking: remove role row and that role’s profile row
- Admins may still have roles explicitly stored; UI shows actual stored roles plus does not auto-hide admin-implied capabilities in list chips (list chips = stored `user_roles` + Admin from `is_admin`)

### Profile fields (visible when role checked)

Align with existing profile API / Profile page:

| Role | Fields |
|------|--------|
| Player | `positions[]`, `skill_level` |
| Coach | `achievements`, `bootcamp_name` |
| Organizer | `managed_courts`, `contact_number`, `contact_email`, `facebook_url`, `instagram_url` |

### Guards (backend authoritative; FE mirrors)

- Actor cannot delete self
- Actor cannot set own `is_admin` to false
- Cannot delete or demote the last remaining admin
- Non-admin middleware already blocks non-admins from all routes

### Delete

1. Confirm dialog: destructive copy including user name/email
2. `DELETE /admin/users/{id}`
3. Hard delete user; cascade or explicitly remove role rows, profiles, personal access tokens, role requests, user notifications, consents as required by FKs
4. Related domain data (events created_by, applications): follow existing schema — prefer DB cascade or nullify only where already defined; if delete would violate FK, return 409 with clear message rather than partial delete
5. Refresh list; if page becomes empty and `page > 1`, go to previous page

## Backend API

Prefix: `auth:sanctum` + `admin` middleware, group `admin`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/users` | Paginated list |
| POST | `/admin/users` | Create |
| GET | `/admin/users/{user}` | Detail for edit (account + roles + profiles) |
| PUT | `/admin/users/{user}` | Full update (account + roles + profiles) |
| DELETE | `/admin/users/{user}` | Hard delete |

### Query params (index)

- `q` string optional
- `roles` array optional: `player`, `coach`, `organizer`
- `page`, `per_page` (cap per_page reasonably, e.g. max 50)

### List item shape

```json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "birth_date": "2000-01-15",
  "gender": "female",
  "is_admin": false,
  "roles": ["player", "coach"],
  "created_at": "2026-08-01T12:00:00.000000Z"
}
```

### Detail / write payload shape

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "optional-on-update",
  "birth_date": "2000-01-15",
  "gender": "female",
  "is_admin": false,
  "roles": ["player", "organizer"],
  "profiles": {
    "player": { "positions": ["setter"], "skill_level": "intermediate" },
    "coach": null,
    "organizer": {
      "managed_courts": ["Court A"],
      "contact_number": "+63...",
      "contact_email": "org@example.com",
      "facebook_url": null,
      "instagram_url": null
    }
  }
}
```

- On write, `roles` is the full desired set.
- `profiles.{role}` may be omitted or null when role not in `roles`; server ignores profile blobs for roles not granted.
- Response for create/update/show: detail shape (no password).
- Pagination envelope: existing Laravel `Paginated` (`data`, `links`, `meta`).

### Validation

- Mirror registration rules for name/email/password/birth_date/gender where applicable
- Profile field validation matches `ProfileController` update rules
- 422 with field errors on validation failure (including email already taken)
- 403 on guard failures (self-delete, last admin, self-demote)
- 409 if delete blocked by unexpected FK/relations after dependent cleanup attempts

## User notifications (target user)

On successful **update** only, if anything material changed:

| Change | Example message |
|--------|-----------------|
| Account fields and/or password | “An admin updated your account.” |
| Roles added | “An admin granted you Coach access.” (one notif per added role or one combined message) |
| Roles removed | “An admin removed your Coach access.” |
| Profile fields only | “An admin updated your profile.” |

Rules:

- Emit **one** `UserNotification` per successful material update, with combined copy when multiple categories change (e.g. “An admin updated your account and granted you Coach access.”).
- `type`: `admin_user_updated`
- Do **not** notify on create or delete
- Do **not** notify the acting admin about their own successful action via this channel (admin gets FE toast only)
- If only whitespace-equivalent / no-op update, skip notification

Admin FE toast examples (actor only):

- “User created”
- “User updated”
- “User deleted”

## Frontend architecture

| Piece | Responsibility |
|-------|----------------|
| `src/pages/Admin/AdminUsersPage.tsx` | Shell: title, search, filters, list, pagination, wire modal |
| `src/pages/Admin/AdminUserFormModal.tsx` (or equivalent) | Create/edit form + submit |
| `src/pages/Admin/AdminUserDeleteDialog.tsx` (optional) | Confirm hard delete |
| `src/api/admin.ts` | `listAdminUsers`, `getAdminUser`, `createAdminUser`, `updateAdminUser`, `deleteAdminUser` |
| `src/api/types.ts` | `AdminUserListItem`, `AdminUserDetail`, related payload types |
| `src/App.tsx` | Route `/admin/users` |
| `src/components/AppHeader.tsx` | **Users** nav link (desktop + mobile) |
| `src/components/AdminPagination.tsx` | Reuse |
| Tests | `admin-users*.test.tsx` covering list/filter/crud UX with mocked API |

### Visual language

Match Admin requests: `font-display`, `text-navy`, `text-muted`, `border-border`, `bg-surface`, `bg-cobalt`, `shadow-soft`, `rounded-[var(--radius-card)]` / `radius-control`, `role="alert"` errors. Operate mode — scannable tools.

### Data flow

```
Mount / filter / page change
  → listAdminUsers({ q, roles, page, per_page })
  → render cards + AdminPagination

Add user
  → open modal empty
  → createAdminUser(payload)
  → toast, close, refresh page 1

Edit
  → getAdminUser(id) (or use list row + fetch detail)
  → updateAdminUser(id, payload)
  → toast, close, refresh current page
  → backend writes UserNotification for target

Delete
  → confirm → deleteAdminUser(id)
  → toast, adjust page if needed, refresh
```

## Backend architecture

| Piece | Responsibility |
|-------|----------------|
| `AdminUserController` | index/store/show/update/destroy |
| Form requests | Validate create/update payloads |
| Service or controller private methods | Sync roles + profiles; apply guards; emit notifications |
| `UserNotification` creation | Same pattern as existing application notifications |
| Feature tests | Filters, CRUD, guards, notification side effects |

Reuse existing models: `User`, `UserRole`, `PlayerProfile`, `CoachProfile`, `OrganizerProfile`, `UserNotification`.

## Error & loading states

| State | UX |
|-------|-----|
| Loading list | “Loading…” |
| List error | `role="alert"` message |
| Modal validation | Inline field errors from 422 |
| Guard / conflict | Alert in modal or page |
| Row/form busy | Disable actions until settled |

## Testing

### Frontend

- Renders list from mocked API; search and role filter passed to API; pagination controls
- Create opens modal and calls create API
- Edit loads detail and calls update
- Delete confirms then calls delete
- Nav link visible for admin

### Backend

- Index: `q` and `roles` OR filter; pagination meta
- Store/update: persists account, roles, profiles
- Update: creates user notification when data changes
- Destroy: removes user; blocked for self and last admin
- Update: blocked self-demote and last-admin demote

## Implementation notes

- Stick to existing admin patterns (RoleRequestsPanel fetch/page/busy) rather than introducing a new table library.
- Password never returned in API responses.
- Frontend does not invent admin capabilities; all mutations go through admin API.
- Coordinate FE and BE in one delivery so the page is usable end-to-end.

## Success criteria

1. Admin can open **Users**, search, multi-filter by role, and page through results on mobile and desktop.
2. Admin can create, edit (account + roles + profiles), toggle admin (within guards), and hard-delete users.
3. Target user sees an in-app notification after admin updates their account.
4. Theme matches existing admin UI; no regression to requests hub or pending badges.
5. Tests cover primary FE flows and BE guards/notifications.
