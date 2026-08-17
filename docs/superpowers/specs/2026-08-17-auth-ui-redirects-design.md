# Auth UI theme + password UX + /events redirects

## Goal

Restyle **Log in** and **Register** to match the HAMPAS Events/Profile visual system; add password show/hide and live validation when setting a new password; make **`/events` the default destination** for everyone, with login/register only when applying or hitting a protected action.

## Decisions (locked)

- Approach: **shared auth shell** + reusable `PasswordField` / password rules (not split marketing layout).
- Password rules when **setting** a password: match Account password change — **min 8**, **≥1 digit**, **≥1 special** (`[^A-Za-z0-9]`), plus confirmation match.
- Login password: eye toggle only (no strength checklist).
- `/` → always `/events` (guest or authenticated).
- Logout → `/events`.
- After login: `location.state.from` if present, else `/events`.
- After register: `/events`.
- Guest apply → `/login` with `state.from` = current location (return after login).
- Protected routes keep `RequireAuth` → login + `from` (profile, create event, etc.).

## Scope

### In scope

- `LoginPage`, `RegisterPage` themed UI
- Shared `PasswordField` (eye toggle) used on Login, Register, Profile password change, Reset password
- Shared password rules checklist on Register (new + confirm); reuse on Profile password change and Reset password
- Align register client validation (and backend if still min-8 only) with the strength rules
- Redirects: `HomeRedirect`, logout in `AppHeader`, Apply (and similar guest→login) pass `from`
- Tests for UI chrome hooks, password toggle/rules, redirect behavior

### Out of scope

- Full redesign of Forgot/Reset pages (optional light token pass only if trivial)
- OAuth / social login
- Email verification UX
- Changing which routes require auth (only default landing + logout + apply return path)

## Visual system

Match existing tokens from `src/index.css` / Profile:

- Colors: ice, surface, navy, cobalt, electric, muted, border, chip-text
- Fonts: display (Archivo Black) titles; DM Sans body
- Controls: `rounded-xl` / `radius-control` inputs; `radius-card` card; `shadow-soft`
- Labels: uppercase tracking chip-text style (same as Profile)
- Primary button: full-width cobalt, white text
- Errors: `role="alert"`, red-50/red-700 pattern consistent with Profile
- Dark mode: CSS variables only

## Auth UI structure

### Shell (Login + Register)

- Page: centered column inside existing `main` layout
- Card: `max-w-md w-full`, surface, border, radius-card, soft shadow, padding
- Title: font-display (e.g. “Log in” / “Join Hampas”)
- Optional one-line muted subtitle
- Footer links: muted text + cobalt/underline links

### Fields

- Email, name, date, gender, checkboxes: same field chrome as Profile
- Register keeps: name, email, password, confirm, birth date (max 18y), gender, privacy + terms checkboxes

### PasswordField (shared component)

- Props: `id`, `label`, `value`, `onChange`, `autoComplete`, optional `disabled`
- Type toggles `password` | `text` via button
- Eye control: absolute end of input; accessible name “Show password” / “Hide password”; `aria-pressed`
- No new icon library required — simple SVG eye / eye-off inline

### PasswordRules (shared)

Shown when user is **setting** a new password (Register password fields; Profile change password; Reset password):

| Rule | Check |
|------|--------|
| At least 8 characters | `length >= 8` |
| At least 1 digit | `/[0-9]/` |
| At least 1 special character | `/[^A-Za-z0-9]/` |
| Passwords match | `password === password_confirmation` |

- List with pass/fail visual (e.g. check vs muted dash)
- Register submit disabled until all rules + existing form validity pass
- Login: **no** rules list

## Redirects

| Trigger | Behavior |
|---------|----------|
| `HomeRedirect` (`/`) | Always `<Navigate to="/events" />` |
| Logout (`AppHeader`) | `signOut()` then `navigate('/events')` (or `navigate` after clear) |
| Guest logo link | Prefer `/events` so guests land on discovery |
| Login success | `state.from.pathname` (+ search/hash if present) or `/events` |
| Register success | `/events` |
| `ApplyButton` guest | `navigate('/login', { state: { from: location } })` |
| `RequireAuth` | Unchanged: `/login` + `state.from` |
| Other guest→login (e.g. ReportModal) | Same `from` pattern |

**Intent:** Guests browse Events freely. Login/register appear when applying or opening a protected route, or when the user chooses Log in from the header.

## Backend (if needed)

- If register validation is still “min 8 only”, update to match strength rules (digit + symbol) so client and server agree — same as password-change endpoint rules.
- No change to login endpoint.

## Files (expected)

| File | Role |
|------|------|
| `src/components/PasswordField.tsx` | Show/hide password input |
| `src/components/PasswordRules.tsx` | Live checklist |
| `src/pages/Auth/LoginPage.tsx` | Themed login |
| `src/pages/Auth/RegisterPage.tsx` | Themed register + rules |
| `src/pages/Auth/ResetPasswordPage.tsx` | PasswordField + rules (light) |
| `src/pages/Profile/ProfilePage.tsx` | Use PasswordField + PasswordRules for change password |
| `src/App.tsx` | HomeRedirect → `/events` |
| `src/components/AppHeader.tsx` | Logout → `/events`; guest logo → `/events` |
| `src/components/ApplyButton.tsx` | Login with `from` |
| `src/components/ReportModal.tsx` | Login with `from` if applicable |
| `src/test/auth.test.tsx` (and/or profile) | Cover new behavior |
| Backend register validation | Only if rules diverge |

## Testing

- Login/Register render themed controls (labels, submit accessible names)
- Password toggle changes input type and accessible name
- Register: weak password keeps submit disabled; strong + match enables
- `/` redirects to `/events` for guest and signed-in
- Logout navigates to `/events`
- Login with `state.from` returns there; without `from` goes to `/events`
- Apply while logged out navigates to login with `from` set

## Success criteria

- Auth pages feel consistent with Events/Profile
- Eye toggle on all password inputs in scope
- Strength indicators on set-password flows; rules match profile password change
- Default destination is `/events`; logout lands on `/events`
- Apply/protected remain the main forced-login paths
- Tests pass; no new dependencies
