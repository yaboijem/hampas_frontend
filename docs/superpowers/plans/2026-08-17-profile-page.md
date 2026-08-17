# Profile Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `ProfilePage` to match HAMPAS Events visual language (hero, account strip, role cards, add-role card) while preserving profile APIs and existing test behaviors.

**Architecture:** Single-page rewrite of `src/pages/Profile/ProfilePage.tsx` using existing `getProfile` / `addRole` / `updateRole` and `useAuth` for name/email. Shared field chrome classes mirror `EventForm`. No new routes or API modules.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Testing Library, react-router

## Global Constraints

- No new dependencies
- API values for roles and fields unchanged (`player` | `coach` | `organizer`, skill_level strings, etc.)
- Accessible names preserved or improved: “Add role”, “Managed courts”, “Save coach”, “Bootcamp name”
- Tokens: ice, surface, navy, cobalt, border, muted, chip-text, radius-card, shadow-soft
- Out of scope: avatar, password, public profile

## File Structure

| File | Responsibility |
|------|----------------|
| `src/pages/Profile/ProfilePage.tsx` | Full UI + state for profile roles |
| `src/test/profile.test.tsx` | Behavior tests (update selectors only as needed) |

---

### Task 1: Redesign ProfilePage UI

**Files:**
- Modify: `src/pages/Profile/ProfilePage.tsx`
- Modify: `src/test/profile.test.tsx`

**Interfaces:**
- Consumes: `getProfile`, `addRole`, `updateRole`, `ProfileView` from `../../api/profiles`
- Consumes: `useAuth` from `../../auth/AuthContext` (`user?.name`, `user?.email`)
- Consumes: `Role`, `ProfileFieldset` from `../../api/types`
- Produces: same user-visible behaviors as today (list roles, add role, save role fields)

- [ ] **Step 1: Extend tests for polished structure**

Update `src/test/profile.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProfilePage from '../pages/Profile/ProfilePage';
import * as profilesApi from '../api/profiles';

vi.mock('../api/profiles', () => ({
  getProfile: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Jem Player', email: 'jem@example.com' },
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows hero, account strip, and current roles', async () => {
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
    expect(screen.getByText('Jem Player')).toBeInTheDocument();
    expect(screen.getByText('jem@example.com')).toBeInTheDocument();
    expect(screen.getByText(/player/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('outside_hitter')).toBeInTheDocument();
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

- [ ] **Step 2: Run tests to see failures**

Run: `npm test -- src/test/profile.test.tsx`

Expected: FAIL on hero heading and/or account strip until UI lands

- [ ] **Step 3: Implement redesigned ProfilePage**

Replace `src/pages/Profile/ProfilePage.tsx` with a polished version that:

1. Keeps `ROLE_FIELDS`, `EMPTY`, load/add/save logic
2. Adds `loading` boolean; show skeleton while first fetch runs
3. Uses `useAuth()` for account strip when `user` present
4. Layout structure:

```tsx
<div className="mx-auto max-w-2xl space-y-6">
  {/* Hero */}
  <header>
    <p className="mb-1 text-sm font-medium tracking-wider text-muted">🏐 YOUR COURT ID</p>
    <h1 className="font-display text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
      Profile
    </h1>
    <p className="mt-1 text-sm text-muted">
      Manage how you show up as a player, coach, or organizer.
    </p>
    {/* role chips */}
  </header>

  {/* error alert */}
  {/* account strip card */}
  {/* add role card (dashed) when roles remain */}
  {/* owned role cards */}
</div>
```

5. Field chrome (match EventForm):

```ts
const fieldClass =
  'mt-1 block w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-navy shadow-sm outline-none transition placeholder:text-muted/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/20';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-chip-text';
```

6. Role metadata:

```ts
const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  player: { label: 'Player', emoji: '🏐' },
  coach: { label: 'Coach', emoji: '📋' },
  organizer: { label: 'Organizer', emoji: '🏟️' },
};
```

7. Skill select options display Title Case labels but values stay `beginner` | `intermediate` | `advanced`
8. Role chips: `rounded-full bg-sky-tint px-2.5 py-1 text-xs font-semibold text-chip-text` with emoji + label
9. Cards: `rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft sm:p-5`
10. Add-role card: add `border-dashed`
11. Buttons: cobalt primary (`bg-cobalt text-white …`)
12. Save button accessible name: `Save ${role}` (e.g. “Save coach”) — keep lowercase role in name for existing test `/save coach/i`
13. Add-role select: `aria-label="Add role"`; only list roles not in `profile.roles`
14. When `profile.roles` has all three, hide add-role section
15. Labels: use `htmlFor` + id or wrap so `getByLabelText(/managed courts/i)` works
16. Position field remains free text (API value `outside_hitter` still displayable)

Full implementation sketch (complete file — implement fully, not stub):

```tsx
import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { addRole, getProfile, updateRole, type ProfileView } from '../../api/profiles';
import type { ProfileFieldset, Role } from '../../api/types';

// ROLE_FIELDS, ROLE_META, EMPTY, fieldClass, labelClass as above

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileView>(EMPTY);
  const [loading, setLoading] = useState(true);
  // ... newRole, newFields, edits, error, savingRole, adding
  // load with finally setLoading(false)
  // render hero, chips, error, account, add card, role cards
}
```

Ensure every field label is associated (e.g. `<label className="block"><span className={labelClass}>…</span><input aria-label={field.label} …/></label>` or proper htmlFor).

- [ ] **Step 4: Run profile tests**

Run: `npm test -- src/test/profile.test.tsx`

Expected: PASS all 3

- [ ] **Step 5: Lint + commit**

Run: `npm run lint`

```bash
git add src/pages/Profile/ProfilePage.tsx src/test/profile.test.tsx
git commit -m "feat: redesign Profile page with hero and role cards"
```

---

### Task 2: Full verification

**Files:** none (verify only)

- [ ] **Step 1: Full test suite**

Run: `npm test`

Expected: all pass

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: exit 0

- [ ] **Step 3: Detector (Impeccable)**

Run: `node C:\Users\Jem\.agents\skills\impeccable\scripts\detect.mjs --json src/pages/Profile/ProfilePage.tsx`

Fix any blocking findings in one batch if present; re-run tests.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Hero + chips | Task 1 |
| Account strip | Task 1 |
| Role cards + save | Task 1 |
| Add role dashed card | Task 1 |
| Loading skeleton | Task 1 |
| Error alert | Task 1 |
| EventForm field chrome | Task 1 |
| Tests / API unchanged | Task 1–2 |
