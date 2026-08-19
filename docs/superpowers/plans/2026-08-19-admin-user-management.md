# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship admin User Management at `/admin/users` with search, multi-role filter, pagination, full CRUD (account + roles + profiles), hard delete, admin-flag guards, and in-app notifications when an admin updates an existing user.

**Architecture:** Laravel `AdminUserController` under existing `auth:sanctum` + `admin` routes provides paginated list and full write/delete. Frontend adds API helpers, an Operate-mode list page matching Admin requests styling, create/edit modal, and delete confirm dialog. Updates emit one `UserNotification` (`type: admin_user_updated`) to the target user.

**Tech Stack:** Laravel (Sanctum, PHPUnit feature tests), React 19, TypeScript, Tailwind v4, Vitest, Testing Library, react-router-dom v7, axios `api` client

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-19-admin-user-management-design.md`
- Backend root: `M:\hampas_backend` (sibling of this frontend repo)
- Frontend root: `M:\hampas_frontend`
- Admin-only via existing `admin` middleware / `RequireAdmin`
- Route: `/admin/users`; nav label **Users** (desktop + mobile), separate from **Admin** (requests badge unchanged)
- Role filter: multi-select Player | Coach | Organizer with **OR** semantics; none selected = all users
- Search `q`: name or email (case-insensitive LIKE)
- Page size default 10 (`ADMIN_PAGE_SIZE`); `per_page` max 50
- List + modal UX (`max-w-xl` cards); reuse `AdminPagination`, theme tokens
- Hard delete + `is_admin` toggle; guards: no self-delete, no self-demote, no demote/delete last admin
- Notify target user on material **update** only (`admin_user_updated`); admin actor gets `showToast`
- Password never in API responses; create requires password; edit blank password = keep
- No new npm/composer packages
- Out of scope: bulk actions, email notify, soft-delete, impersonation, push for these events

---

## File Structure

### Backend (`M:\hampas_backend`)

| File | Responsibility |
|------|----------------|
| `app/Http/Controllers/AdminUserController.php` | index/store/show/update/destroy + serialize + role/profile sync + notify |
| `routes/api.php` | Register admin user routes in admin group |
| `tests/Feature/AdminUserTest.php` | Feature coverage for list/CRUD/guards/notifications |

### Frontend (`M:\hampas_frontend`)

| File | Responsibility |
|------|----------------|
| `src/api/types.ts` | `AdminUserListItem`, `AdminUserDetail`, `AdminUserWritePayload` |
| `src/api/admin.ts` | `listAdminUsers`, `getAdminUser`, `createAdminUser`, `updateAdminUser`, `deleteAdminUser` |
| `src/pages/Admin/AdminUsersPage.tsx` | List shell: search, filters, cards, pagination, open modals |
| `src/pages/Admin/AdminUserFormModal.tsx` | Create/edit form |
| `src/pages/Admin/AdminUserDeleteDialog.tsx` | Hard-delete confirm (mirror `DeleteEventModal`) |
| `src/App.tsx` | Route `/admin/users` |
| `src/components/AppHeader.tsx` | **Users** nav link desktop + mobile |
| `src/test/admin-users-page.test.tsx` | List/filter/pagination/create/edit/delete UX |
| `src/test/admin-header-users-nav.test.tsx` | Users link visible for admin |

---

### Task 1: Backend — list users (index)

**Files:**
- Create: `M:\hampas_backend\app\Http\Controllers\AdminUserController.php`
- Modify: `M:\hampas_backend\routes\api.php` (admin group)
- Test: `M:\hampas_backend\tests\Feature\AdminUserTest.php`

**Interfaces:**
- Consumes: `User`, `admin` middleware, pagination shape from `AdminRoleRequestController`
- Produces:
  - `GET /api/admin/users?q=&roles[]=&page=&per_page=`
  - JSON: `{ data: AdminUserListItem[], links, meta }`
  - List item: `{ id, name, email, birth_date, gender, is_admin, roles: string[], created_at }`

- [ ] **Step 1: Write the failing tests**

```php
<?php
// tests/Feature/AdminUserTest.php
namespace Tests\Feature;

use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(bool $admin, array $attrs = []): array
    {
        $user = User::factory()->create(array_merge([
            'birth_date' => '1998-03-10',
            'gender' => 'male',
            'is_admin' => $admin,
        ], $attrs));

        return [$user, $user->createToken('spa')->plainTextToken];
    }

    public function test_non_admin_cannot_list_users(): void
    {
        [, $token] = $this->makeUser(false);
        $this->withToken($token)->getJson('/api/admin/users')->assertStatus(403);
    }

    public function test_admin_can_list_users_with_search_and_role_filter(): void
    {
        [, $token] = $this->makeUser(true, ['name' => 'Admin One', 'email' => 'admin@example.com']);

        $player = User::factory()->create([
            'name' => 'Pat Player',
            'email' => 'pat@example.com',
            'birth_date' => '1998-03-10',
            'gender' => 'female',
        ]);
        UserRole::create(['user_id' => $player->id, 'role' => 'player']);

        $coach = User::factory()->create([
            'name' => 'Chris Coach',
            'email' => 'chris@example.com',
            'birth_date' => '1998-03-10',
            'gender' => 'male',
        ]);
        UserRole::create(['user_id' => $coach->id, 'role' => 'coach']);

        $this->withToken($token)
            ->getJson('/api/admin/users?q=pat')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'pat@example.com')
            ->assertJsonPath('meta.total', 1);

        $this->withToken($token)
            ->getJson('/api/admin/users?roles[]=coach')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'chris@example.com');

        // OR: coach or player returns both non-admin users that match
        $this->withToken($token)
            ->getJson('/api/admin/users?roles[]=player&roles[]=coach')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `M:\hampas_backend`):

```bash
php artisan test --filter=AdminUserTest
```

Expected: FAIL (route/controller missing)

- [ ] **Step 3: Implement controller index + routes**

In `routes/api.php` inside the admin group:

```php
use App\Http\Controllers\AdminUserController;

Route::get('/users', [AdminUserController::class, 'index']);
// store/show/update/destroy added in later tasks — can stub empty methods or add all routes now
```

`AdminUserController.php` (index + shared serialize helpers):

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', Rule::in(['player', 'coach', 'organizer'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $perPage = $data['per_page'] ?? 10;
        $roles = array_values(array_unique($data['roles'] ?? []));

        $paginator = User::query()
            ->with('roleRecords:id,user_id,role')
            ->when($data['q'] ?? null, function ($q, $term) {
                $like = '%'.$term.'%';
                $q->where(function ($inner) use ($like) {
                    $inner->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like);
                });
            })
            ->when($roles !== [], function ($q) use ($roles) {
                $q->whereHas('roleRecords', fn ($r) => $r->whereIn('role', $roles));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $items = collect($paginator->items())
            ->map(fn (User $u) => $this->serializeListItem($u))
            ->values();

        return response()->json([
            'data' => $items,
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url(max($paginator->lastPage(), 1)),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    private function serializeListItem(User $user): array
    {
        $roles = $user->relationLoaded('roleRecords')
            ? $user->roleRecords->pluck('role')->values()->all()
            : $user->roleRecords()->pluck('role')->all();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'birth_date' => $user->birth_date?->format('Y-m-d'),
            'gender' => $user->gender,
            'is_admin' => (bool) $user->is_admin,
            'roles' => array_values($roles),
            'created_at' => $user->created_at?->toISOString(),
        ];
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
php artisan test --filter=AdminUserTest
```

Expected: PASS

- [ ] **Step 5: Commit backend**

```bash
cd M:\hampas_backend
git add app/Http/Controllers/AdminUserController.php routes/api.php tests/Feature/AdminUserTest.php
git commit -m "feat(admin): list users with search and role filters"
```

---

### Task 2: Backend — show, store, update, destroy + notifications

**Files:**
- Modify: `M:\hampas_backend\app\Http\Controllers\AdminUserController.php`
- Modify: `M:\hampas_backend\routes\api.php`
- Modify: `M:\hampas_backend\tests\Feature\AdminUserTest.php`

**Interfaces:**
- Consumes: `User`, `UserRole`, `PlayerProfile`, `CoachProfile`, `OrganizerProfile`, `UserNotification`, `Rules\Password`, profile field rules from `ProfileController`
- Produces:
  - `POST /api/admin/users` → 201 detail
  - `GET /api/admin/users/{user}` → 200 detail
  - `PUT /api/admin/users/{user}` → 200 detail + optional notification
  - `DELETE /api/admin/users/{user}` → 204
  - Detail shape:

```json
{
  "id": 1,
  "name": "...",
  "email": "...",
  "birth_date": "Y-m-d",
  "gender": "male|female|other",
  "is_admin": false,
  "roles": ["player"],
  "profiles": {
    "player": { "positions": [], "skill_level": null },
    "coach": null,
    "organizer": null
  },
  "created_at": "..."
}
```

- Write body: account fields + `roles: string[]` + `profiles` object (nullable per role)
- Password: required on create (`Password::min(8)->numbers()->symbols()`, no `confirmed`); optional on update (empty/null = unchanged)
- On material update: one `UserNotification` with `type` = `admin_user_updated`

- [ ] **Step 1: Append failing tests**

```php
public function test_admin_can_create_user_with_roles_and_profiles(): void
{
    [, $token] = $this->makeUser(true);

    $res = $this->withToken($token)->postJson('/api/admin/users', [
        'name' => 'New User',
        'email' => 'new@example.com',
        'password' => 'Secret1!',
        'birth_date' => '1995-06-01',
        'gender' => 'other',
        'is_admin' => false,
        'roles' => ['player', 'coach'],
        'profiles' => [
            'player' => ['positions' => ['setter'], 'skill_level' => 'intermediate'],
            'coach' => ['achievements' => 'Won stuff', 'bootcamp_name' => 'Camp'],
            'organizer' => null,
        ],
    ]);

    $res->assertCreated()
        ->assertJsonPath('email', 'new@example.com')
        ->assertJsonPath('roles', ['player', 'coach']);

    $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    $this->assertDatabaseHas('user_roles', ['role' => 'coach']);
    $this->assertDatabaseHas('coach_profiles', ['bootcamp_name' => 'Camp']);
    $this->assertDatabaseMissing('user_notifications', ['type' => 'admin_user_updated']);
}

public function test_admin_update_notifies_user_and_syncs_roles(): void
{
    [$admin, $token] = $this->makeUser(true);
    $target = User::factory()->create([
        'name' => 'Target',
        'email' => 'target@example.com',
        'birth_date' => '1998-03-10',
        'gender' => 'male',
    ]);
    UserRole::create(['user_id' => $target->id, 'role' => 'player']);
    \App\Models\PlayerProfile::create(['user_id' => $target->id, 'positions' => []]);

    $this->withToken($token)->putJson("/api/admin/users/{$target->id}", [
        'name' => 'Target Updated',
        'email' => 'target@example.com',
        'birth_date' => '1998-03-10',
        'gender' => 'male',
        'is_admin' => false,
        'roles' => ['player', 'organizer'],
        'profiles' => [
            'player' => ['positions' => ['libero'], 'skill_level' => 'advanced'],
            'organizer' => [
                'managed_courts' => ['Court A'],
                'contact_number' => null,
                'contact_email' => 'org@example.com',
                'facebook_url' => null,
                'instagram_url' => null,
            ],
        ],
    ])->assertOk()->assertJsonPath('name', 'Target Updated');

    $this->assertDatabaseHas('user_roles', ['user_id' => $target->id, 'role' => 'organizer']);
    $this->assertDatabaseHas('user_notifications', [
        'user_id' => $target->id,
        'type' => 'admin_user_updated',
    ]);
}

public function test_cannot_delete_self_or_last_admin(): void
{
    [$admin, $token] = $this->makeUser(true);

    $this->withToken($token)->deleteJson("/api/admin/users/{$admin->id}")
        ->assertStatus(403);

    $other = User::factory()->create([
        'birth_date' => '1998-03-10',
        'gender' => 'male',
        'is_admin' => false,
    ]);
    $this->withToken($token)->deleteJson("/api/admin/users/{$other->id}")
        ->assertNoContent();
    $this->assertDatabaseMissing('users', ['id' => $other->id]);
}

public function test_cannot_self_demote_or_demote_last_admin(): void
{
    [$admin, $token] = $this->makeUser(true);

    $this->withToken($token)->putJson("/api/admin/users/{$admin->id}", [
        'name' => $admin->name,
        'email' => $admin->email,
        'birth_date' => '1998-03-10',
        'gender' => 'male',
        'is_admin' => false,
        'roles' => [],
        'profiles' => [],
    ])->assertStatus(403);
}

public function test_admin_can_show_user_detail(): void
{
    [, $token] = $this->makeUser(true);
    $u = User::factory()->create([
        'birth_date' => '1998-03-10',
        'gender' => 'female',
    ]);
    UserRole::create(['user_id' => $u->id, 'role' => 'player']);
    \App\Models\PlayerProfile::create(['user_id' => $u->id, 'positions' => ['setter']]);

    $this->withToken($token)->getJson("/api/admin/users/{$u->id}")
        ->assertOk()
        ->assertJsonPath('id', $u->id)
        ->assertJsonPath('profiles.player.positions.0', 'setter');
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test --filter=AdminUserTest
```

Expected: FAIL on missing routes/methods

- [ ] **Step 3: Implement store/show/update/destroy**

Routes:

```php
Route::get('/users', [AdminUserController::class, 'index']);
Route::post('/users', [AdminUserController::class, 'store']);
Route::get('/users/{user}', [AdminUserController::class, 'show']);
Route::put('/users/{user}', [AdminUserController::class, 'update']);
Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
```

Implementation outline (full code in controller — keep private helpers):

```php
use App\Models\CoachProfile;
use App\Models\OrganizerProfile;
use App\Models\PlayerProfile;
use App\Models\UserNotification;
use App\Support\PlayerPositions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

public function show(User $user): JsonResponse
{
    $user->load(['roleRecords', 'playerProfile', 'coachProfile', 'organizerProfile']);

    return response()->json($this->serializeDetail($user));
}

public function store(Request $request): JsonResponse
{
    $data = $this->validateWrite($request, null);

    $user = DB::transaction(function () use ($data) {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'birth_date' => $data['birth_date'],
            'gender' => $data['gender'],
            'is_admin' => (bool) ($data['is_admin'] ?? false),
        ]);
        $this->syncRolesAndProfiles($user, $data['roles'] ?? [], $data['profiles'] ?? []);

        return $user->fresh()->load(['roleRecords', 'playerProfile', 'coachProfile', 'organizerProfile']);
    });

    return response()->json($this->serializeDetail($user), 201);
}

public function update(Request $request, User $user): JsonResponse
{
    $actor = $request->user();
    $data = $this->validateWrite($request, $user);

    if ($user->id === $actor->id && array_key_exists('is_admin', $data) && ! $data['is_admin'] && $user->is_admin) {
        return response()->json(['message' => 'You cannot remove your own admin access.'], 403);
    }

    if ($user->is_admin && array_key_exists('is_admin', $data) && ! $data['is_admin']) {
        $otherAdmins = User::query()->where('is_admin', true)->where('id', '!=', $user->id)->count();
        if ($otherAdmins === 0) {
            return response()->json(['message' => 'Cannot demote the last admin.'], 403);
        }
    }

    $before = $this->snapshotForNotify($user);

    $user = DB::transaction(function () use ($user, $data) {
        $attrs = [
            'name' => $data['name'],
            'email' => $data['email'],
            'birth_date' => $data['birth_date'],
            'gender' => $data['gender'],
            'is_admin' => (bool) ($data['is_admin'] ?? false),
        ];
        if (! empty($data['password'])) {
            $attrs['password'] = Hash::make($data['password']);
        }
        $user->update($attrs);
        $this->syncRolesAndProfiles($user, $data['roles'] ?? [], $data['profiles'] ?? []);

        return $user->fresh()->load(['roleRecords', 'playerProfile', 'coachProfile', 'organizerProfile']);
    });

    $message = $this->buildUpdateNotificationMessage($before, $this->snapshotForNotify($user), ! empty($data['password']));
    if ($message !== null) {
        UserNotification::create([
            'user_id' => $user->id,
            'type' => 'admin_user_updated',
            'message' => $message,
            'data' => ['actor_id' => $actor->id],
        ]);
    }

    return response()->json($this->serializeDetail($user));
}

public function destroy(Request $request, User $user): JsonResponse
{
    $actor = $request->user();
    if ($user->id === $actor->id) {
        return response()->json(['message' => 'You cannot delete your own account.'], 403);
    }
    if ($user->is_admin) {
        $otherAdmins = User::query()->where('is_admin', true)->where('id', '!=', $user->id)->count();
        if ($otherAdmins === 0) {
            return response()->json(['message' => 'Cannot delete the last admin.'], 403);
        }
    }

    $user->tokens()->delete();
    $user->delete(); // FKs cascade for roles, profiles, events, apps, notifications, etc.

    return response()->json(null, 204);
}
```

**validateWrite** (create vs update):

- Create: password `required` + `Password::min(8)->numbers()->symbols()`
- Update: password `nullable` + same Password rule when present
- email unique `Rule::unique('users', 'email')->ignore($user?->id)`
- birth_date `before_or_equal:now()->subYears(18)`
- gender in male/female/other
- roles array of player|coach|organizer
- profiles.player / coach / organizer: same rules as `ProfileController::profileFields()` (nullable objects)

**syncRolesAndProfiles**:

1. Desired roles = unique validated list
2. Delete `roleRecords` not in desired; delete corresponding profile model rows
3. For each desired role: `firstOrCreate` role row + profile; if profile payload present, update fields (normalize positions/managed_courts like ProfileController)

**serializeDetail**: list fields + `profiles` with null when missing

**buildUpdateNotificationMessage**:

- Compare name/email/birth_date/gender/is_admin → account changed
- password changed flag → account changed
- roles added/removed → mention granted/removed labels (Player/Coach/Organizer)
- profile field diffs → profile changed
- Prefer one combined sentence, e.g. `An admin updated your account and granted you Coach access.`
- Return null if nothing material changed

- [ ] **Step 4: Run tests**

```bash
php artisan test --filter=AdminUserTest
```

Expected: PASS

- [ ] **Step 5: Commit backend**

```bash
cd M:\hampas_backend
git add app/Http/Controllers/AdminUserController.php routes/api.php tests/Feature/AdminUserTest.php
git commit -m "feat(admin): CRUD users with roles, profiles, and notifications"
```

---

### Task 3: Frontend — types + admin API client

**Files:**
- Modify: `src/api/types.ts`
- Modify: `src/api/admin.ts`
- Test: optional thin unit not required if page tests cover; still typecheck later

**Interfaces:**
- Produces:

```ts
// types.ts
export interface AdminUserListItem {
  id: number;
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
  roles: Role[];
  created_at: string;
}

export interface AdminUserProfiles {
  player: ProfileFieldset | null;
  coach: ProfileFieldset | null;
  organizer: ProfileFieldset | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  profiles: AdminUserProfiles;
}

export type AdminUserWritePayload = {
  name: string;
  email: string;
  password?: string;
  birth_date: string;
  gender: Gender;
  is_admin: boolean;
  roles: Role[];
  profiles: {
    player?: ProfileFieldset | null;
    coach?: ProfileFieldset | null;
    organizer?: ProfileFieldset | null;
  };
};
```

```ts
// admin.ts
export type ListAdminUsersParams = {
  q?: string;
  roles?: Role[];
  page?: number;
  per_page?: number;
};

export async function listAdminUsers(params: ListAdminUsersParams = {}): Promise<Paginated<AdminUserListItem>> {
  const { data } = await api.get<Paginated<AdminUserListItem>>('/admin/users', {
    params: {
      q: params.q?.trim() || undefined,
      roles: params.roles?.length ? params.roles : undefined,
      page: params.page ?? 1,
      per_page: params.per_page ?? ADMIN_PAGE_SIZE,
    },
  });
  return data;
}

export async function getAdminUser(id: number): Promise<AdminUserDetail> {
  const { data } = await api.get<AdminUserDetail>(`/admin/users/${id}`);
  return data;
}

export async function createAdminUser(payload: AdminUserWritePayload): Promise<AdminUserDetail> {
  const { data } = await api.post<AdminUserDetail>('/admin/users', payload);
  return data;
}

export async function updateAdminUser(id: number, payload: AdminUserWritePayload): Promise<AdminUserDetail> {
  const { data } = await api.put<AdminUserDetail>(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}
```

- [ ] **Step 1: Add types and API functions**

Implement as above; import `Role`, `Gender`, `ProfileFieldset`, `Paginated` already in types.

- [ ] **Step 2: Typecheck**

```bash
npx tsc -b --pretty false
```

Expected: no errors from these files

- [ ] **Step 3: Commit**

```bash
git add src/api/types.ts src/api/admin.ts
git commit -m "feat(admin): add users API client and types"
```

---

### Task 4: Frontend — Users page list, search, filter, pagination

**Files:**
- Create: `src/pages/Admin/AdminUsersPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/admin-users-page.test.tsx`

**Interfaces:**
- Consumes: `listAdminUsers`, `ADMIN_PAGE_SIZE`, `AdminPagination`, `showToast` (later for mutations)
- Produces: page at `/admin/users` listing cards

- [ ] **Step 1: Write failing list tests**

```tsx
// src/test/admin-users-page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as adminApi from '../api/admin';
import AdminUsersPage from '../pages/Admin/AdminUsersPage';
import { pageOf } from './adminPaginated';

vi.mock('../api/admin', () => ({
  ADMIN_PAGE_SIZE: 10,
  listAdminUsers: vi.fn(),
  getAdminUser: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  listAdminRoleRequests: vi.fn(),
  listAdminEvents: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 99,
      name: 'Admin',
      email: 'admin@example.com',
      birth_date: '1990-01-01',
      gender: 'other' as const,
      is_admin: true,
    },
    loading: false,
    signOut: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.listAdminUsers).mockResolvedValue(
      pageOf([
        {
          id: 1,
          name: 'Pat Player',
          email: 'pat@example.com',
          birth_date: '1998-01-01',
          gender: 'female',
          is_admin: false,
          roles: ['player'],
          created_at: '2026-08-01T00:00:00Z',
        },
      ]),
    );
  });

  test('lists users and passes search + role filters', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Pat Player')).toBeInTheDocument();
    expect(screen.getByText('pat@example.com')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'pat');
    await waitFor(() =>
      expect(adminApi.listAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'pat', page: 1 }),
      ),
    );

    await user.click(screen.getByRole('button', { name: /^coach$/i }));
    await waitFor(() =>
      expect(adminApi.listAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ roles: ['coach'], page: 1 }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/test/admin-users-page.test.tsx
```

- [ ] **Step 3: Implement list page + route**

`AdminUsersPage.tsx` structure:

- `max-w-xl space-y-3` shell
- Title **Users**, subtitle manage accounts…
- **Add user** button (opens modal stub later — for this task can set state only)
- Search label matching Admin requests control; `aria-label="Search users"`
- Filter chips: toggle roles in `Role[]` state; selected = `bg-cobalt text-white`, else border surface
- `useEffect` load `listAdminUsers({ q, roles, page })`; reset page on q/roles change
- Cards: name, email, role chips + Admin chip, Edit/Delete buttons (handlers wired in later tasks)
- Empty / loading / error copy per spec
- `AdminPagination` when `lastPage > 1` or total > 0 (match RoleRequestsPanel)

`App.tsx` add route twin of requests:

```tsx
<Route
  path="/admin/users"
  element={
    <RequireAuth>
      <RequireAdmin>
        <AdminUsersPage />
      </RequireAdmin>
    </RequireAuth>
  }
/>
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- src/test/admin-users-page.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin/AdminUsersPage.tsx src/App.tsx src/test/admin-users-page.test.tsx
git commit -m "feat(admin): users list with search, filters, pagination"
```

---

### Task 5: Frontend — create/edit modal

**Files:**
- Create: `src/pages/Admin/AdminUserFormModal.tsx`
- Modify: `src/pages/Admin/AdminUsersPage.tsx`
- Modify: `src/test/admin-users-page.test.tsx`

**Interfaces:**
- Consumes: `getAdminUser`, `createAdminUser`, `updateAdminUser`, `AdminUserWritePayload`, `PasswordField`/`passwordFormValid` patterns, `PLAYER_POSITIONS`, `showToast`
- Produces: modal dialog `aria-labelledby` Create user / Edit user

- [ ] **Step 1: Extend tests**

```tsx
test('creates a user from the modal', async () => {
  const user = userEvent.setup();
  vi.mocked(adminApi.createAdminUser).mockResolvedValue({
    id: 2,
    name: 'New User',
    email: 'new@example.com',
    birth_date: '1995-06-01',
    gender: 'other',
    is_admin: false,
    roles: ['player'],
    profiles: { player: { positions: [] }, coach: null, organizer: null },
    created_at: '2026-08-19T00:00:00Z',
  });

  renderPage();
  await screen.findByText('Pat Player');
  await user.click(screen.getByRole('button', { name: /add user/i }));

  const dialog = await screen.findByRole('dialog', { name: /create user/i });
  await user.type(within(dialog).getByLabelText(/^name$/i), 'New User');
  await user.type(within(dialog).getByLabelText(/^email$/i), 'new@example.com');
  await user.type(within(dialog).getByLabelText(/^password$/i), 'Secret1!');
  await user.type(within(dialog).getByLabelText(/birth/i), '1995-06-01');
  await user.selectOptions(within(dialog).getByLabelText(/gender/i), 'other');
  // ensure Player role checked by default or check it
  const player = within(dialog).getByRole('checkbox', { name: /player/i });
  if (!(player as HTMLInputElement).checked) await user.click(player);

  await user.click(within(dialog).getByRole('button', { name: /save|create/i }));

  await waitFor(() =>
    expect(adminApi.createAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New User',
        email: 'new@example.com',
        password: 'Secret1!',
        roles: expect.arrayContaining(['player']),
      }),
    ),
  );
});

test('edits a user from the modal', async () => {
  const user = userEvent.setup();
  vi.mocked(adminApi.getAdminUser).mockResolvedValue({
    id: 1,
    name: 'Pat Player',
    email: 'pat@example.com',
    birth_date: '1998-01-01',
    gender: 'female',
    is_admin: false,
    roles: ['player'],
    profiles: {
      player: { positions: ['setter'], skill_level: 'beginner' },
      coach: null,
      organizer: null,
    },
    created_at: '2026-08-01T00:00:00Z',
  });
  vi.mocked(adminApi.updateAdminUser).mockResolvedValue({
    id: 1,
    name: 'Pat Updated',
    email: 'pat@example.com',
    birth_date: '1998-01-01',
    gender: 'female',
    is_admin: false,
    roles: ['player'],
    profiles: {
      player: { positions: ['setter'], skill_level: 'beginner' },
      coach: null,
      organizer: null,
    },
    created_at: '2026-08-01T00:00:00Z',
  });

  renderPage();
  await screen.findByText('Pat Player');
  await user.click(screen.getByRole('button', { name: /^edit$/i }));

  const dialog = await screen.findByRole('dialog', { name: /edit user/i });
  const nameInput = within(dialog).getByLabelText(/^name$/i);
  await user.clear(nameInput);
  await user.type(nameInput, 'Pat Updated');
  await user.click(within(dialog).getByRole('button', { name: /save|update/i }));

  await waitFor(() =>
    expect(adminApi.updateAdminUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Pat Updated' }),
    ),
  );
});
```

Import `within` from Testing Library.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/test/admin-users-page.test.tsx
```

- [ ] **Step 3: Implement modal + wire page**

`AdminUserFormModal` props:

```ts
type Props = {
  mode: 'create' | 'edit';
  userId?: number; // edit
  busy?: boolean;
  onClose: () => void;
  onSaved: () => void;
};
```

UI (mirror `DeleteEventModal` scrim: `fixed inset-0 … items-end sm:items-center`, `role="dialog"`, Escape closes):

- Account fields with labels
- Password: required create; optional edit helper text “Leave blank to keep”
- `is_admin` checkbox
- Role checkboxes; when checked show nested profile fields:
  - Player: multi positions (checkboxes from `PLAYER_POSITIONS`), skill_level select
  - Coach: achievements textarea, bootcamp_name
  - Organizer: managed_courts (comma or tag list → string[]), contacts/urls
- Submit builds `AdminUserWritePayload`; omit password key when blank on edit
- On create success: `showToast('User created')`; edit: `showToast('User updated')`
- Map axios 422: if `err.response?.data?.errors` show first messages; else `message` / generic
- On edit open: `getAdminUser(userId)` fill form; loading state inside dialog

Page state: `formMode: null | 'create' | { edit: id }`

- [ ] **Step 4: Run tests — PASS**

```bash
npm test -- src/test/admin-users-page.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin/AdminUserFormModal.tsx src/pages/Admin/AdminUsersPage.tsx src/test/admin-users-page.test.tsx
git commit -m "feat(admin): create and edit user modal"
```

---

### Task 6: Frontend — delete dialog + guards UX

**Files:**
- Create: `src/pages/Admin/AdminUserDeleteDialog.tsx`
- Modify: `src/pages/Admin/AdminUsersPage.tsx`
- Modify: `src/test/admin-users-page.test.tsx`

**Interfaces:**
- Consumes: `deleteAdminUser`, `useAuth().user.id` to hide/disable delete on self
- Produces: confirm dialog like `DeleteEventModal`

- [ ] **Step 1: Test delete flow**

```tsx
test('deletes a user after confirm', async () => {
  const user = userEvent.setup();
  vi.mocked(adminApi.deleteAdminUser).mockResolvedValue();
  renderPage();
  await screen.findByText('Pat Player');
  await user.click(screen.getByRole('button', { name: /^delete$/i }));
  const dialog = await screen.findByRole('dialog', { name: /delete user/i });
  expect(within(dialog).getByText(/pat@example.com/i)).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
  await waitFor(() => expect(adminApi.deleteAdminUser).toHaveBeenCalledWith(1));
});
```

- [ ] **Step 2: FAIL then implement**

`AdminUserDeleteDialog`: copy “Are you sure you want to delete user **Name** (email)? This cannot be undone.”

On confirm success: `showToast('User deleted')`, close, if last item on page and page > 1 then `setPage(p-1)` else reload list.

Do not render Delete for `user.id === authUser.id` (or disable with title).

- [ ] **Step 3: PASS + commit**

```bash
npm test -- src/test/admin-users-page.test.tsx
git add src/pages/Admin/AdminUserDeleteDialog.tsx src/pages/Admin/AdminUsersPage.tsx src/test/admin-users-page.test.tsx
git commit -m "feat(admin): delete user confirmation"
```

---

### Task 7: Frontend — header nav Users link

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Test: `src/test/admin-header-users-nav.test.tsx` (or extend `admin-header-badge.test.tsx`)

**Interfaces:**
- Consumes: `user.is_admin`
- Produces: NavLink **Users** → `/admin/users` next to Admin (desktop + mobile menu)

- [ ] **Step 1: Write test**

```tsx
// Prefer extending existing admin header test patterns
test('shows Users link for admin', async () => {
  // render header with admin auth mock
  expect(screen.getByRole('link', { name: /^users$/i })).toHaveAttribute('href', '/admin/users');
  expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
});
```

Read `src/test/admin-header-badge.test.tsx` and mirror its Auth/router setup.

- [ ] **Step 2: Implement links**

Desktop after Admin block:

```tsx
<NavLink to="/admin/users" className={linkClass}>
  Users
</NavLink>
```

Mobile menu same with `menuLinkClass`. Use plain `linkClass` (no pending badge). Active state: standard `linkClass` is fine (do not steal Admin’s `startsWith('/admin')` active unless you split — **important:** update `adminLinkClass` so Admin is active only for `/admin/requests` paths, and Users uses normal active for `/admin/users`).

Fix existing:

```tsx
const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
  linkClass({ isActive: isActive || location.pathname.startsWith('/admin/requests') });
// Users: className={linkClass} only
```

Apply same for mobile `adminMenuLinkClass`.

- [ ] **Step 3: Run header + users tests**

```bash
npm test -- src/test/admin-header-badge.test.tsx src/test/admin-header-users-nav.test.tsx src/test/admin-users-page.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/AppHeader.tsx src/test/admin-header-users-nav.test.tsx
git commit -m "feat(admin): add Users nav link"
```

---

### Task 8: Verification pass

**Files:** none new

- [ ] **Step 1: Backend full related suite**

```bash
cd M:\hampas_backend
php artisan test --filter=AdminUserTest
```

Expected: all PASS

- [ ] **Step 2: Frontend tests + lint + types**

```bash
cd M:\hampas_frontend
npm test -- src/test/admin-users-page.test.tsx src/test/admin-header-users-nav.test.tsx src/test/admin-header-badge.test.tsx
npm run lint
npx tsc -b --pretty false
```

Expected: PASS / clean

- [ ] **Step 3: Manual smoke (if servers available)**

1. Log in as admin → see **Users** and **Admin**
2. Create user with player+coach profiles
3. Filter Coach; search email
4. Edit name; as that user, confirm notification appears
5. Toggle admin on another user; attempt self-demote (blocked)
6. Delete non-self user

- [ ] **Step 4: Final commits only if fixes needed**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `/admin/users` + RequireAdmin | 4 |
| Users nav desktop/mobile | 7 |
| Search name/email | 1, 4 |
| Multi role filter OR | 1, 4 |
| Pagination page size 10 | 1, 4 |
| List cards + theme | 4 |
| Create modal full fields | 2, 5 |
| Edit modal + profiles | 2, 5 |
| Hard delete + confirm | 2, 6 |
| is_admin toggle + guards | 2, 6 |
| In-app notify on update | 2 |
| Admin toasts | 5, 6 |
| BE API CRUD | 1–2 |
| FE API client | 3 |
| Tests FE + BE | 1–7 |

## Self-review notes

- No TBD placeholders; password rules match registration strength without `confirmed` on admin write
- Notification type fixed: `admin_user_updated`
- Delete relies on existing `cascadeOnDelete` FKs (events, applications, roles, profiles, notifications, consents, reports)
- Admin header active-state split avoids both Admin and Users highlighting together
- Backend and frontend commits stay in their respective repos
