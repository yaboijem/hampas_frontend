# Onboarding Intro Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First-run full-screen intro slider (3 themed image slides + policies slide) that appears only until the user taps Get Started.

**Architecture:** `OnboardingGate` mounts at the app root. It reads `localStorage` key `hampas-onboarding-done`. When unset, it renders a fixed full-viewport dialog overlay with four slides; Skip on image slides jumps to policies; Get Started writes the flag and unmounts. Slide copy and images live in data modules; storage helpers mirror `src/theme/theme.ts`.

**Tech Stack:** React 19, React Router 7, Vite, Tailwind 4, Vitest, Testing Library, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-18-onboarding-intro-slider-design.md`

## Global Constraints

- Storage key must be exactly `hampas-onboarding-done` with value `"1"` when complete.
- Public images: `/courtwball.jpg`, `/friendship.jpg`, `/enjoy.jpg` (already in `public/`).
- Skip only on slides 0–2; jumps to slide 3 (policies). Never completes onboarding.
- Completion only via Get Started on policies slide.
- No new npm dependencies.
- Follow existing patterns: try/catch storage like theme; tests clear `localStorage` in `beforeEach`; use `MemoryRouter` when rendering `Link`.
- Copy is editable in `src/onboarding/slides.ts` only.
- Do not restructure unrelated files or commit secrets.

## File structure

| Path | Role |
|------|------|
| `src/onboarding/storage.ts` | Key + read/write helpers |
| `src/onboarding/slides.ts` | Slide definitions and copy |
| `src/components/OnboardingGate.tsx` | Gate UI + navigation |
| `src/App.tsx` | Mount gate |
| `src/test/onboarding.test.tsx` | Unit + component tests |

---

### Task 1: Onboarding storage helpers

**Files:**
- Create: `src/onboarding/storage.ts`
- Test: `src/test/onboarding.test.tsx`

**Interfaces:**
- Consumes: none
- Produces:
  - `ONBOARDING_STORAGE_KEY: 'hampas-onboarding-done'`
  - `readOnboardingDone(storage?: Storage | null): boolean`
  - `writeOnboardingDone(storage?: Storage | null): void`

- [ ] **Step 1: Write the failing tests**

Create `src/test/onboarding.test.tsx`:

```tsx
import { beforeEach, describe, expect, test } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  readOnboardingDone,
  writeOnboardingDone,
} from '../onboarding/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('onboarding storage', () => {
  test('readOnboardingDone is false when missing or junk', () => {
    expect(readOnboardingDone(localStorage)).toBe(false);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'yes');
    expect(readOnboardingDone(localStorage)).toBe(false);
  });

  test('writeOnboardingDone persists and read returns true', () => {
    writeOnboardingDone(localStorage);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(readOnboardingDone(localStorage)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: FAIL — cannot resolve `../onboarding/storage`

- [ ] **Step 3: Implement storage helpers**

Create `src/onboarding/storage.ts`:

```ts
export const ONBOARDING_STORAGE_KEY = 'hampas-onboarding-done';

export function readOnboardingDone(storage?: Storage | null): boolean {
  try {
    return (storage ?? localStorage).getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingDone(storage?: Storage | null): void {
  try {
    (storage ?? localStorage).setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    // private mode / quota — ignore
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: PASS (storage describe only)

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/storage.ts src/test/onboarding.test.tsx
git commit -m "feat: add onboarding localStorage helpers"
```

---

### Task 2: Slide data module

**Files:**
- Create: `src/onboarding/slides.ts`
- Modify: `src/test/onboarding.test.tsx`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type ImageSlide = { kind: 'image'; id: string; imageSrc: string; title: string; body: string }`
  - `export type PoliciesSlide = { kind: 'policies'; id: string; title: string; features: string[]; policies: string[]; termsPath: '/terms'; privacyPath: '/privacy' }`
  - `export type OnboardingSlide = ImageSlide | PoliciesSlide`
  - `export const ONBOARDING_SLIDES: OnboardingSlide[]` — length 4, order: courtwball, friendship, enjoy, policies

- [ ] **Step 1: Write the failing test**

Append to `src/test/onboarding.test.tsx`:

```tsx
import { ONBOARDING_SLIDES } from '../onboarding/slides';

describe('onboarding slides', () => {
  test('defines three image themes then policies', () => {
    expect(ONBOARDING_SLIDES).toHaveLength(4);
    expect(ONBOARDING_SLIDES[0]).toMatchObject({
      kind: 'image',
      imageSrc: '/courtwball.jpg',
      title: 'Discover and Play',
    });
    expect(ONBOARDING_SLIDES[1]).toMatchObject({
      kind: 'image',
      imageSrc: '/friendship.jpg',
      title: 'Find Friendship',
    });
    expect(ONBOARDING_SLIDES[2]).toMatchObject({
      kind: 'image',
      imageSrc: '/enjoy.jpg',
      title: 'Enjoy and have fun',
    });
    expect(ONBOARDING_SLIDES[3]).toMatchObject({
      kind: 'policies',
      title: 'Before you play',
      termsPath: '/terms',
      privacyPath: '/privacy',
    });
    const policies = ONBOARDING_SLIDES[3];
    if (policies.kind !== 'policies') throw new Error('expected policies slide');
    expect(policies.features.length).toBeGreaterThan(0);
    expect(policies.policies.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: FAIL — cannot resolve `../onboarding/slides`

- [ ] **Step 3: Implement slides data**

Create `src/onboarding/slides.ts`:

```ts
export type ImageSlide = {
  kind: 'image';
  id: string;
  imageSrc: string;
  title: string;
  body: string;
};

export type PoliciesSlide = {
  kind: 'policies';
  id: string;
  title: string;
  features: string[];
  policies: string[];
  termsPath: '/terms';
  privacyPath: '/privacy';
};

export type OnboardingSlide = ImageSlide | PoliciesSlide;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    kind: 'image',
    id: 'discover',
    imageSrc: '/courtwball.jpg',
    title: 'Discover and Play',
    body: 'Browse local games and courts. Find events that match your sport and schedule.',
  },
  {
    kind: 'image',
    id: 'friendship',
    imageSrc: '/friendship.jpg',
    title: 'Find Friendship',
    body: 'Meet players nearby, apply to join, and build your crew on and off the court.',
  },
  {
    kind: 'image',
    id: 'enjoy',
    imageSrc: '/enjoy.jpg',
    title: 'Enjoy and have fun',
    body: 'Show up, play hard, stay respectful. Hampas is for good games and good vibes.',
  },
  {
    kind: 'policies',
    id: 'policies',
    title: 'Before you play',
    features: [
      'Discover events near you',
      'Apply to join games',
      'Host events when eligible',
      'Get notifications about your activity',
    ],
    policies: [
      'You must be at least 18 to use Hampas',
      'Be truthful; no harassment or fake events',
      'Report misuse; we may moderate or suspend accounts',
      'Event participation is at your own risk; Hampas is a platform, not the organizer',
    ],
    termsPath: '/terms',
    privacyPath: '/privacy',
  },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/slides.ts src/test/onboarding.test.tsx
git commit -m "feat: add onboarding slide copy and assets map"
```

---

### Task 3: OnboardingGate UI and behavior

**Files:**
- Create: `src/components/OnboardingGate.tsx`
- Modify: `src/test/onboarding.test.tsx`
- Modify: `src/App.tsx` (mount only — keep minimal)

**Interfaces:**
- Consumes: `readOnboardingDone`, `writeOnboardingDone`, `ONBOARDING_SLIDES`
- Produces: default export `OnboardingGate` React component (no props)

**UI requirements (from spec):**
- If `readOnboardingDone()` → return `null`
- Else fixed full-viewport overlay: `fixed inset-0 z-[100]`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at current title id
- Image slides: full-bleed `background-image` or `<img>` with `object-cover`, dark bottom gradient, white/light title + body, controls: Skip | dots | Next
- Policies slide: surface background, feature list, policy list, `Link` to terms/privacy, Get Started button (no Skip)
- Skip sets index to last slide index
- Next increments index (only when not last)
- Get Started calls `writeOnboardingDone()` and sets local state so component returns `null`
- Dots: `aria-label` progress indicators (non-interactive is fine)
- Lock body overflow while open; restore on unmount/complete
- Use existing tokens: `bg-ice`, `bg-surface`, `text-navy`, `text-muted`, primary button classes consistent with app (`bg-cobalt` or existing primary button pattern from Login/InstallPrompt)

- [ ] **Step 1: Write the failing component tests**

Append to `src/test/onboarding.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OnboardingGate from '../components/OnboardingGate';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/storage';

function renderGate() {
  return render(
    <MemoryRouter>
      <OnboardingGate />
    </MemoryRouter>,
  );
}

describe('OnboardingGate', () => {
  test('shows first slide when onboarding not done', () => {
    renderGate();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /discover and play/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
  });

  test('renders nothing when onboarding already done', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Next advances to the next slide', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByRole('heading', { name: /find friendship/i })).toBeInTheDocument();
  });

  test('Skip jumps to policies slide', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(screen.getByRole('heading', { name: /before you play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  test('Get Started persists flag and dismisses overlay', async () => {
    const user = userEvent.setup();
    renderGate();
    await user.click(screen.getByRole('button', { name: /^skip$/i }));
    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: FAIL — cannot resolve `OnboardingGate`

- [ ] **Step 3: Implement OnboardingGate**

Create `src/components/OnboardingGate.tsx` implementing the UI requirements above. Keep it in one file. Suggested structure:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import { readOnboardingDone, writeOnboardingDone } from '../onboarding/storage';

export default function OnboardingGate() {
  const [done, setDone] = useState(() => readOnboardingDone());
  const [index, setIndex] = useState(0);
  // ... body scroll lock effect when !done
  // ... if done return null
  // ... const slide = ONBOARDING_SLIDES[index]
  // ... const isLast = index === ONBOARDING_SLIDES.length - 1
  // ... render dialog with image or policies branch
}
```

Implementation details:
- Title element: `id="onboarding-title"` + `aria-labelledby="onboarding-title"`
- Image slides: decorative img `alt=""` or `alt={slide.title}`; gradient overlay `bg-gradient-to-t from-black/80 via-black/40 to-transparent`
- Primary buttons: match existing app (`rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-white` or nearest existing primary class used in LoginPage)
- Skip: text button `text-white/90` on image slides
- Policies: two sections with `h3` “Features” / “Policies”, `ul` lists, links with `underline` class
- Get Started handler:

```ts
const complete = () => {
  writeOnboardingDone();
  setDone(true);
};
```

- Body scroll lock:

```ts
useEffect(() => {
  if (done) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
}, [done]);
```

Optional (include if cheap): keyboard ArrowRight/ArrowLeft when dialog is mounted — not required by tests.

- [ ] **Step 4: Mount in App.tsx**

In `src/App.tsx`:
- Import `OnboardingGate` from `./components/OnboardingGate`
- Render `<OnboardingGate />` inside the outer `min-h-dvh` div, next to `<AppHeader />` / `<InstallPrompt />` (order: Header, ToastHost, InstallPrompt, OnboardingGate is fine; z-index on gate covers all)

Do not change routing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: all PASS

- [ ] **Step 6: Lint / typecheck**

Run: `npm run lint`

Run: `npx tsc -b --pretty false` (or project equivalent used in `npm run build` first half)

Expected: no errors in new files

- [ ] **Step 7: Commit**

```bash
git add src/components/OnboardingGate.tsx src/App.tsx src/test/onboarding.test.tsx
git commit -m "feat: add first-run onboarding intro slider"
```

---

### Task 4: Manual verification checklist

**Files:** none (verification only)

- [ ] **Step 1: Ensure images are available**

Confirm these exist (add to git if untracked and needed for deploy):
- `public/courtwball.jpg`
- `public/friendship.jpg`
- `public/enjoy.jpg`

If untracked:

```bash
git add public/courtwball.jpg public/friendship.jpg public/enjoy.jpg
git commit -m "assets: add onboarding intro images"
```

- [ ] **Step 2: Dev smoke**

Run: `npm run dev`

1. Clear site data or `localStorage.removeItem('hampas-onboarding-done')` in devtools
2. Reload — overlay shows Discover and Play with court image
3. Next → Find Friendship → Next → Enjoy → Next → Before you play
4. From slide 1, Skip → lands on Before you play
5. Open Terms and Privacy links (overlay may remain — OK per spec)
6. Get Started → overlay gone; refresh → stays gone
7. Spot-check mobile width (~375px) and dark theme if toggled

- [ ] **Step 3: Full test suite**

Run: `npm test`

Expected: PASS (no regressions)

- [ ] **Step 4: Final commit only if smoke fixed anything**

If copy/CSS tweaks were needed, commit:

```bash
git add -A
git commit -m "fix: polish onboarding slider from smoke pass"
```

Only stage intentional onboarding-related files.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Full-screen gate component | Task 3 |
| `hampas-onboarding-done` = `"1"` | Task 1 |
| 3 image slides + assets | Task 2–3 |
| 4th policies slide + links | Task 2–3 |
| Skip → policies only | Task 3 tests + impl |
| Get Started completes | Task 3 |
| Mount at app root | Task 3 Step 4 |
| Editable copy module | Task 2 |
| localStorage edge try/catch | Task 1 |
| Tests listed in spec | Tasks 1–3 |
| Out of scope (settings replay, i18n, checkbox) | Not planned |

No placeholders. Types consistent across tasks (`ONBOARDING_SLIDES`, storage helpers, `OnboardingGate` default export).
