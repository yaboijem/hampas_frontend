# Compact Editable Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Profile denser and let the signed-in owner edit account fields (name, email, birth_date, gender) via `PUT /user` plus existing role fieldsets.

**Architecture:** Add `updateMe` in auth API; expose `updateUser` on AuthContext so header stays in sync after save. Rewrite `ProfilePage` into compact stacked cards: Account (editable) + role cards + add-role. Preserve `getProfile` / `addRole` / `updateRole` and `ROLE_FIELDS` keys.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Testing Library, axios client

## Global Constraints

- No new dependencies
- Account save: `PUT /user` body `{ name, email, birth_date, gender }`, response `{ user: User }`
- Role APIs and field keys unchanged
- Birth date max = today − 18 years (same as register)
- Accessible names: Save account, Add role, Managed courts, Save coach, Bootcamp name
- Out of scope: password, avatar, public profile, admin editing others
- Tokens: ice, surface, navy, cobalt, border, muted, chip-text, radius-card, shadow-soft

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/api/auth.ts` | Add `updateMe` |
| `src/auth/AuthContext.tsx` | Expose `updateUser(user: User)` |
| `src/pages/Profile/ProfilePage.tsx` | Compact UI + account/role edit state |
| `src/test/profile.test.tsx` | Account save + role behavior tests |

---

### Task 1: updateMe API + AuthContext.updateUser

**Files:**
- Modify: `src/api/auth.ts`
- Modify: `src/auth/AuthContext.tsx`
- Test: `src/test/profile.test.tsx` (mocks only in Task 2; this task is unit-light — verify types compile via tests in Task 2)

**Interfaces:**
- Consumes: `api` from `./client`; `User`, `Gender` from `./types`
- Produces:
  - `updateMe(payload: { name: string; email: string; birth_date: string; gender: Gender }): Promise<{ user: User }>`
  - `AuthValue.updateUser: (user: User) => void`

- [ ] **Step 1: Add updateMe to auth.ts**

Append after `getMe` in `src/api/auth.ts`:

```ts
export async function updateMe(payload: {
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
}): Promise<{ user: User }> {
  const { data } = await api.put('/user', payload);
  return data;
}
```

- [ ] **Step 2: Expose updateUser on AuthContext**

In `src/auth/AuthContext.tsx`:

```ts
interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
  updateUser: () => {},
});

// inside AuthProvider:
const updateUser = (nextUser: User) => {
  setUser(nextUser);
};

// Provider value:
value={{ user, loading, signIn, signOut, updateUser }}
```

- [ ] **Step 3: Commit**

```bash
git add src/api/auth.ts src/auth/AuthContext.tsx
git commit -m "feat: add updateMe and AuthContext.updateUser"
```

---

### Task 2: Failing profile tests (account edit + compact structure)

**Files:**
- Modify: `src/test/profile.test.tsx`

**Interfaces:**
- Consumes: `updateMe` mock; AuthContext mock with `updateUser`
- Produces: failing tests that drive Task 3 UI

- [ ] **Step 1: Rewrite profile.test.tsx**

Replace `src/test/profile.test.tsx` with:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProfilePage from '../pages/Profile/ProfilePage';
import * as profilesApi from '../api/profiles';
import * as authApi from '../api/auth';

const updateUser = vi.fn();

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  updateMe: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Jem Player',
      email: 'jem@example.com',
      birth_date: '2000-01-01',
      gender: 'male' as const,
      is_admin: false,
    },
    loading: false,
    signOut: vi.fn(),
    updateUser,
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows compact profile with editable account and roles', async () => {
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
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('jem@example.com');
    expect(screen.getByLabelText(/birth date/i)).toHaveValue('2000-01-01');
    expect(screen.getByLabelText(/^gender$/i)).toHaveValue('male');
    expect(screen.getByRole('heading', { name: /player details/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('outside_hitter')).toBeInTheDocument();
  });

  test('saves account details via updateMe', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: [],
      player: null,
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
    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'Jem Updated');
    await user.clear(screen.getByLabelText(/^email$/i));
    await user.type(screen.getByLabelText(/^email$/i), 'jem2@example.com');
    await user.clear(screen.getByLabelText(/birth date/i));
    await user.type(screen.getByLabelText(/birth date/i), '1999-06-15');
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
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jem Updated', email: 'jem2@example.com' }),
    );
  });

  test('adds an organizer role', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: [],
      player: null,
      coach: null,
      organizer: null,
    });
    vi.mocked(profilesApi.addRole).mockResolvedValue({
      role: 'organizer',
      profile: { managed_courts: 'Angeles City Sports Complex' },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.selectOptions(await screen.findByLabelText(/add role/i), 'organizer');
    await user.type(screen.getByLabelText(/managed courts/i), 'Angeles City Sports Complex');
    await user.click(screen.getByRole('button', { name: /add role/i }));

    await waitFor(() =>
      expect(profilesApi.addRole).toHaveBeenCalledWith('organizer', {
        managed_courts: 'Angeles City Sports Complex',
      }),
    );
  });

  test('updates coach profile', async () => {
    vi.mocked(profilesApi.getProfile).mockResolvedValue({
      roles: ['coach'],
      player: null,
      coach: { achievements: 'Regionals finalist' },
      organizer: null,
    });
    vi.mocked(profilesApi.updateRole).mockResolvedValue({
      role: 'coach',
      profile: { achievements: 'Nationals champion', bootcamp_name: 'Hampas Academy' },
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
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/test/profile.test.tsx`

Expected: FAIL (no updateMe usage / missing account labels / Save account)

- [ ] **Step 3: Commit tests**

```bash
git add src/test/profile.test.tsx
git commit -m "test: profile account edit and compact structure"
```

---

### Task 3: Compact ProfilePage with editable account + roles

**Files:**
- Modify: `src/pages/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `updateMe` from `../../api/auth`; `useAuth().user` + `useAuth().updateUser`; existing profile APIs
- Produces: UI satisfying all four tests in Task 2

- [ ] **Step 1: Implement full ProfilePage**

Replace `src/pages/Profile/ProfilePage.tsx` with a complete implementation that:

1. Keeps `ROLE_FIELDS`, `ROLE_META`, `ALL_ROLES`, `EMPTY`, `FieldControl`, load/add/save role logic
2. Compact shell: `mx-auto max-w-xl space-y-3`
3. Hero: `h1` text-2xl/sm:text-3xl “Profile”; one muted subtitle; role chips
4. Account section when `user` present:
   - Local state `account` initialized from `user` (sync when `user` changes via useEffect)
   - Labels: Name, Email, Birth date, Gender (associated via htmlFor/id or wrap so getByLabelText works)
   - Gender select options: male, female, other (Title Case display optional)
   - `max` on birth date: same `MAX_BIRTH_DATE` pattern as RegisterPage
   - Button accessible name: **Save account**
   - `saveAccount`: call `updateMe` with trimmed name/email + birth_date + gender; on success `updateUser(data.user)` and set local account from returned user
5. Dense cards: `p-3`, field grid `sm:grid-cols-2 gap-3` for account short fields and player fields
6. Add-role dashed card when `availableRoles.length > 0`
7. Role cards with Save {role}
8. Loading skeleton; top error alert
9. Field chrome classes matching EventForm (fieldClass, labelClass, primaryBtn, cardClass)

Reference structure:

```tsx
import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { updateMe } from '../../api/auth';
import { addRole, getProfile, updateRole, type ProfileView } from '../../api/profiles';
import type { Gender, ProfileFieldset, Role } from '../../api/types';

// ROLE_FIELDS, ROLE_META, ALL_ROLES, EMPTY, classes, FieldControl, titleCase, MAX_BIRTH_DATE

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  // profile, loading, newRole, newFields, edits, error
  // savingAccount, savingRole, adding
  // account: { name, email, birth_date, gender }

  useEffect(() => {
    if (!user) return;
    setAccount({
      name: user.name,
      email: user.email,
      birth_date: user.birth_date,
      gender: user.gender,
    });
  }, [user]);

  const saveAccount = async () => {
    setError(null);
    setSavingAccount(true);
    try {
      const { user: next } = await updateMe({
        name: account.name.trim(),
        email: account.email.trim(),
        birth_date: account.birth_date,
        gender: account.gender as Gender,
      });
      updateUser(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account.');
    } finally {
      setSavingAccount(false);
    }
  };

  // ... load, add, save role as today
  // render compact layout
}
```

Account fields must use labels matching tests:
- `getByLabelText(/^name$/i)`
- `getByLabelText(/^email$/i)`
- `getByLabelText(/birth date/i)`
- `getByLabelText(/^gender$/i)`

Disable Save account while `savingAccount` or if name/email empty or birth_date after MAX_BIRTH_DATE or gender empty.

- [ ] **Step 2: Run profile tests — expect PASS**

Run: `npm test -- src/test/profile.test.tsx`

Expected: all 4 PASS

- [ ] **Step 3: Lint**

Run: `npm run lint`

Expected: exit 0 (fix any issues in touched files)

- [ ] **Step 4: Commit**

```bash
git add src/pages/Profile/ProfilePage.tsx
git commit -m "feat: compact profile with editable account and roles"
```

---

### Task 4: Full verification

**Files:** none (verify only)

- [ ] **Step 1: Full test suite**

Run: `npm test`

Expected: all pass. If other tests mock AuthContext without `updateUser`, add `updateUser: vi.fn()` to those mocks.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: exit 0

- [ ] **Step 3: Impeccable detector**

Run: `node C:\Users\Jem\.agents\skills\impeccable\scripts\detect.mjs --json src/pages/Profile/ProfilePage.tsx`

Fix blocking findings in one batch if any; re-run profile tests.

- [ ] **Step 4: Commit detector fixes if any**

```bash
git add src/pages/Profile/ProfilePage.tsx src/test/*.tsx
git commit -m "fix: profile verification and auth mock updates"
```

(Skip empty commit if nothing changed.)

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Compact shell max-w-xl space-y-3 | Task 3 |
| Smaller hero | Task 3 |
| Editable name/email/birth_date/gender | Task 3 |
| PUT /user via updateMe | Task 1, 3 |
| AuthContext refresh after save | Task 1, 3 |
| 18+ birth date max | Task 3 |
| Role cards + save | Task 3 |
| Add role dashed | Task 3 |
| Skeleton + error alert | Task 3 |
| Tests | Task 2, 4 |
| No password/avatar | — out of scope |
