# Safe-area insets (Dynamic Island / notch / home indicator)

**Date:** 2026-08-18  
**Status:** Approved for planning  
**Scope:** Full app shell — CSS utilities + shell application (no JS layout metrics)

## Problem

On notched and Dynamic Island iPhones (and similar devices), fixed/sticky chrome can sit under the status region or home indicator. Today only the event-detail sticky apply bar uses `env(safe-area-inset-bottom)`. The viewport meta lacks `viewport-fit=cover`, so safe-area env vars are often zero on iOS even when padding is declared.

## Goals

- Keep interactive content clear of top inset (notch / Dynamic Island / status bar), bottom inset (home indicator), and left/right insets (landscape).
- Glass/sticky backgrounds may paint edge-to-edge; **padding** protects content.
- Desktop and non-notch devices unchanged (`env(..., 0px)` resolves to 0).
- Zero JavaScript for insets.

## Non-goals

- Separate layouts or breakpoints per iPhone model.
- Redesign of navigation structure or mobile breakpoints.
- Keyboard / `visualViewport` handling.
- Native iOS/Android shell work beyond mobile web / PWA.

## Approach

**CSS utilities + targeted application on shell and fixed chrome.**

### 1. Viewport

Update primary viewport meta (and offline fallback if it has its own):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

Files:

- `index.html`
- `public/offline.html` (if present with its own viewport meta)

### 2. Shared utilities

Add reusable utilities in `src/index.css` (plain CSS or Tailwind `@utility` — same effect):

| Utility | Behavior |
|--------|----------|
| `pt-safe` | `padding-top: env(safe-area-inset-top, 0px)` |
| `pb-safe` | `padding-bottom: env(safe-area-inset-bottom, 0px)` |
| `pl-safe` / `pr-safe` or `px-safe` | left/right safe-area padding |
| `pb-safe-max-*` (or equivalent) | `padding-bottom: max(<base>, env(safe-area-inset-bottom, 0px))` where base padding already exists |
| Optional position offsets | e.g. `top` / `right` / `bottom` using `max()` or `calc()` with safe insets for floating UI |

Prefer `env(safe-area-inset-*, 0px)` with an explicit fallback.

Refactor the existing event sticky CTA class  
`pb-[max(0.75rem,env(safe-area-inset-bottom))]`  
to use the shared utility once available.

### 3. Application map

| Surface | File(s) | Change |
|--------|---------|--------|
| Sticky header | `AppHeader.tsx` | `pt-safe` on header (or inner nav) so content sits below island; horizontal safe padding on nav row. Background/glass remains full-bleed. |
| App shell main | `App.tsx` | Horizontal safe padding combined with existing `px-4` / `sm:px-6` via `max()` or additive safe padding; no large layout shift on desktop. |
| Event sticky apply | `EventDetailPage.tsx` | Keep bottom safe behavior; use shared utility; ensure horizontal safe if needed on fixed bar. |
| Toasts | `ToastHost.tsx` | Offset `top`/`right` by safe insets (not under island or rounded corners). |
| Install prompt | `InstallPrompt.tsx` | Offset `bottom`/`right` by safe insets. |
| Bottom sheets / modals | e.g. `DeleteEventModal.tsx`, applications modal, similar fixed bottom sheets | Bottom (+ side) safe padding on sheet panel or container. |
| Full-screen overlays | `OnboardingGate.tsx`, mobile menu backdrop/panel as needed | Top/bottom safe on chrome and primary controls. |
| Notifications popover | `NotificationsBell.tsx` | Top offset accounts for header height **and** safe-area top when fixed on mobile. |

### 4. Layout rules

1. **Bleed chrome, pad content:** sticky/fixed panels can extend into unsafe regions; interactive text/controls must not.
2. **Compose with existing padding:** use `max(existing, env(...))` or additive padding so we do not shrink below current spacing on non-notch devices.
3. **md+ breakpoints:** where mobile-only fixed bars become static (e.g. event CTA), safe-area classes must not leave extra empty space on desktop — reset or rely on zero insets.
4. **No device UA sniffing.**

## Testing

- Existing unit/smoke tests continue to pass; sticky CTA test still finds `event-sticky-cta`.
- Manual / simulator: iOS Safari or Xcode simulator with notch/Dynamic Island:
  - Header title and controls clear of island.
  - Sticky apply and install prompt clear of home indicator.
  - Toast readable and tappable.
  - Onboarding controls clear of top and bottom insets.
  - Landscape: content not under side notch if applicable.
- Non-notch / desktop: no visible padding regression.

## Implementation notes

- Prefer few shared utilities over one-off arbitrary values scattered in class strings.
- Do not add a React context or resize listeners for this work.
- Keep changes visual/layout-only; no API or routing changes.
