# Try Out Event Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event type `try_out` (display: “Try Out”, emoji: 🎯) end-to-end so hosts can create, filter, and view try-out events like every other type.

**Architecture:** Expand the MySQL `event_type` enum and Laravel validation lists on the backend; mirror the value in the frontend `EventType` union, labels/emoji maps, create/edit form options, and discovery filters. No new components or special business rules.

**Tech Stack:** Laravel (PHP, MySQL enum migrations, PHPUnit feature tests), React + TypeScript + Vitest (Vite frontend).

## Global Constraints

- API / DB value: `try_out` (snake_case)
- Display label: `Try Out`
- Emoji: `🎯`
- Behavior identical to existing types (no special apply rules)
- Do not drop existing enum values when altering MySQL ENUM
- Frontend workspace: `M:\hampas_frontend`
- Backend workspace: `M:\hampas_backend`
- Spec: `docs/superpowers/specs/2026-08-17-try-out-event-type-design.md`

## File map

| File | Responsibility |
|------|----------------|
| `hampas_backend/database/migrations/2026_08_17_*_add_try_out_event_type.php` | Expand `events.event_type` ENUM |
| `hampas_backend/app/Http/Controllers/EventController.php` | Accept `try_out` on index/store/update |
| `hampas_backend/tests/Feature/EventTest.php` | Prove create with `try_out` |
| `hampas_backend/database/seeders/SampleEventsSeeder.php` | Optional sample try-out event |
| `hampas_frontend/src/api/types.ts` | `EventType` union |
| `hampas_frontend/src/events/eventLabels.ts` | Label + emoji |
| `hampas_frontend/src/pages/Events/EventForm.tsx` | Create/edit select options |
| `hampas_frontend/src/pages/Events/EventsPage.tsx` | Filter options |
| `hampas_frontend/src/test/eventLabels.test.ts` | Label/emoji assertions |
| `hampas_frontend/src/test/event-form.test.tsx` | Form can submit `try_out` |

---

### Task 1: Backend — accept and store `try_out`

**Files:**
- Create: `M:\hampas_backend\database\migrations\2026_08_17_120000_add_try_out_event_type.php`
- Modify: `M:\hampas_backend\app\Http\Controllers\EventController.php` (three `Rule::in` lists for `event_type`)
- Modify: `M:\hampas_backend\tests\Feature\EventTest.php`
- Modify: `M:\hampas_backend\database\seeders\SampleEventsSeeder.php`

**Interfaces:**
- Consumes: existing create event payload shape
- Produces: `event_type` may be `try_out`; JSON responses return `event_type: "try_out"`

- [ ] **Step 1: Write the failing test**

Add to `EventTest.php`:

```php
public function test_can_create_event_with_try_out_type(): void
{
    [, $token] = $this->authUser(withPriorLiveEvent: true);

    $this->withToken($token)->postJson('/api/events', $this->payload([
        'event_type' => 'try_out',
        'title' => 'Club Try Out Day',
    ]))
        ->assertStatus(201)
        ->assertJsonPath('event_type', 'try_out')
        ->assertJsonPath('title', 'Club Try Out Day');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `M:\hampas_backend`):

```bash
php artisan test --filter=test_can_create_event_with_try_out_type
```

Expected: FAIL with validation error on `event_type` (422) or assertion failure — `try_out` not in allowed values.

- [ ] **Step 3: Add migration**

Create `database/migrations/2026_08_17_120000_add_try_out_event_type.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE events MODIFY event_type ENUM('open_play', 'league', 'tournament', 'training_camp', 'friendly', 'try_out') NOT NULL");
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::table('events')->where('event_type', 'try_out')->update(['event_type' => 'open_play']);
            DB::statement("ALTER TABLE events MODIFY event_type ENUM('open_play', 'league', 'tournament', 'training_camp', 'friendly') NOT NULL");
        }
    }
};
```

- [ ] **Step 4: Update validation in EventController**

In all three places (`index`, `store`, `update`), change:

```php
Rule::in(['open_play', 'league', 'tournament', 'training_camp', 'friendly'])
```

to:

```php
Rule::in(['open_play', 'league', 'tournament', 'training_camp', 'friendly', 'try_out'])
```

- [ ] **Step 5: Optional seeder sample**

Append one sample to `$samples` in `SampleEventsSeeder.php`:

```php
[
    'title' => 'Angeles Club Try Out',
    'description' => 'Open try-out for new club members. Bring indoor shoes.',
    'event_type' => 'try_out',
    'skill_level' => 'all_levels',
    'barangay' => 'Balibago',
    'city' => 'Angeles City',
    'latitude' => 15.1650,
    'longitude' => 120.5900,
    'starts_at' => now()->addDays(9)->setTime(10, 0),
],
```

- [ ] **Step 6: Run migration and test to verify pass**

```bash
php artisan migrate
php artisan test --filter=test_can_create_event_with_try_out_type
```

Expected: PASS

Also run full event suite:

```bash
php artisan test --filter=EventTest
```

Expected: all PASS

- [ ] **Step 7: Commit backend**

```bash
cd M:\hampas_backend
git add database/migrations/2026_08_17_120000_add_try_out_event_type.php app/Http/Controllers/EventController.php tests/Feature/EventTest.php database/seeders/SampleEventsSeeder.php
git commit -m "feat: add try_out event type to API and database"
```

---

### Task 2: Frontend — types, labels, form, filters

**Files:**
- Modify: `M:\hampas_frontend\src\api\types.ts`
- Modify: `M:\hampas_frontend\src\events\eventLabels.ts`
- Modify: `M:\hampas_frontend\src\pages\Events\EventForm.tsx`
- Modify: `M:\hampas_frontend\src\pages\Events\EventsPage.tsx`
- Modify: `M:\hampas_frontend\src\test\eventLabels.test.ts`
- Modify: `M:\hampas_frontend\src\test\event-form.test.tsx`

**Interfaces:**
- Consumes: API `event_type: "try_out"`
- Produces: UI shows `🎯 Try Out`; form submits `event_type=try_out`; filter value `try_out`

- [ ] **Step 1: Write failing label test**

In `eventLabels.test.ts`, extend the first test:

```ts
expect(TYPE_LABEL.try_out).toBe('Try Out');
expect(TYPE_EMOJI.try_out).toBe('🎯');
```

- [ ] **Step 2: Write failing form test**

In `event-form.test.tsx`, add:

```ts
test('create form can submit try_out event type', async () => {
  const user = userEvent.setup();
  vi.mocked(eventsApi.createEvent).mockResolvedValue({} as never);

  render(
    <MemoryRouter>
      <CreateEventPage />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText(/title/i), 'Club Try Out');
  await user.type(screen.getByLabelText(/description/i), 'New member try-out.');
  await user.selectOptions(screen.getByLabelText(/event type/i), 'try_out');
  await user.selectOptions(screen.getByLabelText(/skill level/i), 'all_levels');
  await user.type(screen.getByLabelText(/barangay/i), 'Balibago');
  await user.selectOptions(screen.getByLabelText(/city/i), 'Angeles City');
  await user.type(screen.getByLabelText(/starts at/i), '2026-08-25T10:00');
  await user.click(screen.getByRole('button', { name: /create event/i }));

  await waitFor(() => {
    const call = vi.mocked(eventsApi.createEvent).mock.calls[0]?.[0];
    expect(call).toBeInstanceOf(FormData);
    expect(call.get('event_type')).toBe('try_out');
    expect(call.get('title')).toBe('Club Try Out');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd M:\hampas_frontend
npx vitest run src/test/eventLabels.test.ts src/test/event-form.test.tsx
```

Expected: FAIL — `TYPE_LABEL.try_out` undefined and/or select option `try_out` missing.

- [ ] **Step 4: Implement types and labels**

`src/api/types.ts` — add to `EventType`:

```ts
export type EventType =
  | 'open_play'
  | 'league'
  | 'tournament'
  | 'training_camp'
  | 'exclusive'
  | 'friendly'
  | 'try_out';
```

`src/events/eventLabels.ts`:

```ts
export const TYPE_LABEL: Record<EventType, string> = {
  open_play: 'Open play',
  league: 'League',
  tournament: 'Tournament',
  training_camp: 'Training Camp',
  exclusive: 'Exclusive',
  friendly: 'Exclusive', // legacy API value
  try_out: 'Try Out',
};

export const TYPE_EMOJI: Record<EventType, string> = {
  open_play: '🏐',
  league: '🏅',
  tournament: '🏆',
  training_camp: '💪',
  exclusive: '🤝',
  friendly: '🤝',
  try_out: '🎯',
};
```

- [ ] **Step 5: Implement form and filter options**

In both `EventForm.tsx` and `EventsPage.tsx`, add to `EVENT_TYPES` (after `training_camp` or at end before exclusive is fine; prefer after tournament for “session” types):

```ts
{ value: 'try_out', label: 'Try Out' },
```

Full recommended order for both arrays:

```ts
const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'open_play', label: 'Open play' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'training_camp', label: 'Training Camp' },
  { value: 'try_out', label: 'Try Out' },
  { value: 'friendly', label: 'Exclusive' },
];
```

Do **not** add a separate `exclusive` option to the form (API still uses `friendly`).

Cards and detail already use `typeLabel` / `typeEmoji` — no layout changes required.

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/test/eventLabels.test.ts src/test/event-form.test.tsx
```

Expected: PASS

Broader smoke (optional but recommended):

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 7: Commit frontend**

```bash
cd M:\hampas_frontend
git add src/api/types.ts src/events/eventLabels.ts src/pages/Events/EventForm.tsx src/pages/Events/EventsPage.tsx src/test/eventLabels.test.ts src/test/event-form.test.tsx
git commit -m "feat: add Try Out event type to UI and filters"
```

---

### Task 3: Manual verification checklist

**Files:** none (manual)

- [ ] **Step 1: Backend running with migration applied**

```bash
cd M:\hampas_backend
php artisan migrate
```

- [ ] **Step 2: Frontend against that API**

Create event → Event type dropdown includes **Try Out** → save → detail/card shows `🎯 Try Out`.

Filters on Events page → select Try Out → only try-out events listed.

- [ ] **Step 3: Done**

No further commit unless manual QA finds gaps.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| DB enum includes `try_out` | Task 1 migration |
| API validation index/store/update | Task 1 controller |
| Backend create test | Task 1 |
| Optional seeder sample | Task 1 |
| FE `EventType` | Task 2 types |
| Labels + emoji | Task 2 eventLabels |
| Form + filters | Task 2 EventForm/EventsPage |
| FE tests | Task 2 |
| Cards/detail via shared helpers | Task 2 (no extra files) |
| Manual success criteria | Task 3 |

No placeholders. Types consistent: `try_out` / `Try Out` / `🎯` everywhere.
