# Event Detail Application Status Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign applicant status + Leave/Cancel UI on Event Detail into a polished status card for mobile sticky bar and desktop static layout, without changing apply/cancel API behavior.

**Architecture:** All UI lives in `ApplyButton`. When `application` is set, render a status-tinted card with `StatusBadge`, helper copy, and optional secondary action. Empty state keeps a full-width primary Apply. `EventDetailPage` sticky wrapper only gets minor spacing tweaks if needed. Reuse existing `StatusBadge` unchanged for list pages.

**Tech Stack:** React 19, Tailwind 4 utility classes, Vitest, Testing Library, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-18-event-detail-application-status-card-design.md`

## Global Constraints

- Exact helper copy:
  - pending: `Waiting for organizer approval.`
  - approved: `You're in — see you on the court.` (use a real em dash `—` or ASCII ` - ` consistently; prefer `—` as in spec)
  - rejected: `You cannot reapply to this event.`
- Button labels unchanged: `Apply`, `Cancel application`, `Leave event`
- No new npm deps; no API changes; no confirmation modal for cancel/leave
- Do not change global `StatusBadge` styles used on applications lists
- Keep `data-testid="event-sticky-cta"` and existing safe-area sticky classes
- Preserve dark mode via existing token/badge patterns
- Min touch target `min-h-11` on actions
- Stage only files listed in each task commit

## File structure

| Path | Role |
|------|------|
| `src/components/ApplyButton.tsx` | Status card + Apply UI |
| `src/pages/Events/EventDetailPage.tsx` | Optional sticky padding tweak |
| `src/test/applications.test.tsx` | ApplyButton status card contracts + behavior |
| `src/test/event-detail.test.tsx` | Sticky CTA regression (must stay green) |

---

### Task 1: Status card UI + tests in ApplyButton

**Files:**
- Modify: `src/components/ApplyButton.tsx`
- Modify: `src/test/applications.test.tsx`
- Test: `src/test/applications.test.tsx`
- Test: `src/test/event-detail.test.tsx` (run only; no change unless broken)

**Interfaces:**
- Consumes: existing props  
  `ApplyButton({ eventId, isOwner, visibility, myApplication })`  
  `myApplication: { id: number; status: ApplicationStatus } | null`
- Produces: DOM structure for status states:
  - Root card: `data-testid="application-status-card"`
  - Helper text visible per status (exact strings above)
  - Secondary button labels unchanged

- [ ] **Step 1: Extend failing tests for status card copy and structure**

In `src/test/applications.test.tsx`, inside `describe('ApplyButton')`, add:

```tsx
  test('pending status card shows helper copy and cancel action', () => {
    render(
      <MemoryRouter>
        <ApplyButton
          eventId={1}
          isOwner={false}
          visibility="live"
          myApplication={{ id: 5, status: 'pending' }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('application-status-card');
    expect(card).toBeInTheDocument();
    expect(within(card).getByText('Pending')).toBeInTheDocument();
    expect(
      within(card).getByText(/waiting for organizer approval/i),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: /cancel application/i }),
    ).toBeInTheDocument();
  });

  test('approved status card shows helper copy and leave action', () => {
    render(
      <MemoryRouter>
        <ApplyButton
          eventId={1}
          isOwner={false}
          visibility="live"
          myApplication={{ id: 5, status: 'approved' }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('application-status-card');
    expect(within(card).getByText('Approved')).toBeInTheDocument();
    expect(within(card).getByText(/you.?re in/i)).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: /leave event/i }),
    ).toBeInTheDocument();
  });

  test('rejected status card has no leave or cancel action', () => {
    render(
      <MemoryRouter>
        <ApplyButton
          eventId={1}
          isOwner={false}
          visibility="live"
          myApplication={{ id: 5, status: 'rejected' }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('application-status-card');
    expect(within(card).getByText('Rejected')).toBeInTheDocument();
    expect(within(card).getByText(/cannot reapply/i)).toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: /cancel application/i }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: /leave event/i }),
    ).not.toBeInTheDocument();
  });

  test('apply CTA is full width in empty state container', () => {
    render(
      <MemoryRouter>
        <ApplyButton eventId={1} isOwner={false} visibility="live" myApplication={null} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /^apply$/i });
    expect(btn.className).toMatch(/\bw-full\b/);
  });
```

Ensure `within` is imported from `@testing-library/react` if not already.

Update the existing rejected test if it becomes redundant — keep one rejected coverage path (either the new card test or the old one; prefer the new card test and delete duplicate assertions from the old test, or leave both if both still pass).

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npm test -- src/test/applications.test.tsx`

Expected: FAIL — missing `application-status-card` and/or helper copy.

- [ ] **Step 3: Implement status card in ApplyButton**

Replace the `if (application) { ... }` branch and empty Apply branch with the following structure (handlers and hooks above stay the same):

```tsx
  const STATUS_HELP: Record<ApplicationStatus, string> = {
    pending: 'Waiting for organizer approval.',
    approved: "You're in — see you on the court.",
    rejected: 'You cannot reapply to this event.',
  };

  const STATUS_CARD: Record<ApplicationStatus, string> = {
    pending:
      'border-amber-500/30 bg-amber-50 text-navy dark:bg-amber-950/35 dark:text-amber-50',
    approved:
      'border-cobalt/25 bg-sky-tint text-navy dark:bg-sky-tint/20',
    rejected:
      'border-border bg-ice text-navy',
  };

  if (application) {
    const canWithdraw =
      application.status === 'pending' || application.status === 'approved';

    return (
      <div className="w-full space-y-2">
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <div
          data-testid="application-status-card"
          className={[
            'flex w-full flex-col gap-3 rounded-[var(--radius-card)] border p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4',
            STATUS_CARD[application.status],
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Your status
              </span>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-sm leading-snug text-navy/90 dark:text-navy">
              {STATUS_HELP[application.status]}
            </p>
          </div>
          {canWithdraw ? (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy shadow-soft transition hover:border-cobalt hover:bg-ice sm:w-auto"
            >
              {application.status === 'pending' ? 'Cancel application' : 'Leave event'}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleApply}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-electric"
      >
        Apply
      </button>
    </div>
  );
```

Move `STATUS_HELP` / `STATUS_CARD` to module scope (outside the component) to avoid recreating objects each render:

```tsx
const STATUS_HELP: Record<ApplicationStatus, string> = {
  pending: 'Waiting for organizer approval.',
  approved: "You're in — see you on the court.",
  rejected: 'You cannot reapply to this event.',
};

const STATUS_CARD_CLASS: Record<ApplicationStatus, string> = {
  pending:
    'border-amber-500/30 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/40',
  approved: 'border-cobalt/25 bg-sky-tint dark:border-cobalt/30 dark:bg-sky-tint/25',
  rejected: 'border-border bg-ice',
};
```

- [ ] **Step 4: Run ApplyButton + event-detail tests**

Run: `npm test -- src/test/applications.test.tsx src/test/event-detail.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ApplyButton.tsx src/test/applications.test.tsx
git commit -m "feat: application status card for event detail CTA"
```

---

### Task 2: Sticky CTA wrapper polish + full verification

**Files:**
- Modify: `src/pages/Events/EventDetailPage.tsx` (only if sticky region needs spacing for the card)
- Test: full suite

**Interfaces:**
- Consumes: ApplyButton from Task 1
- Produces: sticky region that frames the card cleanly on mobile

- [ ] **Step 1: Adjust sticky wrapper spacing**

In `EventDetailPage.tsx`, update the sticky CTA classes so the card has comfortable vertical padding:

From:

```tsx
className={[
  'fixed inset-x-0 bottom-0 z-30 border-t border-border px-4 px-safe pt-3 glass-panel',
  'pb-safe-max-3',
  'md:static md:z-auto md:mb-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none',
].join(' ')}
```

To:

```tsx
className={[
  'fixed inset-x-0 bottom-0 z-30 border-t border-border px-4 px-safe pt-3 glass-panel',
  'pb-safe-max-3',
  'md:static md:z-auto md:mb-6 md:border-0 md:bg-transparent md:p-0 md:pt-0 md:shadow-none md:backdrop-blur-none',
].join(' ')}
```

Inner container — ensure full width card:

```tsx
<div className="mx-auto w-full max-w-3xl md:mx-0">
  <ApplyButton ... />
</div>
```

If `pb-28` on the article is too tight for the taller card, bump mobile bottom padding:

```tsx
<article className={`relative mx-auto max-w-3xl ${showApplyChrome ? 'pb-36 md:pb-8' : 'pb-8'}`}>
```

Use `pb-36` only if the sticky card is taller; verify visually that content is not hidden behind the bar.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: all PASS

- [ ] **Step 3: Lint + typecheck build**

Run: `npm run lint`  
Run: `npm run build`

Expected: no new errors from these changes

- [ ] **Step 4: Commit if EventDetailPage changed**

```bash
git add src/pages/Events/EventDetailPage.tsx
git commit -m "fix: space event detail sticky CTA for status card"
```

If no page changes were needed, skip commit.

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Status card for pending/approved/rejected | Task 1 |
| Exact helper copy | Task 1 constants |
| Cancel / Leave labels unchanged | Task 1 |
| Apply full-width primary | Task 1 |
| Sticky mobile + static md | Existing wrapper + Task 2 |
| Reuse StatusBadge; no global badge restyle | Task 1 |
| No API / modal changes | Global constraints |
| Tests for structure + behavior | Task 1 + Task 2 |

No placeholders. Class names and testids are consistent (`application-status-card`).
