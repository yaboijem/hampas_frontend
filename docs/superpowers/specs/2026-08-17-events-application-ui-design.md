# Events Application UI — Design

**Date:** 2026-08-17  
**Status:** Approved for planning  
**Scope:** UI/UX polish only (match existing Hampas design system)

## Problem

Player and organizer application surfaces still look like scaffold HTML (`border p-4`, plain “Loading…”, raw status strings, green-700/red-700 action blocks). Event list, event detail, Apply CTA, and profile already use design tokens (`font-display`, `navy`/`cobalt`, `radius-card`, `shadow-soft`, skeletons, empty states). Applications feel inconsistent and lower trust.

## Goals

- Bring **My Applications** and **Manage Applications** up to the same visual language as Event detail / Events list.
- Improve scanability, empty/loading states, and status labeling without changing product rules or APIs.
- Keep application tests stable via role/name selectors where possible.

## Non-goals

- Filters, tabs, bulk approve/reject, application counts, or new API fields.
- Redesign of Events list, Event detail, create/edit forms, or ApplyButton behavior (except incidental StatusBadge consumers).
- Confirm dialogs, optimistic UI, or new motion systems.
- PRODUCT.md / full rebrand (offer `$impeccable init` later if desired).

## Approach

**A — Surface polish only:** restyle the two application pages and `StatusBadge` using incumbent tokens and patterns. No shared row abstraction unless duplication becomes obvious during implementation (YAGNI).

## Surfaces in scope

| Surface | Route | Role |
|---|---|---|
| My Applications | `/me/applications` | Player: list own applications, cancel pending |
| Manage Applications | `/events/:id/applications` | Organizer: list applicants, approve/reject pending |
| StatusBadge | shared | pending / approved / rejected chip |

## Visual design

### Page shell (both)

- Content width: `mx-auto max-w-3xl` with page padding consistent with Event detail.
- Title: `font-display`, bold, `text-navy`, ~`text-2xl`–`text-3xl`.
- Optional one-line muted subtitle:
  - My Applications: “Events you’ve applied to”
  - Manage Applications: “Review who wants to join”
- Manage Applications: back control “← Back to event” linking to `/events/:id` (same chip/back pattern as Event detail’s “Back to events”).

### Loading

- Replace plain “Loading…” with 3–4 skeleton **rows** (card-shaped shimmer blocks: title bar + badge stub).
- Use existing `.skeleton-shimmer` utility.

### List rows

- Card chrome: `rounded-[var(--radius-card)] border border-border bg-surface shadow-soft` with comfortable padding (`p-4`).
- Layout: horizontal on wider viewports (`justify-between`); wrap on small screens so actions never collapse under ~44px touch targets (`min-h-11` on buttons).
- Spacing between rows: `space-y-3` (or equivalent gap).

### My Applications row

- Primary: event title as `Link` to `/events/:id` (semibold; hover underline or cobalt).
- Secondary meta: event start time. Prefer reusing `formatEventWhen` from `src/events/eventLabels.ts` when straightforward; otherwise keep readable `toLocaleString` equivalent.
- Trailing: `StatusBadge` + **Cancel** when `status === 'pending'`.
- Cancel button style: outline control matching ApplyButton cancel (`border-border bg-surface`, muted → navy hover). Not a primary cobalt button.

### Manage Applications row

- Primary: applicant `user.name` (semibold).
- Trailing: `StatusBadge`.
- When pending:
  - **Approve:** primary cobalt control (solid, white text, `shadow-soft`, hover electric) — not raw `bg-green-700`.
  - **Reject:** danger outline matching Event detail Delete (`border-red-300`, red text, light red hover) — not solid `bg-red-700` block (hierarchy: one strong positive action, secondary reject).

### StatusBadge

- Human labels (not raw enum strings):
  - `pending` → “Pending”
  - `approved` → “Approved”
  - `rejected` → “Rejected”
- Shape: pill (`rounded-full`), compact type.
- Semantic colors retained (amber / green / red tints readable in light mode; ensure contrast remains acceptable). Color is not the only status cue — full word label required.
- Consumers (`ApplyButton`, both pages) should need no API change beyond optional class polish.

### Empty states

- Centered dashed-border card (`border-dashed border-border bg-surface`), short message.
- My Applications: “You have not applied to any events yet.” + CTA button/link **Browse events** → `/events` (cobalt primary style).
- Manage Applications: “No applications yet.” + rely on back link; no fake CTA.

### Errors

- `role="alert"` panel consistent with Events page (red border/bg, readable text).
- Manage Applications: keep list load error handling; wrap approve/reject in try/catch and surface failures (today decide path can fail silently).

## Behavior (unchanged product rules)

- Data sources remain `myApplications`, `cancelApplication`, `listEventApplications`, `approveApplication`, `rejectApplication`.
- Reload list after successful cancel / approve / reject.
- No confirm dialogs for cancel, approve, or reject.
- No new loading disable on buttons required (keep parity with current ApplyButton simplicity) unless a one-line `disabled` during in-flight is trivial and improves double-submit safety — optional, not required.

## Accessibility

- Single page `h1` per page.
- Buttons keep accessible names: “Cancel”, “Approve”, “Reject” (tests use these).
- Links and buttons keyboard operable; rely on global focus styles.
- Status never color-only.

## Testing

- Primary file: `src/test/applications.test.tsx`.
- Prefer updating only if structure breaks `getByRole` / text queries.
- Do not rename Approve/Reject/Cancel labels without updating tests in the same change.
- Run existing applications tests after UI changes.

## Files to change

1. `src/pages/Applications/MyApplicationsPage.tsx`
2. `src/pages/Applications/EventApplicationsPage.tsx`
3. `src/components/StatusBadge.tsx`
4. `src/test/applications.test.tsx` (only if needed)

## Out of file scope (do not expand)

- `EventDetailPage.tsx`, `EventsPage.tsx`, `EventCard.tsx`, `ApplyButton.tsx` (unless StatusBadge forces a trivial import/type touch)
- Backend seeders, routes, or application API contracts

## Success criteria

- [ ] Both application pages use design tokens and card rows consistent with Event detail.
- [ ] StatusBadge shows Pending / Approved / Rejected with pill styling.
- [ ] Loading uses skeletons; empty states use dashed cards; Manage has back link.
- [ ] Approve = cobalt primary; Reject/Cancel = secondary/outline patterns above.
- [ ] No API or route changes.
- [ ] `applications` tests pass.
