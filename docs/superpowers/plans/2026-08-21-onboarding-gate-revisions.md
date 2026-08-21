# Onboarding Gate Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** First-run gate shows brand-ball loading then Important Notice only; legal emails become `hampasapp@gmail.com`; default theme is light; install toast is top-right and auto-hides after 3.5s.

**Architecture:** Slim `slides.ts` to a single policies slide. `OnboardingGate` gains a `loading | policies` phase: mount loading with header ball until favicon ready and min 1s, then show existing policies UI without multi-slide chrome. Theme default flips in `readStoredPreference`. `InstallPrompt` becomes a top-right auto-dismiss toast.

**Tech Stack:** React 19, Vite, Tailwind 4, Vitest, Testing Library, existing `localStorage` onboarding/theme keys.

## Global Constraints

- Onboarding storage key remains `hampas-onboarding-done` = `"1"` (one-time only).
- Loading: header ball (`.brand-ball` + `/favicon.png`), min **1000ms**, wait until assets ready (or error).
- Install toast: top-right, **3500ms** auto-hide, copy “Install Hampas on your device”.
- Legal contact email: **only** `hampasapp@gmail.com`.
- Default theme preference when missing/junk: **`light`** (not `system`).
- No image slides; no Skip/Next/progress dots for multi-slide.
- Do not force-overwrite users who already stored `dark` or `system`.
- TDD: failing test first, then minimal implementation, then commit per task.
- Run tests via `npm test` (vitest run). Lint: `npm run lint`.

---

### Task 1: Theme default → light

**Files:**
- Modify: `src/theme/theme.ts` (`readStoredPreference`)
- Modify: `src/test/theme.test.tsx`

**Interfaces:**
- Consumes: existing `ThemePreference`, `THEME_STORAGE_KEY`
- Produces: `readStoredPreference()` returns `'light'` when storage missing or junk

- [ ] **Step 1: Update failing tests for light default**

In `src/test/theme.test.tsx`, replace the default-to-system assertions:

```tsx
test('readStoredPreference defaults to light and ignores junk', () => {
  expect(readStoredPreference(localStorage)).toBe('light');
  localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  expect(readStoredPreference(localStorage)).toBe('dark');
  localStorage.setItem(THEME_STORAGE_KEY, 'garbage');
  expect(readStoredPreference(localStorage)).toBe('light');
});

test('ThemeProvider defaults to light and applies resolved class', () => {
  mockMatchMedia(true); // system dark must NOT win when preference is light default

  const { result } = renderHook(() => useTheme(), { wrapper });
  expect(result.current.preference).toBe('light');
  expect(result.current.resolvedTheme).toBe('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});
```

Leave `resolveTheme('system', …)` and cycle/toggle tests unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/theme.test.tsx`

Expected: FAIL — still defaults to `'system'`.

- [ ] **Step 3: Implement light default**

In `src/theme/theme.ts`, change both return paths in `readStoredPreference` from `'system'` to `'light'`:

```ts
export function readStoredPreference(storage?: Storage | null): ThemePreference {
  try {
    const raw = (storage ?? localStorage).getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : 'light';
  } catch {
    return 'light';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/theme.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme/theme.ts src/test/theme.test.tsx
git commit -m "fix: default theme preference to light"
```

---

### Task 2: Legal contact emails → hampasapp@gmail.com

**Files:**
- Modify: `src/pages/Legal/Terms.tsx`
- Modify: `src/pages/Legal/PrivacyPolicy.tsx`
- Modify: `src/test/legal.test.tsx`

**Interfaces:**
- Consumes: none
- Produces: mailto links using `hampasapp@gmail.com` only

- [ ] **Step 1: Write failing email assertions**

Append to `src/test/legal.test.tsx`:

```tsx
test('terms contact uses hampasapp@gmail.com', () => {
  render(<Terms />);
  const link = screen.getByRole('link', { name: /hampasapp@gmail\.com/i });
  expect(link).toHaveAttribute('href', 'mailto:hampasapp@gmail.com');
  expect(screen.queryByRole('link', { name: /@hampas\.app/i })).not.toBeInTheDocument();
});

test('privacy contacts use hampasapp@gmail.com only', () => {
  render(<PrivacyPolicy />);
  const links = screen.getAllByRole('link', { name: /hampasapp@gmail\.com/i });
  expect(links.length).toBeGreaterThanOrEqual(2);
  for (const link of links) {
    expect(link).toHaveAttribute('href', 'mailto:hampasapp@gmail.com');
  }
  expect(screen.queryByRole('link', { name: /@hampas\.app/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/legal.test.tsx`

Expected: FAIL — old `@hampas.app` addresses still present.

- [ ] **Step 3: Update legal pages**

`Terms.tsx` contact paragraph:

```tsx
<p>
  <a href="mailto:hampasapp@gmail.com" className="underline">
    hampasapp@gmail.com
  </a>
</p>
```

`PrivacyPolicy.tsx` — both delete-account and questions mailtos:

```tsx
<p>
  To delete your account and data, email{' '}
  <a href="mailto:hampasapp@gmail.com" className="underline">
    hampasapp@gmail.com
  </a>{' '}
  with the subject "Delete my account" from your registered email. We respond within 30 days.
</p>
{/* ... */}
<p>
  Questions about this policy:{' '}
  <a href="mailto:hampasapp@gmail.com" className="underline">
    hampasapp@gmail.com
  </a>
  .
</p>
```

Grep the repo for `@hampas.app` in `src/` and replace any remaining legal contact emails the same way (do not change unrelated organizer `contact_email` fixtures).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/legal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Legal/Terms.tsx src/pages/Legal/PrivacyPolicy.tsx src/test/legal.test.tsx
git commit -m "fix: use hampasapp@gmail.com on legal pages"
```

---

### Task 3: Install prompt — top-right, 3.5s auto-hide

**Files:**
- Modify: `src/components/InstallPrompt.tsx`
- Modify: `src/test/install.test.tsx`

**Interfaces:**
- Consumes: `beforeinstallprompt`, optional `window.__hampasInstallEvent`
- Produces: UI visible at top-right; auto-dismiss after 3500ms; Install still calls `prompt()`

- [ ] **Step 1: Rewrite install tests**

Replace `src/test/install.test.tsx` content with:

```tsx
import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import InstallPrompt from '../components/InstallPrompt';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).__hampasInstallEvent;
});

function fireInstallable() {
  const promptFn = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
  };
  Object.defineProperty(event, 'prompt', { value: promptFn });
  (window as unknown as Record<string, unknown>).__hampasInstallEvent = event;
  fireEvent(window, event);
  return promptFn;
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  test('shows install UI top-right when prompt event fires', () => {
    render(<InstallPrompt />);
    fireInstallable();
    expect(screen.getByText(/install hampas on your device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
    const root = screen.getByTestId('install-prompt');
    expect(root.className).toMatch(/top-/);
    expect(root.className).toMatch(/right-/);
    expect(root.className).not.toMatch(/bottom-/);
  });

  test('Install button calls deferred.prompt', async () => {
    render(<InstallPrompt />);
    const promptFn = fireInstallable();
    fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    expect(promptFn).toHaveBeenCalled();
  });

  test('auto-hides after 3.5 seconds', async () => {
    render(<InstallPrompt />);
    fireInstallable();
    expect(screen.getByText(/install hampas on your device/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(screen.queryByText(/install hampas on your device/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/install.test.tsx`

Expected: FAIL — missing `data-testid`, still bottom positioning, no auto-hide.

- [ ] **Step 3: Implement InstallPrompt**

Rewrite `src/components/InstallPrompt.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const AUTO_HIDE_MS = 3500;

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      const stored = (window as unknown as Record<string, unknown>).__hampasInstallEvent;
      setDeferred((stored as BeforeInstallPromptEvent) ?? (e as BeforeInstallPromptEvent));
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!deferred || dismissed) return;
    const id = window.setTimeout(() => setDismissed(true), AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [deferred, dismissed]);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div
      data-testid="install-prompt"
      className="fixed top-safe-offset-4 right-safe-offset-4 z-50 flex max-w-[min(100vw-2rem,22rem)] items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-sm text-navy shadow-soft sm:p-4"
      role="status"
    >
      <span className="min-w-0 flex-1">Install Hampas on your device.</span>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-[var(--radius-control)] bg-cobalt px-3 py-1 text-white hover:bg-electric"
      >
        Install app
      </button>
    </div>
  );
}
```

If `top-safe-offset-4` / `right-safe-offset-4` do not exist in the project CSS utilities, use the same safe-area pattern already used for bottom (`bottom-safe-offset-4`) — check `src/index.css` for the twin top/right classes; if missing, use:

```tsx
className="fixed z-50 flex ... top-[max(1rem,env(safe-area-inset-top,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/test/install.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/InstallPrompt.tsx src/test/install.test.tsx
git commit -m "feat: top-right install toast auto-hides in 3.5s"
```

---

### Task 4: Policies-only slides config

**Files:**
- Modify: `src/onboarding/slides.ts`
- Modify: `src/test/onboarding.test.tsx` (slides describe block only in this task)

**Interfaces:**
- Consumes: none
- Produces: `ONBOARDING_SLIDES` length 1, single `kind: 'policies'` entry; remove `ImageSlide` type if unused

- [ ] **Step 1: Update slides test to expect policies only**

In `src/test/onboarding.test.tsx`, replace the `onboarding slides` describe:

```tsx
describe('onboarding slides', () => {
  test('defines policies slide only', () => {
    expect(ONBOARDING_SLIDES).toHaveLength(1);
    expect(ONBOARDING_SLIDES[0]).toMatchObject({
      kind: 'policies',
      title: 'Before you play',
      termsPath: '/terms',
      privacyPath: '/privacy',
    });
    const policies = ONBOARDING_SLIDES[0];
    if (policies.kind !== 'policies') throw new Error('expected policies slide');
    expect(policies.features.length).toBeGreaterThan(0);
    expect(policies.policies.length).toBeGreaterThan(0);
  });
});
```

Leave `OnboardingGate` describe tests for Task 5 (they will fail after this step until the gate is rewritten — acceptable if you only run the slides test here).

- [ ] **Step 2: Run slides test to verify it fails**

Run: `npm test -- src/test/onboarding.test.tsx -t "defines policies"`

Expected: FAIL — length still 4.

- [ ] **Step 3: Slim slides.ts**

Replace `src/onboarding/slides.ts` with:

```ts
export type PoliciesSlide = {
  kind: 'policies';
  id: string;
  title: string;
  features: string[];
  policies: string[];
  termsPath: '/terms';
  privacyPath: '/privacy';
};

export type OnboardingSlide = PoliciesSlide;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    kind: 'policies',
    id: 'policies',
    title: 'Before you play',
    features: [
      'Discover events near you',
      'Apply to join games',
      'Host events when eligible',
      'Get notifications about your\u00A0activity',
    ],
    policies: [
      'You must be at least 18 to use Hampas',
      'Be truthful; no harassment or fake events',
      'Report misuse; we may moderate or suspend\u00A0accounts',
      'Event participation is at your own risk; Hampas is a platform, not the\u00A0organizer',
    ],
    termsPath: '/terms',
    privacyPath: '/privacy',
  },
];
```

- [ ] **Step 4: Run slides test to verify it passes**

Run: `npm test -- src/test/onboarding.test.tsx -t "defines policies"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/onboarding/slides.ts src/test/onboarding.test.tsx
git commit -m "refactor: onboarding slides are policies-only"
```

Note: `OnboardingGate` may not typecheck cleanly until Task 5. If `npm test` / `tsc` fails on image branches, proceed immediately to Task 5 in the same session; only commit Task 4 if the project still builds. Prefer committing Task 4+5 together if intermediate compile breaks: in that case skip this commit and do one commit at end of Task 5 covering slides + gate.

---

### Task 5: OnboardingGate — loading then Important Notice

**Files:**
- Modify: `src/components/OnboardingGate.tsx`
- Modify: `src/test/onboarding.test.tsx`
- Possibly touch: `src/test/safe-area.test.tsx` only if chrome class assertions break

**Interfaces:**
- Consumes: `ONBOARDING_SLIDES[0]` policies slide; `readOnboardingDone` / `writeOnboardingDone`; `onFinished?: () => void`
- Produces: phase `loading` → `policies`; min load 1000ms; brand-ball loading UI; Get Started completion unchanged

- [ ] **Step 1: Rewrite OnboardingGate tests**

Replace the `OnboardingGate` describe in `src/test/onboarding.test.tsx` with:

```tsx
describe('OnboardingGate', () => {
  test('renders nothing when onboarding already done', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows loading with brand ball before policies', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderGate();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('onboarding-loading-ball')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /before you play/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
  });

  test('reveals policies after min load once favicon settles', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderGate();
    const img = screen.getByTestId('onboarding-loading-ball').querySelector('img');
    expect(img).toBeTruthy();
    fireEvent.load(img!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('heading', { name: /before you play/i })).toBeInTheDocument();
    expect(screen.getByText(/important notice/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^skip$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next slide/i })).not.toBeInTheDocument();
  });

  test('Get Started persists flag and dismisses overlay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGate();
    const img = screen.getByTestId('onboarding-loading-ball').querySelector('img');
    fireEvent.load(img!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Get Started navigates to /events not /login', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <>
              <LocationPath />
              <OnboardingGate />
            </>
          ),
        },
      ],
      { initialEntries: ['/login'] },
    );
    render(<RouterProvider router={router} />);
    const img = screen.getByTestId('onboarding-loading-ball').querySelector('img');
    fireEvent.load(img!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await user.click(screen.getByRole('button', { name: /get started/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(router.state.location.pathname).toBe('/events');
    expect(screen.getByTestId('path')).toHaveTextContent('/events');
  });
});
```

Add `fireEvent` to the `@testing-library/react` import at the top of the file.

Remove obsolete tests: first-slide welcome, Next, Prev, Skip.

- [ ] **Step 2: Run gate tests to verify they fail**

Run: `npm test -- src/test/onboarding.test.tsx`

Expected: FAIL — no loading phase / brand-ball test id.

- [ ] **Step 3: Rewrite OnboardingGate**

Replace `src/components/OnboardingGate.tsx` with a single-slide + loading implementation. Core structure:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING_SLIDES } from '../onboarding/slides';
import { readOnboardingDone, writeOnboardingDone } from '../onboarding/storage';

const ghostBtnDark =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-transparent px-3 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40';

const EXIT_MS = 420;
const MIN_LOAD_MS = 1000;

type Props = {
  onFinished?: () => void;
};

type Phase = 'loading' | 'policies';

export default function OnboardingGate({ onFinished }: Props) {
  const navigate = useNavigate();
  const [done, setDone] = useState(() => readOnboardingDone());
  const [phase, setPhase] = useState<Phase>('loading');
  const [exiting, setExiting] = useState(false);
  const [assetReady, setAssetReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const slide = ONBOARDING_SLIDES[0];

  useEffect(() => {
    if (done) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [done]);

  useEffect(() => {
    if (done || phase !== 'loading') return;
    const id = window.setTimeout(() => setMinElapsed(true), MIN_LOAD_MS);
    return () => window.clearTimeout(id);
  }, [done, phase]);

  useEffect(() => {
    if (phase === 'loading' && assetReady && minElapsed) {
      setPhase('policies');
    }
  }, [phase, assetReady, minElapsed]);

  const complete = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      writeOnboardingDone();
      navigate('/events', { replace: true });
      setDone(true);
      onFinished?.();
    }, EXIT_MS);
  };

  if (done) return null;

  if (phase === 'loading') {
    return (
      <div
        className={`onboarding-shell fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ice text-navy ${
          exiting ? 'onboarding-exit' : 'onboarding-enter'
        }`}
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-label="Loading Hampas"
      >
        <span className="brand-ball shrink-0" data-testid="onboarding-loading-ball" aria-hidden>
          <img
            className="brand-ball__glyph"
            src="/favicon.png"
            alt=""
            width={43}
            height={43}
            draggable={false}
            onLoad={() => setAssetReady(true)}
            onError={() => setAssetReady(true)}
          />
        </span>
      </div>
    );
  }

  // policies phase — reuse existing Important Notice markup from current file
  // (features, policies, terms/privacy links, Get Started). No bottom Skip/Next/dots.
  // aria-busy="false", aria-labelledby="onboarding-title"
  // complete() on Get Started
  return (/* policies UI only */);
}
```

Copy the policies branch markup from the current file’s `slide.kind !== 'image'` branch (lines ~152–218), drop the bottom chrome that rendered Prev/progress for policies (or keep empty footer if safe-area tests require bottom padding classes — check `src/test/safe-area.test.tsx`).

If the favicon is cached and `onLoad` never fires in some browsers after setState, also call `setAssetReady(true)` when `img.complete` is true via a ref callback:

```tsx
const onBallImg = (el: HTMLImageElement | null) => {
  if (!el) return;
  if (el.complete) setAssetReady(true);
};
// ref={onBallImg} onLoad=... onError=...
```

- [ ] **Step 4: Run onboarding + safe-area tests**

Run: `npm test -- src/test/onboarding.test.tsx src/test/safe-area.test.tsx`

Expected: PASS. Fix safe-area test assertions only if they still require removed chrome classes — prefer keeping `pt-safe` / `pb-safe-max-5` on the policies shell if the test checks those strings in source.

- [ ] **Step 5: Full regression + lint**

Run: `npm test`  
Run: `npm run lint`

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/OnboardingGate.tsx src/onboarding/slides.ts src/test/onboarding.test.tsx src/test/safe-area.test.tsx
git commit -m "feat: onboarding gate loads with brand ball then policies only"
```

(Include slides files here if Task 4 commit was deferred.)

---

### Task 6: Manual smoke checklist (no code)

**Files:** none

- [ ] **Step 1: Dev server smoke**

Run: `npm run dev`

With cleared site data for the origin:

1. First load → ball loading ≥1s → Important Notice.
2. Open Terms/Privacy → email is `hampasapp@gmail.com`.
3. Get Started → `/events`, header appears, light theme by default.
4. Reload → no gate.
5. If installable (Chrome desktop PWA criteria), install toast top-right disappears ~3.5s.

- [ ] **Step 2: Final commit only if smoke fixes were needed**

Otherwise done.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Remove 3 image slides | 4, 5 |
| Keep Important Notice | 4, 5 |
| Loading with header ball | 5 |
| Assets ready + min 1s | 5 |
| One-time storage flag | 5 (unchanged key) |
| Legal emails → hampasapp@gmail.com | 2 |
| Install top-right 3.5s | 3 |
| Default theme light | 1 |

## Self-review notes

- No TBD placeholders.
- `MIN_LOAD_MS = 1000` and `AUTO_HIDE_MS = 3500` match the approved spec.
- Intermediate Task 4 may break `OnboardingGate` types; plan allows combining commits with Task 5.
