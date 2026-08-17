# Auth UI Theme + Password UX + /events Redirects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theme Login/Register to HAMPAS tokens, add password show/hide + strength checklist when setting passwords, and default all users to `/events` (logout included), with login return-to-`from` for apply/protected routes.

**Architecture:** Shared `PasswordField` and `PasswordRules` + small `passwordRules.ts` helpers. Auth pages use a card shell matching Profile field chrome. Redirects updated in `App.tsx`, `AppHeader`, `ApplyButton`, `ReportModal`. Backend register/reset password rules aligned to min 8 + digit + symbol.

**Tech Stack:** React 19, TypeScript, Tailwind v4 tokens, Vitest, Testing Library, Laravel validation (`Password::min(8)->numbers()->symbols()`)

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-17-auth-ui-redirects-design.md`
- Tokens: ice, surface, navy, cobalt, electric, muted, border, chip-text, radius-card, radius-control, shadow-soft, font-display
- Password set rules: length ≥ 8, `/[0-9]/`, `/[^A-Za-z0-9]/`, confirmation match
- Login: eye only, no checklist
- `/` → always `/events`; logout → `/events`; login default → `/events`; login with `state.from` → return there
- Apply guest → login with `from`; RequireAuth unchanged pattern
- No new npm dependencies; inline SVG for eye icons
- Update existing auth tests: weak `password` no longer valid for register — use e.g. `Passw0rd!`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/passwordRules.ts` | `passwordMeetsRules`, `passwordsMatch` helpers |
| `src/components/PasswordField.tsx` | Labeled password input + show/hide |
| `src/components/PasswordRules.tsx` | Live checklist UI |
| `src/pages/Auth/LoginPage.tsx` | Themed login |
| `src/pages/Auth/RegisterPage.tsx` | Themed register + rules |
| `src/pages/Auth/ResetPasswordPage.tsx` | PasswordField + rules |
| `src/pages/Auth/ForgotPasswordPage.tsx` | Light token pass |
| `src/pages/Profile/ProfilePage.tsx` | Use shared password components |
| `src/App.tsx` | HomeRedirect → `/events` |
| `src/components/AppHeader.tsx` | Logout navigate `/events`; logo `/events` |
| `src/components/ApplyButton.tsx` | Login with `from` |
| `src/components/ReportModal.tsx` | Login with `from` |
| `src/test/auth.test.tsx` | Auth UI + rules + login from |
| `src/test/profile.test.tsx` | Adjust if PasswordField labels change |
| `hampas_backend/.../RegisteredUserController.php` | Stronger password rule |
| `hampas_backend/.../NewPasswordController.php` | Same rule |
| Backend registration tests if they use weak passwords |

---

### Task 1: passwordRules helpers + PasswordField + PasswordRules

**Files:**
- Create: `src/lib/passwordRules.ts`
- Create: `src/components/PasswordField.tsx`
- Create: `src/components/PasswordRules.tsx`
- Test: `src/test/auth.test.tsx` (extend in Task 3; unit-smoke via import in components)

**Interfaces:**
- Produces:
  - `passwordMeetsRules(pw: string): boolean`
  - `passwordsMatch(a: string, b: string): boolean`
  - `<PasswordField id label value onChange autoComplete? disabled? className? />`
  - `<PasswordRules password confirmation />`

- [ ] **Step 1: Create helpers**

```ts
// src/lib/passwordRules.ts
export function passwordMeetsRules(pw: string): boolean {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

export function passwordsMatch(a: string, b: string): boolean {
  return a.length > 0 && a === b;
}
```

- [ ] **Step 2: Create PasswordField**

```tsx
// src/components/PasswordField.tsx
import { useId, useState } from 'react';

const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 pr-11 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
};

export default function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  disabled,
}: Props) {
  const genId = useId();
  const id = idProp ?? genId;
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id} className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative mt-1 block">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-navy"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {/* simple eye / eye-off SVG */}
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
```

- [ ] **Step 3: Create PasswordRules**

```tsx
// src/components/PasswordRules.tsx
import { passwordMeetsRules, passwordsMatch } from '../lib/passwordRules';

function Row({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'font-medium text-emerald-700' : 'text-muted'}`}>
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      {children}
    </li>
  );
}

export default function PasswordRules({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  const len = password.length >= 8;
  const digit = /[0-9]/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);
  const match = passwordsMatch(password, confirmation);

  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      <Row ok={len}>At least 8 characters</Row>
      <Row ok={digit}>At least 1 digit</Row>
      <Row ok={special}>At least 1 special character</Row>
      <Row ok={match}>Passwords match</Row>
    </ul>
  );
}

// optional export for submit gates:
export function passwordFormValid(password: string, confirmation: string): boolean {
  return passwordMeetsRules(password) && passwordsMatch(password, confirmation);
}
```

Move `passwordFormValid` to `passwordRules.ts` instead if cleaner:

```ts
export function passwordFormValid(password: string, confirmation: string): boolean {
  return passwordMeetsRules(password) && passwordsMatch(password, confirmation);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/passwordRules.ts src/components/PasswordField.tsx src/components/PasswordRules.tsx
git commit -m "feat: shared PasswordField and password rules helpers"
```

---

### Task 2: Theme LoginPage + RegisterPage

**Files:**
- Modify: `src/pages/Auth/LoginPage.tsx`
- Modify: `src/pages/Auth/RegisterPage.tsx`
- Modify: `src/pages/Auth/ForgotPasswordPage.tsx` (light)
- Modify: `src/pages/Auth/ResetPasswordPage.tsx`

**Interfaces:**
- Consumes: `PasswordField`, `PasswordRules`, `passwordFormValid` / `passwordMeetsRules`
- Login navigate: keep `from` then `/events`
- Register: `isValid` includes `passwordFormValid`

Shared chrome constants (inline or small local consts on each page):

```ts
const cardClass =
  'mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6';
const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
const primaryBtn =
  'inline-flex w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60';
```

- [ ] **Step 1: Rewrite LoginPage**

Structure:

```tsx
<div className={cardClass}>
  <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">Log in</h1>
  <p className="mt-1 text-sm text-muted">Find games across Pampanga.</p>
  <form onSubmit={submit} className="mt-5 space-y-3">
    {error && <p role="alert" className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    <label htmlFor="login-email" className="block">
      <span className={labelClass}>Email</span>
      <input id="login-email" type="email" autoComplete="email" className={fieldClass} ... />
    </label>
    <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
    <button type="submit" className={primaryBtn}>Log in</button>
  </form>
  <p className="mt-4 text-center text-sm text-muted">
    <Link to="/forgot-password" className="font-semibold text-cobalt hover:underline">Forgot password?</Link>
    {' · '}
    <Link to="/register" className="font-semibold text-cobalt hover:underline">Create an account</Link>
  </p>
</div>
```

Keep login success:

```ts
const fromState = location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null;
const from = fromState?.from;
const target =
  from?.pathname
    ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
    : '/events';
navigate(target, { replace: true });
```

- [ ] **Step 2: Rewrite RegisterPage**

- Use same card shell
- `PasswordField` for password + confirm (`autoComplete="new-password"`)
- `<PasswordRules password={form.password} confirmation={form.password_confirmation} />`
- `isValid` uses `passwordFormValid(form.password, form.password_confirmation)` instead of `length >= 8` only
- Gender/date/checkboxes keep accessible labels matching tests (`/privacy policy/i`, `/terms of service/i`, exact `Password` / `Confirm password` labels via PasswordField label prop)
- `navigate('/events')` on success (already)

- [ ] **Step 3: ResetPasswordPage + ForgotPasswordPage light theme**

Reset: card + PasswordField x2 + PasswordRules + primary button.  
Forgot: card + email field + primary button.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Auth/
git commit -m "feat: theme Login and Register with password UX"
```

---

### Task 3: Auth tests (password rules + toggle)

**Files:**
- Modify: `src/test/auth.test.tsx`

- [ ] **Step 1: Update register passwords to strong value**

Replace `'password'` with `'Passw0rd!'` in register tests (type + expect).

- [ ] **Step 2: Add tests**

```ts
test('weak password keeps create account disabled', async () => {
  // fill form with password 'password' / 'password', valid age, consents
  // expect create account disabled
});

test('show password toggle changes input type', async () => {
  render Login or Register
  const input = screen.getByLabelText('Password');
  expect(input).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: /show password/i }));
  expect(input).toHaveAttribute('type', 'text');
});
```

- [ ] **Step 3: Run**

```bash
npm test -- --run src/test/auth.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/test/auth.test.tsx
git commit -m "test: auth password rules and show/hide toggle"
```

---

### Task 4: Redirects — home, logout, apply, report

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/components/ApplyButton.tsx`
- Modify: `src/components/ReportModal.tsx`
- Test: extend `src/test/auth.test.tsx` or small redirect tests

- [ ] **Step 1: HomeRedirect**

```tsx
function HomeRedirect() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-muted" role="status">
        Loading…
      </div>
    );
  }
  return <Navigate to="/events" replace />;
}
```

- [ ] **Step 2: AppHeader logout + logo**

```tsx
import { Link, useNavigate } from 'react-router-dom';
// ...
const navigate = useNavigate();
const handleSignOut = () => {
  setMenuOpen(false);
  signOut();
  navigate('/events', { replace: true });
};
// Logo Link to="/events" for both guest and user (or always /events)
```

Replace both desktop and mobile Log out `onClick={signOut}` with `handleSignOut`.  
Guest brand link: `to="/events"`.

- [ ] **Step 3: ApplyButton**

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
const location = useLocation();
// in handleApply:
if (!user) {
  navigate('/login', { state: { from: location } });
  return;
}
```

- [ ] **Step 4: ReportModal**

```tsx
const location = useLocation();
useEffect(() => {
  if (!user) {
    navigate('/login', { state: { from: location } });
    return;
  }
  // ...
}, [user, navigate, location]);
```

- [ ] **Step 5: Tests**

```ts
// auth or smoke:
test('login with from state returns to that path', async () => {
  vi.mocked(authApi.login).mockResolvedValue({ token: 'tok', user: {...} });
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/events/9' } } }]}>
      <LoginPage />
    </MemoryRouter>,
  );
  // fill + submit
  // assert navigate - use MemoryRouter + Routes or mock useNavigate
});
```

Prefer wrapping with:

```tsx
import { MemoryRouter, Routes, Route } from 'react-router-dom';
// Route path="/login" element={<LoginPage />}
// Route path="/events/9" element={<div>Event 9</div>}
// after login expect screen.getByText('Event 9')
```

Also test HomeRedirect via rendering App routes if feasible, or unit test Navigate target by rendering a tiny harness.

Simpler smoke for logout: mock AuthContext + render header, click Log out, assert location is `/events`.

- [ ] **Step 6: Run tests**

```bash
npm test -- --run src/test/auth.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/AppHeader.tsx src/components/ApplyButton.tsx src/components/ReportModal.tsx src/test/auth.test.tsx
git commit -m "feat: default navigation to /events and login return-to-from"
```

---

### Task 5: Profile password fields use shared components

**Files:**
- Modify: `src/pages/Profile/ProfilePage.tsx`
- Modify: `src/test/profile.test.tsx` if labels change

**Interfaces:**
- Replace raw new/confirm password inputs with `PasswordField`
- Replace inline rule text with `PasswordRules`
- Use `passwordFormValid` / `passwordMeetsRules` from `lib/passwordRules` (remove duplicate local helper if present)

- [ ] **Step 1: Wire ProfilePage**

Import `PasswordField`, `PasswordRules`, helpers from lib.  
Unlocked password UI:

```tsx
<PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
<PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
<PasswordRules password={newPassword} confirmation={confirmPassword} />
```

Keep Save password disabled until `passwordFormValid(...)`.

- [ ] **Step 2: Run profile tests**

```bash
npm test -- --run src/test/profile.test.tsx
```

Fix label queries if needed (`/^new password$/i` still works via PasswordField label).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile/ProfilePage.tsx src/test/profile.test.tsx
git commit -m "refactor: profile password change uses shared PasswordField"
```

---

### Task 6: Backend register + reset password rules

**Files:**
- Modify: `M:\hampas_backend\app\Http\Controllers\Auth\RegisteredUserController.php`
- Modify: `M:\hampas_backend\app\Http\Controllers\Auth\NewPasswordController.php`
- Modify: registration/password tests that use `password` as value

- [ ] **Step 1: Align validation**

```php
'password' => ['required', 'confirmed', Password::min(8)->numbers()->symbols()],
```

(Import `Illuminate\Validation\Rules\Password` if using short name.)

Same in `NewPasswordController`.

- [ ] **Step 2: Fix tests**

In `tests/Feature/Auth/RegistrationTest.php`, `PasswordResetTest.php`, etc., change passwords to `Passw0rd!` (or `Newpass1!`).

- [ ] **Step 3: Run**

```bash
cd M:\hampas_backend
php artisan test --filter=Registration
php artisan test --filter=Password
```

Expected: PASS

- [ ] **Step 4: Commit (backend repo)**

```bash
git add app/Http/Controllers/Auth/RegisteredUserController.php app/Http/Controllers/Auth/NewPasswordController.php tests/
git commit -m "fix: require digit and symbol on register and reset password"
```

---

### Task 7: Final verification

- [ ] **Step 1: Frontend**

```bash
cd M:\hampas_frontend
npm test -- --run src/test/auth.test.tsx src/test/profile.test.tsx
npm run lint
```

- [ ] **Step 2: Backend**

```bash
cd M:\hampas_backend
php artisan test --filter=Registration
php artisan test --filter=PasswordChange
php artisan test --filter=PasswordReset
```

- [ ] **Step 3: Spec checklist**

- [x] Themed login/register  
- [x] Eye toggle  
- [x] Rules on set-password  
- [x] `/` and logout → `/events`  
- [x] Apply/login `from`  
- [x] Backend rules aligned  

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Auth shell theme | 2 |
| PasswordField eye | 1–2, 5 |
| PasswordRules | 1–2, 5 |
| Register rules = profile | 1–2, 6 |
| Home → /events | 4 |
| Logout → /events | 4 |
| Login from / default events | 2, 4 |
| Apply from | 4 |
| Report from | 4 |
| Tests | 3–4, 7 |
| Backend align | 6 |

No placeholders. Shared names: `PasswordField`, `PasswordRules`, `passwordMeetsRules`, `passwordFormValid`.
