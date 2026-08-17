# Organizer Contact on Event Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizers can set optional public contact fields (phone, email, Facebook, Instagram) on their profile; every event detail page shows those fields with SVG icons to all viewers.

**Architecture:** Store contact on `organizer_profiles` (backend). Expose under `EventResource.created_by`. Frontend profile form edits the fields; event detail renders non-empty values as `tel:` / `mailto:` / external links with shared `ContactIcons`.

**Tech Stack:** Laravel (hampas_backend), React + TypeScript + Vitest (hampas_frontend), existing profile/event patterns.

## Global Constraints

- All four contact fields are **optional**; empty → `null` / hidden UI row.
- Public contact email is **separate** from login email (`contact_email`).
- Platforms in scope only: phone, email, Facebook, Instagram.
- Event detail contact is visible to **all** users who can view the event (no auth gate).
- Use **inline SVG icons** via `ContactIcons.tsx` (pattern from `WeatherIcons.tsx`).
- Backend repo: `M:\hampas_backend`. Frontend repo: `M:\hampas_frontend`. Commit in the repo you change.
- TDD: write failing test → implement → pass → commit per task.

## File map

| Path | Responsibility |
|------|----------------|
| `hampas_backend/database/migrations/*_add_contact_fields_to_organizer_profiles.php` | New nullable columns |
| `hampas_backend/app/Models/OrganizerProfile.php` | fillable fields |
| `hampas_backend/app/Http/Controllers/ProfileController.php` | validate + normalize contact on organizer update |
| `hampas_backend/app/Http/Resources/EventResource.php` | nest contact under `created_by` |
| `hampas_backend/app/Http/Controllers/EventController.php` | eager-load `creator.organizerProfile` on show/index/store/update |
| `hampas_backend/routes/api.php` | nearby events eager-load |
| `hampas_backend/app/Http/Controllers/AdminEventController.php` | eager-load for admin list |
| `hampas_backend/app/Http/Controllers/EventApplicationController.php` | eager-load where events serialized |
| `hampas_backend/tests/Feature/Auth/ProfileTest.php` | organizer contact update tests |
| `hampas_backend/tests/Feature/EventTest.php` | event show includes contact on `created_by` |
| `hampas_frontend/src/api/types.ts` | `created_by` + `ProfileFieldset` fields |
| `hampas_frontend/src/components/ContactIcons.tsx` | Phone/Email/Facebook/Instagram SVGs |
| `hampas_frontend/src/pages/Profile/ProfilePage.tsx` | organizer contact edit/view/save |
| `hampas_frontend/src/pages/Events/EventDetailPage.tsx` | contact block with icons |
| `hampas_frontend/src/test/profile.test.tsx` | save contact fields |
| `hampas_frontend/src/test/event-detail.test.tsx` | show/hide contact links |

---

### Task 1: Backend — migration + OrganizerProfile fillable

**Files:**
- Create: `hampas_backend/database/migrations/2026_08_17_120000_add_contact_fields_to_organizer_profiles_table.php`
- Modify: `hampas_backend/app/Models/OrganizerProfile.php`

**Interfaces:**
- Produces: columns `contact_number`, `contact_email`, `facebook_url`, `instagram_url` (nullable strings) on `organizer_profiles`; model fillable includes them.

- [ ] **Step 1: Create migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizer_profiles', function (Blueprint $table) {
            $table->string('contact_number', 32)->nullable()->after('managed_courts');
            $table->string('contact_email')->nullable()->after('contact_number');
            $table->string('facebook_url', 500)->nullable()->after('contact_email');
            $table->string('instagram_url', 500)->nullable()->after('facebook_url');
        });
    }

    public function down(): void
    {
        Schema::table('organizer_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'contact_number',
                'contact_email',
                'facebook_url',
                'instagram_url',
            ]);
        });
    }
};
```

- [ ] **Step 2: Update OrganizerProfile fillable**

```php
protected $fillable = [
    'user_id',
    'managed_courts',
    'contact_number',
    'contact_email',
    'facebook_url',
    'instagram_url',
];
```

- [ ] **Step 3: Run migration**

Run (in `hampas_backend`):

```bash
php artisan migrate
```

Expected: migrates successfully.

- [ ] **Step 4: Commit (backend)**

```bash
git add database/migrations/2026_08_17_120000_add_contact_fields_to_organizer_profiles_table.php app/Models/OrganizerProfile.php
git commit -m "feat: organizer profile contact columns"
```

---

### Task 2: Backend — profile update validation + tests

**Files:**
- Modify: `hampas_backend/app/Http/Controllers/ProfileController.php`
- Modify: `hampas_backend/tests/Feature/Auth/ProfileTest.php`

**Interfaces:**
- Consumes: organizer profile columns from Task 1
- Produces: `PUT /api/profile/organizer` accepts and returns contact fields; empty strings normalized to `null`

- [ ] **Step 1: Write failing tests** in `ProfileTest.php`

Add after existing tests (import `OrganizerProfile` if needed):

```php
public function test_organizer_can_update_contact_fields(): void
{
    $user = $this->authUser();
    $user->roleRecords()->create(['role' => 'organizer']);
    OrganizerProfile::create(['user_id' => $user->id, 'managed_courts' => []]);

    $this->putJson('/api/profile/organizer', [
        'managed_courts' => ['Court A'],
        'contact_number' => '+639171234567',
        'contact_email' => 'org@example.com',
        'facebook_url' => 'https://facebook.com/hampas',
        'instagram_url' => 'https://instagram.com/hampas',
    ])
        ->assertStatus(200)
        ->assertJsonPath('profile.contact_number', '+639171234567')
        ->assertJsonPath('profile.contact_email', 'org@example.com')
        ->assertJsonPath('profile.facebook_url', 'https://facebook.com/hampas')
        ->assertJsonPath('profile.instagram_url', 'https://instagram.com/hampas');

    $this->assertDatabaseHas('organizer_profiles', [
        'user_id' => $user->id,
        'contact_email' => 'org@example.com',
    ]);
}

public function test_organizer_contact_empty_strings_become_null(): void
{
    $user = $this->authUser();
    $user->roleRecords()->create(['role' => 'organizer']);
    OrganizerProfile::create([
        'user_id' => $user->id,
        'managed_courts' => [],
        'contact_number' => '09171234567',
        'contact_email' => 'old@example.com',
    ]);

    $this->putJson('/api/profile/organizer', [
        'managed_courts' => [],
        'contact_number' => '  ',
        'contact_email' => '',
        'facebook_url' => '',
        'instagram_url' => '',
    ])
        ->assertStatus(200)
        ->assertJsonPath('profile.contact_number', null)
        ->assertJsonPath('profile.contact_email', null)
        ->assertJsonPath('profile.facebook_url', null)
        ->assertJsonPath('profile.instagram_url', null);
}

public function test_organizer_invalid_contact_email_and_urls_rejected(): void
{
    $user = $this->authUser();
    $user->roleRecords()->create(['role' => 'organizer']);
    OrganizerProfile::create(['user_id' => $user->id, 'managed_courts' => []]);

    $this->putJson('/api/profile/organizer', [
        'contact_email' => 'not-an-email',
        'facebook_url' => 'ftp://bad.example',
        'instagram_url' => 'not-a-url',
    ])->assertStatus(422);
}
```

Add import:

```php
use App\Models\OrganizerProfile;
```

- [ ] **Step 2: Run tests to verify they fail**

Run (in `hampas_backend`):

```bash
php artisan test --filter=test_organizer_can_update_contact_fields
```

Expected: FAIL (validation / unknown columns or fields ignored).

- [ ] **Step 3: Implement ProfileController organizer rules + normalize**

In `profileFields()` organizer array:

```php
'organizer' => [
    'managed_courts' => ['nullable', 'array'],
    'managed_courts.*' => ['string', 'max:255'],
    'contact_number' => ['nullable', 'string', 'max:32'],
    'contact_email' => ['nullable', 'email', 'max:255'],
    'facebook_url' => ['nullable', 'url:http,https', 'max:500'],
    'instagram_url' => ['nullable', 'url:http,https', 'max:500'],
],
```

In `update()`, after managed_courts normalization, add:

```php
if ($role === 'organizer') {
    foreach (['contact_number', 'contact_email', 'facebook_url', 'instagram_url'] as $key) {
        if (! array_key_exists($key, $data)) {
            continue;
        }
        $value = $data[$key];
        if (! is_string($value) || trim($value) === '') {
            $data[$key] = null;
        } else {
            $data[$key] = trim($value);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
php artisan test --filter=test_organizer_can_update_contact
php artisan test --filter=test_organizer_contact_empty
php artisan test --filter=test_organizer_invalid_contact
```

Expected: PASS

- [ ] **Step 5: Commit (backend)**

```bash
git add app/Http/Controllers/ProfileController.php tests/Feature/Auth/ProfileTest.php
git commit -m "feat: validate and save organizer contact fields"
```

---

### Task 3: Backend — EventResource created_by contact + eager load + tests

**Files:**
- Modify: `hampas_backend/app/Http/Resources/EventResource.php`
- Modify: `hampas_backend/app/Http/Controllers/EventController.php` (all `creator:id,name` loads)
- Modify: `hampas_backend/routes/api.php` (nearby)
- Modify: `hampas_backend/app/Http/Controllers/AdminEventController.php`
- Modify: `hampas_backend/app/Http/Controllers/EventApplicationController.php` (if events returned with creator)
- Modify: `hampas_backend/tests/Feature/EventTest.php`

**Interfaces:**
- Consumes: organizer contact columns
- Produces: `created_by` JSON:

```json
{
  "id": 1,
  "name": "…",
  "contact_number": null,
  "contact_email": null,
  "facebook_url": null,
  "instagram_url": null
}
```

- [ ] **Step 1: Write failing event show tests** in `EventTest.php`

```php
public function test_event_show_includes_organizer_contact_on_created_by(): void
{
    $owner = User::factory()->create(['birth_date' => '1998-03-10', 'gender' => 'male', 'name' => 'Alex Organizer']);
    $owner->roleRecords()->create(['role' => 'organizer']);
    \App\Models\OrganizerProfile::create([
        'user_id' => $owner->id,
        'managed_courts' => [],
        'contact_number' => '09171234567',
        'contact_email' => 'alex@example.com',
        'facebook_url' => 'https://facebook.com/alex',
        'instagram_url' => 'https://instagram.com/alex',
    ]);

    $event = Event::create([
        'created_by' => $owner->id,
        'title' => 'Contact Event',
        'description' => 'x',
        'event_type' => 'open_play',
        'skill_level' => 'all_levels',
        'city' => 'Angeles City',
        'starts_at' => now()->addDays(2),
        'visibility' => 'live',
    ]);

    $this->getJson('/api/events/'.$event->id)
        ->assertStatus(200)
        ->assertJsonPath('created_by.id', $owner->id)
        ->assertJsonPath('created_by.name', 'Alex Organizer')
        ->assertJsonPath('created_by.contact_number', '09171234567')
        ->assertJsonPath('created_by.contact_email', 'alex@example.com')
        ->assertJsonPath('created_by.facebook_url', 'https://facebook.com/alex')
        ->assertJsonPath('created_by.instagram_url', 'https://instagram.com/alex');
}

public function test_event_show_created_by_contact_null_when_unset(): void
{
    $owner = User::factory()->create(['birth_date' => '1998-03-10', 'gender' => 'male']);
    $event = Event::create([
        'created_by' => $owner->id,
        'title' => 'No Contact',
        'description' => 'x',
        'event_type' => 'open_play',
        'skill_level' => 'all_levels',
        'city' => 'Angeles City',
        'starts_at' => now()->addDays(2),
        'visibility' => 'live',
    ]);

    $this->getJson('/api/events/'.$event->id)
        ->assertStatus(200)
        ->assertJsonPath('created_by.contact_number', null)
        ->assertJsonPath('created_by.contact_email', null)
        ->assertJsonPath('created_by.facebook_url', null)
        ->assertJsonPath('created_by.instagram_url', null);
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
php artisan test --filter=test_event_show_includes_organizer_contact
```

Expected: FAIL (keys missing).

- [ ] **Step 3: Update EventResource `created_by`**

Replace `created_by` block with:

```php
'created_by' => (function () {
    $creator = $this->relationLoaded('creator') ? $this->creator : null;
    $org = $creator?->organizerProfile;

    return [
        'id' => $this->created_by,
        'name' => $creator?->name,
        'contact_number' => $org?->contact_number,
        'contact_email' => $org?->contact_email,
        'facebook_url' => $org?->facebook_url,
        'instagram_url' => $org?->instagram_url,
    ];
})(),
```

Note: accessing `$creator->organizerProfile` without eager load causes N+1 — next step fixes loads.

- [ ] **Step 4: Eager-load `creator.organizerProfile` everywhere events are serialized**

Use consistent with array (replace bare `creator:id,name`):

```php
'creator' => fn ($q) => $q->select('id', 'name')->with('organizerProfile'),
```

Apply in:

1. `EventController::index` — `->with([...])`
2. `EventController::show` — `$event->load([...])`
3. `EventController::store` — after create, `$event->load(...)`
4. `EventController::update` — `load(...)`
5. `routes/api.php` nearby closure
6. `AdminEventController` list + setVisibility
7. `EventApplicationController` my applications `with(['event.creator' => ..., ...])` — use nested:

```php
->with([
    'event' => fn ($q) => $q->with([
        'creator' => fn ($c) => $c->select('id', 'name')->with('organizerProfile'),
        'applications',
    ]),
])
```

(Adjust to match existing structure; goal is creator always has organizerProfile available when EventResource runs.)

- [ ] **Step 5: Run tests**

```bash
php artisan test --filter=test_event_show_includes_organizer_contact
php artisan test --filter=test_event_show_created_by_contact_null
php artisan test --filter=EventTest
```

Expected: PASS (full EventTest suite green).

- [ ] **Step 6: Commit (backend)**

```bash
git add app/Http/Resources/EventResource.php app/Http/Controllers/EventController.php app/Http/Controllers/AdminEventController.php app/Http/Controllers/EventApplicationController.php routes/api.php tests/Feature/EventTest.php
git commit -m "feat: expose organizer contact on event created_by"
```

---

### Task 4: Frontend — types

**Files:**
- Modify: `hampas_frontend/src/api/types.ts`

**Interfaces:**
- Produces: TypeScript shapes matching API

- [ ] **Step 1: Extend types**

`EventItem.created_by`:

```ts
created_by: {
  id: number;
  name: string;
  contact_number?: string | null;
  contact_email?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
};
```

`ProfileFieldset` add:

```ts
contact_number?: string | null;
contact_email?: string | null;
facebook_url?: string | null;
instagram_url?: string | null;
```

- [ ] **Step 2: Commit (frontend)**

```bash
git add src/api/types.ts
git commit -m "feat: types for organizer contact fields"
```

---

### Task 5: Frontend — ContactIcons

**Files:**
- Create: `hampas_frontend/src/components/ContactIcons.tsx`

**Interfaces:**
- Produces: `PhoneIcon`, `EmailIcon`, `FacebookIcon`, `InstagramIcon` — props `{ className?: string; size?: number }`, decorative `aria-hidden`

- [ ] **Step 1: Implement ContactIcons.tsx** (mirror `WeatherIcons.tsx` helpers)

```tsx
type IconProps = {
  className?: string;
  size?: number;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

function svgBase(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: cx('inline-block shrink-0', className),
    'aria-hidden': true as const,
  };
}

export function PhoneIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function EmailIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function FacebookIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function InstagramIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgBase(size, className)} stroke="currentColor">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit (frontend)**

```bash
git add src/components/ContactIcons.tsx
git commit -m "feat: ContactIcons SVG set for organizer contact"
```

---

### Task 6: Frontend — Profile organizer contact form + test

**Files:**
- Modify: `hampas_frontend/src/pages/Profile/ProfilePage.tsx`
- Modify: `hampas_frontend/src/test/profile.test.tsx`

**Interfaces:**
- Consumes: `ProfileFieldset` contact fields; `updateRole('organizer', payload)`
- Produces: organizer card edit/view for four fields; save sends courts + contact together

- [ ] **Step 1: Write failing profile test**

```ts
test('organizer can save contact fields with courts', async () => {
  vi.mocked(profilesApi.getProfile).mockResolvedValue({
    roles: ['player', 'organizer'],
    player: {},
    coach: null,
    organizer: {
      managed_courts: ['Court A'],
      contact_number: null,
      contact_email: null,
      facebook_url: null,
      instagram_url: null,
    },
  });
  vi.mocked(profilesApi.updateRole).mockResolvedValue({
    role: 'organizer',
    profile: {
      managed_courts: ['Court A'],
      contact_number: '09171234567',
      contact_email: 'org@example.com',
      facebook_url: 'https://facebook.com/org',
      instagram_url: 'https://instagram.com/org',
    },
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

  await expand(/organizer details/i);
  await user.click(screen.getByRole('button', { name: /^edit$/i }));

  fireEvent.change(screen.getByLabelText(/contact number/i), {
    target: { value: '09171234567' },
  });
  fireEvent.change(screen.getByLabelText(/contact email/i), {
    target: { value: 'org@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/facebook url/i), {
    target: { value: 'https://facebook.com/org' },
  });
  fireEvent.change(screen.getByLabelText(/instagram url/i), {
    target: { value: 'https://instagram.com/org' },
  });
  await user.click(screen.getByRole('button', { name: /save organizer/i }));

  await waitFor(() =>
    expect(profilesApi.updateRole).toHaveBeenCalledWith('organizer', {
      managed_courts: ['Court A'],
      contact_number: '09171234567',
      contact_email: 'org@example.com',
      facebook_url: 'https://facebook.com/org',
      instagram_url: 'https://instagram.com/org',
    }),
  );
});
```

Also update existing courts test expectation if save payload now always includes contact keys (empty string or null — pick empty string from drafts and match test).

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/test/profile.test.tsx
```

Expected: FAIL (labels missing).

- [ ] **Step 3: Implement ProfilePage organizer contact state + UI**

1. Add state near courts draft:

```ts
const [contactDraft, setContactDraft] = useState({
  contact_number: '',
  contact_email: '',
  facebook_url: '',
  instagram_url: '',
});
```

2. In `syncDraftsFromProfile` and `startEdit` for organizer:

```ts
setContactDraft({
  contact_number: data.organizer?.contact_number ?? '',
  contact_email: data.organizer?.contact_email ?? '',
  facebook_url: data.organizer?.facebook_url ?? '',
  instagram_url: data.organizer?.instagram_url ?? '',
});
```

(use `profile.organizer` in `startEdit`)

3. `saveOrganizer`:

```ts
await updateRole('organizer', {
  managed_courts,
  contact_number: contactDraft.contact_number.trim(),
  contact_email: contactDraft.contact_email.trim(),
  facebook_url: contactDraft.facebook_url.trim(),
  instagram_url: contactDraft.instagram_url.trim(),
});
```

4. In organizer card UI (edit + view), below courts:

Edit mode — four labeled inputs (`htmlFor` / `id`):

- `Contact number` → `id="org-contact-number"` type text inputMode tel  
- `Contact email` → type email  
- `Facebook URL` → type url  
- `Instagram URL` → type url  

View mode — each field with label + value or muted `Not set`.

Use existing `labelClass` / `fieldClass`.

5. Update `test('organizer can add multiple managed courts')` expected call to include contact keys as `''` (or whatever save sends).

- [ ] **Step 4: Run profile tests**

```bash
npm test -- src/test/profile.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit (frontend)**

```bash
git add src/pages/Profile/ProfilePage.tsx src/test/profile.test.tsx
git commit -m "feat: organizer profile contact fields UI"
```

---

### Task 7: Frontend — Event detail contact block + tests

**Files:**
- Modify: `hampas_frontend/src/pages/Events/EventDetailPage.tsx`
- Modify: `hampas_frontend/src/test/event-detail.test.tsx`

**Interfaces:**
- Consumes: `event.created_by` contact fields; `ContactIcons`
- Produces: Contact section after Organizer name when any field non-empty

- [ ] **Step 1: Write failing event-detail tests**

```ts
test('shows organizer contact links with icons when present', async () => {
  vi.mocked(eventsApi.getEvent).mockResolvedValue({
    ...baseEvent,
    created_by: {
      id: 3,
      name: 'Alex Organizer',
      contact_number: '09171234567',
      contact_email: 'alex@example.com',
      facebook_url: 'https://facebook.com/alex',
      instagram_url: 'https://instagram.com/alex',
    },
  });
  renderDetail();

  expect(await screen.findByText(/alex organizer/i)).toBeInTheDocument();

  const phone = screen.getByRole('link', { name: /09171234567/i });
  expect(phone).toHaveAttribute('href', 'tel:09171234567');

  const email = screen.getByRole('link', { name: /alex@example.com/i });
  expect(email).toHaveAttribute('href', 'mailto:alex@example.com');

  const fb = screen.getByRole('link', { name: /facebook/i });
  expect(fb).toHaveAttribute('href', 'https://facebook.com/alex');
  expect(fb).toHaveAttribute('target', '_blank');

  const ig = screen.getByRole('link', { name: /instagram/i });
  expect(ig).toHaveAttribute('href', 'https://instagram.com/alex');
  expect(ig).toHaveAttribute('rel', expect.stringContaining('noopener'));
});

test('hides contact block when organizer contact is empty', async () => {
  vi.mocked(eventsApi.getEvent).mockResolvedValue({
    ...baseEvent,
    created_by: {
      id: 3,
      name: 'Alex Organizer',
      contact_number: null,
      contact_email: null,
      facebook_url: null,
      instagram_url: null,
    },
  });
  renderDetail();

  expect(await screen.findByText(/alex organizer/i)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /facebook/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /instagram/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /mailto:/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/test/event-detail.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement EventDetailPage contact UI**

After Organizer `<dd>` row inside the facts `<dl>`, add contact rows (or a nested block). Helper:

```ts
function nonEmpty(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

const org = event.created_by;
const hasContact =
  nonEmpty(org.contact_number) ||
  nonEmpty(org.contact_email) ||
  nonEmpty(org.facebook_url) ||
  nonEmpty(org.instagram_url);
```

When `hasContact`, render additional rows (or one section) inside the card:

```tsx
{hasContact && (
  <>
    {nonEmpty(org.contact_number) && (
      <div className="flex justify-between gap-4 px-4 py-3">
        <dt className="flex items-center gap-2 text-sm text-muted">
          <PhoneIcon className="text-cobalt" />
          Phone
        </dt>
        <dd className="text-right text-sm font-medium text-navy">
          <a href={`tel:${org.contact_number.trim()}`} className="text-cobalt underline-offset-2 hover:underline">
            {org.contact_number.trim()}
          </a>
        </dd>
      </div>
    )}
    {/* same pattern: EmailIcon + mailto, FacebookIcon + external, InstagramIcon + external */}
  </>
)}
```

External links:

```tsx
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className="text-cobalt underline-offset-2 hover:underline"
>
  Facebook
</a>
```

Link accessible name for Facebook/Instagram is the word “Facebook” / “Instagram” (icons aria-hidden).

Import icons from `../../components/ContactIcons`.

- [ ] **Step 4: Run event-detail tests**

```bash
npm test -- src/test/event-detail.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run broader frontend smoke if quick**

```bash
npm test -- src/test/smoke.test.tsx src/test/profile.test.tsx src/test/event-detail.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit (frontend)**

```bash
git add src/pages/Events/EventDetailPage.tsx src/test/event-detail.test.tsx
git commit -m "feat: show organizer contact on event detail"
```

---

### Task 8: Verification

**Files:** none (run only)

- [ ] **Step 1: Backend full relevant suites**

```bash
cd M:\hampas_backend
php artisan test --filter=ProfileTest
php artisan test --filter=EventTest
```

Expected: PASS

- [ ] **Step 2: Frontend typecheck + targeted tests**

```bash
cd M:\hampas_frontend
npm run typecheck
npm test -- src/test/profile.test.tsx src/test/event-detail.test.tsx
```

If `typecheck` script missing, use `npx tsc -b --pretty false` or project’s package.json script.

Expected: PASS

- [ ] **Step 3: Manual checklist (optional)**

1. Login as organizer → Profile → set contact → save  
2. Open own live event detail → see phone/email/FB/IG with icons  
3. Clear contact fields → save → detail hides contact block  
4. Guest/other user opens event → same public contact  

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| DB columns on organizer_profiles | 1 |
| Profile PUT validation + null normalize | 2 |
| EventResource created_by contact | 3 |
| Eager load organizer profile | 3 |
| FE types | 4 |
| SVG ContactIcons | 5 |
| Profile edit/view/save all four + courts | 6 |
| Event detail links + icons, hide if empty | 7 |
| Backend + frontend tests | 2, 3, 6, 7, 8 |
| No per-event override / no forced fields | N/A (not built) |

## Self-review notes

- No TBD placeholders.
- Field names consistent: `contact_number`, `contact_email`, `facebook_url`, `instagram_url` across BE/FE.
- Empty path and happy path covered on both sides.
- Dual-repo commits called out per task.
