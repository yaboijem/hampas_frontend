# Onboarding Gate Revisions — Design

**Date:** 2026-08-21  
**Status:** Approved  
**Product:** Hampas frontend (React + Vite + Tailwind)  
**Supersedes (flow only):** image-slider portion of `2026-08-18-onboarding-intro-slider-design.md` — policies content, storage key, and one-time gate architecture remain.

## Goal

Simplify first-run onboarding to a branded loading beat plus the Important Notice (policies) screen only; fix legal contact emails; make light the default theme; and show the install affordance briefly at top-right.

## Decisions

| Topic | Choice |
|--------|--------|
| Image slides | **Removed** (Discover / Friendship / Enjoy) |
| Kept slide | Policies / Important Notice only |
| Pre-slide | Full-screen loading with header **brand-ball** |
| Loading end | When critical assets are ready, **minimum ~1s** |
| Completion | **Get Started** only; still writes one-time storage flag |
| Persistence | Unchanged: `localStorage` `hampas-onboarding-done` = `"1"` |
| Default theme | **`light`** when no stored preference (was `system`) |
| Legal emails | All contacts → `hampasapp@gmail.com` |
| Install UI | Top-right; auto-hide after **3.5s**; not persistent bottom banner |

## User flow

1. User opens any app URL with no onboarding flag (legal routes `/terms` and `/privacy` still bypass the gate so links work).
2. **Loading phase:** full-viewport shell (`bg-ice`, light chrome), body scroll locked. Center: the same bouncing ball as the header nav (`.brand-ball` + favicon glyph). No Skip / Next / dots.
3. Loading ends when:
   - Favicon (and any other assets the gate needs) have loaded or failed, **and**
   - At least **1000ms** have elapsed since mount.
4. **Policies phase:** existing Important Notice UI (features list, policies list, Terms + Privacy links, **Get Started**). No progress dots, no Prev/Next between image slides (none exist).
5. **Get Started** → exit animation → write `hampas-onboarding-done` → navigate `/events` → mount app shell (unchanged contract with `AppShell`).
6. Later visits: gate is null; normal app.

## Loading screen

- Reuse existing CSS: `.brand-ball` / `.brand-ball__glyph` from `index.css` (same mark as `AppHeader`).
- Centered on a clean ice background; optional short status text is **not** required (ball alone is enough).
- Accessible: `role="dialog"` / `aria-busy="true"` / `aria-label` during loading; policies phase keeps existing dialog labeling.
- Respect `prefers-reduced-motion` the same way the header ball already does.

## Policies slide

- Content unchanged from current `ONBOARDING_SLIDES` policies entry (`Before you play`, features, policies, `/terms`, `/privacy`).
- `slides.ts` may shrink to a single policies slide (or a dedicated constant); image slide types can be removed if unused.
- Terms/Privacy links remain `target="_blank"` with `rel="noopener noreferrer"` (current behavior).

## Install prompt

- **Remove** persistent bottom-right card with long-lived Dismiss.
- When `beforeinstallprompt` is available (or stored `__hampasInstallEvent`):
  - Show a compact bar/toast at **top-right** (desktop and mobile), with safe-area insets.
  - Copy: “Install Hampas on your device” plus Install action (Dismiss optional but not required for auto-hide).
  - **Auto-hide after 3500ms** from first show (timer cleared on unmount / `appinstalled`).
  - Install click still calls `deferred.prompt()`.
- Does not appear during onboarding gate (still only mounted in post-onboarding shell). Not special-cased inside legal page copy.

## Legal pages

- `Terms.tsx`: contact mailto → `hampasapp@gmail.com`.
- `PrivacyPolicy.tsx`: all privacy/support contact mailtos → `hampasapp@gmail.com` (delete-account and questions).

## Theme default

- `readStoredPreference`: if missing or junk → return **`light`** (not `system`).
- Stored `dark` / `system` / `light` still respected when valid.
- Users can still toggle theme in the header after onboarding.

## Out of scope

- Changing policies bullet copy or feature list wording.
- Changing onboarding storage key or multi-device sync.
- iOS Safari custom install instructions (no `beforeinstallprompt`).
- Forcing light theme for users who already saved `dark` or `system`.

## Files (expected touch set)

| Area | Files |
|------|--------|
| Gate | `src/components/OnboardingGate.tsx`, `src/onboarding/slides.ts` |
| Install | `src/components/InstallPrompt.tsx` |
| Legal | `src/pages/Legal/Terms.tsx`, `src/pages/Legal/PrivacyPolicy.tsx` |
| Theme | `src/theme/theme.ts` |
| Tests | `src/test/onboarding.test.tsx`, `src/test/install.test.tsx`, `src/test/theme.test.tsx`, legal tests if email asserted |
| CSS | Only if loading needs a small layout helper; prefer existing `brand-ball` |

## Test plan

1. Fresh storage: loading ball ≥1s → Important Notice → Get Started → flag set, `/events`, no gate on reload.
2. Flag already set: no gate, no loading.
3. Terms/Privacy: only `hampasapp@gmail.com` mailtos.
4. Theme: empty storage resolves preference `light` and light UI.
5. Install: event fires → top-right UI visible → gone after 3.5s; Install still invokes `prompt`.
6. Existing safe-area / legal-route bypass behavior for the gate remains.

## Success criteria

- [ ] No image onboarding slides in product or slide config.
- [ ] First-run shows ball loading then Important Notice only.
- [ ] One-time completion still works via storage.
- [ ] Default theme is light for new visitors.
- [ ] Legal contact email is `hampasapp@gmail.com` only.
- [ ] Install prompt is top-right and auto-dismisses at 3.5s.
