# Profile role access design

## Goal

Replace self-serve multi-role pickup with a clearer trust model:

- Every user is a **player** by default.
- **Coach** and **organizer** are elevated roles granted only after **admin approval** of a user request.
- A typical Profile shows **Account + Player details** only, plus a compact way to request elevated access or view request status.
- Owners still edit all fields for roles they already hold.

## Problem with the previous model

- Anyone could add player/coach/organizer from Profile (`POST /profile/roles`).
- Elevated capabilities (especially organizing events) were not gated.
- Profile UI encouraged empty multi-role chrome before the user had a real reason to hold those roles.

## Role model

| Role | How obtained | Who edits fields | Notes |
|------|----------------|------------------|--------|
| Player | Always on registration | Owner | Not removable by user; not “requested” |
| Coach | Admin approves request | Owner, after grant | Profile fields only until other product rules say otherwise |
| Organizer | Admin approves request | Owner, after grant | Implies ability to create/manage events (backend enforces) |

- `is_admin` is separate from coach/organizer (platform admin, not a profile role card).
- Frontend must not offer self-grant of elevated roles; backend must reject non-admin direct grants.

## Profile page (owner view)

### Always visible
1. **Account** — name, email, birth_date, gender (existing `PUT /user`).
2. **Player details** — position, skill_level (existing `PUT /profile/player`).

### Elevated section (single compact block)
Behavior depends on state per elevated role (`coach` | `organizer`):

| State | UI |
|-------|-----|
| Not held, no pending request | CTA to request that role (optional short note) |
| Pending | Chip/status “Pending” — no field editors |
| Rejected | Short message + allow re-request |
| Granted (in `profile.roles`) | Role details card + Save (existing `updateRole`) |

- Do **not** show “Add role” that immediately creates coach/organizer.
- Do **not** show coach/organizer field editors until the role is granted.
- Role chips in the hero reflect **granted** roles only (player always; plus coach/organizer when held).

### Loading / errors
- Keep compact skeleton + top-level `role="alert"` for load/save/request failures.

## Request flow

### User
1. Opens Profile → sees Account + Player.
2. Requests coach and/or organizer (one request per role; cannot spam duplicate pending for same role).
3. Sees pending until admin acts.
4. On approve: role appears; user fills details and saves.
5. On reject: sees status; may re-request.

### Admin
1. Views pending role requests.
2. Approve → attach role to user (same effect as former admin grant).
3. Reject → mark rejected with optional reason (reason display optional in v1).

Admin UI can be a minimal authenticated page or section gated by `user.is_admin`. Exact admin chrome is in scope if frontend-only admin list is feasible; otherwise document API and ship user Profile first with hooks.

## API contracts (frontend assumptions)

### Keep
- `GET /profile` → `{ roles, player, coach, organizer }`
- `PUT /profile/{role}` → update fieldset for a **held** role only
- `PUT /user` → account update
- `GET /user` → current user including `is_admin`

### Change / stop using from client self-service
- `POST /profile/roles` — **not** used by normal users to self-add elevated roles. Prefer admin-only or remove from Profile client.

### New (user)
- `POST /profile/role-requests`  
  Body: `{ role: 'coach' | 'organizer', note?: string }`  
  Returns: `{ id, role, status: 'pending', note?, created_at }`  
  Errors: 422 if role already held or pending already exists.
- `GET /profile/role-requests`  
  Returns: list of current user’s requests (at least latest per role or full history with status).

### New (admin, `is_admin`)
- `GET /admin/role-requests?status=pending`  
  Returns: `{ id, role, status, note?, created_at, user: { id, name, email } }[]`
- `POST /admin/role-requests/{id}/approve` → attaches role; status `approved`
- `POST /admin/role-requests/{id}/reject` → body optional `{ reason?: string }`; status `rejected`

### Registration (backend)
- Creating a user always attaches **player** role (and empty/default player profile).
- Frontend register flow does not call add-role for player if backend already does this.

## Frontend modules (planned)

| Area | Responsibility |
|------|----------------|
| `src/api/profiles.ts` | Profile CRUD; role-request user endpoints; drop self-serve `addRole` from Profile usage |
| `src/api/admin.ts` (or profiles admin section) | Admin list/approve/reject |
| `src/pages/Profile/ProfilePage.tsx` | Account + player always; elevated request/status/granted cards |
| Admin page or section | Pending queue for `is_admin` |
| Tests | Player-only profile; request pending; granted coach save; no self-add elevated |

## Out of scope
- Password/avatar/public profiles
- Auto-approval rules, payments, or verified badges beyond admin queue
- Revoke elevated role UI (backend may support later; not required for v1 Profile)
- Changing event create rules beyond relying on organizer grant server-side

## Phasing

1. **Profile UX + user request APIs** — hide self-add; player always; request/pending/granted UI.
2. **Admin queue UI** — approve/reject.
3. **Backend alignment** — register always player; enforce elevated grants only via approve path.

Frontend can ship phase 1 against mocked/new endpoints; phase 2 as soon as admin routes exist.

## Success criteria
- New/default user Profile shows Account + Player only (no coach/organizer editors).
- User cannot self-grant coach/organizer from Profile.
- User can request elevated roles and see pending state.
- After approval, user can edit that role’s details.
- Admin can approve/reject requests (`is_admin`).
- Existing account edit and player/coach field save behaviors remain for held roles.
- Tests cover the above; no new dependencies.
