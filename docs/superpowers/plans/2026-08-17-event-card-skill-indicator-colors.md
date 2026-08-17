# Event Card Skill Indicator Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Color-code skill level badges on event cards (ski-trail classic) via a shared `SKILL_BADGE_CLASS` map used by both pills on `EventCard`.

**Architecture:** Export a `Record<SkillLevel, string>` of Tailwind classes from `eventLabels.ts` next to `SKILL_LABEL`. `EventCard` applies those classes to the photo overlay skill badge and the body skill chip. Labels stay text-only; colors carry the difficulty signal.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library

## Global Constraints

- Scope: `EventCard` only (not Event detail, filters, or profile)
- Colors: beginner green · intermediate blue · advanced near-black + red border · all_levels neutral
- Both skill pills on the card must use the map
- Event type chip and distance badge styling unchanged
- No new dependencies; Tailwind utilities only
- Keep existing `SKILL_LABEL` copy unchanged

## File Structure

| File | Role |
|------|------|
| `src/events/eventLabels.ts` | Add `SKILL_BADGE_CLASS` (and optional `SKILL_BADGE_OVERLAY_CLASS` if overlay needs frosted modifiers) |
| `src/components/EventCard.tsx` | Apply skill badge classes to both skill spans |
| `src/test/eventLabels.test.ts` | Unit tests for class map keys and distinctive tokens |
| `src/test/EventCard.test.tsx` | Component tests that skill badges include level-specific classes |

---

### Task 1: Shared skill badge class map

**Files:**
- Modify: `src/events/eventLabels.ts`
- Modify: `src/test/eventLabels.test.ts`

**Interfaces:**
- Consumes: `SkillLevel` from `src/api/types.ts`
- Produces:
  - `SKILL_BADGE_CLASS: Record<SkillLevel, string>` — solid body-chip styles
  - `SKILL_BADGE_OVERLAY_CLASS: Record<SkillLevel, string>` — frosted overlay variants (same hues)

- [ ] **Step 1: Write the failing test**

Append to `src/test/eventLabels.test.ts`:

```ts
import {
  SKILL_LABEL,
  SKILL_BADGE_CLASS,
  SKILL_BADGE_OVERLAY_CLASS,
  TYPE_LABEL,
  formatEventPlace,
  formatEventWhen,
} from '../events/eventLabels';
import type { SkillLevel } from '../api/types';

// inside describe('eventLabels', ...):

test('SKILL_BADGE_CLASS covers every skill with distinctive colors', () => {
  const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'all_levels'];
  for (const level of levels) {
    expect(SKILL_BADGE_CLASS[level]).toBeTruthy();
    expect(SKILL_BADGE_OVERLAY_CLASS[level]).toBeTruthy();
  }

  expect(SKILL_BADGE_CLASS.beginner).toMatch(/emerald/);
  expect(SKILL_BADGE_CLASS.intermediate).toMatch(/blue/);
  expect(SKILL_BADGE_CLASS.advanced).toMatch(/slate-900|zinc-900|neutral-900/);
  expect(SKILL_BADGE_CLASS.advanced).toMatch(/red/);
  expect(SKILL_BADGE_CLASS.all_levels).toMatch(/ice|muted|slate/);

  expect(SKILL_BADGE_OVERLAY_CLASS.beginner).toMatch(/emerald/);
  expect(SKILL_BADGE_OVERLAY_CLASS.beginner).toMatch(/backdrop-blur/);
  expect(SKILL_BADGE_OVERLAY_CLASS.advanced).toMatch(/red/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/eventLabels.test.ts`

Expected: FAIL — `SKILL_BADGE_CLASS` / `SKILL_BADGE_OVERLAY_CLASS` not exported

- [ ] **Step 3: Write minimal implementation**

In `src/events/eventLabels.ts`, after `SKILL_LABEL`:

```ts
/** Body chip: solid ski-trail skill colors */
export const SKILL_BADGE_CLASS: Record<SkillLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'border border-red-500/70 bg-slate-900 text-white',
  all_levels: 'bg-ice text-muted',
};

/** Photo overlay: same hues, frosted for photo readability */
export const SKILL_BADGE_OVERLAY_CLASS: Record<SkillLevel, string> = {
  beginner: 'border border-emerald-200/60 bg-emerald-100/80 text-emerald-900 backdrop-blur-md',
  intermediate: 'border border-blue-200/60 bg-blue-100/80 text-blue-900 backdrop-blur-md',
  advanced: 'border border-red-500/70 bg-slate-900/85 text-white backdrop-blur-md',
  all_levels: 'border border-white/40 bg-white/70 text-navy backdrop-blur-md',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/eventLabels.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/events/eventLabels.ts src/test/eventLabels.test.ts
git commit -m "feat: add ski-trail SKILL_BADGE_CLASS maps for event skill levels"
```

---

### Task 2: Apply skill colors on EventCard

**Files:**
- Modify: `src/components/EventCard.tsx`
- Create: `src/test/EventCard.test.tsx`

**Interfaces:**
- Consumes: `SKILL_BADGE_CLASS`, `SKILL_BADGE_OVERLAY_CLASS`, `SKILL_LABEL` from `../events/eventLabels`
- Produces: EventCard skill spans include level-specific class tokens

- [ ] **Step 1: Write the failing test**

Create `src/test/EventCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import EventCard from '../components/EventCard';
import type { EventItem, SkillLevel } from '../api/types';
import { SKILL_BADGE_CLASS, SKILL_BADGE_OVERLAY_CLASS } from '../events/eventLabels';

const base = (skill_level: SkillLevel): EventItem => ({
  id: 1,
  title: 'Sunday Open Play',
  description: 'x',
  event_type: 'open_play',
  skill_level,
  barangay: 'Malabanias',
  city: 'Angeles City',
  starts_at: '2026-08-20T18:00:00+08:00',
  photo_url: null,
  visibility: 'live',
  is_owner: false,
  my_application: null,
  created_by: { id: 2, name: 'Org' },
});

describe('EventCard skill badges', () => {
  test.each([
    ['beginner', 'Beginner'],
    ['intermediate', 'Intermediate'],
    ['advanced', 'Advanced'],
    ['all_levels', 'All levels'],
  ] as const)('applies %s colors to both skill badges', (level, label) => {
    render(
      <MemoryRouter>
        <EventCard event={base(level)} />
      </MemoryRouter>,
    );

    const badges = screen.getAllByText(label);
    expect(badges).toHaveLength(2);

    const bodyClass = SKILL_BADGE_CLASS[level];
    const overlayClass = SKILL_BADGE_OVERLAY_CLASS[level];

    // One badge is overlay (has backdrop-blur), one is body
    const classes = badges.map((el) => el.className);
    expect(classes.some((c) => c.includes(overlayClass.split(' ')[0]))).toBe(true);
    expect(classes.some((c) => bodyClass.split(' ').every((token) => c.includes(token)))).toBe(true);
  });
});
```

Note: If the “every token” check is brittle with shared layout classes, simplify to distinctive tokens only:

```ts
expect(classes.some((c) => c.includes('backdrop-blur') && c.match(/emerald|blue|slate-900|white\/70/))).toBe(true);
// and for body:
expect(classes.some((c) => !c.includes('backdrop-blur') && /* level token */)).toBe(true);
```

Prefer asserting full map strings are substrings of `className` when the component concatenates them intact:

```ts
expect(badges.some((el) => el.className.includes(SKILL_BADGE_OVERLAY_CLASS[level]))).toBe(true);
expect(badges.some((el) => el.className.includes(SKILL_BADGE_CLASS[level]))).toBe(true);
```

Use that last form in the actual test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/EventCard.test.tsx`

Expected: FAIL — skill spans lack map classes (still neutral/frosted white)

- [ ] **Step 3: Write minimal implementation**

Update `src/components/EventCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import {
  SKILL_BADGE_CLASS,
  SKILL_BADGE_OVERLAY_CLASS,
  SKILL_LABEL,
  TYPE_LABEL,
  formatEventPlace,
  formatEventWhen,
} from '../events/eventLabels';

export default function EventCard({ event }: { event: EventItem }) {
  const place = formatEventPlace(event.barangay, event.city);
  const when = formatEventWhen(event.starts_at);
  const skillLabel = SKILL_LABEL[event.skill_level];
  const skillBodyClass = SKILL_BADGE_CLASS[event.skill_level];
  const skillOverlayClass = SKILL_BADGE_OVERLAY_CLASS[event.skill_level];

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-sky-tint via-electric/30 to-cobalt">
        {event.photo_url ? (
          <img
            src={event.photo_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>
            🏐
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${skillOverlayClass}`}
        >
          {skillLabel}
        </span>
        {event.distance_km !== undefined && (
          <span className="absolute bottom-3 left-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-medium text-white">
            {event.distance_km} km away
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-display text-lg font-bold text-navy group-hover:text-cobalt">
          {event.title}
        </h2>
        <p className="text-sm text-muted">{when}</p>
        <p className="text-sm text-muted">{place}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <span className="rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text">
            🏐 {TYPE_LABEL[event.event_type]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${skillBodyClass}`}>
            {skillLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
```

Do not change the type chip or distance badge.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/EventCard.test.tsx src/test/eventLabels.test.ts src/test/discovery.test.tsx`

Expected: PASS (discovery still finds cards by title/filters)

- [ ] **Step 5: Lint**

Run: `npm run lint`

Expected: no new issues in touched files

- [ ] **Step 6: Commit**

```bash
git add src/components/EventCard.tsx src/test/EventCard.test.tsx
git commit -m "feat: color event card skill badges by ski-trail difficulty"
```

---

### Task 3: Full verification

**Files:**
- None (verify only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests PASS

- [ ] **Step 2: Typecheck/build**

Run: `npm run build`

Expected: exit 0

- [ ] **Step 3: Manual smoke (if dev server available)**

Run: `npm run dev` — open events list; confirm beginner green, intermediate blue, advanced black/red, all_levels neutral on both badges.

- [ ] **Step 4: Final commit only if uncommitted fixes remain**

```bash
git status
# commit only if Task 3 produced code fixes
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Beginner green | Task 1 map + Task 2 apply |
| Intermediate blue | Task 1 + 2 |
| Advanced black + red accent | Task 1 + 2 |
| All levels neutral | Task 1 + 2 |
| Both badges on EventCard | Task 2 |
| Shared map in eventLabels | Task 1 |
| Type chip / distance unchanged | Task 2 (left as-is) |
| No new deps | All tasks |
| Tests | Task 1 unit, Task 2 component, Task 3 suite |
