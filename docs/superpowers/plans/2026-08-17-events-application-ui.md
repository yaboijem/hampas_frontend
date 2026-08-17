# Events Application UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish My Applications, Manage Applications, and StatusBadge so they match Hampas event design tokens without API or product-rule changes.

**Architecture:** Restyle three existing React surfaces in place. StatusBadge becomes the shared label source (`Pending` / `Approved` / `Rejected` pills). Both application pages keep their current data hooks and actions; only layout, loading, empty, error chrome, and button classes change. No new components or routes.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (project tokens), Vitest, Testing Library, react-router-dom

## Global Constraints

- No new dependencies
- No API, route, or application status enum changes (`pending` | `approved` | `rejected` remain wire values)
- Accessible button names stay: `Apply`, `Cancel application` (ApplyButton), `Cancel` (My Applications), `Approve`, `Reject`
- StatusBadge **display** labels are Title Case: Pending / Approved / Rejected (tests must not assert raw lowercase enum text)
- Tokens: `navy`, `cobalt`, `electric`, `surface`, `border`, `muted`, `radius-card`, `radius-control`, `shadow-soft`, `font-display`, `.skeleton-shimmer`
- Out of scope: Event list/detail redesign, filters, bulk actions, confirm dialogs, ApplyButton behavior (except StatusBadge text via shared component)
- Spec: `docs/superpowers/specs/2026-08-17-events-application-ui-design.md`

## File Structure

| File | Responsibility |
|------|----------------|
| `src/components/StatusBadge.tsx` | Pill + human labels for application status |
| `src/pages/Applications/MyApplicationsPage.tsx` | Player list: load, empty, cancel pending |
| `src/pages/Applications/EventApplicationsPage.tsx` | Organizer list: load, empty, error, approve/reject |
| `src/test/applications.test.tsx` | ApplyButton + EventApplicationsPage + MyApplicationsPage behavior |

---

### Task 1: StatusBadge human labels + pill styling

**Files:**
- Modify: `src/components/StatusBadge.tsx`
- Modify: `src/test/applications.test.tsx` (ApplyButton assertion only)

**Interfaces:**
- Consumes: `ApplicationStatus` from `../api/types`
- Produces: `<StatusBadge status={ApplicationStatus} />` rendering Title Case label text

- [ ] **Step 1: Update failing assertion for Title Case status**

In `src/test/applications.test.tsx`, change ApplyButton test expectation from raw enum to label:

```tsx
// was: expect(await screen.findByText('pending')).toBeInTheDocument();
expect(await screen.findByText('Pending')).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails (still shows lowercase)**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: FAIL — cannot find text `Pending` (still `pending`).

- [ ] **Step 3: Implement StatusBadge**

Replace `src/components/StatusBadge.tsx` with:

```tsx
import type { ApplicationStatus } from '../api/types';

const LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
};

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
```

- [ ] **Step 4: Run applications tests**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: PASS (ApplyButton + EventApplicationsPage existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusBadge.tsx src/test/applications.test.tsx
git commit -m "feat: polish StatusBadge with human labels and pill style"
```

---

### Task 2: My Applications page polish

**Files:**
- Modify: `src/pages/Applications/MyApplicationsPage.tsx`
- Modify: `src/test/applications.test.tsx`

**Interfaces:**
- Consumes: `myApplications`, `cancelApplication` from `../../api/applications`
- Consumes: `StatusBadge`, `formatEventWhen` from `../../events/eventLabels`
- Consumes: `ApplicationStatus`, `EventItem` from `../../api/types`
- Produces: page at `/me/applications` with same cancel behavior

- [ ] **Step 1: Add MyApplicationsPage tests**

Append to `src/test/applications.test.tsx`:

```tsx
import MyApplicationsPage from '../pages/Applications/MyApplicationsPage';

// inside file after EventApplicationsPage describe:

describe('MyApplicationsPage', () => {
  test('lists applications and cancels pending', async () => {
    const user = userEvent.setup();
    const event = {
      id: 11,
      title: 'Friday League',
      description: 'x',
      event_type: 'league' as const,
      skill_level: 'intermediate' as const,
      barangay: null,
      city: 'Angeles City',
      starts_at: '2026-09-01T18:00:00.000Z',
      photo_url: null,
      visibility: 'live' as const,
      is_owner: false,
      my_application: null,
      created_by: { id: 1, name: 'Org' },
    };

    vi.mocked(applicationsApi.myApplications)
      .mockResolvedValueOnce({
        data: [{ id: 20, status: 'pending', event }],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(applicationsApi.cancelApplication).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/me/applications']}>
        <Routes>
          <Route path="/me/applications" element={<MyApplicationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /my applications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /friday league/i })).toHaveAttribute('href', '/events/11');
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(applicationsApi.cancelApplication).toHaveBeenCalledWith(11));
    expect(await screen.findByText(/not applied to any events/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse events/i })).toHaveAttribute('href', '/events');
  });

  test('shows empty state when none', async () => {
    vi.mocked(applicationsApi.myApplications).mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <MyApplicationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/not applied to any events/i)).toBeInTheDocument();
  });
});
```

Ensure top-level imports include `MyApplicationsPage` (and `Routes`/`Route` already present).

- [ ] **Step 2: Run new tests (expect fail or weak pass on empty only)**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: empty-state test may pass; cancel/list test fails until UI matches (heading/link/Browse events).

- [ ] **Step 3: Implement MyApplicationsPage**

Replace `src/pages/Applications/MyApplicationsPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelApplication, myApplications } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus, EventItem } from '../../api/types';
import { formatEventWhen } from '../../events/eventLabels';

interface Row {
  id: number;
  status: ApplicationStatus;
  event: EventItem;
}

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton-shimmer h-5 w-2/3 rounded" />
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
        </div>
        <div className="skeleton-shimmer h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    myApplications()
      .then(({ data }) => setRows(data))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const cancel = async (eventId: number) => {
    await cancelApplication(eventId);
    await load();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Loading applications">
        <div className="skeleton-shimmer mb-2 h-8 w-56 rounded" />
        <div className="skeleton-shimmer mb-4 h-4 w-40 rounded" />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">My Applications</h1>
        <p className="text-sm text-muted">Events you’ve applied to</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">You have not applied to any events yet.</p>
          <Link
            to="/events"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            >
              <div className="min-w-0">
                <Link
                  to={`/events/${row.event.id}`}
                  className="font-semibold text-navy hover:text-cobalt hover:underline"
                >
                  {row.event.title}
                </Link>
                <p className="text-sm text-muted">{formatEventWhen(row.event.starts_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={row.status} />
                {row.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancel(row.event.id)}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-navy"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run applications tests**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Applications/MyApplicationsPage.tsx src/test/applications.test.tsx
git commit -m "feat: polish My Applications page UI"
```

---

### Task 3: Manage Applications (EventApplicationsPage) polish

**Files:**
- Modify: `src/pages/Applications/EventApplicationsPage.tsx`
- Modify: `src/test/applications.test.tsx`

**Interfaces:**
- Consumes: `listEventApplications`, `approveApplication`, `rejectApplication` from `../../api/applications`
- Consumes: `StatusBadge`, `useParams` / `Link` from react-router
- Produces: page at `/events/:id/applications` with approve/reject + back link + load/decide errors

- [ ] **Step 1: Extend EventApplicationsPage tests**

Update the existing `EventApplicationsPage` describe in `src/test/applications.test.tsx`:

1. After render settles, assert back link and heading:

```tsx
expect(await screen.findByRole('heading', { name: /^applications$/i })).toBeInTheDocument();
expect(screen.getByRole('link', { name: /back to event/i })).toHaveAttribute('href', '/events/1');
expect(screen.getByText('Pending')).toBeInTheDocument();
expect(screen.getByText('Approved')).toBeInTheDocument();
```

2. Add empty-state test:

```tsx
test('shows empty state when no applicants', async () => {
  vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({ data: [] });

  render(
    <MemoryRouter initialEntries={['/events/2/applications']}>
      <Routes>
        <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /back to event/i })).toHaveAttribute('href', '/events/2');
});
```

3. Add decide-error test:

```tsx
test('surfaces approve failure', async () => {
  const user = userEvent.setup();
  vi.mocked(applicationsApi.listEventApplications).mockResolvedValue({
    data: [{ id: 3, user: { id: 7, name: 'Ana' }, status: 'pending' }],
  });
  vi.mocked(applicationsApi.approveApplication).mockRejectedValue(new Error('Approve failed.'));

  render(
    <MemoryRouter initialEntries={['/events/1/applications']}>
      <Routes>
        <Route path="/events/:id/applications" element={<EventApplicationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole('button', { name: /approve/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/approve failed/i);
});
```

- [ ] **Step 2: Run tests to verify new assertions fail**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: FAIL on missing back link and/or Title Case badges and/or alert on approve failure.

- [ ] **Step 3: Implement EventApplicationsPage**

Replace `src/pages/Applications/EventApplicationsPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { approveApplication, listEventApplications, rejectApplication } from '../../api/applications';
import StatusBadge from '../../components/StatusBadge';
import type { ApplicationStatus } from '../../api/types';

interface Applicant {
  id: number;
  user: { id: number; name: string };
  status: ApplicationStatus;
}

function RowSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton-shimmer h-5 w-1/3 rounded" />
        <div className="skeleton-shimmer h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function EventApplicationsPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listEventApplications(eventId)
      .then(({ data }) => setApplicants(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load applications.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    void load();
  }, [eventId]);

  const decide = async (applicationId: number, status: 'approved' | 'rejected') => {
    setError(null);
    try {
      if (status === 'approved') {
        await approveApplication(eventId, applicationId);
      } else {
        await rejectApplication(eventId, applicationId);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update application.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Loading applications">
        <div className="skeleton-shimmer mb-2 h-8 w-48 rounded" />
        <div className="skeleton-shimmer mb-4 h-4 w-56 rounded" />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link
        to={`/events/${eventId}`}
        className="mb-1 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-sm font-semibold text-chip-text transition hover:bg-cobalt/15"
      >
        <span aria-hidden>←</span>
        Back to event
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">Applications</h1>
        <p className="text-sm text-muted">Review who wants to join</p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      {applicants.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">No applications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {applicants.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            >
              <span className="font-semibold text-navy">{a.user.name}</span>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={a.status} />
                {a.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => decide(a.id, 'approved')}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(a.id, 'rejected')}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Note: after `decide` success, `load()` must not leave `loading` stuck true. Either:

- do **not** call `setLoading(true)` inside the shared `load` used by decide, or
- split `refresh` that only updates `applicants` without toggling full-page skeleton.

Preferred pattern in implementation:

```tsx
const fetchList = async () => {
  const { data } = await listEventApplications(eventId);
  setApplicants(data);
};

// initial:
useEffect(() => {
  setLoading(true);
  setError(null);
  fetchList()
    .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load applications.'))
    .finally(() => setLoading(false));
}, [eventId]);

// after decide success:
await fetchList();
```

Use this split so approve does not flash full-page skeletons (and so tests can still find Ana after approve).

- [ ] **Step 4: Run applications tests**

Run:

```bash
npm test -- src/test/applications.test.tsx
```

Expected: PASS all describes.

- [ ] **Step 5: Lint + full test sanity**

Run:

```bash
npm run lint
npm test -- src/test/applications.test.tsx
```

Expected: no new lint errors; tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Applications/EventApplicationsPage.tsx src/test/applications.test.tsx
git commit -m "feat: polish Manage Applications page UI"
```

---

### Task 4: Spec success criteria check + final commit if dirty

**Files:**
- Read: `docs/superpowers/specs/2026-08-17-events-application-ui-design.md`
- Touch only if tests/docs need a final fix

- [ ] **Step 1: Verify success criteria**

Checklist from spec:

- [ ] Both application pages use design tokens and card rows
- [ ] StatusBadge shows Pending / Approved / Rejected with pill styling
- [ ] Loading uses skeletons; empty states use dashed cards; Manage has back link
- [ ] Approve = cobalt primary; Reject/Cancel = outline patterns
- [ ] No API or route changes
- [ ] `applications` tests pass

- [ ] **Step 2: Run final verification**

```bash
npm test -- src/test/applications.test.tsx
npm run lint
```

Expected: PASS / clean for touched files.

- [ ] **Step 3: Commit only if uncommitted fixes remain**

```bash
git status
# if needed:
git add src/pages/Applications src/components/StatusBadge.tsx src/test/applications.test.tsx
git commit -m "fix: finish Events Application UI polish"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| StatusBadge Title Case + pill | Task 1 |
| My Applications shell, skeletons, cards, cancel outline, empty + Browse events, formatEventWhen | Task 2 |
| Manage Applications shell, back link, skeletons, cards, cobalt Approve, outline Reject, empty, error on decide | Task 3 |
| ApplyButton only affected via StatusBadge text | Task 1 test update |
| No API/route changes | All tasks |
| applications tests pass | Tasks 1–4 |

## Placeholder / consistency scan

- No TBD/TODO left in steps
- Button labels match tests: Cancel, Approve, Reject, Cancel application, Pending
- `load` vs `fetchList` split documented so approve test does not race skeletons
- Event mock in Task 2 includes required `EventItem` fields
