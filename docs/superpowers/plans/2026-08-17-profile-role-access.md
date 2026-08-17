# Profile Role Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Player is always the base profile; coach/organizer are elevated via user request + admin approve; Profile shows Account + Player by default and never self-grants elevated roles.

**Architecture:** Extend `profiles` API with role-request endpoints; add thin `admin` API for the queue. Rewrite Profile elevated section (request / pending / granted). Add admin Role Requests page gated by `user.is_admin`. Remove Profile usage of self-serve `addRole`.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Testing Library, react-router, existing axios `api` client

## Global Constraints

- No new dependencies
- Player always present after register (backend); frontend treats missing player as empty fieldset still editable via `PUT /profile/player`
- Elevated roles only: `coach` | `organizer`
- No self-serve `POST /profile/roles` from Profile
- Account + player always editable by owner; elevated field cards only when role granted
- Admin UI only when `user.is_admin === true`
- Tokens/chrome match compact Profile (max-w-xl, cardClass, fieldClass, cobalt buttons)
- Out of scope: revoke UI, request cooldown, email notifications

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/api/types.ts` | `ElevatedRole`, `RoleRequestStatus`, `RoleRequest` types |
| `src/api/profiles.ts` | User role-request list/create; keep get/update; stop exporting addRole usage from Profile (may delete `addRole` or leave unused) |
| `src/api/admin.ts` | Admin list/approve/reject role requests |
| `src/pages/Profile/ProfilePage.tsx` | Account + player + elevated request/status/cards |
| `src/pages/Admin/RoleRequestsPage.tsx` | Admin pending queue |
| `src/App.tsx` | Route `/admin/role-requests` |
| `src/components/AppHeader.tsx` | Admin nav link when `is_admin` |
| `src/auth/RequireAdmin.tsx` | Gate admin routes |
| `src/test/profile.test.tsx` | Player-default, request, granted coach |
| `src/test/admin-role-requests.test.tsx` | Admin approve/reject |

---

### Task 1: Types + profile role-request API + admin API

**Files:**
- Modify: `src/api/types.ts`
- Modify: `src/api/profiles.ts`
- Create: `src/api/admin.ts`

**Interfaces:**
- Produces:
  - `export type ElevatedRole = 'coach' | 'organizer'`
  - `export type RoleRequestStatus = 'pending' | 'approved' | 'rejected'`
  - `export interface RoleRequest { id: number; role: ElevatedRole; status: RoleRequestStatus; note: string | null; created_at: string; reason?: string | null }`
  - `export interface AdminRoleRequest extends RoleRequest { user: { id: number; name: string; email: string } }`
  - `listMyRoleRequests(): Promise<RoleRequest[]>`
  - `createRoleRequest(payload: { role: ElevatedRole; note?: string }): Promise<RoleRequest>`
  - `listAdminRoleRequests(status?: RoleRequestStatus): Promise<AdminRoleRequest[]>`
  - `approveRoleRequest(id: number): Promise<AdminRoleRequest>`
  - `rejectRoleRequest(id: number, reason?: string): Promise<AdminRoleRequest>`
- Removes from client Profile path: `addRole` (delete function from `profiles.ts`)

- [ ] **Step 1: Add types to `src/api/types.ts`**

After `export type Role = ...` add:

```ts
export type ElevatedRole = 'coach' | 'organizer';
export type RoleRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleRequest {
  id: number;
  role: ElevatedRole;
  status: RoleRequestStatus;
  note: string | null;
  created_at: string;
  reason?: string | null;
}

export interface AdminRoleRequest extends RoleRequest {
  user: { id: number; name: string; email: string };
}
```

- [ ] **Step 2: Rewrite `src/api/profiles.ts`**

```ts
import { api } from './client';
import type { ElevatedRole, ProfileFieldset, Role, RoleRequest } from './types';

export interface ProfileView {
  roles: Role[];
  player: ProfileFieldset | null;
  coach: ProfileFieldset | null;
  organizer: ProfileFieldset | null;
}

export async function getProfile(): Promise<ProfileView> {
  const { data } = await api.get('/profile');
  return data;
}

export async function updateRole(
  role: Role,
  fields: ProfileFieldset,
): Promise<{ role: Role; profile: ProfileFieldset }> {
  const { data } = await api.put(`/profile/${role}`, fields);
  return data;
}

export async function listMyRoleRequests(): Promise<RoleRequest[]> {
  const { data } = await api.get('/profile/role-requests');
  return data;
}

export async function createRoleRequest(payload: {
  role: ElevatedRole;
  note?: string;
}): Promise<RoleRequest> {
  const { data } = await api.post('/profile/role-requests', payload);
  return data;
}
```

- [ ] **Step 3: Create `src/api/admin.ts`**

```ts
import { api } from './client';
import type { AdminRoleRequest, RoleRequestStatus } from './types';

export async function listAdminRoleRequests(
  status: RoleRequestStatus = 'pending',
): Promise<AdminRoleRequest[]> {
  const { data } = await api.get('/admin/role-requests', { params: { status } });
  return data;
}

export async function approveRoleRequest(id: number): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/approve`);
  return data;
}

export async function rejectRoleRequest(
  id: number,
  reason?: string,
): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/reject`, {
    reason: reason ?? null,
  });
  return data;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/api/types.ts src/api/profiles.ts src/api/admin.ts
git commit -m "feat: role request and admin queue APIs"
```

---

### Task 2: Failing profile tests (no self-add; request flow)

**Files:**
- Modify: `src/test/profile.test.tsx`

**Interfaces:**
- Consumes: `listMyRoleRequests`, `createRoleRequest`, `getProfile`, `updateRole`, `updateMe`
- Produces: failing tests driving Profile rewrite

- [ ] **Step 1: Replace `src/test/profile.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProfilePage from '../pages/Profile/ProfilePage';
import * as profilesApi from '../api/profiles';
import * as authApi from '../api/auth';

const { updateUser, mockUser } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  mockUser: {
    id: 1,
    name: 'Jem Player',
    email: 'jem@example.com',
    birth_date: '2000-01-01',
    gender: 'male' as const,
    is_admin: false,
  },
}));

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  updateRole: vi.fn(),
  listMyRoleRequests: vi.fn(),
  createRoleRequest: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  updateMe: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
    updateUser,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([]);
  });

  test('player-only profile shows account and player details, not elevated editors', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: { position: 'outside_hitter', skill_level: 'intermediate' },
      coach: null,
      organizer: null,
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^profile$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Jem Player');
    expect(screen.getByRole('heading', { name: /player details/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('outside_hitter')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /coach details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /organizer details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add role/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request coach/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request organizer/i })).toBeInTheDocument();
  });

  test('requests coach access', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 10,
      role: 'coach',
      status: 'pending',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /request coach/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({ role: 'coach' }),
    );
    expect(await screen.findByText(/pending/i)).toBeInTheDocument();
  });

  test('shows pending status and hides coach field editors', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.listMyRoleRequests).mockResolvedValue([
      {
        id: 10,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/coach/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/bootcamp name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request coach/i })).not.toBeInTheDocument();
  });

  test('granted coach can save details', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player', 'coach'],
      player: {},
      coach: { achievements: 'Regionals finalist' },
      organizer: null,
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'coach',
      profile: { achievements: 'Regionals finalist', bootcamp_name: 'Hampas Academy' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /coach details/i });
    await user.type(screen.getByLabelText(/bootcamp name/i), 'Hampas Academy');
    await user.click(screen.getByRole('button', { name: /save coach/i }));

    await waitFor(() =>
      expect(profilesApi.updateRole).toHaveBeenCalledWith(
        'coach',
        expect.objectContaining({ bootcamp_name: 'Hampas Academy' }),
      ),
    );
  });

  test('saves account details via updateMe', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['player'],
      player: {},
      coach: null,
      organizer: null,
    });
    vi.mocked(authApi.updateMe).mockResolvedValue({
      user: {
        id: 1,
        name: 'Jem Updated',
        email: 'jem2@example.com',
        birth_date: '1999-06-15',
        gender: 'female',
        is_admin: false,
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByLabelText(/^name$/i);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Jem Updated' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'jem2@example.com' } });
    fireEvent.change(screen.getByLabelText(/birth date/i), { target: { value: '1999-06-15' } });
    await user.selectOptions(screen.getByLabelText(/^gender$/i), 'female');
    await user.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() =>
      expect(authApi.updateMe).toHaveBeenCalledWith({
        name: 'Jem Updated',
        email: 'jem2@example.com',
        birth_date: '1999-06-15',
        gender: 'female',
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/test/profile.test.tsx`

Expected: FAIL (still has Add role / missing request buttons)

- [ ] **Step 3: Commit tests**

```bash
git add src/test/profile.test.tsx
git commit -m "test: profile role access and request flow"
```

---

### Task 3: ProfilePage — player default + request elevated roles

**Files:**
- Modify: `src/pages/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `getProfile`, `updateRole`, `listMyRoleRequests`, `createRoleRequest`, `updateMe`, `useAuth`
- Produces: UI satisfying Task 2 tests

- [ ] **Step 1: Implement ProfilePage elevated logic**

Keep account + `FieldControl` + `ROLE_FIELDS` + compact chrome. Remove `addRole`, `newRole`, `newFields`, add-role card.

Key behavior:

```ts
import {
  createRoleRequest,
  getProfile,
  listMyRoleRequests,
  updateRole,
  type ProfileView,
} from '../../api/profiles';
import type { ElevatedRole, RoleRequest } from '../../api/types';

const ELEVATED: ElevatedRole[] = ['coach', 'organizer'];

// state:
const [requests, setRequests] = useState<RoleRequest[]>([]);
const [requesting, setRequesting] = useState<ElevatedRole | null>(null);

const load = async () => {
  try {
    const [data, reqs] = await Promise.all([getProfile(), listMyRoleRequests()]);
    setProfile(data);
    setRequests(reqs);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load profile.');
  } finally {
    setLoading(false);
  }
};

const latestFor = (role: ElevatedRole): RoleRequest | undefined => {
  const mine = requests.filter((r) => r.role === role);
  return mine.sort((a, b) => b.id - a.id)[0];
};

const requestRole = async (role: ElevatedRole) => {
  setError(null);
  setRequesting(role);
  try {
    const created = await createRoleRequest({ role });
    setRequests((rs) => [...rs, created]);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to request role.');
  } finally {
    setRequesting(null);
  }
};
```

Render rules:

1. **Player card:** always after account (use `profile.player` or `{}`; always show Save player). If `roles` lacks `player`, still show player editors (backend should attach player; frontend still allows save to `/profile/player`).
2. **Elevated section** (`aria-label="Elevated roles"`):
   - For each of `coach`, `organizer`:
     - If `profile.roles.includes(role)` → details card + Save (same as today).
     - Else if `latestFor(role)?.status === 'pending'` → row: “Coach — Pending” (no fields, no request button).
     - Else if `latestFor(role)?.status === 'rejected'` → row + “Request again” button.
     - Else → button `Request coach` / `Request organizer` (accessible names exact for tests).
3. Hero chips: granted roles only (`profile.roles`).
4. No “Add role” UI anywhere.

Request buttons:

```tsx
<button
  type="button"
  className={primaryBtn}
  disabled={requesting === 'coach'}
  onClick={() => void requestRole('coach')}
>
  {requesting === 'coach' ? 'Requesting…' : 'Request coach'}
</button>
```

Same for organizer with name `Request organizer`.

Pending text must match `/pending/i` (e.g. `Pending`).

- [ ] **Step 2: Run profile tests — PASS**

Run: `npm test -- src/test/profile.test.tsx`

Expected: all PASS

- [ ] **Step 3: Lint + commit**

Run: `npm run lint`

```bash
git add src/pages/Profile/ProfilePage.tsx
git commit -m "feat: profile player default and elevated role requests"
```

---

### Task 4: RequireAdmin + RoleRequestsPage + nav/route

**Files:**
- Create: `src/auth/RequireAdmin.tsx`
- Create: `src/pages/Admin/RoleRequestsPage.tsx`
- Create: `src/test/admin-role-requests.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppHeader.tsx`

**Interfaces:**
- Consumes: `listAdminRoleRequests`, `approveRoleRequest`, `rejectRoleRequest`, `useAuth().user.is_admin`
- Produces: `/admin/role-requests` admin queue

- [ ] **Step 1: Write failing admin test**

Create `src/test/admin-role-requests.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import RoleRequestsPage from '../pages/Admin/RoleRequestsPage';
import * as adminApi from '../api/admin';

vi.mock('../api/admin', () => ({
  listAdminRoleRequests: vi.fn(),
  approveRoleRequest: vi.fn(),
  rejectRoleRequest: vi.fn(),
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

describe('RoleRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('lists pending requests and approves one', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 7,
        role: 'organizer',
        status: 'pending',
        note: 'I run Angeles courts',
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
      },
    ]);
    vi.mocked(adminApi.approveRoleRequest).mockResolvedValue({
      id: 7,
      role: 'organizer',
      status: 'approved',
      note: 'I run Angeles courts',
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoleRequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Jem Player')).toBeInTheDocument();
    expect(screen.getByText(/organizer/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(adminApi.approveRoleRequest).toHaveBeenCalledWith(7));
  });

  test('rejects a request', async () => {
    vi.mocked(adminApi.listAdminRoleRequests).mockResolvedValue([
      {
        id: 8,
        role: 'coach',
        status: 'pending',
        note: null,
        created_at: '2026-08-17T00:00:00Z',
        user: { id: 2, name: 'Sam', email: 'sam@example.com' },
      },
    ]);
    vi.mocked(adminApi.rejectRoleRequest).mockResolvedValue({
      id: 8,
      role: 'coach',
      status: 'rejected',
      note: null,
      created_at: '2026-08-17T00:00:00Z',
      user: { id: 2, name: 'Sam', email: 'sam@example.com' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoleRequestsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Sam');
    await user.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => expect(adminApi.rejectRoleRequest).toHaveBeenCalledWith(8));
  });
});
```

- [ ] **Step 2: Run admin test — FAIL**

Run: `npm test -- src/test/admin-role-requests.test.tsx`

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/auth/RequireAdmin.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="text-muted" role="status">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/events" replace />;
  return children;
}
```

- [ ] **Step 4: Create `src/pages/Admin/RoleRequestsPage.tsx`**

Compact list page:

```tsx
import { useEffect, useState } from 'react';
import {
  approveRoleRequest,
  listAdminRoleRequests,
  rejectRoleRequest,
} from '../../api/admin';
import type { AdminRoleRequest } from '../../api/types';

export default function RoleRequestsPage() {
  const [items, setItems] = useState<AdminRoleRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await listAdminRoleRequests('pending');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await rejectRoleRequest(id);
      setItems((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
        Role requests
      </h1>
      <p className="text-sm text-muted">Approve coach or organizer access.</p>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No pending requests.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
            >
              <p className="font-display font-bold text-navy">{r.user.name}</p>
              <p className="text-sm text-muted">{r.user.email}</p>
              <p className="mt-1 text-sm capitalize text-navy">{r.role}</p>
              {r.note ? <p className="mt-1 text-sm text-muted">{r.note}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void approve(r.id)}
                  className="rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void reject(r.id)}
                  className="rounded-[var(--radius-control)] border border-border px-3 py-2 text-sm font-semibold text-navy"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire route + header**

In `src/App.tsx`:

```tsx
import RequireAdmin from './auth/RequireAdmin';
import RoleRequestsPage from './pages/Admin/RoleRequestsPage';

// inside Routes:
<Route
  path="/admin/role-requests"
  element={
    <RequireAuth>
      <RequireAdmin>
        <RoleRequestsPage />
      </RequireAdmin>
    </RequireAuth>
  }
/>
```

In `AppHeader.tsx`, when `user` is present, add nav link if `user.is_admin`:

```tsx
{user.is_admin ? (
  <NavLink to="/admin/role-requests" className={linkClass}>
    Role requests
  </NavLink>
) : null}
```

Also add the same link in the mobile menu block (mirror existing Profile link pattern).

- [ ] **Step 6: Run admin + profile tests**

Run: `npm test -- src/test/admin-role-requests.test.tsx src/test/profile.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/auth/RequireAdmin.tsx src/pages/Admin/RoleRequestsPage.tsx src/test/admin-role-requests.test.tsx src/App.tsx src/components/AppHeader.tsx
git commit -m "feat: admin role request queue"
```

---

### Task 5: Full verification + grep cleanup

**Files:** any remaining `addRole` imports

- [ ] **Step 1: Grep for dead addRole usage**

Run: search codebase for `addRole`

Remove leftover imports/mocks. Keep none unless a test still needs it (should not).

- [ ] **Step 2: Full test suite**

Run: `npm test`

Expected: all pass

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: exit 0

- [ ] **Step 4: Lint**

Run: `npm run lint`

- [ ] **Step 5: Detector on changed UI**

Run:

```bash
node C:\Users\Jem\.agents\skills\impeccable\scripts\detect.mjs --json src/pages/Profile/ProfilePage.tsx src/pages/Admin/RoleRequestsPage.tsx
```

Fix blocking findings in one batch if any.

- [ ] **Step 6: Final commit if fixes**

```bash
git add -A
git commit -m "fix: role access verification cleanup"
```

(Skip empty commit.)

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Player always / Account + Player default | Task 3 |
| No self-add elevated | Task 2–3 |
| Request coach/organizer | Task 1–3 |
| Pending / rejected / granted UI | Task 3 |
| Admin approve/reject | Task 1, 4 |
| Admin route + is_admin gate | Task 4 |
| APIs role-requests + admin | Task 1 |
| Remove Profile addRole | Task 1, 3, 5 |
| Tests | Task 2, 4, 5 |
| Phasing note (backend register player) | Documented; FE treats player card always |

## Backend dependency note

This plan ships frontend against the contracts in the spec. Until backend implements role-requests and admin routes, those calls will 404 in production — coordinate backend before release. Profile UI still must not call removed `addRole`.
