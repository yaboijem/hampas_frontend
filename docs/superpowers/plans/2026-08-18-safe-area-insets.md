# Safe-Area Insets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep interactive UI clear of Dynamic Island / notch / home indicator on notched phones via `viewport-fit=cover` and shared CSS safe-area utilities applied across the app shell and fixed chrome.

**Architecture:** Enable non-zero `env(safe-area-inset-*)` with `viewport-fit=cover`. Define shared utilities in `src/index.css`. Apply them to sticky header, main content, fixed floating UI, bottom sheets/modals, onboarding chrome, and the notifications panel. Glass backgrounds stay edge-to-edge; padding protects content. No JS layout metrics.

**Tech Stack:** React 19, Vite, Tailwind 4 (`@import "tailwindcss"` + `@layer utilities`), Vitest, Testing Library, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-18-safe-area-insets-design.md`

## Global Constraints

- No new npm dependencies.
- No device UA sniffing and no React context / `visualViewport` listeners for insets.
- Always use `env(safe-area-inset-*, 0px)` with the `0px` fallback.
- Compose with existing padding via `max(base, env(...))` or `calc(base + env(...))` so non-notch devices keep current spacing.
- Where mobile-only fixed chrome becomes static at `md+` (event sticky CTA), safe-area classes must not leave extra empty desktop space (rely on zero insets and/or existing `md:` resets).
- Do not redesign breakpoints, navigation structure, or copy.
- Do not commit unrelated dirty working-tree files (favicons, onboarding WIP, etc.) — stage only files listed in each task.
- Follow existing test patterns: Vitest + Testing Library; assert `className` / `toHaveClass` where CSS env cannot be simulated in jsdom.

## File structure

| Path | Role |
|------|------|
| `index.html` | Viewport meta: add `viewport-fit=cover` |
| `public/offline.html` | Same viewport meta |
| `src/index.css` | Shared safe-area utility classes |
| `src/components/AppHeader.tsx` | Sticky header top + horizontal safe padding |
| `src/App.tsx` | Main horizontal safe padding |
| `src/components/ToastHost.tsx` | Top/right safe offsets |
| `src/components/InstallPrompt.tsx` | Bottom/right safe offsets |
| `src/pages/Events/EventDetailPage.tsx` | Sticky apply bar uses shared bottom utility |
| `src/components/DeleteEventModal.tsx` | Overlay padding respects safe areas |
| `src/pages/Applications/EventApplicationsPage.tsx` | Applicant detail sheet overlay same |
| `src/components/ReportModal.tsx` | Centered modal overlay safe padding |
| `src/components/OnboardingGate.tsx` | Full-screen chrome top/bottom safe |
| `src/components/NotificationsBell.tsx` | Mobile fixed panel top/max-height safe |
| `src/test/safe-area.test.tsx` | Class / markup contract tests |
| `src/test/event-detail.test.tsx` | Existing sticky CTA tests still pass |
| `src/test/smoke.test.tsx` | Shell still renders |

---

### Task 1: Viewport meta + safe-area CSS utilities

**Files:**
- Modify: `index.html`
- Modify: `public/offline.html`
- Modify: `src/index.css` (inside existing `@layer utilities { ... }` block, near the top of that layer before `.brand-ball`)
- Create: `src/test/safe-area.test.tsx`

**Interfaces:**
- Consumes: none
- Produces CSS class names (exact):
  - `pt-safe` → `padding-top: env(safe-area-inset-top, 0px)`
  - `pb-safe` → `padding-bottom: env(safe-area-inset-bottom, 0px)`
  - `px-safe` → left/right `env(safe-area-inset-*, 0px)`
  - `pb-safe-max-3` → `padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))`
  - `p-safe-max-4` → all sides `max(1rem, env(...))`
  - `px-header-safe` → horizontal `max(0.75rem, env(...))`; at `min-width: 640px` base becomes `1.5rem`
  - `px-main-safe` → horizontal `max(1rem, env(...))`; at `min-width: 640px` base becomes `1.5rem`
  - `top-safe-offset-4` → `top: calc(1rem + env(safe-area-inset-top, 0px))`
  - `right-safe-offset-4` → `right: calc(1rem + env(safe-area-inset-right, 0px))`
  - `bottom-safe-offset-4` → `bottom: calc(1rem + env(safe-area-inset-bottom, 0px))`
  - `top-safe-below-header` → `top: calc(4.5rem + env(safe-area-inset-top, 0px))`
  - `max-h-safe-notif` → `max-height: min(24rem, calc(100dvh - 5.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))`

- [ ] **Step 1: Write the failing viewport contract test**

Create `src/test/safe-area.test.tsx`:

```tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('safe-area foundation', () => {
  test('index.html viewport enables cover fit for insets', () => {
    const html = read('index.html');
    expect(html).toMatch(/viewport-fit\s*=\s*cover/);
    expect(html).toMatch(/width\s*=\s*device-width/);
  });

  test('offline.html viewport enables cover fit for insets', () => {
    const html = read('public/offline.html');
    expect(html).toMatch(/viewport-fit\s*=\s*cover/);
  });

  test('index.css defines required safe-area utilities', () => {
    const css = read('src/index.css');
    for (const name of [
      'pt-safe',
      'pb-safe',
      'px-safe',
      'pb-safe-max-3',
      'p-safe-max-4',
      'px-header-safe',
      'px-main-safe',
      'top-safe-offset-4',
      'right-safe-offset-4',
      'bottom-safe-offset-4',
      'top-safe-below-header',
      'max-h-safe-notif',
    ]) {
      expect(css).toContain(`.${name}`);
    }
    expect(css).toContain('safe-area-inset-top');
    expect(css).toContain('safe-area-inset-bottom');
    expect(css).toContain('safe-area-inset-left');
    expect(css).toContain('safe-area-inset-right');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/safe-area.test.tsx`

Expected: FAIL — missing `viewport-fit=cover` and/or missing utility class names.

- [ ] **Step 3: Update viewport metas**

In `index.html`, replace:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

with:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

In `public/offline.html`, same replacement.

- [ ] **Step 4: Add utilities to `src/index.css`**

Inside `@layer utilities {`, **before** the `.brand-ball` block, insert:

```css
  /* Safe areas: Dynamic Island / notch / home indicator (env = 0 when unsupported) */
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
  }

  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .px-safe {
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }

  .pb-safe-max-3 {
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
  }

  .p-safe-max-4 {
    padding-top: max(1rem, env(safe-area-inset-top, 0px));
    padding-right: max(1rem, env(safe-area-inset-right, 0px));
    padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    padding-left: max(1rem, env(safe-area-inset-left, 0px));
  }

  .px-header-safe {
    padding-left: max(0.75rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.75rem, env(safe-area-inset-right, 0px));
  }

  .px-main-safe {
    padding-left: max(1rem, env(safe-area-inset-left, 0px));
    padding-right: max(1rem, env(safe-area-inset-right, 0px));
  }

  @media (min-width: 640px) {
    .px-header-safe {
      padding-left: max(1.5rem, env(safe-area-inset-left, 0px));
      padding-right: max(1.5rem, env(safe-area-inset-right, 0px));
    }

    .px-main-safe {
      padding-left: max(1.5rem, env(safe-area-inset-left, 0px));
      padding-right: max(1.5rem, env(safe-area-inset-right, 0px));
    }
  }

  .top-safe-offset-4 {
    top: calc(1rem + env(safe-area-inset-top, 0px));
  }

  .right-safe-offset-4 {
    right: calc(1rem + env(safe-area-inset-right, 0px));
  }

  .bottom-safe-offset-4 {
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }

  .top-safe-below-header {
    top: calc(4.5rem + env(safe-area-inset-top, 0px));
  }

  .max-h-safe-notif {
    max-height: min(
      24rem,
      calc(
        100dvh - 5.5rem - env(safe-area-inset-top, 0px) -
          env(safe-area-inset-bottom, 0px)
      )
    );
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/test/safe-area.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add index.html public/offline.html src/index.css src/test/safe-area.test.tsx
git commit -m "feat: add viewport-fit cover and safe-area CSS utilities"
```

---

### Task 2: App shell — header + main

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/App.tsx`
- Modify: `src/test/safe-area.test.tsx`
- Modify: `src/test/smoke.test.tsx` (only if assertions break; prefer keeping smoke green)

**Interfaces:**
- Consumes: `pt-safe`, `px-header-safe`, `px-main-safe` from Task 1
- Produces: header and main markup using those classes

- [ ] **Step 1: Extend failing shell class tests**

Append to `src/test/safe-area.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/storage';

// inside describe or new describe('safe-area shell'):
describe('safe-area shell', () => {
  test('header and main use safe-area utilities', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: /main/i });
    const header = nav.closest('header');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/\bpt-safe\b/);
    expect(nav.className).toMatch(/\bpx-header-safe\b/);

    const main = document.querySelector('main');
    expect(main).toBeTruthy();
    expect(main!.className).toMatch(/\bpx-main-safe\b/);
    // base horizontal padding comes from px-main-safe (max with 1rem / 1.5rem)
    expect(main!.className).not.toMatch(/\bpx-4\b/);
    expect(main!.className).not.toMatch(/\bsm:px-6\b/);
  });
});
```

Keep vertical main padding: `py-6 sm:py-8`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/safe-area.test.tsx`

Expected: FAIL — header/main missing safe classes.

- [ ] **Step 3: Apply classes**

`AppHeader.tsx` — change header and nav:

```tsx
<header className="sticky top-0 z-40 border-b border-border glass-panel pt-safe">
  <nav
    className="mx-auto flex max-w-6xl items-center gap-2 px-header-safe py-3 sm:gap-3"
    aria-label="Main"
  >
```

Remove prior `px-3` / `sm:px-6` on that nav (replaced by `px-header-safe`).

`App.tsx` — change main:

```tsx
<main className="mx-auto max-w-6xl px-main-safe py-6 sm:py-8">
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/safe-area.test.tsx src/test/smoke.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AppHeader.tsx src/App.tsx src/test/safe-area.test.tsx
git commit -m "feat: apply safe-area padding to header and main"
```

---

### Task 3: Fixed floating chrome (toast, install, event sticky CTA)

**Files:**
- Modify: `src/components/ToastHost.tsx`
- Modify: `src/components/InstallPrompt.tsx`
- Modify: `src/pages/Events/EventDetailPage.tsx`
- Modify: `src/test/safe-area.test.tsx`
- Test: `src/test/event-detail.test.tsx` (must stay green)

**Interfaces:**
- Consumes: `top-safe-offset-4`, `right-safe-offset-4`, `bottom-safe-offset-4`, `pb-safe-max-3`, `px-safe`
- Produces: floating UI class contracts

- [ ] **Step 1: Write failing component class tests**

Append to `src/test/safe-area.test.tsx`:

```tsx
import ToastHost from '../components/ToastHost';
import InstallPrompt from '../components/InstallPrompt';
import { act } from '@testing-library/react';
import { showToast } from '../lib/adminNotifications';

describe('safe-area floating chrome', () => {
  test('ToastHost offsets use safe-area utilities', () => {
    render(<ToastHost />);
    act(() => {
      showToast('Safe area toast');
    });
    const el = screen.getByRole('status');
    expect(el.className).toMatch(/\btop-safe-offset-4\b/);
    expect(el.className).toMatch(/\bright-safe-offset-4\b/);
    expect(el.className).not.toMatch(/\btop-4\b/);
    expect(el.className).not.toMatch(/\bright-4\b/);
  });

  test('InstallPrompt offsets use safe-area utilities when visible', () => {
    // Force visible: dispatch beforeinstallprompt with preventDefault stub
    const event = new Event('beforeinstallprompt') as Event & {
      preventDefault: () => void;
      prompt: () => Promise<void>;
    };
    event.preventDefault = () => {};
    event.prompt = async () => {};
    (window as unknown as { __hampasInstallEvent?: unknown }).__hampasInstallEvent = event;

    render(<InstallPrompt />);
    act(() => {
      window.dispatchEvent(event);
    });

    const text = screen.queryByText(/install hampas/i);
    if (!text) {
      // If component ignores synthetic event in this environment, skip soft:
      // prefer making InstallPrompt testable — see Step 3 note.
      expect(text).toBeTruthy();
      return;
    }
    const el = text.closest('div');
    expect(el!.className).toMatch(/\bbottom-safe-offset-4\b/);
    expect(el!.className).toMatch(/\bright-safe-offset-4\b/);
  });
});
```

Also add a focused assertion for event sticky CTA classes by reading the source file (stable without full page mock):

```tsx
test('EventDetail sticky CTA uses shared pb-safe-max-3', () => {
  const src = read('src/pages/Events/EventDetailPage.tsx');
  expect(src).toContain('pb-safe-max-3');
  expect(src).not.toMatch(/pb-\[max\(0\.75rem,\s*env\(safe-area-inset-bottom\)\)\]/);
});
```

If InstallPrompt is hard to open via event in jsdom, instead assert via source string the same way as EventDetail (prefer behavior test when possible; source contract is acceptable fallback for InstallPrompt only).

- [ ] **Step 2: Run test to verify failures**

Run: `npm test -- src/test/safe-area.test.tsx`

Expected: FAIL on missing classes / still using old pb arbitrary value.

- [ ] **Step 3: Implement**

`ToastHost.tsx` — replace `top-4 right-4` with:

```tsx
'fixed top-safe-offset-4 right-safe-offset-4 z-50 max-w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border px-4 py-3 text-sm font-medium text-white shadow-soft',
```

`InstallPrompt.tsx` — replace `bottom-4 right-4` with:

```tsx
className="fixed bottom-safe-offset-4 right-safe-offset-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-navy shadow-soft"
```

`EventDetailPage.tsx` — sticky CTA classes become:

```tsx
className={[
  'fixed inset-x-0 bottom-0 z-30 border-t border-border px-4 px-safe pt-3 glass-panel',
  'pb-safe-max-3',
  'md:static md:z-auto md:mb-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none',
].join(' ')}
```

Note: at `md:p-0` all padding including safe utilities is cleared on desktop static layout — correct.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/safe-area.test.tsx src/test/event-detail.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ToastHost.tsx src/components/InstallPrompt.tsx src/pages/Events/EventDetailPage.tsx src/test/safe-area.test.tsx
git commit -m "feat: safe-area offsets for toast, install prompt, sticky CTA"
```

---

### Task 4: Modals, onboarding, notifications panel

**Files:**
- Modify: `src/components/DeleteEventModal.tsx`
- Modify: `src/pages/Applications/EventApplicationsPage.tsx` (applicant detail overlay only)
- Modify: `src/components/ReportModal.tsx`
- Modify: `src/components/OnboardingGate.tsx`
- Modify: `src/components/NotificationsBell.tsx`
- Modify: `src/test/safe-area.test.tsx`
- Test: `src/test/onboarding.test.tsx` (must stay green)

**Interfaces:**
- Consumes: `p-safe-max-4`, `pt-safe`, `pb-safe-max-3` / `pb-safe`, `px-safe`, `top-safe-below-header`, `max-h-safe-notif`
- Produces: overlay and onboarding chrome clear of unsafe regions

- [ ] **Step 1: Write failing source/class contracts**

Append to `src/test/safe-area.test.tsx`:

```tsx
describe('safe-area overlays', () => {
  test('bottom-sheet style modals use p-safe-max-4 on scrim', () => {
    expect(read('src/components/DeleteEventModal.tsx')).toContain('p-safe-max-4');
    expect(read('src/pages/Applications/EventApplicationsPage.tsx')).toContain('p-safe-max-4');
    expect(read('src/components/ReportModal.tsx')).toContain('p-safe-max-4');
  });

  test('OnboardingGate pads chrome for safe areas', () => {
    const src = read('src/components/OnboardingGate.tsx');
    expect(src).toMatch(/pt-safe|p-safe-max-4/);
    expect(src).toMatch(/pb-safe|pb-safe-max-3|p-safe-max-4/);
  });

  test('NotificationsBell mobile panel accounts for header safe top', () => {
    const src = read('src/components/NotificationsBell.tsx');
    expect(src).toContain('top-safe-below-header');
    expect(src).toContain('max-h-safe-notif');
  });
});
```

- [ ] **Step 2: Run test to verify failures**

Run: `npm test -- src/test/safe-area.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement overlays**

**DeleteEventModal** scrim — replace `p-4` with `p-safe-max-4`:

```tsx
className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-safe-max-4 sm:items-center"
```

**EventApplicationsPage** applicant detail scrim — same:

```tsx
className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-safe-max-4 sm:items-center"
```

**ReportModal** outer:

```tsx
className="fixed inset-0 flex items-center justify-center bg-black/50 p-safe-max-4"
```

**OnboardingGate:**

1. Root shell keeps `fixed inset-0` (background may bleed). Add horizontal safe on interactive layers as needed.
2. Image slide copy block — ensure bottom clearance includes home indicator. Change `pb-24` / `sm:pb-28` composition by adding `pb-safe` **in addition** is wrong if it overrides. Prefer:

```tsx
className="onboarding-copy relative z-10 mt-auto flex flex-col gap-3 px-6 pt-16 sm:px-10 pb-[max(6rem,calc(6rem+env(safe-area-inset-bottom,0px)))] sm:pb-[max(7rem,calc(7rem+env(safe-area-inset-bottom,0px)))]"
```

Simpler approved approach: keep `pb-24 sm:pb-28` and add a wrapper utility only on the **bottom controls** bar:

Bottom controls (currently `px-5 py-5 sm:px-10`):

```tsx
className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-5 px-safe pt-5 pb-safe-max-3 sm:px-10"
```

(`pb-safe-max-3` = max(0.75rem, inset); if visual needs more air, use inline max with 1.25rem — prefer adding utility `pb-safe-max-5` only if design looks tight: `max(1.25rem, env(...))`. Default to `pb-safe-max-3` first; if bottom bar was `py-5` (1.25rem), use:

```css
.pb-safe-max-5 {
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
}
```

Add `pb-safe-max-5` in Task 4 only if implementing onboarding bottom bar with former `py-5` bottom. Then update Task 1 foundation test OR add the class in this task and extend the foundation CSS test in the same commit.

**Recommended onboarding bottom bar:**

```tsx
className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-5 px-safe pt-5 pb-safe-max-5 sm:px-10"
```

Add to `index.css` if missing:

```css
  .pb-safe-max-5 {
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
  }
```

Policies slide content top:

```tsx
className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 px-safe pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-28 sm:px-8 sm:py-12 sm:pt-12"
```

Or simpler: wrap policies scroll column with `pt-safe` additive via:

```tsx
className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ice text-navy pt-safe"
```

and keep inner `py-10`.

Image welcome block already centered — no change required if island only affects top chrome; bottom bar covers home indicator.

**NotificationsBell** mobile panel — replace fixed top/max-h classes:

From:

```tsx
className="fixed inset-x-3 top-[4.5rem] z-50 max-h-[min(24rem,calc(100dvh-5.5rem))] ..."
```

To:

```tsx
className="fixed inset-x-3 top-safe-below-header z-50 max-h-safe-notif w-auto origin-top overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-2 shadow-soft sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-96"
```

Keep `sm:` absolute positioning resets so desktop dropdown is unchanged.

Also add horizontal safe on fixed mobile panel if needed: `left`/`right` via existing `inset-x-3` is fine; optional `mx` not required.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/safe-area.test.tsx src/test/onboarding.test.tsx src/test/smoke.test.tsx src/test/event-detail.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DeleteEventModal.tsx src/pages/Applications/EventApplicationsPage.tsx src/components/ReportModal.tsx src/components/OnboardingGate.tsx src/components/NotificationsBell.tsx src/index.css src/test/safe-area.test.tsx
git commit -m "feat: safe-area padding for modals, onboarding, notifications"
```

---

### Task 5: Full verification

**Files:**
- None expected (fix-only)

- [ ] **Step 1: Run full unit suite**

Run: `npm test`

Expected: all tests PASS

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint`

Run: `npm run build`

Expected: no errors from safe-area changes

- [ ] **Step 3: Manual checklist (document in commit message if anything adjusted)**

On iOS Safari or Xcode Simulator (notched device), or Chrome device mode with overlay (approx):

1. Header title/controls clear of Dynamic Island / status bar; glass still full-bleed under island.
2. Event detail sticky Apply clear of home indicator.
3. Toast appears below island / clear of top-right corner.
4. Install prompt clear of home indicator (if shown).
5. Delete / applicant bottom sheets sit above home indicator.
6. Onboarding Skip/Next and Get Started clear of home indicator; policies content not under status bar.
7. Notifications dropdown on mobile starts below header+island and scrolls within viewport.
8. Desktop / non-notch: no extra empty padding regression.

- [ ] **Step 4: Final commit only if Step 3 required tiny fixes**

```bash
git add <only touched files>
git commit -m "fix: polish safe-area spacing after device check"
```

If no fixes: skip commit.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `viewport-fit=cover` on `index.html` + offline | Task 1 |
| Shared CSS utilities with `env(..., 0px)` | Task 1 |
| AppHeader top + horizontal safe | Task 2 |
| Main horizontal safe | Task 2 |
| Event sticky apply shared bottom utility | Task 3 |
| Toast + Install offsets | Task 3 |
| Bottom sheets / modals | Task 4 |
| Onboarding chrome | Task 4 |
| Notifications mobile panel | Task 4 |
| No JS metrics / no per-device layouts | Global constraints |
| Existing tests remain meaningful | Tasks 2–5 |
| Desktop unchanged (zero insets / md resets) | Tasks 2–3 |

No placeholders remain. Class names are consistent across tasks (`pb-safe-max-3`, `p-safe-max-4`, `top-safe-below-header`, etc.).
