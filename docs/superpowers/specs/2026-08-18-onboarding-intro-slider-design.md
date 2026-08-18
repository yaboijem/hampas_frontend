# Onboarding Intro Slider — Design

**Date:** 2026-08-18  
**Status:** Approved  
**Product:** Hampas frontend (React + Vite + Tailwind)

## Goal

Show a first-run intro slider that introduces Hampas themes, key features, and policies. It appears only on first discovery of the app and does not show again after the user completes onboarding.

## Decisions

| Topic | Choice |
|--------|--------|
| Architecture | Full-screen gate component at app root (Approach A) |
| Policies | Dedicated 4th slide with feature + policy summary and links |
| Skip | Allowed on image slides only; jumps to policies slide |
| Completion | Only via **Get Started** on the policies slide |
| Persistence | `localStorage` key `hampas-onboarding-done` = `"1"` |

## User flow

1. User opens any app URL for the first time (no storage flag).
2. Full-viewport onboarding overlay covers the app (header and main not interactive; body scroll locked).
3. Slides 1–3: themed image slides with **Skip**, progress dots, and **Next**.
4. **Skip** (slides 1–3) jumps to slide 4 (policies). Does not complete onboarding.
5. Slide 4: features and policies summary, links to `/terms` and `/privacy`, primary **Get Started** (no Skip).
6. **Get Started** writes `hampas-onboarding-done` and dismisses the overlay.
7. Subsequent visits: gate renders nothing; normal app use.

## Slides

### 1 — Discover and Play

- Image: `/courtwball.jpg` (public asset)
- Title: Discover and Play
- Body: Browse local games and courts. Find events that match your sport and schedule.

### 2 — Find Friendship

- Image: `/friendship.jpg`
- Title: Find Friendship
- Body: Meet players nearby, apply to join, and build your crew on and off the court.

### 3 — Enjoy and have fun

- Image: `/enjoy.jpg`
- Title: Enjoy and have fun
- Body: Show up, play hard, stay respectful. Hampas is for good games and good vibes.

### 4 — Features & Policies

- No hero image; solid surface using existing theme tokens (ice/navy/surface).
- Title: Before you play
- Feature bullets (editable copy):
  - Discover events near you
  - Apply to join games
  - Host events when eligible
  - Get notifications about your activity
- Policy bullets (aligned with existing Terms/Privacy):
  - You must be at least 18 to use Hampas
  - Be truthful; no harassment or fake events
  - Report misuse; we may moderate or suspend accounts
  - Event participation is at your own risk; Hampas is a platform, not the organizer
- Links: Terms of Service → `/terms`, Privacy Policy → `/privacy`
- CTA: **Get Started**

Copy lives in a data module so it can be edited without touching UI structure.

## Architecture

### Components and modules

| Path | Responsibility |
|------|----------------|
| `src/onboarding/storage.ts` | `ONBOARDING_STORAGE_KEY`, `readOnboardingDone`, `writeOnboardingDone` (try/catch like theme helpers) |
| `src/onboarding/slides.ts` | Ordered slide definitions (image, title, body, or policies content) |
| `src/components/OnboardingGate.tsx` | Read storage on mount; render full-screen slider or `null`; handle nav, skip-to-policies, complete |
| `src/App.tsx` | Mount `<OnboardingGate />` at root (alongside header/main), high enough to cover chrome |
| `src/test/onboarding.test.tsx` | Behavior tests |

### Placement

- Gate mounts inside existing providers (`ThemeProvider`, etc.) so tokens work.
- `z-index` above header and toasts so onboarding is the only interactive layer while open.
- `InstallPrompt` may still mount underneath; it is not usable until onboarding completes (acceptable).

### State

- `done: boolean` — from storage (default false if missing/unreadable).
- `index: number` — current slide (0–3).
- Completing sets `done` true and writes storage.

### Navigation behavior

- **Next:** `index + 1` (disabled/hidden on last slide).
- **Skip:** set `index` to policies slide (last). Only on slides 0–2.
- **Get Started:** `writeOnboardingDone()` then set local `done` true.
- Optional: touch swipe left/right; keyboard ArrowLeft/ArrowRight when overlay focused.
- Progress dots reflect `index`; optional click-to-jump only among already-allowed slides is not required (keep simple: dots are indicators only).

## UI

### Slides 1–3

- Full-bleed background image (`object-cover`), dark gradient scrim at bottom for text contrast.
- Title (large), body (short), bottom controls: Skip (text) | dots | Next (primary).
- Respect `prefers-reduced-motion` (minimal or no slide animation).

### Slide 4

- Padded content on `bg-surface` / ice background, navy text.
- Bulleted lists, underlined legal links using app link styles.
- Full-width primary **Get Started** button.

### Accessibility

- Overlay: `role="dialog"`, `aria-modal="true"`, labeled by title.
- Focus trap not mandatory for v1 if primary controls are first tab stops; ensure Skip/Next/Get Started and legal links are keyboard reachable.
- Images: decorative or empty alt when title conveys meaning; otherwise meaningful alt from title.
- Color contrast: light text on gradient for photo slides; theme tokens on policies slide.

## Edge cases

| Case | Behavior |
|------|----------|
| `localStorage` read throws | Treat as not done; show onboarding |
| `localStorage` write throws | Dismiss UI for this session anyway (do not block the app); may reappear next visit |
| User opens `/terms` or `/privacy` from slide 4 | Navigate to legal route under overlay; overlay remains until Get Started (links may use in-app navigation). Prefer same-tab React Router `Link` so user can go back within the SPA; overlay stays until complete |
| Deep link (e.g. `/events/123`) | Overlay still shows first; target route remains underneath |
| Refresh mid-onboarding | Shows again from slide 1 (no mid-flow persistence) — acceptable for v1 |
| Already completed | Gate returns `null` immediately |

## Out of scope

- Re-opening onboarding from settings/profile
- Server-side or account-bound completion flag
- i18n
- Forcing checkbox acceptance of terms (summary + links only)
- Analytics events

## Testing

`src/test/onboarding.test.tsx` (Vitest + Testing Library), following existing test patterns:

1. Renders intro when storage key absent.
2. Renders nothing when storage key is `"1"`.
3. Next advances title/content.
4. Skip jumps to policies content (Features & Policies / Before you play).
5. Get Started calls storage write and unmounts overlay.
6. Policies slide includes links to `/terms` and `/privacy`.

Mock `localStorage` as other tests do for theme if needed.

## Success criteria

- First-time visitors always see the intro before using the app UI.
- Returning visitors never see it after successful Get Started.
- Three branded themes use the specified public images.
- Features and policies are communicated; legal pages remain one tap away.
- Copy is centralized and easy to edit.
