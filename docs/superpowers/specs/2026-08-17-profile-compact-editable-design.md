# Compact editable profile design

## Goal

Make the Profile page denser and let the signed-in owner edit **all of their own details**: account fields (name, email, birth date, gender) and role fieldsets (player / coach / organizer).

## Scope

**In scope**
- Compact stacked-card layout on `ProfilePage`
- Editable account form with `PUT /user`
- Refresh auth user after successful account save
- Keep existing role APIs (`getProfile`, `addRole`, `updateRole`) and field keys
- Loading skeleton, error alert, busy save states
- Tests for account save + existing role behaviors

**Out of scope**
- Password change, avatar upload, public profiles
- Admins editing other users
- New role types or business-rule changes
- Backend implementation (frontend assumes `PUT /user` exists)

## Structure

### 1. Page shell (compact)
- Container: `mx-auto max-w-xl space-y-3`
- Hero: title `Profile` (display, smaller than current 4xl/5xl — e.g. `text-2xl sm:text-3xl`) + one muted subtitle line
- Role chips row under hero (emoji + label); empty: muted “No roles yet”
- Drop oversized eyebrow/padding; keep HAMPAS tokens (navy, cobalt, surface, border, muted, chip-text)

### 2. Account card (owner-editable)
- Always shown when `user` is loaded
- Fields (prefilled from `useAuth().user`):
  - `name` (text, required)
  - `email` (email, required)
  - `birth_date` (date; max = today − 18 years, same rule as register)
  - `gender` (select: male | female | other)
- Layout: 2-column grid on `sm+` for short fields; full width for name/email if needed
- Primary button: **Save account**
- On submit: `updateMe({ name, email, birth_date, gender })` → `PUT /user`
- On success: update AuthContext user (header name stays in sync); clear local dirty state
- On failure: top-level `role="alert"` with API/message error
- While saving: disable button, label “Saving…”

### 3. Role cards
- One compact card per owned role
- Header: emoji + “{Role} details”
- Fields from existing `ROLE_FIELDS` (unchanged keys/API values)
- Skill level select: API values `beginner` | `intermediate` | `advanced`; Title Case labels
- Button: `Save {role}` (accessible name keeps lowercase role, e.g. “Save coach”)
- `updateRole(role, fields)` then reload profile

### 4. Add role card
- Shown when not all three roles owned
- Dashed border; role select limited to missing roles; dynamic fields; **Add role**
- `addRole` then reload; clear new-field draft

### 5. Loading & errors
- Initial load: compact skeleton (hero strip + 1–2 cards)
- Shared top alert for load/save/add failures

## Data & APIs

### Existing (unchanged)
- `GET /profile` → `getProfile`
- `POST /profile/roles` → `addRole`
- `PUT /profile/{role}` → `updateRole`
- `GET /user` → `getMe`

### New
- `updateMe(payload)` in `src/api/auth.ts`:
  - `PUT /user` body: `{ name, email, birth_date, gender }`
  - Returns `{ user: User }` (same shape as login/register/getMe)
- AuthContext: expose a way to replace the current user after save (e.g. `setUser` / `updateUser(user: User)`), without changing token

### Types
- Reuse `User` and `Gender` from `src/api/types.ts`
- No change to `ProfileFieldset` / `Role`

## Ownership / security (frontend)
- Page remains behind `RequireAuth`
- Only the authenticated session’s `/user` and `/profile` are called — no user-id in path for account update
- Do not surface `is_admin` as an editable field

## Visual system
- Match Events/EventForm field chrome (labels uppercase chip-text; inputs rounded-xl border focus cobalt)
- Cards: `rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft`
- Primary buttons: cobalt
- Dark mode via existing CSS variables

## Testing
- Extend `src/test/profile.test.tsx`:
  - Renders editable account fields from mocked auth user
  - Save account calls `updateMe` with edited values and updates displayed name
  - Keep add-role and save-coach tests (selectors may tighten for density)
- Mock `updateMe` alongside profile API mocks; AuthContext mock should allow asserting user update if needed

## Success criteria
- Profile is visually denser (less vertical waste) than current hero + large cards
- Owner can edit and save name, email, birth_date, gender
- Owner can edit and save every role field they own; can still add missing roles
- Existing profile tests pass (updated as needed); lint/build clean
- No new dependencies
