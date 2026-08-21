# Enlarge venue pin map — Design

**Date:** 2026-08-22  
**Status:** Approved for planning  
**Scope:** Frontend only (`hampas_frontend`) — fullscreen enlarge for organizer pin placement on create/edit

## Problem

`EventLocationPicker` uses a compact map (~14–15rem tall). Organizers struggle to place pins accurately, especially on mobile. There is no way to work on a larger map surface.

## Goals

- Let organizers **enlarge** the pin map to near full viewport while creating or editing an event.
- Keep pin placement accurate: tap map, drag pin, scroll zoom in the enlarged view.
- **Responsive** desktop and mobile (safe areas, touch targets ≥44px).
- Short new filenames.
- Match existing modal chrome and brand map styling.

## Non-goals

- Enlarge on event detail (`EventMap` stays a compact Google Maps link card).
- Place search / autocomplete.
- Google Maps JS SDK or paid tiles.
- Backend or API changes.
- Separate Cancel-vs-Apply draft pin (open sheet edits live pin; close keeps it).

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Where | Create/edit only |
| Interaction | Fullscreen overlay sheet |
| Architecture | Shared `MapSheet` dialog; picker opens it |
| Pin model | Single source of truth — no draft |
| Leaflet instances | One at a time: unmount compact map while sheet open |

## Approach

**A — `MapSheet` fullscreen dialog (chosen)**

- New short-named component `MapSheet.tsx`.
- `EventLocationPicker` keeps the compact map + **Expand** control.
- Expand opens `MapSheet` with the same pin props (`value`, `onChange`, address, location actions).
- While open: unmount compact `MapContainer` to avoid dual Leaflet instances and tile waste; remount on close with current pin.
- On open (and after layout): call Leaflet `invalidateSize` so the large map fills correctly.

### Rejected

- **B — Inline expand only:** taller in-form map helps desktop less on mobile and fights long forms.
- **C — Two maps always mounted:** simpler mentally, worse performance and `invalidateSize` bugs.

## UX

### Compact picker

- Unchanged height and existing controls (“Use my location”, address strip, tip chip).
- **Expand** control: top-right over the map (opposite tip chip), pointer-events enabled, label e.g. “Expand map” (`aria-label` + visible icon/text as space allows).
- Disabled when `disabled` prop is true (no expand).

### Map sheet

- Backdrop + dialog, `role="dialog"`, `aria-modal="true"`, labelled by title “Pin venue”.
- **Escape** and backdrop click close the sheet (same as other modals).
- **Done** (primary) and **Close** (X) both dismiss; pin already applied live — no discard.
- **Mobile:** edge-to-edge (or safe-area padded) full viewport height.
- **Desktop (`sm+`):** near-full viewport with modest inset, max width ~`min(100%, 56rem)`, centered, card radius — not a tiny modal.
- Map body: `flex-1` height `calc(100dvh - header - footer)` (or flex column fill).
- Zoom: scroll wheel enabled when not disabled; Leaflet zoom control **on** in sheet only (compact stays `zoomControl={false}`).
- Hint chip: “Tap map or drag pin” retained.
- Footer: same “Use my location” + address / error states as compact.
- Body scroll lock while open; restore on unmount.
- Focus: move focus into dialog on open (Close or Done); restore focus to Expand button on close.

### Responsive checklist

| Breakpoint | Behavior |
|------------|----------|
| &lt; sm | Full bleed sheet; large map; stacked footer if needed |
| sm+ | Inset card sheet; map still dominant |
| Touch | Pin drag + tap; controls min-height 44px |
| Reduced motion | No gratuitous sheet animation if any is added |

## Components & files

| Path | Change |
|------|--------|
| `src/components/MapSheet.tsx` | **New** — fullscreen pin dialog |
| `src/components/EventLocationPicker.tsx` | Expand control; open state; mount/unmount compact vs sheet |
| `src/test/map-sheet.test.tsx` | **New** — open/close, pin via sheet, escape |
| `src/test/event-venue-map.test.tsx` | Expand opens dialog; pin still wires to form |

No new deps. Reuse `defaultMarkerIcon`, CARTO voyager tiles, existing modal patterns (`DeleteEventModal`-style fixed overlay).

### `MapSheet` props (conceptual)

```ts
type MapSheetProps = {
  value: LatLng;
  onChange: (next: LatLng) => void;
  address: string | null;
  addressStatus: 'idle' | 'loading' | 'error';
  disabled?: boolean;
  onUseMyLocation: () => void;
  locating?: boolean;
  locationError?: string | null;
  onClose: () => void;
};
```

Optional: extract shared `ClickToPin` / `Recenter` helpers into the same file or a tiny colocated helper only if duplication is painful — prefer YAGNI.

## Data flow

```
EventForm pin state
    ↓ value / onChange
EventLocationPicker
    ├── compact MapContainer (when !expanded)
    └── MapSheet (when expanded) → same onChange
```

Reverse geocode stays in `EventForm` (existing debounce on `pin`); sheet does not own geocoding.

## Error & edge cases

| Case | Behavior |
|------|----------|
| Geocode loading/error in sheet | Same copy as compact footer |
| Location permission denied | `locationError` in sheet footer |
| Rapid open/close | Unmount cleans listeners; no leaked scroll lock |
| `disabled` while open | Should not open; if form disables mid-flight, sheet still closable, map non-interactive |
| SSR / tests | jsdom: mock leaflet as existing tests do |

## Testing

- Expand opens dialog with accessible name “Pin venue” (or equivalent).
- Escape / Done / Close dismisses dialog.
- Changing pin in sheet updates parent (mock map events or fire `onChange` via test hooks consistent with existing venue map tests).
- Compact map not required to stay in DOM while open.
- Regression: existing venue map tests still pass.

## Implementation notes

- Short filename: `MapSheet.tsx` / `map-sheet.test.tsx`.
- After map container mounts in sheet, `invalidateSize` on next frame / short timeout (Leaflet known need when parent was display-none or zero-sized).
- z-index ≥ existing modals (`z-50`) so sheet sits above form chrome.
- Do not change `EventMap.tsx` or backend.

## Success criteria

1. Organizer can open a large map from create/edit and place a pin more precisely.
2. Desktop and mobile layouts use most of the viewport without breaking safe areas or form submit.
3. Pin value on submit matches last placement in sheet or compact view.
4. Tests cover open/close and pin wiring; no new lint/type errors.
