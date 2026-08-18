# Organizer Apply Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a player applies to an event, the organizer gets an in-app notification “{Name} applied for the event” and tapping it opens Manage applications.

**Architecture:** Backend creates a `UserNotification` for the event owner inside `EventApplicationController::apply` (same pattern as decide → `application_decision`). Frontend reuses poll/toast/inbox; a pure helper maps `application_received` to `/events/:id/applications` and decision types to `/events/:id`.

**Tech Stack:** Laravel (hampas_backend), PHPUnit; React + TypeScript + Vitest (hampas_frontend).

**Spec:** `docs/superpowers/specs/2026-08-18-organizer-apply-notification-design.md`

## Global Constraints

- Message exact: `{Applicant Name} applied for the event` (no event title).
- Notification `type`: `application_received`.
- Recipient: event owner only (`created_by`).
- Click path: `/events/{event_id}/applications`.
- Decision notifications still go to `/events/{event_id}`.
- No email on apply; cancel does not delete the notification.
- Backend repo: `M:\hampas_backend`. Frontend repo: `M:\hampas_frontend`. Commit in the repo you change.
- Backend tests: `php artisan test --filter=...` from `M:\hampas_backend`.
- Frontend tests: `npx vitest run src/test/<file>.tsx` from `M:\hampas_frontend`.

## File structure

| File | Responsibility |
|---|---|
| `hampas_backend/app/Http/Controllers/EventApplicationController.php` | Create owner notification on apply |
| `hampas_backend/tests/Feature/OrganizerHostedNotificationsTest.php` | Feature coverage for apply → owner notify |
| `hampas_frontend/src/api/types.ts` | Optional `applicant_name` on notification data |
| `hampas_frontend/src/notifications/notificationTargetPath.ts` | Pure path helper from notification |
| `hampas_frontend/src/components/NotificationsBell.tsx` | Use helper for navigate target |
| `hampas_frontend/src/pages/Notifications/NotificationsPage.tsx` | Use helper for navigate target |
| `hampas_frontend/src/test/notification-target-path.test.ts` | Unit tests for helper |

---

### Task 1: Backend — create organizer notification on apply

**Files:**
- Modify: `M:\hampas_backend\app\Http\Controllers\EventApplicationController.php`
- Modify: `M:\hampas_backend\tests\Feature\OrganizerHostedNotificationsTest.php`

**Interfaces:**
- Consumes: `UserNotification::create`, `$event->created_by`, `$request->user()->name`, application id after create
- Produces: owner row with `type = application_received`, message `{Name} applied for the event`, data `{ event_id, application_id, applicant_name }`

- [ ] **Step 1: Write the failing test**

Append to `OrganizerHostedNotificationsTest.php`:

```php
public function test_apply_creates_organizer_notification(): void
{
    [$owner, $ownerToken] = $this->user(['name' => 'Org']);
    [$player, $playerToken] = $this->user(['name' => 'Ana']);
    $event = $this->liveEvent($owner, ['title' => 'Cup']);

    $applied = $this->withToken($playerToken)
        ->postJson("/api/events/{$event->id}/apply")
        ->assertCreated()
        ->json('application');

    $this->assertDatabaseHas('user_notifications', [
        'user_id' => $owner->id,
        'type' => 'application_received',
        'message' => 'Ana applied for the event',
    ]);

    $notification = UserNotification::query()
        ->where('user_id', $owner->id)
        ->where('type', 'application_received')
        ->first();

    $this->assertNotNull($notification);
    $this->assertSame($event->id, $notification->data['event_id']);
    $this->assertSame($applied['id'], $notification->data['application_id']);
    $this->assertSame('Ana', $notification->data['applicant_name']);

    $this->assertDatabaseMissing('user_notifications', [
        'user_id' => $player->id,
        'type' => 'application_received',
    ]);

    $this->app['auth']->forgetGuards();

    $this->withToken($ownerToken)
        ->getJson('/api/me/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('count', 1);

    $this->withToken($ownerToken)
        ->getJson('/api/me/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.message', 'Ana applied for the event')
        ->assertJsonPath('data.0.type', 'application_received');
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run from `M:\hampas_backend`:

```bash
php artisan test --filter=test_apply_creates_organizer_notification
```

Expected: FAIL (no notification row for owner).

- [ ] **Step 3: Implement create-on-apply**

In `EventApplicationController::apply`, after successful `$application` create and before the return, add:

```php
$applicantName = $user->name;
UserNotification::create([
    'user_id' => $event->created_by,
    'type' => 'application_received',
    'message' => sprintf('%s applied for the event', $applicantName),
    'data' => [
        'event_id' => $event->id,
        'application_id' => $application->id,
        'applicant_name' => $applicantName,
    ],
]);
```

Place this after the try/catch create block so failed/duplicate apply never notifies. Use refreshed application id:

```php
$application = $application->refresh();

UserNotification::create([
    'user_id' => (int) $event->created_by,
    'type' => 'application_received',
    'message' => sprintf('%s applied for the event', $user->name),
    'data' => [
        'event_id' => $event->id,
        'application_id' => $application->id,
        'applicant_name' => $user->name,
    ],
]);

return response()->json(['application' => $application], 201);
```

Full `apply` method after edit:

```php
public function apply(Request $request, Event $event): JsonResponse
{
    $user = $request->user();
    abort_unless($event->visibility === 'live', 422, 'This event is not open for applications.');
    abort_if((int) $event->created_by === $user->id, 422, 'You cannot apply to your own event.');
    abort_if($event->applications()->where('user_id', $user->id)->exists(), 422, 'You already applied.');

    try {
        $application = $event->applications()->create(['user_id' => $user->id]);
    } catch (\Illuminate\Database\QueryException) {
        abort(409, 'Application already exists.');
    }

    $application = $application->refresh();

    UserNotification::create([
        'user_id' => (int) $event->created_by,
        'type' => 'application_received',
        'message' => sprintf('%s applied for the event', $user->name),
        'data' => [
            'event_id' => $event->id,
            'application_id' => $application->id,
            'applicant_name' => $user->name,
        ],
    ]);

    return response()->json(['application' => $application], 201);
}
```

`UserNotification` is already imported in this controller.

- [ ] **Step 4: Run test — expect PASS**

```bash
php artisan test --filter=test_apply_creates_organizer_notification
```

Expected: PASS.

Also run related suite to ensure decide tests still pass:

```bash
php artisan test --filter=OrganizerHostedNotificationsTest
```

Expected: all PASS.

- [ ] **Step 5: Commit (backend repo)**

```bash
cd M:\hampas_backend
git add app/Http/Controllers/EventApplicationController.php tests/Feature/OrganizerHostedNotificationsTest.php
git commit -m "feat: notify organizer when someone applies to their event"
```

---

### Task 2: Frontend — notification target path helper

**Files:**
- Create: `M:\hampas_frontend\src\notifications\notificationTargetPath.ts`
- Modify: `M:\hampas_frontend\src\api\types.ts`
- Create: `M:\hampas_frontend\src\test\notification-target-path.test.ts`

**Interfaces:**
- Consumes: `AppNotification` (or minimal `{ type: string; data: { event_id?: number } | null }`)
- Produces: `notificationTargetPath(n): string | null`

- [ ] **Step 1: Extend types**

In `src/api/types.ts`, inside `AppNotification.data`, add:

```ts
applicant_name?: string;
```

- [ ] **Step 2: Write failing tests**

Create `src/test/notification-target-path.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { notificationTargetPath } from '../notifications/notificationTargetPath';
import type { AppNotification } from '../api/types';

const base = (overrides: Partial<AppNotification>): AppNotification => ({
  id: 1,
  message: 'x',
  type: 'application_decision',
  read_at: null,
  created_at: '2026-08-18T10:00:00Z',
  data: null,
  ...overrides,
});

describe('notificationTargetPath', () => {
  test('application_received goes to manage applications', () => {
    expect(
      notificationTargetPath(
        base({
          type: 'application_received',
          data: { event_id: 5, application_id: 9, applicant_name: 'Ana' },
        }),
      ),
    ).toBe('/events/5/applications');
  });

  test('application_decision goes to event detail', () => {
    expect(
      notificationTargetPath(
        base({
          type: 'application_decision',
          data: { event_id: 5, status: 'approved' },
        }),
      ),
    ).toBe('/events/5');
  });

  test('missing event_id returns null', () => {
    expect(notificationTargetPath(base({ type: 'application_received', data: {} }))).toBeNull();
    expect(notificationTargetPath(base({ data: null }))).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run src/test/notification-target-path.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 4: Implement helper**

Create `src/notifications/notificationTargetPath.ts`:

```ts
import type { AppNotification } from '../api/types';

export function notificationTargetPath(
  n: Pick<AppNotification, 'type' | 'data'>,
): string | null {
  const eventId = n.data?.event_id;
  if (eventId == null) return null;
  if (n.type === 'application_received') {
    return `/events/${eventId}/applications`;
  }
  return `/events/${eventId}`;
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/test/notification-target-path.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit (frontend repo)**

```bash
cd M:\hampas_frontend
git add src/api/types.ts src/notifications/notificationTargetPath.ts src/test/notification-target-path.test.ts
git commit -m "feat: notification deep-link helper for application_received"
```

---

### Task 3: Frontend — wire bell and notifications page

**Files:**
- Modify: `M:\hampas_frontend\src\components\NotificationsBell.tsx`
- Modify: `M:\hampas_frontend\src\pages\Notifications\NotificationsPage.tsx`

**Interfaces:**
- Consumes: `notificationTargetPath`
- Produces: click navigates to helper path when non-null

- [ ] **Step 1: Update NotificationsBell**

Import helper:

```ts
import { notificationTargetPath } from '../notifications/notificationTargetPath';
```

Replace `openItem` with:

```ts
const openItem = async (n: (typeof items)[number]) => {
  setOpen(false);
  await markRead([n.id]);
  const path = notificationTargetPath(n);
  if (path) navigate(path);
};
```

Update the menuitem `onClick`:

```ts
onClick={() => void openItem(n)}
```

Remove the old `openItem(id, eventId)` signature that only used `n.data?.event_id`.

- [ ] **Step 2: Update NotificationsPage**

Import:

```ts
import { notificationTargetPath } from '../../notifications/notificationTargetPath';
```

Replace `openItem` with:

```ts
const openItem = async (n: (typeof items)[number]) => {
  await markRead([n.id]);
  const path = notificationTargetPath(n);
  if (path) navigate(path);
};
```

Button:

```ts
onClick={() => void openItem(n)}
```

- [ ] **Step 3: Run frontend notification tests**

```bash
npx vitest run src/test/notification-target-path.test.ts src/test/notifications.test.tsx
```

Expected: PASS.

Optional smoke: if any test renders the bell with click navigation, keep it green; no new UI test required if helper is covered.

- [ ] **Step 4: Commit (frontend)**

```bash
cd M:\hampas_frontend
git add src/components/NotificationsBell.tsx src/pages/Notifications/NotificationsPage.tsx
git commit -m "feat: deep-link application_received notifications to manage apps"
```

---

### Task 4: Final verification

**Files:** none required unless fixes

- [ ] **Step 1: Backend full related tests**

```bash
cd M:\hampas_backend
php artisan test --filter=OrganizerHostedNotificationsTest
php artisan test --filter=ApplicationTest
```

Expected: PASS.

- [ ] **Step 2: Frontend related tests**

```bash
cd M:\hampas_frontend
npx vitest run src/test/notification-target-path.test.ts src/test/notifications.test.tsx src/test/applications.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Manual checklist**

1. Log in as organizer; create/ensure a live hosted event.
2. In another session, player applies.
3. Organizer: bell badge increments; message `"{Name} applied for the event"`.
4. Toast appears if organizer was already online after baseline (poll ~8s).
5. Click notification → `/events/{id}/applications`.
6. Approve still creates applicant decision notification; click still goes to event detail.

- [ ] **Step 4: Commit fixups only if needed**

Backend and/or frontend separate commits as appropriate.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Create owner notification on apply | Task 1 |
| Message `{Name} applied for the event` | Task 1 |
| type `application_received` + data fields | Task 1 |
| Applicant does not get this type on apply | Task 1 test |
| No email / no cancel cleanup | Task 1 (omitted by design) |
| Deep link to Manage applications | Tasks 2–3 |
| Decision still → event detail | Task 2 tests + Task 3 |
| Types `applicant_name` | Task 2 |
| Poll/toast reuse existing client | No change (existing) |
| Backend + frontend tests | Tasks 1–4 |

No placeholders. Names consistent: `application_received`, `notificationTargetPath`, `applicant_name`.
