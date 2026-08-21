# Map Enlarge Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizers can open a fullscreen map sheet from create/edit to place venue pins more accurately on desktop and mobile.

**Architecture:** New `MapSheet` portal dialog hosts a large interactive Leaflet map. `EventLocationPicker` keeps the compact map plus an Expand control; while the sheet is open the compact `MapContainer` is unmounted so only one Leaflet instance runs. Pin state stays in `EventForm` via existing `value`/`onChange`.

**Tech Stack:** React 19, TypeScript, react-leaflet, Vitest + Testing Library, Tailwind v4, existing modal patterns (`createPortal`, body scroll lock, Escape).

## Global Constraints

- Frontend only (`M:\hampas_frontend`); no backend changes.
- Create/edit only — do **not** change `EventMap.tsx` (detail view).
- Fullscreen overlay sheet (not in-place expand).
- Live pin (no Cancel-vs-Apply draft); Done/Close/Escape/backdrop all dismiss and keep current pin.
- One Leaflet map at a time: unmount compact while sheet open.
- Short filenames: `MapSheet.tsx`, `map-sheet.test.tsx`.
- Responsive: mobile full bleed / safe-area; desktop inset card max-width ~56rem; touch targets ≥44px.
- Match modal chrome: `bg-navy/45` backdrop, `z-50`+, `rounded-[var(--radius-card)]`, cobalt primary buttons.
- TDD: failing test → implement → pass → commit per task.
- Spec: `docs/superpowers/specs/2026-08-22-map-enlarge-design.md`

## File map

| Path | Responsibility |
|------|----------------|
| `src/components/MapSheet.tsx` | Fullscreen pin dialog (portal, header, large map, footer) |
| `src/components/EventLocationPicker.tsx` | Expand button, open state, mount compact XOR sheet |
| `src/test/map-sheet.test.tsx` | MapSheet open/close, Escape, onChange wiring |
| `src/test/event-venue-map.test.tsx` | Expand from form picker opens dialog |

---

### Task 1: `MapSheet` — tests + component

**Files:**
- Create: `src/test/map-sheet.test.tsx`
- Create: `src/components/MapSheet.tsx`

**Interfaces:**
- Produces:

```ts
export type LatLng = { lat: number; lng: number };

export type MapSheetProps = {
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

export default function MapSheet(props: MapSheetProps): JSX.Element;
```

- Consumes: `defaultMarkerIcon` from `src/lib/leafletIcon.ts`; same CARTO tile URL as picker; `createPortal` to `document.body`.

- [ ] **Step 1: Write failing tests**

Create `src/test/map-sheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import MapSheet from '../components/MapSheet';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, zoomControl }: { children?: React.ReactNode; zoomControl?: boolean }) => (
    <div data-testid="sheet-map" data-zoom-control={String(!!zoomControl)}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 15,
    invalidateSize: vi.fn(),
  }),
}));

vi.mock('../lib/leafletIcon', () => ({
  defaultMarkerIcon: {},
}));

const base = {
  value: { lat: 15.14, lng: 120.59 },
  onChange: vi.fn(),
  address: 'San Fernando, Pampanga',
  addressStatus: 'idle' as const,
  onUseMyLocation: vi.fn(),
  onClose: vi.fn(),
};

describe('MapSheet', () => {
  test('renders dialog titled Pin venue with address and Done', () => {
    render(<MapSheet {...base} />);
    expect(screen.getByRole('dialog', { name: /pin venue/i })).toBeInTheDocument();
    expect(screen.getByText(/san fernando, pampanga/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-map')).toHaveAttribute('data-zoom-control', 'true');
  });

  test('Done and Close call onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MapSheet {...base} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    onClose.mockClear();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MapSheet {...base} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Use my location button calls handler', async () => {
    const user = userEvent.setup();
    const onUseMyLocation = vi.fn();
    render(<MapSheet {...base} onUseMyLocation={onUseMyLocation} />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));
    expect(onUseMyLocation).toHaveBeenCalledTimes(1);
  });

  test('locks body overflow while mounted', () => {
    const { unmount } = render(<MapSheet {...base} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
npm test -- src/test/map-sheet.test.tsx
```

Expected: FAIL — cannot resolve `../components/MapSheet` or module missing.

- [ ] **Step 3: Implement `MapSheet.tsx`**

Create `src/components/MapSheet.tsx`:

```tsx
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { defaultMarkerIcon } from '../lib/leafletIcon';

export type LatLng = { lat: number; lng: number };

export type MapSheetProps = {
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

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const zoom = typeof map.getZoom === 'function' ? map.getZoom() : 16;
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const run = () => {
      if (typeof map.invalidateSize === 'function') map.invalidateSize();
    };
    const t = window.setTimeout(run, 50);
    const id = requestAnimationFrame(run);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(id);
    };
  }, [map]);
  return null;
}

export default function MapSheet({
  value,
  onChange,
  address,
  addressStatus,
  disabled = false,
  onUseMyLocation,
  locating = false,
  locationError = null,
  onClose,
}: MapSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex min-h-dvh w-full items-stretch justify-center bg-navy/45 sm:items-center sm:p-safe-max-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 bg-surface text-navy shadow-soft sm:h-[min(92dvh,52rem)] sm:max-w-[min(100%,56rem)] sm:rounded-[var(--radius-card)] sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-base font-bold tracking-tight sm:text-lg">
            Pin venue
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface text-navy hover:border-cobalt"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 text-sm font-bold text-white shadow-soft hover:bg-electric"
          >
            Done
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={[value.lat, value.lng]}
            zoom={16}
            className="event-map__leaflet absolute inset-0 h-full w-full"
            scrollWheelZoom={!disabled}
            style={{ height: '100%', width: '100%' }}
            zoomControl
            attributionControl={false}
          >
            <TileLayer
              attribution="&copy; OSM &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <InvalidateSize />
            <Recenter lat={value.lat} lng={value.lng} />
            {!disabled ? <ClickToPin onPick={(lat, lng) => onChange({ lat, lng })} /> : null}
            <Marker
              position={[value.lat, value.lng]}
              icon={defaultMarkerIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onChange({ lat: pos.lat, lng: pos.lng });
                },
              }}
            />
          </MapContainer>

          <p className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-chip-text shadow-sm backdrop-blur-sm">
            Tap map or drag pin
          </p>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-gradient-to-r from-ice/80 via-surface to-sky-tint/40 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={locating || disabled}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] bg-cobalt px-3 py-1.5 text-xs font-bold text-white shadow-soft hover:bg-electric disabled:opacity-60"
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {addressStatus === 'loading' ? (
            <span className="text-[11px] font-medium text-muted">Looking up address…</span>
          ) : addressStatus === 'error' ? (
            <span className="text-[11px] font-medium text-muted">
              Address unavailable — pin will still be saved
            </span>
          ) : address ? (
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-chip-text">
              {address}
            </span>
          ) : null}
          {locationError ? (
            <span role="alert" className="w-full text-[11px] font-medium text-red-600">
              {locationError}
            </span>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
```

Notes for implementer:
- `zoomControl` must be truthy so the mock sees `data-zoom-control="true"`.
- Close button needs accessible name matching `/close/i` (`aria-label="Close"`).
- Dialog name comes from `aria-labelledby` → “Pin venue”.
- Body overflow restore must run on unmount (store previous value).

- [ ] **Step 4: Run tests — expect PASS**

```powershell
npm test -- src/test/map-sheet.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/MapSheet.tsx src/test/map-sheet.test.tsx
git commit -m "feat: add MapSheet fullscreen venue pin dialog"
```

---

### Task 2: Wire Expand into `EventLocationPicker`

**Files:**
- Modify: `src/components/EventLocationPicker.tsx`
- Modify: `src/test/event-venue-map.test.tsx`
- Modify: `src/test/map-sheet.test.tsx` (optional picker-level cases can live in venue-map test)

**Interfaces:**
- Consumes: `MapSheet` default export + same pin props already on picker.
- Produces: Expand control; when expanded, compact map unmounted and `MapSheet` shown.

- [ ] **Step 1: Write failing integration tests**

Append to `src/test/event-venue-map.test.tsx` (keep existing mocks; ensure `useMap` mock includes `invalidateSize: vi.fn()`):

```tsx
import userEvent from '@testing-library/user-event';
// ... existing imports

// In react-leaflet mock, update useMap:
// useMap: () => ({ setView: vi.fn(), getZoom: () => 15, invalidateSize: vi.fn() }),

describe('EventForm venue pin expand', () => {
  test('Expand map opens Pin venue dialog and hides compact map', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('map')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /expand map/i }));

    expect(screen.getByRole('dialog', { name: /pin venue/i })).toBeInTheDocument();
    // One map instance: sheet map only (compact unmounted)
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });

  test('Done closes sheet and restores compact map', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /expand map/i }));
    await user.click(screen.getByRole('button', { name: /^done$/i }));

    expect(screen.queryByRole('dialog', { name: /pin venue/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});
```

Update the leaflet mock in this file so compact map uses `data-testid="map"` (already) and sheet uses `data-testid="sheet-map"` — **MapSheet** already sets `sheet-map` in its test mock; the shared mock in `event-venue-map.test.tsx` must distinguish containers:

```tsx
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    zoomControl,
  }: {
    children?: React.ReactNode;
    zoomControl?: boolean;
  }) => (
    <div data-testid={zoomControl ? 'sheet-map' : 'map'} data-zoom-control={String(!!zoomControl)}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: () => 15,
    invalidateSize: vi.fn(),
  }),
}));
```

Compact picker keeps `zoomControl={false}`; sheet keeps `zoomControl` true — that is how tests tell them apart.

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
npm test -- src/test/event-venue-map.test.tsx
```

Expected: FAIL — no `/expand map/i` button.

- [ ] **Step 3: Update `EventLocationPicker.tsx`**

1. Import `useState`, `useRef`, and `MapSheet`.
2. Add `const [expanded, setExpanded] = useState(false)`.
3. Add `const expandRef = useRef<HTMLButtonElement>(null)`.
4. When `expanded` is true, **do not render** the compact `MapContainer` (keep the card chrome + footer, or hide the whole map area — prefer: keep outer card with footer always; only the map viewport swaps). Spec: unmount compact while sheet open.
5. Render Expand button top-right on the compact map (when `!expanded && !disabled`):

```tsx
<button
  ref={expandRef}
  type="button"
  onClick={() => setExpanded(true)}
  aria-label="Expand map"
  className="absolute right-3 top-3 z-[1] inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border/80 bg-surface/90 px-2.5 text-[11px] font-semibold text-chip-text shadow-sm backdrop-blur-sm hover:border-cobalt sm:min-w-0 sm:px-2.5"
>
  {/* expand / corners icon */}
  <span className="hidden sm:inline">Expand</span>
</button>
```

Use a simple 4-corner expand SVG (18×18). `aria-label="Expand map"` is required for the test.

6. When `expanded`:

```tsx
{expanded ? (
  <MapSheet
    value={value}
    onChange={onChange}
    address={address}
    addressStatus={addressStatus}
    disabled={disabled}
    onUseMyLocation={onUseMyLocation}
    locating={locating}
    locationError={locationError}
    onClose={() => {
      setExpanded(false);
      // restore focus next tick
      requestAnimationFrame(() => expandRef.current?.focus());
    }}
  />
) : null}
```

7. Compact map branch: only when `!expanded`:

```tsx
{!expanded ? (
  <MapContainer
    // existing props — keep zoomControl={false}
    ...
  >
    ...
  </MapContainer>
) : (
  <div className="flex h-56 items-center justify-center bg-ice/40 text-[11px] font-medium text-muted sm:h-60" aria-hidden>
    Map open full screen
  </div>
)}
```

Placeholder keeps card height stable while sheet is open (optional UX polish; if tests only check testids, either approach works).

8. Tip chip stays on compact map only; Expand sits opposite (right).

Full structure sketch:

```tsx
export default function EventLocationPicker(...) {
  const [expanded, setExpanded] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-[var(--radius-card)] border ...">
        <div className="relative">
          {!expanded ? (
            <>
              <MapContainer ... zoomControl={false} className="event-map__leaflet h-56 w-full sm:h-60">
                ...existing children...
              </MapContainer>
              {/* gradient + tip chip unchanged */}
              {!disabled ? (
                <button ref={expandRef} type="button" aria-label="Expand map" ... onClick={() => setExpanded(true)}>
                  ...
                </button>
              ) : null}
            </>
          ) : (
            <div className="flex h-56 ... sm:h-60" aria-hidden>
              Map open full screen
            </div>
          )}
        </div>
        {/* existing footer unchanged */}
      </div>

      {expanded ? (
        <MapSheet
          value={value}
          onChange={onChange}
          address={address}
          addressStatus={addressStatus}
          disabled={disabled}
          onUseMyLocation={onUseMyLocation}
          locating={locating}
          locationError={locationError}
          onClose={() => {
            setExpanded(false);
            requestAnimationFrame(() => expandRef.current?.focus());
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```powershell
npm test -- src/test/event-venue-map.test.tsx src/test/map-sheet.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/EventLocationPicker.tsx src/test/event-venue-map.test.tsx
git commit -m "feat: expand venue pin map into MapSheet on create/edit"
```

---

### Task 3: Regression suite + lint/typecheck

**Files:**
- Verify only (no new features)

- [ ] **Step 1: Run full frontend tests**

```powershell
npm test
```

Expected: all PASS. If other files mock `react-leaflet` without `invalidateSize`, add `invalidateSize: vi.fn()` to those `useMap` mocks only if something starts calling it and throws — MapSheet only mounts when expanded so form tests that never expand should be fine.

Known files with leaflet mocks (update only if failures):
- `src/test/event-form.test.tsx`
- `src/test/event-detail.test.tsx`
- `src/test/event-venue-map.test.tsx` (already updated in Task 2)

- [ ] **Step 2: Lint + typecheck**

```powershell
npm run lint
npm run build
```

Expected: no errors from MapSheet / picker changes.

- [ ] **Step 3: Manual smoke (if dev server available)**

```powershell
npm run dev
```

Check:
1. Create event → Expand map → large map fills viewport (mobile width + desktop).
2. Drag/tap pin → address updates in sheet footer.
3. Done → compact map back; pin retained.
4. Escape closes sheet.
5. Use my location works in sheet.

- [ ] **Step 4: Commit only if mock fixes were needed**

```powershell
git add src/test
git commit -m "test: fix leaflet mocks for MapSheet invalidateSize"
```

Skip commit if working tree clean.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Fullscreen overlay on create/edit | 1–2 |
| Expand control on compact picker | 2 |
| Done / Close / Escape / backdrop dismiss | 1 |
| Live pin, no draft | 1–2 (`onChange` passthrough) |
| One Leaflet instance | 2 (unmount compact) |
| Zoom control on sheet only | 1 |
| Body scroll lock | 1 |
| Focus to Close on open; Expand on close | 1–2 |
| `invalidateSize` after open | 1 (`InvalidateSize`) |
| Responsive mobile/desktop shell | 1 (classes) |
| Short filenames | 1 |
| No EventMap / backend changes | all |
| Tests | 1–3 |

## Self-review notes

- No placeholders left in steps.
- `LatLng` may be duplicated in `MapSheet` and picker — acceptable YAGNI; do not create a shared types file unless a third consumer appears.
- Dialog z-index `220` sits above `RoleRequestModal` (`210`) so expand works if both ever stack; picker form is not under that modal today.
- Safe-area: mobile full-bleed uses `h-dvh`; desktop uses `sm:p-safe-max-4` on scrim — consistent with other modals.
