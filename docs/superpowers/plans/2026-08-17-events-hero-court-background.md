# Events Hero Court Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put `public/courtwball.jpg` behind the Events page hero with a dark overlay and light text so the court photo reads as on-brand without hurting readability.

**Architecture:** Keep the existing hero content and layout in `EventsPage`. Wrap it in a contained card that uses CSS `background-image` (`/courtwball.jpg`), `bg-cover` / `bg-center`, and a dark navy gradient overlay. Switch kicker/title/subtitle to light colors; keep the cobalt “Find a game” CTA. No new components or dependencies.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest + Testing Library, Vite public assets

## Global Constraints

- Asset path must be `/courtwball.jpg` (file already at `public/courtwball.jpg`).
- Scope is the Events page hero only — do not change filters, weather strip, event list, or cards.
- Background is decorative (no meaningful image alt / no announcing the photo).
- Prefer existing Tailwind utilities and design tokens (`--radius-card`, cobalt, navy).
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-17-events-hero-court-background-design.md`

---

## File map

| File | Role |
|------|------|
| `public/courtwball.jpg` | Existing asset (ensure tracked if still untracked) |
| `src/pages/Events/EventsPage.tsx` | Hero markup/classes only (~lines 370–389) |
| `src/test/discovery.test.tsx` | Add hero background assertion; keep existing discovery tests green |
| `src/index.css` | Touch only if a tiny utility is needed for multi-layer bg; prefer pure Tailwind first |

---

### Task 1: Hero court background on EventsPage

**Files:**
- Modify: `src/pages/Events/EventsPage.tsx` (hero block ~370–389)
- Modify: `src/test/discovery.test.tsx`
- Ensure tracked: `public/courtwball.jpg` (if still untracked at commit time)
- Optional modify: `src/index.css` only if Tailwind cannot express the layered background cleanly

**Interfaces:**
- Consumes: existing `mode`, `focusSearch`, hero copy strings
- Produces: hero region with `data-testid="events-hero"` and background using `/courtwball.jpg`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('EventsPage', …)` in `src/test/discovery.test.tsx` (reuse the same geolocation + `nearbyEvents` stubs as the first test so the page settles):

```tsx
test('hero uses court photo background', async () => {
  stubGeolocation((success) =>
    success({ coords: { latitude: 15.1395, longitude: 120.5877 } } as GeolocationPosition),
  );
  vi.mocked(discoveryApi.nearbyEvents).mockResolvedValue({
    data: [event({ distance_km: 2.4 })],
    links: { first: null, last: null, prev: null, next: null },
    meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
  });

  render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>,
  );

  const hero = await screen.findByTestId('events-hero');
  expect(hero).toBeInTheDocument();
  expect(hero.className).toMatch(/courtwball|bg-\[url/);
  // Inline style fallback if implementation uses style.backgroundImage
  const bg =
    hero.style.backgroundImage ||
    getComputedStyle(hero).backgroundImage ||
    hero.className;
  expect(String(bg)).toMatch(/courtwball\.jpg/);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /find a game/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/discovery.test.tsx`

Expected: FAIL — `events-hero` not found (or background assertion fails).

- [ ] **Step 3: Implement hero background**

Replace the hero wrapper in `EventsPage.tsx` (the block that currently starts with `<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">`) with:

```tsx
<div
  data-testid="events-hero"
  className="relative overflow-hidden rounded-[var(--radius-card)] border border-border shadow-soft"
  style={{
    backgroundImage: [
      'linear-gradient(120deg, rgb(15 23 42 / 0.82) 0%, rgb(15 23 42 / 0.68) 45%, rgb(15 23 42 / 0.55) 100%)',
      'url(/courtwball.jpg)',
    ].join(', '),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  <div className="relative z-10 flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-8">
    <div>
      <p className="mb-1 text-sm font-medium tracking-wider text-white/75">
        📍 VOLLEYBALL HUB
      </p>
      <h1 className="font-display text-6xl font-extrabold tracking-tight text-white">
        {mode === 'nearby' ? 'Games Near\u00A0You' : 'Events in Pampanga'}
      </h1>
      <p className="mt-1 text-sm text-white/80">
        Explore nearby games, leagues, and camps. Tap to get on&nbsp;court.
      </p>
    </div>
    <button
      type="button"
      onClick={focusSearch}
      className="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      Find a game
    </button>
  </div>
</div>
```

Notes:
- Do not change filters, weather, or list sections below.
- Keep title copy and `focusSearch` behavior identical.
- If `style` is undesirable, equivalent Tailwind arbitrary values are fine as long as the test still sees `courtwball.jpg` on the hero node (class or style).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/discovery.test.tsx`

Expected: all tests in that file PASS, including `hero uses court photo background`.

- [ ] **Step 5: Lint / typecheck smoke**

Run: `npm run lint`  
Run: `npm run build`  
Expected: no new errors from the hero change.

- [ ] **Step 6: Commit**

```bash
git add public/courtwball.jpg src/pages/Events/EventsPage.tsx src/test/discovery.test.tsx
git commit -m "feat: court photo background on events hero"
```

Only stage the files above (plus `src/index.css` if you had to touch it). Do not bundle unrelated working-tree changes.

---

## Self-review (plan vs spec)

| Spec requirement | Task coverage |
|------------------|---------------|
| `/courtwball.jpg` as hero background | Task 1 Step 3 |
| Contained rounded card, not full-bleed | Task 1 Step 3 classes |
| Dark navy gradient overlay ~60–75% | Task 1 Step 3 gradient stops |
| Light text on hero | Task 1 Step 3 text classes |
| Cobalt CTA retained | Task 1 Step 3 button |
| Filters/list unchanged | Explicit non-touch note |
| Decorative bg / a11y focus | No alt; focus ring on CTA |
| Test coverage | Task 1 Steps 1–4 |

No placeholders. Single task — one testable deliverable.
