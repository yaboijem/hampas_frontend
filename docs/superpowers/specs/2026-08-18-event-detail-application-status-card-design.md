# Event Detail — Application Status Card

**Date:** 2026-08-18  
**Status:** Approved for planning  
**Product:** Hampas frontend (React + Vite + Tailwind)

## Goal

Make the Event Detail application status and Leave/Cancel controls clearer and more appealing on mobile and desktop, without changing apply/cancel API behavior.

## Problem

Today `ApplyButton` shows a small `StatusBadge` beside a plain border button in a flex wrap. On desktop it looks sparse and left-aligned; on mobile the sticky bar feels like a raw control row rather than a clear “your status” moment.

## Decision

**Approach:** Application status card inside `ApplyButton` (single component owns all applicant CTA states).

- Mobile: remains inside the existing sticky glass CTA region (`event-sticky-cta`).
- Desktop (`md+`): same card, static (existing sticky → static wrapper behavior).
- No new routes, APIs, or status values.

## Scope

### In scope

- Visual redesign of applicant states in `ApplyButton`:
  - No application → primary **Apply**
  - Pending → status card + **Cancel application**
  - Approved → status card + **Leave event**
  - Rejected → status card, no action (cannot reapply message)
- Sticky wrapper polish on `EventDetailPage` only as needed for card padding/spacing.
- Tests: keep sticky CTA / Apply / cancel behavior assertions green; extend if helpful for card structure.

### Out of scope

- Owner/admin manage tools (Edit / Manage applications / Delete)
- Report control, About, facts, contact icons
- New confirmation modals for leave/cancel (keep current one-click + toast unless product later asks)
- Changing `StatusBadge` global styles used on applications lists (may compose the badge inside the card; do not break other pages)

## UX copy

| Status | Badge label | Helper line |
|--------|-------------|-------------|
| pending | Pending | Waiting for organizer approval. |
| approved | Approved | You’re in — see you on the court. |
| rejected | Rejected | You cannot reapply to this event. |

Button labels stay:

- Pending → **Cancel application**
- Approved → **Leave event**
- None → **Apply**

Toasts and error handling remain as today.

## Visual design

### Status card (pending / approved / rejected)

- Container: rounded card (`--radius-card`), border, light surface tint by status:
  - **pending:** amber-tinted background + amber border (aligned with existing pending tokens)
  - **approved:** sky/cobalt tint + soft cobalt border
  - **rejected:** ice/muted surface + border-border
- Content:
  - Top/leading: `StatusBadge` (existing component) + helper line (`text-sm text-muted` or status-appropriate muted navy)
  - Action: secondary button — outline, min-height 44px (`min-h-11`), full width on narrow screens; auto width on `sm+` aligned end when row layout
- Layout:
  - Default (narrow): column — status block, then full-width button
  - `sm+`: row — status block flex-1, button shrink-0 aligned center/end
- Dark mode: use existing dark variants consistent with `StatusBadge` / amber banner patterns

### Apply (no application)

- Keep primary cobalt full-width button on mobile; `sm:w-auto` or full-width in sticky bar is fine — prefer **full width inside sticky/card width** on mobile for thumb reach; desktop may stay full width of content column or auto — **full width of the CTA container** for consistency with the status card.

### Sticky region (`EventDetailPage`)

- Keep `data-testid="event-sticky-cta"`, safe-area utilities, glass on mobile, static on `md+`.
- Ensure inner max-width and padding give the card breathing room (no edge-flush card on mobile beyond existing `px-4` / safe padding).

## Behavior (unchanged)

- Guest Apply → navigate to login with `from` location
- Apply → API `apply`, toast success/error, set local application
- Cancel/Leave → API `cancelApplication`, toast, clear local application
- Owner / non-live → component returns null (page may not show sticky chrome)

## Files

| Path | Role |
|------|------|
| `src/components/ApplyButton.tsx` | Status card + Apply UI |
| `src/pages/Events/EventDetailPage.tsx` | Sticky wrapper spacing only if needed |
| `src/components/StatusBadge.tsx` | Reuse as-is unless tiny a11y/class hooks needed |
| `src/test/event-detail.test.tsx` and/or apply-focused tests | Regression + optional card copy |

## Testing

- Existing event-detail sticky CTA and Apply button tests pass.
- With `my_application: pending` / `approved`, UI shows helper copy and correct button label.
- Rejected shows message, no cancel button.
- Cancel still calls API and clears status (existing or new unit test on `ApplyButton` if present).

## Non-goals

- Redesign entire Event Detail page
- Per-device layouts beyond responsive card stacking
- Changing application business rules
