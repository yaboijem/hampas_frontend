# Events page hero — court photo background

**Date:** 2026-08-17  
**Status:** Approved  
**Scope:** Events discovery page hero only (`EventsPage`)

## Goal

Use `public/courtwball.jpg` as the visual background of the events page hero so the hub feels on-court, while keeping title, subtitle, and “Find a game” readable and usable.

## Non-goals

- Full-bleed edge-to-edge banner outside the page content width
- Changing filters, weather strip, event list, or event cards
- Replacing event photo placeholders elsewhere with this asset
- New copy, marketing claims, or additional CTAs

## Context

- Hero today: top block in `src/pages/Events/EventsPage.tsx` — “VOLLEYBALL HUB” kicker, large title (“Games Near You” / “Events in Pampanga”), short subtitle, primary “Find a game” button.
- Asset: `public/courtwball.jpg` (served as `/courtwball.jpg`).
- Layout language: contained page, rounded cards (`--radius-card`), cobalt primary actions, navy text on ice background.

## Approach (chosen)

**CSS background on a contained hero card** with a dark navy/black gradient overlay and light text.

Alternatives considered:

| Approach | Trade-off |
|----------|-----------|
| CSS `background-image` + overlay (chosen) | Minimal DOM; matches card styling |
| Stacked `<img>` + absolute overlay | Better native lazy/alt patterns; more markup for same look |
| Full-bleed breakout banner | Stronger marketing; fights contained layout |

## Visual design

1. **Container**  
   - Hero root becomes a single rounded card (`rounded-[var(--radius-card)]`, existing border/shadow language as fits).  
   - Internal padding sufficient for title + CTA on mobile and desktop.  
   - Preserve current flex layout: stack on small screens; title block left / CTA right on `sm+`.

2. **Background**  
   - `background-image: url(/courtwball.jpg)`  
   - `background-size: cover`  
   - `background-position: center`  
   - Decorative only (no meaningful `alt` required).

3. **Overlay**  
   - Dark navy/black gradient over the photo (approx. 60–75% effective opacity on the text region).  
   - Goal: WCAG-friendly contrast for white/near-white text on the busiest parts of the court photo.  
   - Prefer gradient (e.g. stronger from bottom or left) over a flat slab if it keeps more of the court visible without hurting readability.

4. **Typography & controls**  
   - Kicker, title, subtitle: light/white (or ice) on the overlay.  
   - Subtitle/muted line: soft white / ice at reduced opacity, still readable.  
   - Primary CTA: keep cobalt filled button (high contrast on dark hero). Switch to white outline only if cobalt fails visual balance in implementation.

5. **Responsive**  
   - Cover crop must remain sensible on narrow phones (court/ball not awkwardly cropped if avoidable; center is fine).  
   - No horizontal overflow; hero stays within page content width.

## Implementation notes

- **File:** `src/pages/Events/EventsPage.tsx` (hero markup/classes only; optional tiny utility classes in `src/index.css` if Tailwind alone is awkward for the gradient stack).  
- **Asset path:** `/courtwball.jpg` from public.  
- **No new dependencies.**  
- Prefer Tailwind utilities already used in the project (`bg-cover`, `bg-center`, gradient overlays, `text-white`, existing radius tokens).

## Accessibility

- Background is decorative; do not announce the photo.  
- Ensure title and button remain keyboard-focusable and visible with existing focus rings (may need a light ring on dark surface).  
- Do not rely on color alone for the CTA; keep clear button label.

## Testing

- Manual: light/dark theme if app theme affects hero tokens — hero should stay intentionally dark-on-photo regardless of page chrome where needed for contrast.  
- Existing discovery/smoke tests should still pass; update only if they assert hero class names or structure that changes.  
- Spot-check mobile width and desktop side-by-side title/CTA.

## Success criteria

- Court photo visible as hero background.  
- Title, subtitle, and “Find a game” clearly readable with dark overlay.  
- Filters and event grid unchanged below the hero.  
- No layout breakage at common breakpoints.
