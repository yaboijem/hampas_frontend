# Profile Account password change (email 4-digit code)

## Goal

When the signed-in user edits the **Account** card on the Profile page, add **Password** change. Changing password requires proving control of the account email via a **4-digit code** before new password fields unlock and can be saved.

## Decisions (locked)

- Code gate applies to **password change only** (name / email / birth date / gender save unchanged).
- UI: **inline** Password block inside Account edit (not a separate page/modal).
- Sequence: **Send code → enter code → unlock fields → save password**.
- **No current password** required after successful code verify.
- Code is always sent to the authenticated user’s **current account email** (no alternate address; no hard `email_verified_at` gate). On successful verify, if `email_verified_at` is null, set it.
- Approach: **session-gated** three-step API (send → verify → change).
- New password rules: **min 8 characters**, **at least 1 digit**, **at least 1 special character**, plus confirmation match.
- Implement **frontend** (`hampas_frontend`) and **backend** (`hampas_backend`).

## Scope

### In scope

- Profile Account edit: Password block (send / verify / new + confirm / save password)
- Backend OTP generation, email, verify grant, password update
- Rate limiting, validation, error messages
- Frontend API client methods + Profile UI + tests
- Backend feature tests

### Out of scope

- Redesign of forgot/reset password (link token) flows
- Forcing email verification on all routes
- Avatar, public profiles, admin editing other users’ passwords
- Changing password rules on registration (unless done later as follow-up)

## Architecture

```
[Profile Account edit]
  Save account ──► PUT /user                    (unchanged)
  Password block:
    Send code   ──► POST /user/password/send-code
    Verify code ──► POST /user/password/verify-code  → short-lived grant
    Save password ► PUT /user/password               (requires grant)
```

All password endpoints require `auth:sanctum`. The client never chooses the email; the server uses `$request->user()->email`.

## Backend (`hampas_backend`)

### Endpoints

| Method | Path | Body | Success |
|--------|------|------|---------|
| `POST` | `/api/user/password/send-code` | _(empty)_ | `{ message }` — emails 4-digit code |
| `POST` | `/api/user/password/verify-code` | `{ code: string }` | `{ message }` — establishes password-change grant |
| `PUT` | `/api/user/password` | `{ password, password_confirmation }` | `{ message }` — updates password, clears grant + OTP |

### OTP & grant storage

- Prefer **cache** keys scoped by user id (no new table required unless cache is unsuitable in deploy):
  - `password_change_otp:{user_id}` → hashed code, expires ~**10 minutes**, attempt counter
  - `password_change_grant:{user_id}` → flag, expires ~**10 minutes** after successful verify
- Store **hash** of OTP only (e.g. `Hash::make` or `hash_hmac`); never return OTP in JSON.
- OTP format: **4 digits**, zero-padded string `0000`–`9999` (cryptographically secure random).
- On successful password change: delete OTP + grant keys.
- On successful verify: set `email_verified_at = now()` when null; delete OTP so the same code cannot be reused; create grant.

### Validation & rules

**send-code**

- Auth required.
- Throttle: e.g. **1 send per 60 seconds** per user (and/or IP); return 429 with clear message when limited.
- Overwrite any previous unused OTP for that user.

**verify-code**

- `code`: required, string, exactly 4 digits.
- Reject if no OTP, expired, or hash mismatch → 422 “Invalid or expired code.”
- Max attempts (e.g. **5**): then invalidate OTP → 422 “Too many attempts. Request a new code.”

**change password**

- Require valid grant; else 422 “Verify your email code first.”
- `password`: required, confirmed, min 8, regex (or multi-rule) for ≥1 digit and ≥1 special character.
- Special character: non-alphanumeric (e.g. `[^A-Za-z0-9]`).
- Hash with existing User cast (`hashed` / `Hash::make`).
- Do **not** require current password.

### Mail

- Mailable/notification: subject along the lines of “Your HAMPAS password change code”.
- Body: plain 4-digit code + short expiry note.
- Use existing Laravel mail config (`config/mail.php`).

### Controller placement

- New methods on `ProfileController` or a dedicated `PasswordChangeController` under `App\Http\Controllers\Auth` (prefer dedicated controller to keep Profile thin).
- Register routes inside the existing `auth:sanctum` group in `routes/api.php`.

### Errors (HTTP)

| Case | Status | Message (approx.) |
|------|--------|-------------------|
| Unauthenticated | 401 | standard |
| Send throttled | 429 | Wait before requesting another code |
| Invalid/expired code | 422 | Invalid or expired code |
| Too many verify attempts | 422 | Too many attempts. Request a new code |
| No grant on change | 422 | Verify your email code first |
| Weak/mismatched password | 422 | Laravel validation errors |

## Frontend (`hampas_frontend`)

### API client (`src/api/auth.ts`)

```ts
sendPasswordCode(): Promise<{ message: string }>
verifyPasswordCode(code: string): Promise<{ message: string }>
changePassword(password: string, password_confirmation: string): Promise<{ message: string }>
```

Paths: `/user/password/send-code`, `/user/password/verify-code`, `/user/password`.

### Profile UI (`ProfilePage` Account card)

Only when `editing.account`:

1. **Existing account fields** + **Save account** — unchanged behavior (`updateMe`).
2. **Password block** (below account fields):
   - **Locked:** copy that a code will be sent to `user.email`; primary **Send code**.
   - **Code pending:** 4-digit input + **Verify**; **Resend** disabled during cooldown (mirror server 60s or local timer after successful send).
   - **Unlocked:** **New password** + **Confirm password**; client-side checks (length ≥ 8, ≥1 digit, ≥1 special, match); **Save password** (separate button from Save account).
3. View mode: no password row (nothing to display).
4. Cancel / collapse Account: reset local password draft, code field, and unlock UI state.
5. Busy states: disable relevant buttons; labels “Sending…”, “Verifying…”, “Saving…”.
6. Errors: reuse top `role="alert"` and/or short inline error under the Password block.
7. Success: brief inline confirmation (“Password updated”); return Password block to locked idle state.

### Password validation (client, mirror server)

- Min length 8  
- `/[0-9]/`  
- `/[^A-Za-z0-9]/`  
- `password === password_confirmation`  
- Disable **Save password** until valid and unlocked  

### Types

- No change to public `User` shape required for basic flow.
- If UI later shows verified badge, optionally expose `email_verified_at` from `/user` (backend already has the column; frontend `User` type may gain optional `email_verified_at: string | null` when useful).

## Security notes

- Authenticated session alone is not enough to set a new password; email OTP + grant required.
- OTP hashed at rest; short TTL; attempt limits; send throttle.
- Grant is user-scoped and single-use on successful change.
- Never log or API-return the plain OTP.
- Frontend does not trust unlock alone: server enforces grant on `PUT /user/password`.

## Testing

### Backend

- Feature tests covering:
  - send-code emails notification (Mail/Notification fake) and stores OTP
  - verify succeeds with correct code; fails wrong/expired
  - change password fails without grant; succeeds with grant
  - password rules reject weak passwords
  - throttle / max attempts behavior as implemented

### Frontend

- Extend `src/test/profile.test.tsx`:
  - Password block visible in Account edit; locked until verify
  - After mocked verify, password fields enabled; `changePassword` called with values
  - Save account still calls `updateMe` without requiring code
  - Client validation blocks weak passwords

## Success criteria

- User can change password only after verifying a 4-digit code sent to their account email
- Password rules enforced on client and server
- Account profile fields remain independently editable
- Backend and frontend tests pass; no secrets in repo
- No unrelated refactors

## Implementation order (for planning)

1. Backend: OTP service + mail + three endpoints + tests  
2. Frontend API client  
3. Profile Account Password UI + validation  
4. Frontend tests  
5. Manual smoke (mail driver / log)  
