# Role Request Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-click coach/organizer requests with a shared modal that shows role-specific privileges/rules, requires scroll-to-bottom then accept, allows an optional note, and works from Profile and the create-event access modal.

**Architecture:** Editable copy lives in `src/content/roleRequestCopy.ts`. `RoleRequestModal` owns scroll gate, accept checkbox, optional note, and `createRoleRequest` submit. Profile elevated access and `CreateEventAccessModal` open the modal instead of posting immediately. Backend contract unchanged (`role` + optional `note` max 500).

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, existing `createRoleRequest` API, portal modals matching `CreateEventAccessModal`

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-19-role-request-forms-design.md`
- Note optional; accept required; scroll-to-bottom before accept enabled
- If content fits without scroll → accept enabled immediately
- Separate coach vs organizer **copy**; shared modal shell
- Entry: Profile elevated access + CreateEventAccessModal
- API: `POST /profile/role-requests` only; no BE schema change
- No new npm packages
- Checkbox label: “I have read and accept the privileges and rules for this role.”
- RoleRequestModal z-index ≥ create-event modal (`z-[210]` or higher)
- Out of scope: `accepted_rules_at`, dedicated routes, wizard pages

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/content/roleRequestCopy.ts` | Titles, privileges[], rules[] per coach/organizer |
| `src/components/RoleRequestModal.tsx` | Scroll gate, accept, note, submit |
| `src/pages/Profile/ProfilePage.tsx` | Open modal; stop direct request |
| `src/components/CreateEventAccessModal.tsx` | Open modal; refresh on success |
| `src/test/role-request-modal.test.tsx` | Gate + submit tests |
| `src/test/create-event-access.test.tsx` | Expect modal open, not immediate POST |
| `src/test/profile.test.tsx` | Expect modal open for request coach |

---

### Task 1: Role request copy module

**Files:**
- Create: `src/content/roleRequestCopy.ts`
- Test: `src/test/role-request-copy.test.ts` (smoke: both roles have non-empty sections)

**Interfaces:**
- Produces:

```ts
import type { ElevatedRole } from '../api/types';

export type RoleRequestCopy = {
  title: string;
  privilegesHeading: string;
  rulesHeading: string;
  privileges: string[];
  rules: string[];
  acceptLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
};

export const ROLE_REQUEST_COPY: Record<ElevatedRole, RoleRequestCopy>;
export function getRoleRequestCopy(role: ElevatedRole): RoleRequestCopy;
```

- [ ] **Step 1: Write failing smoke test**

```ts
// src/test/role-request-copy.test.ts
import { describe, expect, test } from 'vitest';
import { ROLE_REQUEST_COPY, getRoleRequestCopy } from '../content/roleRequestCopy';

describe('roleRequestCopy', () => {
  test('coach and organizer have privileges and rules', () => {
    for (const role of ['coach', 'organizer'] as const) {
      const c = getRoleRequestCopy(role);
      expect(c.title.length).toBeGreaterThan(5);
      expect(c.privileges.length).toBeGreaterThan(2);
      expect(c.rules.length).toBeGreaterThan(2);
      expect(c.acceptLabel).toMatch(/accept/i);
    }
    expect(ROLE_REQUEST_COPY.coach.title).not.toBe(ROLE_REQUEST_COPY.organizer.title);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/test/role-request-copy.test.ts
```

- [ ] **Step 3: Implement copy from spec draft**

Use the privilege/rule bullets from the design spec § “Draft copy”. Titles:

- coach: `Request coach access`
- organizer: `Request organizer access`

Headings: `Privileges` / `Rules`.  
`acceptLabel`: `I have read and accept the privileges and rules for this role.`  
`noteLabel`: `Note to admin (optional)`  
`notePlaceholder`: `Why you want this role, courts you run, experience, etc.`  
`submitLabel`: `Submit request`

- [ ] **Step 4: Run test — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/content/roleRequestCopy.ts src/test/role-request-copy.test.ts
git commit -m "feat: add coach and organizer role request copy"
```

---

### Task 2: RoleRequestModal (scroll gate + submit)

**Files:**
- Create: `src/components/RoleRequestModal.tsx`
- Test: `src/test/role-request-modal.test.tsx`

**Interfaces:**
- Consumes: `getRoleRequestCopy`, `createRoleRequest`, `showToast`, `ElevatedRole`
- Produces:

```tsx
type Props = {
  role: ElevatedRole;
  onClose: () => void;
  onSubmitted?: () => void;
};
export default function RoleRequestModal(props: Props): JSX.Element;
```

- [ ] **Step 1: Write failing tests**

```tsx
// src/test/role-request-modal.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as profilesApi from '../api/profiles';
import RoleRequestModal from '../components/RoleRequestModal';

vi.mock('../api/profiles', () => ({
  createRoleRequest: vi.fn(),
}));

describe('RoleRequestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows coach copy and blocks submit until accept', async () => {
    const user = userEvent.setup();
    // Force “already at bottom” path: mock scroll metrics after mount if needed
    render(
      <RoleRequestModal role="coach" onClose={vi.fn()} />,
    );
    expect(await screen.findByRole('dialog', { name: /request coach access/i })).toBeInTheDocument();
    expect(screen.getByText(/privileges/i)).toBeInTheDocument();
    expect(screen.getByText(/rules/i)).toBeInTheDocument();

    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();

    const accept = screen.getByRole('checkbox', { name: /accept the privileges and rules/i });
    // If accept disabled due to scroll gate with overflow, set scrollHeight === clientHeight via mock
    if ((accept as HTMLInputElement).disabled) {
      // implementation should expose scroll container; test may fire scroll or mock layout
    } else {
      await user.click(accept);
    }
    // Prefer: after enabling accept and checking it, submit becomes enabled
  });

  test('submits role with optional note', async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    const onClose = vi.fn();
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 1,
      role: 'organizer',
      status: 'pending',
      note: 'I run Capel',
      created_at: '2026-08-19T00:00:00Z',
    });

    render(
      <RoleRequestModal role="organizer" onClose={onClose} onSubmitted={onSubmitted} />,
    );
    await screen.findByRole('dialog', { name: /request organizer access/i });

    // Enable accept (see helper below in implementation notes)
    const accept = screen.getByRole('checkbox', { name: /accept/i });
    // Ensure enabled then check
    await user.click(accept);
    await user.type(screen.getByLabelText(/note to admin/i), 'I run Capel');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({
        role: 'organizer',
        note: 'I run Capel',
      }),
    );
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('omits empty note', async () => {
    const user = userEvent.setup();
    vi.mocked(profilesApi.createRoleRequest).mockResolvedValue({
      id: 2,
      role: 'coach',
      status: 'pending',
      note: null,
      created_at: '2026-08-19T00:00:00Z',
    });
    render(<RoleRequestModal role="coach" onClose={vi.fn()} />);
    await screen.findByRole('dialog', { name: /coach/i });
    await user.click(screen.getByRole('checkbox', { name: /accept/i }));
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() =>
      expect(profilesApi.createRoleRequest).toHaveBeenCalledWith({
        role: 'coach',
        note: undefined, // or omit key — match implementation; prefer note omitted or undefined
      }),
    );
  });
});
```

**Scroll testing strategy (required for reliability):**  
On mount, measure the scroll element. In jsdom, `scrollHeight` often equals `clientHeight`, so **accept starts enabled**. That is correct per spec. Add one unit-style test for the helper:

```ts
// export for test or test via data attributes
export function isScrolledToBottom(el: { scrollTop: number; clientHeight: number; scrollHeight: number }, pad = 12): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - pad;
}
```

Test helper with fake metrics (not scrolled / scrolled).

- [ ] **Step 2: Run tests — FAIL**

```bash
npm test -- src/test/role-request-modal.test.tsx
```

- [ ] **Step 3: Implement RoleRequestModal**

Structure (portal like CreateEventAccessModal):

```tsx
// Key pieces
const copy = getRoleRequestCopy(role);
const scrollerRef = useRef<HTMLDivElement>(null);
const [atBottom, setAtBottom] = useState(false);
const [accepted, setAccepted] = useState(false);
const [note, setNote] = useState('');
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);

const measure = () => {
  const el = scrollerRef.current;
  if (!el) return;
  setAtBottom(isScrolledToBottom(el));
};

useEffect(() => {
  setAccepted(false);
  setNote('');
  setError(null);
  // rAF double measure after paint
  requestAnimationFrame(() => measure());
}, [role]);

// scroller: onScroll={measure}, ref={scrollerRef}, className max-h-[min(50dvh,20rem)] overflow-y-auto

// checkbox disabled={!atBottom} checked={accepted} onChange...
// when !atBottom && accepted, force accepted false

const canSubmit = atBottom && accepted && !busy;

const submit = async () => {
  if (!canSubmit) return;
  setBusy(true);
  try {
    const trimmed = note.trim();
    await createRoleRequest({
      role,
      ...(trimmed ? { note: trimmed } : {}),
    });
    showToast(role === 'coach' ? 'Coach request submitted.' : 'Organizer request submitted.');
    onSubmitted?.();
    onClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Request failed.');
  } finally {
    setBusy(false);
  }
};
```

UI details:

- `role="dialog"` `aria-labelledby` title from copy  
- Privileges as `<ul>`, Rules as `<ul>`  
- Optional note `maxLength={500}`  
- Primary Submit, secondary Cancel  
- z-index `z-[210]`  
- Escape + scrim close when `!busy`  
- body scroll lock like CreateEventAccessModal  

Export `isScrolledToBottom` from the same file or `src/lib/scrollBottom.ts`.

- [ ] **Step 4: Tests PASS**

```bash
npm test -- src/test/role-request-modal.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/RoleRequestModal.tsx src/lib/scrollBottom.ts src/test/role-request-modal.test.tsx
git commit -m "feat: role request modal with scroll gate and accept"
```

---

### Task 3: Wire Profile elevated access

**Files:**
- Modify: `src/pages/Profile/ProfilePage.tsx`
- Modify: `src/test/profile.test.tsx`

**Interfaces:**
- Consumes: `RoleRequestModal`
- Stops calling `createRoleRequest` directly from Request buttons

- [ ] **Step 1: Update profile test**

Change expectation from immediate `createRoleRequest({ role: 'coach' })` to:

```tsx
await user.click(screen.getByRole('button', { name: /request coach/i }));
expect(await screen.findByRole('dialog', { name: /request coach access/i })).toBeInTheDocument();
// optional: complete accept+submit and then expect createRoleRequest
```

- [ ] **Step 2: Run test — FAIL**

```bash
npm test -- src/test/profile.test.tsx
```

- [ ] **Step 3: Implement Profile wiring**

```tsx
const [requestModalRole, setRequestModalRole] = useState<ElevatedRole | null>(null);

// Replace requestRole direct submit buttons:
onClick={() => setRequestModalRole(role)}

// Keep pending/granted disabled labels as today

{requestModalRole ? (
  <RoleRequestModal
    role={requestModalRole}
    onClose={() => setRequestModalRole(null)}
    onSubmitted={() => {
      void listMyRoleRequests().then(setRequests); // or existing refresh path
    }}
  />
) : null}
```

Remove unused direct `requestRole` submit path or slim it to only open modal.

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile/ProfilePage.tsx src/test/profile.test.tsx
git commit -m "feat(profile): open role request modal for coach/organizer"
```

---

### Task 4: Wire CreateEventAccessModal

**Files:**
- Modify: `src/components/CreateEventAccessModal.tsx`
- Modify: `src/test/create-event-access.test.tsx`

**Interfaces:**
- Consumes: `RoleRequestModal`
- Nested modal: RoleRequestModal on top

- [ ] **Step 1: Update create-event-access test**

```tsx
// was: createRoleRequest called on coach click
await user.click(screen.getByRole('button', { name: /request coach|coach access/i }));
expect(await screen.findByRole('dialog', { name: /request coach access/i })).toBeInTheDocument();
expect(profilesApi.createRoleRequest).not.toHaveBeenCalled();
// complete modal flow → then createRoleRequest called
```

Read current button labels in CreateEventAccessModal and match them.

- [ ] **Step 2: FAIL then implement**

```tsx
const [formRole, setFormRole] = useState<ElevatedRole | null>(null);

// coach button onClick={() => setFormRole('coach')}
// organizer button similarly

{formRole ? (
  <RoleRequestModal
    role={formRole}
    onClose={() => setFormRole(null)}
    onSubmitted={() => {
      void listMyRoleRequests().then(setRequests);
    }}
  />
) : null}
```

Remove inline `requestRole` POST from those buttons (or only use after modal).

- [ ] **Step 3: PASS**

```bash
npm test -- src/test/create-event-access.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateEventAccessModal.tsx src/test/create-event-access.test.tsx
git commit -m "feat: create-event access opens role request modal"
```

---

### Task 5: Verification

- [ ] **Step 1: Full related FE tests**

```bash
npm test -- src/test/role-request-copy.test.ts src/test/role-request-modal.test.tsx src/test/profile.test.tsx src/test/create-event-access.test.tsx
npm run lint
npx tsc -b --pretty false
```

Expected: all green

- [ ] **Step 2: Manual smoke**

1. Profile → Request coach → scroll/accept → submit → pending  
2. Request organizer with note → admin sees note  
3. Player hits Create event → access modal → coach form  
4. Edit `roleRequestCopy.ts` text and confirm UI updates  

- [ ] **Step 3: Fix any failures; commit if needed**

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Copy module coach/organizer | 1 |
| Shared RoleRequestModal | 2 |
| Scroll gate + accept | 2 |
| Optional note | 2 |
| Profile entry | 3 |
| Create-event entry | 4 |
| Existing API | 2–4 |
| Tests | 1–5 |
| No BE accepted_at | — |

## Self-review notes

- No TBD placeholders  
- `createRoleRequest` payload: omit empty note (not empty string)  
- jsdom scroll: helper unit-tested; UI tests rely on no-overflow → accept enabled  
- Nested dialog z-index documented  
