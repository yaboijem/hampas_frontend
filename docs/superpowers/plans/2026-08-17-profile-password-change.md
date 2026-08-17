# Profile Account Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in users change their password from Profile → Account edit only after verifying a 4-digit code emailed to their account email.

**Architecture:** Backend stores a hashed OTP and short-lived grant in cache; three Sanctum routes (send-code → verify-code → PUT password). Frontend adds client methods and an inline Password block in Account edit that unlocks new/confirm fields after verify. Account field save (`PUT /user`) stays independent.

**Tech Stack:** Laravel (Sanctum, Cache, Notifications, Feature tests), React 19, TypeScript, Vitest, Testing Library, existing axios `api` client

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-17-profile-password-change-design.md`
- Password gate only — name/email/birth_date/gender save unchanged
- Sequence: Send code → verify 4-digit → unlock → Save password
- No current password required
- Code always sent to authenticated user’s current email (no email in body)
- On successful verify: set `email_verified_at` if null
- New password: min 8 chars, ≥1 digit, ≥1 special (`[^A-Za-z0-9]`), confirmed
- OTP: 4 digits zero-padded `0000`–`9999`, hashed at rest, ~10 min TTL, max 5 verify attempts
- Send throttle: 1 per 60 seconds per user
- Grant: ~10 min after verify; required for `PUT /user/password`; cleared on success
- Never return OTP in API JSON
- Repos: backend work in `M:\hampas_backend` (separate git repo); frontend in `M:\hampas_frontend`
- No new npm/composer packages unless already present
- User model casts `password` => `hashed` — assign **plain** password string (do not `Hash::make` again)

---

## File Structure

| File | Responsibility |
|------|----------------|
| `hampas_backend/app/Notifications/PasswordChangeCodeNotification.php` | Email notification carrying the 4-digit code |
| `hampas_backend/app/Services/PasswordChangeOtpService.php` | Generate/store/verify OTP, grant lifecycle (cache) |
| `hampas_backend/app/Http/Controllers/Auth/PasswordChangeController.php` | sendCode, verifyCode, update |
| `hampas_backend/routes/api.php` | Register three auth routes + throttle |
| `hampas_backend/app/Providers/AppServiceProvider.php` | Rate limiter `password-change-send` |
| `hampas_backend/tests/Feature/Auth/PasswordChangeTest.php` | Backend feature coverage |
| `hampas_frontend/src/api/auth.ts` | `sendPasswordCode`, `verifyPasswordCode`, `changePassword` |
| `hampas_frontend/src/pages/Profile/ProfilePage.tsx` | Inline Password block in Account edit |
| `hampas_frontend/src/test/profile.test.tsx` | UI flow tests |

---

### Task 1: Backend OTP service + notification

**Files:**
- Create: `M:\hampas_backend\app\Notifications\PasswordChangeCodeNotification.php`
- Create: `M:\hampas_backend\app\Services\PasswordChangeOtpService.php`
- Test: `M:\hampas_backend\tests\Feature\Auth\PasswordChangeTest.php` (created/extended in Task 3; this task is exercised via Task 3)

**Interfaces:**
- Consumes: `Illuminate\Support\Facades\Cache`, `Illuminate\Support\Facades\Hash`, `Illuminate\Support\Facades\Notification`, `App\Models\User`
- Produces:
  - `PasswordChangeCodeNotification` constructor `(string $code)` public readonly `$code`
  - `PasswordChangeOtpService`:
    - `send(User $user): void` — generate OTP, cache hash+attempts, notify user
    - `verify(User $user, string $code): void` — throws `ValidationException` on failure; on success creates grant, forgets OTP, sets `email_verified_at` if null
    - `assertGrant(User $user): void` — throws `ValidationException` if no grant
    - `clearAll(User $user): void` — forget OTP + grant
    - `hasGrant(User $user): bool`

**Cache shape (exact keys):**

```
password_change_otp:{userId}   => ['hash' => string, 'attempts' => int], TTL 600s
password_change_grant:{userId} => true, TTL 600s
password_change_send:{userId}  => used only if implementing send cooldown in service; prefer route RateLimiter (Task 2)
```

- [ ] **Step 1: Create notification**

`app/Notifications/PasswordChangeCodeNotification.php`:

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordChangeCodeNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your HAMPAS password change code')
            ->line('Use this 4-digit code to change your password:')
            ->line("**{$this->code}**")
            ->line('This code expires in 10 minutes. If you did not request a password change, you can ignore this email.');
    }
}
```

- [ ] **Step 2: Create PasswordChangeOtpService**

`app/Services/PasswordChangeOtpService.php`:

```php
<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\PasswordChangeCodeNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordChangeOtpService
{
    private const OTP_TTL = 600;

    private const GRANT_TTL = 600;

    private const MAX_ATTEMPTS = 5;

    public function send(User $user): void
    {
        $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        Cache::put($this->otpKey($user), [
            'hash' => Hash::make($code),
            'attempts' => 0,
        ], self::OTP_TTL);

        $user->notify(new PasswordChangeCodeNotification($code));
    }

    public function verify(User $user, string $code): void
    {
        $payload = Cache::get($this->otpKey($user));

        if (! is_array($payload) || ! isset($payload['hash'])) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired code.'],
            ]);
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::forget($this->otpKey($user));
            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Request a new code.'],
            ]);
        }

        if (! Hash::check($code, $payload['hash'])) {
            $payload['attempts'] = $attempts + 1;
            if ($payload['attempts'] >= self::MAX_ATTEMPTS) {
                Cache::forget($this->otpKey($user));
                throw ValidationException::withMessages([
                    'code' => ['Too many attempts. Request a new code.'],
                ]);
            }
            Cache::put($this->otpKey($user), $payload, self::OTP_TTL);
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired code.'],
            ]);
        }

        Cache::forget($this->otpKey($user));
        Cache::put($this->grantKey($user), true, self::GRANT_TTL);

        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }
    }

    public function assertGrant(User $user): void
    {
        if (! $this->hasGrant($user)) {
            throw ValidationException::withMessages([
                'password' => ['Verify your email code first.'],
            ]);
        }
    }

    public function hasGrant(User $user): bool
    {
        return (bool) Cache::get($this->grantKey($user));
    }

    public function clearAll(User $user): void
    {
        Cache::forget($this->otpKey($user));
        Cache::forget($this->grantKey($user));
    }

    private function otpKey(User $user): string
    {
        return 'password_change_otp:'.$user->id;
    }

    private function grantKey(User $user): string
    {
        return 'password_change_grant:'.$user->id;
    }
}
```

- [ ] **Step 3: Commit (backend repo)**

```bash
cd M:\hampas_backend
git add app/Notifications/PasswordChangeCodeNotification.php app/Services/PasswordChangeOtpService.php
git commit -m "feat: password change OTP service and email notification"
```

---

### Task 2: Backend controller + routes + rate limit

**Files:**
- Create: `M:\hampas_backend\app\Http\Controllers\Auth\PasswordChangeController.php`
- Modify: `M:\hampas_backend\routes\api.php`
- Modify: `M:\hampas_backend\app\Providers\AppServiceProvider.php`

**Interfaces:**
- Consumes: `PasswordChangeOtpService`, Sanctum user
- Produces HTTP:
  - `POST /api/user/password/send-code` → `{ message: string }` (200)
  - `POST /api/user/password/verify-code` body `{ code: string }` → `{ message: string }` (200)
  - `PUT /api/user/password` body `{ password, password_confirmation }` → `{ message: string }` (200)

- [ ] **Step 1: Register rate limiter**

In `AppServiceProvider::boot`, after existing limiters:

```php
RateLimiter::for(
    'password-change-send',
    fn ($request) => Limit::perMinute(1)->by(optional($request->user())->id ?: $request->ip())
);
```

- [ ] **Step 2: Create controller**

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordChangeOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class PasswordChangeController extends Controller
{
    public function __construct(private PasswordChangeOtpService $otp) {}

    public function sendCode(Request $request): JsonResponse
    {
        $this->otp->send($request->user());

        return response()->json([
            'message' => 'A 4-digit code was sent to your email.',
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{4}$/'],
        ]);

        $this->otp->verify($request->user(), $data['code']);

        return response()->json([
            'message' => 'Code verified. You can set a new password.',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->otp->assertGrant($request->user());

        $data = $request->validate([
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->numbers()->symbols(),
            ],
        ]);

        $user = $request->user();
        $user->password = $data['password']; // hashed cast
        $user->save();

        $this->otp->clearAll($user);

        return response()->json([
            'message' => 'Password updated.',
        ]);
    }
}
```

- [ ] **Step 3: Register routes**

In `routes/api.php`, inside `Route::middleware(['auth:sanctum'])->group`:

```php
use App\Http\Controllers\Auth\PasswordChangeController;

// after put /user:
Route::post('/user/password/send-code', [PasswordChangeController::class, 'sendCode'])
    ->middleware('throttle:password-change-send');
Route::post('/user/password/verify-code', [PasswordChangeController::class, 'verifyCode'])
    ->middleware('throttle:30,1');
Route::put('/user/password', [PasswordChangeController::class, 'update'])
    ->middleware('throttle:10,1');
```

- [ ] **Step 4: Commit (backend)**

```bash
cd M:\hampas_backend
git add app/Http/Controllers/Auth/PasswordChangeController.php routes/api.php app/Providers/AppServiceProvider.php
git commit -m "feat: password change API routes and controller"
```

---

### Task 3: Backend feature tests

**Files:**
- Create: `M:\hampas_backend\tests\Feature\Auth\PasswordChangeTest.php`

**Interfaces:**
- Consumes: routes from Task 2, `PasswordChangeCodeNotification`
- Produces: green PHPUnit feature suite for password change

- [ ] **Step 1: Write failing/complete feature test file**

```php
<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordChangeCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordChangeTest extends TestCase
{
    use RefreshDatabase;

    private function authUser(array $attrs = []): User
    {
        $user = User::factory()->create(array_merge([
            'birth_date' => '1998-03-10',
            'gender' => 'male',
            'password' => 'old-password',
            'email_verified_at' => null,
        ], $attrs));
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_guest_cannot_send_code(): void
    {
        $this->postJson('/api/user/password/send-code')->assertStatus(401);
    }

    public function test_send_code_emails_notification(): void
    {
        Notification::fake();
        $user = $this->authUser();

        $this->postJson('/api/user/password/send-code')
            ->assertOk()
            ->assertJsonPath('message', 'A 4-digit code was sent to your email.');

        Notification::assertSentTo($user, PasswordChangeCodeNotification::class, function ($n) {
            return preg_match('/^\d{4}$/', $n->code) === 1;
        });
    }

    public function test_verify_and_change_password_happy_path(): void
    {
        Notification::fake();
        $user = $this->authUser();

        $this->postJson('/api/user/password/send-code')->assertOk();

        $code = null;
        Notification::assertSentTo($user, PasswordChangeCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });

        $this->postJson('/api/user/password/verify-code', ['code' => $code])
            ->assertOk();

        $this->assertNotNull($user->fresh()->email_verified_at);

        $this->putJson('/api/user/password', [
            'password' => 'Newpass1!',
            'password_confirmation' => 'Newpass1!',
        ])->assertOk()->assertJsonPath('message', 'Password updated.');

        $this->assertTrue(Hash::check('Newpass1!', $user->fresh()->password));

        // grant consumed — second change fails
        $this->putJson('/api/user/password', [
            'password' => 'Another1!',
            'password_confirmation' => 'Another1!',
        ])->assertStatus(422);
    }

    public function test_change_password_requires_grant(): void
    {
        $this->authUser();

        $this->putJson('/api/user/password', [
            'password' => 'Newpass1!',
            'password_confirmation' => 'Newpass1!',
        ])->assertStatus(422);
    }

    public function test_wrong_code_is_rejected(): void
    {
        Notification::fake();
        $this->authUser();
        $this->postJson('/api/user/password/send-code')->assertOk();

        $this->postJson('/api/user/password/verify-code', ['code' => '0000'])
            ->assertStatus(422);
    }

    public function test_weak_password_is_rejected(): void
    {
        Notification::fake();
        $user = $this->authUser();
        $this->postJson('/api/user/password/send-code')->assertOk();

        $code = null;
        Notification::assertSentTo($user, PasswordChangeCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });
        $this->postJson('/api/user/password/verify-code', ['code' => $code])->assertOk();

        $this->putJson('/api/user/password', [
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(422);
    }

    public function test_too_many_verify_attempts_invalidates_otp(): void
    {
        Notification::fake();
        $user = $this->authUser();
        $this->postJson('/api/user/password/send-code')->assertOk();

        $code = null;
        Notification::assertSentTo($user, PasswordChangeCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/user/password/verify-code', ['code' => '0000'])
                ->assertStatus(422);
        }

        // correct code no longer works after lockout
        $this->postJson('/api/user/password/verify-code', ['code' => $code])
            ->assertStatus(422);
    }
}
```

Note: if wrong-code test collides with real OTP `0000`, use a wrong code that is not equal to `$code` (e.g. force `$wrong = $code === '0000' ? '1111' : '0000'`). Prefer that safer variant when implementing.

- [ ] **Step 2: Run tests**

```bash
cd M:\hampas_backend
php artisan test --filter=PasswordChangeTest
```

Expected: all PASS. If `Password::min(8)->numbers()->symbols()` rejects `Newpass1!` on your Laravel version, adjust test password to satisfy defaults or use explicit regex rules matching the spec.

- [ ] **Step 3: Commit (backend)**

```bash
cd M:\hampas_backend
git add tests/Feature/Auth/PasswordChangeTest.php
git commit -m "test: password change OTP and update endpoints"
```

---

### Task 4: Frontend API client

**Files:**
- Modify: `M:\hampas_frontend\src\api\auth.ts`

**Interfaces:**
- Consumes: `api` from `./client`
- Produces:
  - `sendPasswordCode(): Promise<{ message: string }>`
  - `verifyPasswordCode(code: string): Promise<{ message: string }>`
  - `changePassword(password: string, password_confirmation: string): Promise<{ message: string }>`

- [ ] **Step 1: Append methods to auth.ts**

```ts
export async function sendPasswordCode(): Promise<{ message: string }> {
  const { data } = await api.post('/user/password/send-code');
  return data;
}

export async function verifyPasswordCode(code: string): Promise<{ message: string }> {
  const { data } = await api.post('/user/password/verify-code', { code });
  return data;
}

export async function changePassword(
  password: string,
  password_confirmation: string,
): Promise<{ message: string }> {
  const { data } = await api.put('/user/password', { password, password_confirmation });
  return data;
}
```

- [ ] **Step 2: Commit (frontend)**

```bash
cd M:\hampas_frontend
git add src/api/auth.ts
git commit -m "feat: auth API methods for password change OTP flow"
```

---

### Task 5: Profile Account Password UI

**Files:**
- Modify: `M:\hampas_frontend\src\pages\Profile\ProfilePage.tsx`

**Interfaces:**
- Consumes: `sendPasswordCode`, `verifyPasswordCode`, `changePassword` from `../../api/auth`
- Produces: inline Password block only when `editing.account`

**UI state (local to ProfilePage):**

```ts
type PasswordPhase = 'locked' | 'code_sent' | 'unlocked';

// passwordPhase, passwordCode, newPassword, confirmPassword
// sendingCode, verifyingCode, savingPassword
// passwordMessage (success/info), passwordError
// resendAt (timestamp ms) for 60s cooldown
```

**Validation helper (same file or small const):**

```ts
function passwordMeetsRules(pw: string): boolean {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}
```

- [ ] **Step 1: Import API helpers**

Extend import from `../../api/auth`:

```ts
import { updateMe, sendPasswordCode, verifyPasswordCode, changePassword } from '../../api/auth';
```

- [ ] **Step 2: Add state + reset helper**

Near other account state:

```ts
const [passwordPhase, setPasswordPhase] = useState<'locked' | 'code_sent' | 'unlocked'>('locked');
const [passwordCode, setPasswordCode] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [sendingCode, setSendingCode] = useState(false);
const [verifyingCode, setVerifyingCode] = useState(false);
const [savingPassword, setSavingPassword] = useState(false);
const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
const [passwordError, setPasswordError] = useState<string | null>(null);
const [resendAt, setResendAt] = useState(0);

const resetPasswordUi = () => {
  setPasswordPhase('locked');
  setPasswordCode('');
  setNewPassword('');
  setConfirmPassword('');
  setSendingCode(false);
  setVerifyingCode(false);
  setSavingPassword(false);
  setPasswordMessage(null);
  setPasswordError(null);
  setResendAt(0);
};
```

Call `resetPasswordUi()` from `cancelEdit('account')`, when collapsing account via `toggleCard`, and after successful password save.

- [ ] **Step 3: Handlers**

```ts
const handleSendCode = async () => {
  setPasswordError(null);
  setPasswordMessage(null);
  setSendingCode(true);
  try {
    const { message } = await sendPasswordCode();
    setPasswordPhase('code_sent');
    setPasswordMessage(message);
    setResendAt(Date.now() + 60_000);
  } catch (err) {
    setPasswordError(err instanceof Error ? err.message : 'Failed to send code.');
  } finally {
    setSendingCode(false);
  }
};

const handleVerifyCode = async () => {
  if (!/^\d{4}$/.test(passwordCode)) {
    setPasswordError('Enter the 4-digit code.');
    return;
  }
  setPasswordError(null);
  setVerifyingCode(true);
  try {
    const { message } = await verifyPasswordCode(passwordCode);
    setPasswordPhase('unlocked');
    setPasswordMessage(message);
    setPasswordCode('');
  } catch (err) {
    setPasswordError(err instanceof Error ? err.message : 'Invalid or expired code.');
  } finally {
    setVerifyingCode(false);
  }
};

const passwordValid =
  passwordMeetsRules(newPassword) && newPassword === confirmPassword;

const handleChangePassword = async () => {
  if (!passwordValid) return;
  setPasswordError(null);
  setSavingPassword(true);
  try {
    const { message } = await changePassword(newPassword, confirmPassword);
    setPasswordMessage(message);
    resetPasswordUi();
    setPasswordMessage(message); // keep success after reset if reset clears it — prefer set message after partial reset
  } catch (err) {
    setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
  } finally {
    setSavingPassword(false);
  }
};
```

Implement success so message survives: clear fields/phase to locked, then `setPasswordMessage('Password updated.')`.

Extract API errors from axios if the project already does (check LoginPage pattern). Prefer:

```ts
function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    const first = data?.errors && Object.values(data.errors).flat()[0];
    if (first) return first;
    if (data?.message) return data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
```

- [ ] **Step 4: Render Password block inside Account edit**

After the account fields grid (still inside `editing.account` branch), before `editActions`:

```tsx
<div className="mt-4 border-t border-border pt-3">
  <p className={labelClass}>Password</p>
  <p className="mt-1 text-xs text-muted">
    Change password using a 4-digit code sent to {user.email}.
  </p>
  {passwordError ? (
    <p className="mt-2 text-sm font-medium text-red-700" role="alert">
      {passwordError}
    </p>
  ) : null}
  {passwordMessage ? (
    <p className="mt-2 text-sm font-medium text-emerald-800">{passwordMessage}</p>
  ) : null}

  {passwordPhase === 'locked' || passwordPhase === 'code_sent' ? (
    <div className="mt-3 space-y-2">
      {passwordPhase === 'code_sent' ? (
        <label className="block" htmlFor="password-change-code">
          <span className={labelClass}>4-digit code</span>
          <input
            id="password-change-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            className={fieldClass}
            value={passwordCode}
            onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {passwordPhase === 'code_sent' ? (
          <button
            type="button"
            className={primaryBtn}
            disabled={verifyingCode || passwordCode.length !== 4}
            onClick={() => void handleVerifyCode()}
          >
            {verifyingCode ? 'Verifying…' : 'Verify code'}
          </button>
        ) : null}
        <button
          type="button"
          className={passwordPhase === 'locked' ? primaryBtn : secondaryBtn}
          disabled={sendingCode || Date.now() < resendAt}
          onClick={() => void handleSendCode()}
        >
          {sendingCode
            ? 'Sending…'
            : passwordPhase === 'code_sent'
              ? Date.now() < resendAt
                ? 'Resend code'
                : 'Resend code'
              : 'Send code'}
        </button>
      </div>
    </div>
  ) : null}

  {passwordPhase === 'unlocked' ? (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2" htmlFor="new-password">
        <span className={labelClass}>New password</span>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className={fieldClass}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <label className="block sm:col-span-2" htmlFor="confirm-password">
        <span className={labelClass}>Confirm password</span>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className={fieldClass}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      <p className="sm:col-span-2 text-xs text-muted">
        Min 8 characters, at least 1 digit and 1 special character.
      </p>
      <button
        type="button"
        className={primaryBtn}
        disabled={savingPassword || !passwordValid}
        onClick={() => void handleChangePassword()}
      >
        {savingPassword ? 'Saving…' : 'Save password'}
      </button>
    </div>
  ) : null}
</div>
```

Ensure Cancel / collapse resets password UI. Do not show password section in view mode.

- [ ] **Step 5: Manual sanity (optional)** — typecheck

```bash
cd M:\hampas_frontend
npx tsc -p tsconfig.app.json --noEmit
```

- [ ] **Step 6: Commit (frontend)**

```bash
cd M:\hampas_frontend
git add src/pages/Profile/ProfilePage.tsx
git commit -m "feat: Account password change UI with email code gate"
```

---

### Task 6: Frontend profile tests

**Files:**
- Modify: `M:\hampas_frontend\src\test\profile.test.tsx`

**Interfaces:**
- Consumes: mocked `sendPasswordCode`, `verifyPasswordCode`, `changePassword`
- Produces: tests for locked → verify → save password; account save independent

- [ ] **Step 1: Extend auth mock**

```ts
vi.mock('../api/auth', () => ({
  updateMe: vi.fn(),
  sendPasswordCode: vi.fn(),
  verifyPasswordCode: vi.fn(),
  changePassword: vi.fn(),
}));
```

- [ ] **Step 2: Add tests**

```ts
test('password fields stay locked until code verified; then changePassword is called', async () => {
  vi.mocked(profilesApi.getProfile).mockResolvedValue({
    roles: ['player'],
    player: {},
    coach: null,
    organizer: null,
  });
  vi.mocked(authApi.sendPasswordCode).mockResolvedValue({
    message: 'A 4-digit code was sent to your email.',
  });
  vi.mocked(authApi.verifyPasswordCode).mockResolvedValue({
    message: 'Code verified. You can set a new password.',
  });
  vi.mocked(authApi.changePassword).mockResolvedValue({
    message: 'Password updated.',
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

  await expand(/^account/i);
  await user.click(screen.getByRole('button', { name: /^edit$/i }));

  expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^send code$/i }));
  await waitFor(() => expect(authApi.sendPasswordCode).toHaveBeenCalled());

  await user.type(screen.getByLabelText(/4-digit code/i), '1234');
  await user.click(screen.getByRole('button', { name: /verify code/i }));
  await waitFor(() => expect(authApi.verifyPasswordCode).toHaveBeenCalledWith('1234'));

  await user.type(screen.getByLabelText(/^new password$/i), 'Newpass1!');
  await user.type(screen.getByLabelText(/^confirm password$/i), 'Newpass1!');
  await user.click(screen.getByRole('button', { name: /save password/i }));

  await waitFor(() =>
    expect(authApi.changePassword).toHaveBeenCalledWith('Newpass1!', 'Newpass1!'),
  );
});

test('save account does not require password code', async () => {
  // keep existing updateMe test; ensure it still passes without sendPasswordCode
});
```

Also add a weak-password test: after unlock, type `password` / `password` and assert Save password disabled and `changePassword` not called.

- [ ] **Step 3: Run tests**

```bash
cd M:\hampas_frontend
npx vitest run src/test/profile.test.tsx
```

Expected: all PASS.

- [ ] **Step 4: Commit (frontend)**

```bash
cd M:\hampas_frontend
git add src/test/profile.test.tsx
git commit -m "test: profile password change code gate"
```

---

### Task 7: Final verification

**Files:** none new

- [ ] **Step 1: Backend full related tests**

```bash
cd M:\hampas_backend
php artisan test --filter=PasswordChangeTest
```

Expected: PASS

- [ ] **Step 2: Frontend profile + lint if available**

```bash
cd M:\hampas_frontend
npx vitest run src/test/profile.test.tsx
npm run lint
```

(If no lint script, run `npx tsc -p tsconfig.app.json --noEmit` instead.)

Expected: PASS / clean

- [ ] **Step 3: Spec checklist**

Confirm against `docs/superpowers/specs/2026-08-17-profile-password-change-design.md`:

- [x] send → verify → unlock → save
- [x] password-only gate
- [x] rules 8 + digit + special
- [x] no current password
- [x] account save independent
- [x] backend + frontend

No extra commit unless small fixes were needed; if fixes, commit with message describing the fix.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| POST send-code | 2 |
| POST verify-code | 2 |
| PUT password + grant | 1–2 |
| OTP hashed, TTL, attempts | 1 |
| Email notification | 1 |
| email_verified_at on verify | 1 |
| Rate limit send | 2 |
| Password rules FE+BE | 2, 5 |
| Inline Account Password UI | 5 |
| API client | 4 |
| Backend tests | 3 |
| Frontend tests | 6 |
| Account save independent | 5–6 |

No placeholders remaining. Type names consistent: `sendPasswordCode` / `verifyPasswordCode` / `changePassword` / `PasswordChangeOtpService` / `PasswordChangeController`.
