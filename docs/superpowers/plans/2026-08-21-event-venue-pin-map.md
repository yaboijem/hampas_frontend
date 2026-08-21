# Event Venue Pin Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizers set a required venue name and map pin on create/edit; event detail shows venue name, reverse-geocoded address, and a clickable map that opens Google Maps.

**Architecture:** Backend stores `venue_name`, `location_address`, and public `latitude`/`longitude` on events (policy change: coords are no longer stripped from API). Frontend uses Leaflet + OSM for pinnable editor and read-only detail map; Nominatim reverse-geocodes on pin settle; Google Maps URL for external open.

**Tech Stack:** Laravel (`M:\hampas_backend`), React 19 + TypeScript + Vitest + Tailwind (`M:\hampas_frontend`), `leaflet` + `react-leaflet`, OSM Nominatim.

## Global Constraints

- Pin and `venue_name` are **required** on create/update (no city-center silent fallback on submit).
- Map stack: **Leaflet + OSM** only (no Google Maps JS SDK).
- Reverse geocode: **Nominatim** at pin time; store `location_address`; geocode failure still allows save with null address.
- Detail order: **venue name → pin address → map** (then barangay/city as secondary place context).
- Map click opens `https://www.google.com/maps?q={lat},{lng}` in a new tab.
- Venue pin is **public** on event JSON (list/show/hosted/admin). Player GPS for nearby stays private.
- Backend repo: `M:\hampas_backend`. Frontend repo: `M:\hampas_frontend`. Commit in the repo you change.
- TDD: failing test → implement → pass → commit per task.
- Spec: `docs/superpowers/specs/2026-08-21-event-venue-pin-map-design.md`

## File map

| Path | Responsibility |
|------|----------------|
| `hampas_backend/database/migrations/*_add_venue_fields_to_events_table.php` | `venue_name`, `location_address` columns |
| `hampas_backend/app/Models/Event.php` | fillable new fields |
| `hampas_backend/app/Http/Controllers/EventController.php` | require venue + coords on store/update |
| `hampas_backend/app/Http/Resources/EventResource.php` | expose venue + coords |
| `hampas_backend/database/seeders/*.php` | sample venue names |
| `hampas_backend/tests/Feature/EventTest.php` | coords + venue round-trip; drop hide-coords test |
| `hampas_backend/tests/Feature/EventListingTest.php` | list includes coords |
| `hampas_frontend/package.json` | leaflet deps |
| `hampas_frontend/src/api/types.ts` | EventItem venue/geo fields |
| `hampas_frontend/src/lib/mapsLink.ts` | Google Maps URL helper |
| `hampas_frontend/src/lib/reverseGeocode.ts` | Nominatim client |
| `hampas_frontend/src/components/EventMap.tsx` | read-only clickable map |
| `hampas_frontend/src/components/EventLocationPicker.tsx` | interactive pin + GPS + address status |
| `hampas_frontend/src/pages/Events/EventForm.tsx` | venue + picker; required pin submit |
| `hampas_frontend/src/pages/Events/EventDetailPage.tsx` | Location section |
| `hampas_frontend/src/main.tsx` or map module | Leaflet CSS import |
| `hampas_frontend/src/test/mapsLink.test.ts` | URL helper |
| `hampas_frontend/src/test/reverseGeocode.test.ts` | geocode mock |
| `hampas_frontend/src/test/event-venue-map.test.tsx` | detail location block + form fields |

---

### Task 1: Backend — migration + Event fillable

**Files:**
- Create: `M:\hampas_backend\database\migrations\2026_08_21_120000_add_venue_fields_to_events_table.php`
- Modify: `M:\hampas_backend\app\Models\Event.php`

**Interfaces:**
- Produces: `events.venue_name` nullable string(255); `events.location_address` nullable string(500); model fillable includes both.

- [ ] **Step 1: Create migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('venue_name')->nullable()->after('city');
            $table->string('location_address', 500)->nullable()->after('venue_name');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['venue_name', 'location_address']);
        });
    }
};
```

- [ ] **Step 2: Update Event fillable**

In `Event.php` `$fillable`, add `'venue_name', 'location_address'` next to city/lat/lng:

```php
protected $fillable = [
    'created_by', 'title', 'description', 'event_type', 'skill_level',
    'barangay', 'city', 'venue_name', 'location_address', 'latitude', 'longitude', 'starts_at',
    'photo_path', 'visibility', 'host_display_as', 'show_participants_publicly',
];
```

- [ ] **Step 3: Run migration**

```powershell
cd M:\hampas_backend
php artisan migrate
```

Expected: migration succeeds.

- [ ] **Step 4: Commit (backend)**

```powershell
cd M:\hampas_backend
git add database/migrations/2026_08_21_120000_add_venue_fields_to_events_table.php app/Models/Event.php
git commit -m "feat: add venue_name and location_address to events"
```

---

### Task 2: Backend — EventResource exposes venue + coordinates

**Files:**
- Modify: `M:\hampas_backend\app\Http\Resources\EventResource.php`
- Modify: `M:\hampas_backend\tests\Feature\EventTest.php`
- Modify: `M:\hampas_backend\tests\Feature\EventListingTest.php`

**Interfaces:**
- Produces: JSON keys `venue_name`, `location_address`, `latitude`, `longitude` on every EventResource payload.
- Consumes: model attributes from Task 1.

- [ ] **Step 1: Replace hide-coords tests with expose-coords tests**

In `EventTest.php`, replace `test_event_response_never_contains_coordinates` with:

```php
public function test_event_response_includes_venue_and_coordinates(): void
{
    [, $token] = $this->authUser();

    $this->withToken($token)->postJson('/api/events', $this->payload([
        'venue_name' => 'Clark Court 3',
        'location_address' => 'Angeles, Pampanga',
        'latitude' => 15.1395,
        'longitude' => 120.5877,
    ]))
        ->assertStatus(201)
        ->assertJsonPath('venue_name', 'Clark Court 3')
        ->assertJsonPath('location_address', 'Angeles, Pampanga')
        ->assertJsonPath('latitude', 15.1395)
        ->assertJsonPath('longitude', 120.5877);
}
```

Also update private `payload()` defaults so existing create tests still pass once validation requires venue + coords (Task 3 will enforce; add defaults now):

```php
private function payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Sunday Open Play',
        'description' => 'Casual games for everyone.',
        'event_type' => 'open_play',
        'skill_level' => 'all_levels',
        'barangay' => 'Malabanias',
        'city' => 'Angeles City',
        'venue_name' => 'Test Court',
        'location_address' => null,
        'latitude' => 15.145,
        'longitude' => 120.588,
        'starts_at' => now()->addDays(3)->format('Y-m-d\TH:i'),
    ], $overrides);
}
```

In `EventListingTest.php`, replace `test_list_never_contains_coordinates` with:

```php
public function test_list_includes_coordinates_when_set(): void
{
    $this->createEvent([
        'latitude' => 15.1395,
        'longitude' => 120.5877,
        'venue_name' => 'Listed Court',
    ]);

    $this->getJson('/api/events')
        ->assertStatus(200)
        ->assertJsonPath('data.0.latitude', 15.1395)
        ->assertJsonPath('data.0.longitude', 120.5877)
        ->assertJsonPath('data.0.venue_name', 'Listed Court');
}
```

- [ ] **Step 2: Run tests — expect FAIL (resource missing keys)**

```powershell
cd M:\hampas_backend
php artisan test --filter=test_event_response_includes_venue_and_coordinates
php artisan test --filter=test_list_includes_coordinates_when_set
```

Expected: FAIL — JSON missing `latitude` / `venue_name`.

- [ ] **Step 3: Expose fields in EventResource**

After `'city' => $this->city,` add:

```php
'venue_name' => $this->venue_name,
'location_address' => $this->location_address,
'latitude' => $this->latitude,
'longitude' => $this->longitude,
```

- [ ] **Step 4: Run tests — expect PASS**

```powershell
cd M:\hampas_backend
php artisan test --filter=test_event_response_includes_venue_and_coordinates
php artisan test --filter=test_list_includes_coordinates_when_set
php artisan test --filter=EventTest
php artisan test --filter=EventListingTest
```

Expected: PASS.

- [ ] **Step 5: Commit (backend)**

```powershell
cd M:\hampas_backend
git add app/Http/Resources/EventResource.php tests/Feature/EventTest.php tests/Feature/EventListingTest.php
git commit -m "feat: expose venue pin and address on event API"
```

---

### Task 3: Backend — require venue_name + coordinates on create/update

**Files:**
- Modify: `M:\hampas_backend\app\Http\Controllers\EventController.php`
- Modify: `M:\hampas_backend\tests\Feature\EventTest.php`

**Interfaces:**
- Consumes: Form fields `venue_name`, `location_address`, `latitude`, `longitude`.
- Produces: 422 when venue or coords missing; persisted values on 201/200.

- [ ] **Step 1: Add failing validation tests**

```php
public function test_create_requires_venue_name_and_coordinates(): void
{
    [, $token] = $this->authUser();

    $this->withToken($token)->postJson('/api/events', $this->payload([
        'venue_name' => null,
        'latitude' => null,
        'longitude' => null,
    ]))->assertStatus(422)
        ->assertJsonValidationErrors(['venue_name', 'latitude', 'longitude']);
}

public function test_create_accepts_null_location_address(): void
{
    [, $token] = $this->authUser();

    $this->withToken($token)->postJson('/api/events', $this->payload([
        'location_address' => null,
    ]))->assertStatus(201)
        ->assertJsonPath('location_address', null);
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
cd M:\hampas_backend
php artisan test --filter=test_create_requires_venue_name_and_coordinates
```

Expected: FAIL (currently nullable → 201).

- [ ] **Step 3: Update store + update validation in EventController**

In both `store` and `update` validate arrays, change/add:

```php
'venue_name' => ['required', 'string', 'max:255'],
'location_address' => ['nullable', 'string', 'max:500'],
'latitude' => ['required', 'numeric', 'between:-90,90'],
'longitude' => ['required', 'numeric', 'between:-180,180'],
```

(multipart may send empty strings — Laravel `required` rejects empty string.)

- [ ] **Step 4: Run EventTest suite**

```powershell
cd M:\hampas_backend
php artisan test --filter=EventTest
```

Expected: PASS. Fix any update tests that omit new fields by using `payload()`.

- [ ] **Step 5: Commit (backend)**

```powershell
cd M:\hampas_backend
git add app/Http/Controllers/EventController.php tests/Feature/EventTest.php
git commit -m "feat: require venue name and pin coordinates on events"
```

---

### Task 4: Backend — seeders sample venue_name

**Files:**
- Modify: `M:\hampas_backend\database\seeders\SampleEventsSeeder.php`
- Modify: `M:\hampas_backend\database\seeders\PendingEventSeeder.php` (if present)
- Modify: `M:\hampas_backend\database\seeders\CoachHostedEventSeeder.php` (if present)

**Interfaces:**
- Produces: seeded events include non-null `venue_name` (and optional `location_address`).

- [ ] **Step 1: Add venue_name to each event array in seeders**

Example:

```php
'venue_name' => 'Malabanias Open Court',
'location_address' => 'Malabanias, Angeles City, Pampanga',
```

Use distinct names per sample event where easy.

- [ ] **Step 2: Commit (backend)**

```powershell
cd M:\hampas_backend
git add database/seeders
git commit -m "chore: seed venue names on sample events"
```

---

### Task 5: Frontend — types + mapsLink helper (TDD)

**Files:**
- Modify: `M:\hampas_frontend\src\api\types.ts`
- Create: `M:\hampas_frontend\src\lib\mapsLink.ts`
- Create: `M:\hampas_frontend\src\test\mapsLink.test.ts`

**Interfaces:**
- Produces:
  - `EventItem`: `venue_name?: string | null; location_address?: string | null; latitude?: number | null; longitude?: number | null`
  - `googleMapsUrl(lat: number, lng: number): string`

- [ ] **Step 1: Write failing unit test**

```ts
// src/test/mapsLink.test.ts
import { describe, expect, test } from 'vitest';
import { googleMapsUrl } from '../lib/mapsLink';

describe('googleMapsUrl', () => {
  test('builds Google Maps query URL', () => {
    expect(googleMapsUrl(15.1395, 120.5877)).toBe(
      'https://www.google.com/maps?q=15.1395,120.5877',
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```powershell
cd M:\hampas_frontend
npm test -- src/test/mapsLink.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper + types**

```ts
// src/lib/mapsLink.ts
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
```

In `EventItem` (after `city`):

```ts
venue_name?: string | null;
location_address?: string | null;
latitude?: number | null;
longitude?: number | null;
```

- [ ] **Step 4: Run test — expect PASS**

```powershell
cd M:\hampas_frontend
npm test -- src/test/mapsLink.test.ts
```

- [ ] **Step 5: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add src/lib/mapsLink.ts src/test/mapsLink.test.ts src/api/types.ts
git commit -m "feat: EventItem venue fields and Google Maps URL helper"
```

---

### Task 6: Frontend — reverseGeocode (TDD)

**Files:**
- Create: `M:\hampas_frontend\src\lib\reverseGeocode.ts`
- Create: `M:\hampas_frontend\src\test\reverseGeocode.test.ts`

**Interfaces:**
- Produces: `reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null>`
- Nominatim: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}`
- Headers: `Accept: application/json` (browser cannot set custom User-Agent; rely on Referer + app origin).
- Returns `display_name` string or `null` on failure/non-OK.

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, describe, expect, test, vi } from 'vitest';
import { reverseGeocode } from '../lib/reverseGeocode';

describe('reverseGeocode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns display_name on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ display_name: 'Malabanias, Angeles City, Pampanga, Philippines' }),
      }),
    );

    await expect(reverseGeocode(15.145, 120.588)).resolves.toBe(
      'Malabanias, Angeles City, Pampanga, Philippines',
    );
  });

  test('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(reverseGeocode(15.145, 120.588)).resolves.toBeNull();
  });

  test('returns null when ok is false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(reverseGeocode(15.145, 120.588)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```powershell
cd M:\hampas_frontend
npm test -- src/test/reverseGeocode.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/reverseGeocode.ts
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));

  try {
    const res = await fetch(url.toString(), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    const name = data.display_name?.trim();
    return name ? name : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```powershell
cd M:\hampas_frontend
npm test -- src/test/reverseGeocode.test.ts
```

- [ ] **Step 5: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add src/lib/reverseGeocode.ts src/test/reverseGeocode.test.ts
git commit -m "feat: Nominatim reverse geocode helper"
```

---

### Task 7: Frontend — install Leaflet + EventMap (read-only)

**Files:**
- Modify: `M:\hampas_frontend\package.json` (via npm)
- Create: `M:\hampas_frontend\src\components\EventMap.tsx`
- Modify: `M:\hampas_frontend\src\main.tsx` (import leaflet CSS)
- Create/Modify: `M:\hampas_frontend\src\test\event-venue-map.test.tsx`

**Interfaces:**
- Produces: `EventMap({ lat, lng, className?, interactive?: boolean })`
  - When `interactive` is false (default): map not draggable; whole surface is `<a>` (or button wrapping link behavior) opening `googleMapsUrl(lat,lng)` with `target="_blank"` `rel="noopener noreferrer"`.
  - Marker at lat/lng; zoom ~15; height via className (default `h-48 w-full`).

- [ ] **Step 1: Install deps**

```powershell
cd M:\hampas_frontend
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

- [ ] **Step 2: Write failing test for detail link (mock map if needed)**

Prefer testing a thin presentational wrapper that always renders the external link; keep Leaflet in the same component but ensure the anchor is in the DOM:

```tsx
// In event-venue-map.test.tsx — start with link contract only after EventMap exists
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

// jsdom may lack layout APIs Leaflet needs — mock react-leaflet if map mount crashes:
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));

import EventMap from '../components/EventMap';

describe('EventMap', () => {
  test('links to Google Maps at coordinates', () => {
    render(<EventMap lat={15.1395} lng={120.5877} />);
    const link = screen.getByRole('link', { name: /open venue in google maps/i });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps?q=15.1395,120.5877');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```powershell
cd M:\hampas_frontend
npm test -- src/test/event-venue-map.test.tsx
```

- [ ] **Step 4: Implement EventMap + CSS import**

```tsx
// src/components/EventMap.tsx
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { googleMapsUrl } from '../lib/mapsLink';

// Fix default marker icons under Vite bundling
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type Props = {
  lat: number;
  lng: number;
  className?: string;
};

export default function EventMap({ lat, lng, className = 'h-48 w-full' }: Props) {
  const href = googleMapsUrl(lat, lng);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open venue in Google Maps"
      className={`block overflow-hidden rounded-[var(--radius-card)] border border-border ${className}`}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={true}
        style={{ pointerEvents: 'none', height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </a>
  );
}
```

In `main.tsx` after `./index.css`:

```ts
import 'leaflet/dist/leaflet.css';
```

If Vite complains about PNG imports, add `/// <reference` or declare module `*.png` in `vite-env.d.ts`:

```ts
declare module '*.png' {
  const src: string;
  export default src;
}
```

- [ ] **Step 5: Run tests + build typecheck**

```powershell
cd M:\hampas_frontend
npm test -- src/test/event-venue-map.test.tsx
npx tsc -b --pretty false
```

Expected: PASS.

- [ ] **Step 6: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add package.json package-lock.json src/components/EventMap.tsx src/main.tsx src/test/event-venue-map.test.tsx src/vite-env.d.ts
git commit -m "feat: read-only EventMap linking to Google Maps"
```

---

### Task 8: Frontend — EventLocationPicker (interactive pin)

**Files:**
- Create: `M:\hampas_frontend\src\components\EventLocationPicker.tsx`
- Modify: `M:\hampas_frontend\src\test\event-venue-map.test.tsx` (optional picker smoke if stable under jsdom)

**Interfaces:**
- Produces:

```ts
export type LatLng = { lat: number; lng: number };

export type EventLocationPickerProps = {
  value: LatLng;
  onChange: (next: LatLng) => void;
  address: string | null;
  addressStatus: 'idle' | 'loading' | 'error';
  disabled?: boolean;
  onUseMyLocation: () => void;
  locating?: boolean;
  locationError?: string | null;
};
```

- Behavior:
  - `MapContainer` center follows `value`; `Marker` draggable.
  - `useMapEvents({ click(e) { onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) } })`.
  - On marker `dragend`, call `onChange`.
  - Show helper text “Tap the map or drag the pin”.
  - Button “Use my location” → `onUseMyLocation`.
  - Address line: loading → “Looking up address…”; error → “Address unavailable — pin will still be saved”; else show `address`.

Parent owns reverse-geocode debounce (Task 9).

- [ ] **Step 1: Implement EventLocationPicker**

Use same Leaflet icon fix as EventMap (extract shared `src/lib/leafletIcon.ts` if duplication is painful):

```ts
// src/lib/leafletIcon.ts
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
```

Picker sketch:

```tsx
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { defaultMarkerIcon } from '../lib/leafletIcon';

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
  map.setView([lat, lng]);
  return null;
}

// ... MapContainer zoom={15}, Marker draggable position + eventHandlers.dragend
```

Match EventForm field styling (rounded-xl, cobalt buttons, muted helper text).

- [ ] **Step 2: Smoke import / typecheck**

```powershell
cd M:\hampas_frontend
npx tsc -b --pretty false
```

- [ ] **Step 3: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add src/components/EventLocationPicker.tsx src/lib/leafletIcon.ts src/components/EventMap.tsx
git commit -m "feat: interactive EventLocationPicker map pin"
```

---

### Task 9: Frontend — EventForm integration

**Files:**
- Modify: `M:\hampas_frontend\src\pages\Events\EventForm.tsx`
- Modify: `M:\hampas_frontend\src\test\event-venue-map.test.tsx`

**Interfaces:**
- Consumes: `EventLocationPicker`, `reverseGeocode`, `EventItem` initial venue/geo.
- Produces: FormData keys `venue_name`, `location_address`, `latitude`, `longitude` (always set; no city-center fallback).

- [ ] **Step 1: Write failing form tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EventForm from '../pages/Events/EventForm';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
  useMap: () => ({ setView: vi.fn() }),
}));

vi.mock('../lib/reverseGeocode', () => ({
  reverseGeocode: vi.fn().mockResolvedValue('Mock Address, Pampanga'),
}));

describe('EventForm venue pin', () => {
  test('shows venue name field and map helper', () => {
    render(
      <MemoryRouter>
        <EventForm onSubmit={vi.fn()} submitLabel="Save" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/venue name/i)).toBeInTheDocument();
    expect(screen.getByText(/tap the map or drag the pin/i)).toBeInTheDocument();
    expect(screen.queryByText(/optional · for nearby discovery/i)).not.toBeInTheDocument();
  });

  test('blocks submit without venue name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <EventForm onSubmit={onSubmit} submitLabel="Save" />
      </MemoryRouter>,
    );
    // fill other required fields as needed for the form’s client validation
    await user.clear(screen.getByLabelText(/venue name/i));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

Adapt labels/ids to match implementation (`htmlFor` + `useId`).

- [ ] **Step 2: Run — expect FAIL**

```powershell
cd M:\hampas_frontend
npm test -- src/test/event-venue-map.test.tsx
```

- [ ] **Step 3: Wire EventForm**

State:

```ts
const [venueName, setVenueName] = useState(initial?.venue_name ?? '');
const initialPin = (() => {
  if (
    typeof initial?.latitude === 'number' &&
    typeof initial?.longitude === 'number' &&
    Number.isFinite(initial.latitude) &&
    Number.isFinite(initial.longitude)
  ) {
    return { lat: initial.latitude, lng: initial.longitude };
  }
  return cityCenter(initial?.city ?? DEFAULT_EVENT_CITY) ?? PAMPANGA_CENTER;
})();
const [pin, setPin] = useState(initialPin);
const [pinTouched, setPinTouched] = useState(
  typeof initial?.latitude === 'number' && typeof initial?.longitude === 'number',
);
const [locationAddress, setLocationAddress] = useState<string | null>(
  initial?.location_address ?? null,
);
const [addressStatus, setAddressStatus] = useState<'idle' | 'loading' | 'error'>('idle');
// keep locating / locationError for GPS button
```

On city change:

```ts
const onCityChange = (nextCity: string) => {
  setCity(nextCity);
  if (!pinTouched) {
    const c = cityCenter(nextCity) ?? PAMPANGA_CENTER;
    setPin(c);
  }
};
```

Debounced geocode effect when `pin` changes:

```ts
useEffect(() => {
  const ac = new AbortController();
  setAddressStatus('loading');
  const t = window.setTimeout(() => {
    void reverseGeocode(pin.lat, pin.lng, ac.signal).then((addr) => {
      if (ac.signal.aborted) return;
      if (addr) {
        setLocationAddress(addr);
        setAddressStatus('idle');
      } else {
        setLocationAddress(null);
        setAddressStatus('error');
      }
    });
  }, 500);
  return () => {
    ac.abort();
    window.clearTimeout(t);
  };
}, [pin.lat, pin.lng]);
```

`useMyLocation`: geolocation success → `setPin` + `setPinTouched(true)`.

`setPinFromPicker`: `(next) => { setPin(next); setPinTouched(true); }`.

Submit validation:

```ts
if (!venueName.trim()) {
  setError('Please fill in title, description, venue name, city, and start time.');
  return;
}
// remove city-center fallback:
form.set('venue_name', venueName.trim());
if (locationAddress) form.set('location_address', locationAddress);
form.set('latitude', String(pin.lat));
form.set('longitude', String(pin.lng));
```

UI: venue name field above picker; replace old GPS strip with:

```tsx
<label htmlFor={venueId} className={label}>Venue name</label>
<input
  id={venueId}
  className={field}
  value={venueName}
  onChange={(e) => setVenueName(e.target.value)}
  placeholder="e.g. SM City Clark Court 3"
  required
/>
<EventLocationPicker
  value={pin}
  onChange={(next) => {
    setPin(next);
    setPinTouched(true);
  }}
  address={locationAddress}
  addressStatus={addressStatus}
  disabled={submitting}
  onUseMyLocation={useMyLocation}
  locating={locating}
  locationError={locationError}
/>
```

- [ ] **Step 4: Run tests + lint**

```powershell
cd M:\hampas_frontend
npm test -- src/test/event-venue-map.test.tsx
npm run lint
npx tsc -b --pretty false
```

- [ ] **Step 5: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add src/pages/Events/EventForm.tsx src/test/event-venue-map.test.tsx
git commit -m "feat: required venue name and pinnable map on event form"
```

---

### Task 10: Frontend — EventDetailPage Location section

**Files:**
- Modify: `M:\hampas_frontend\src\pages\Events\EventDetailPage.tsx`
- Modify: `M:\hampas_frontend\src\test\event-venue-map.test.tsx`

**Interfaces:**
- Consumes: `event.venue_name`, `event.location_address`, `event.latitude`, `event.longitude`, `EventMap`, `formatEventPlace`.

- [ ] **Step 1: Add failing detail tests**

Mock `getEvent` / render page with router if an existing event-detail test harness exists; otherwise unit-test a small pure block. Preferred: extend page test with mocked API.

Minimal approach — extract nothing; mock API module:

```tsx
vi.mock('../api/events', () => ({
  getEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

// after arranging getEvent resolved value with venue fields:
expect(screen.getByText('Clark Court 3')).toBeInTheDocument();
expect(screen.getByText(/Malabanias, Angeles/i)).toBeInTheDocument();
expect(screen.getByRole('link', { name: /open venue in google maps/i })).toHaveAttribute(
  'href',
  'https://www.google.com/maps?q=15.1395,120.5877',
);
```

Include AuthContext provider as other page tests do — check `src/test` for patterns.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Replace Where row with Location section**

Replace the dl “Where” row block with a section after the meta `dl` (or expand the dl):

Recommended structure (section below When/Distance/Host dl, or replace Where inside dl + map below):

```tsx
const place = formatEventPlace(event.barangay, event.city);
const venueTitle = event.venue_name?.trim() || place;
const hasPin =
  typeof event.latitude === 'number' &&
  typeof event.longitude === 'number' &&
  Number.isFinite(event.latitude) &&
  Number.isFinite(event.longitude);

// In dl: remove simple Where row OR keep When/Distance/Host and move location out:

<section className="mb-6" aria-labelledby="event-location-heading">
  <h2 id="event-location-heading" className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
    Location
  </h2>
  <p className="text-base font-semibold text-navy">{venueTitle}</p>
  {event.location_address?.trim() ? (
    <p className="mt-0.5 text-sm text-muted">{event.location_address.trim()}</p>
  ) : null}
  {event.venue_name?.trim() && place ? (
    <p className="mt-0.5 text-sm text-muted">{place}</p>
  ) : null}
  {hasPin ? (
    <div className="mt-3">
      <EventMap lat={event.latitude!} lng={event.longitude!} className="h-52 w-full" />
    </div>
  ) : null}
</section>
```

Remove the old single **Where** `<div>` from the `dl` so location is not duplicated. Keep When, Distance, Host rows.

- [ ] **Step 4: Run full frontend tests + lint**

```powershell
cd M:\hampas_frontend
npm test
npm run lint
npx tsc -b --pretty false
```

Expected: all PASS.

- [ ] **Step 5: Commit (frontend)**

```powershell
cd M:\hampas_frontend
git add src/pages/Events/EventDetailPage.tsx src/test/event-venue-map.test.tsx
git commit -m "feat: show venue pin map on event detail"
```

---

### Task 11: Manual verification checklist

**Files:** none (manual)

- [ ] **Step 1: Backend up + migrate**

```powershell
cd M:\hampas_backend
php artisan migrate
php artisan test --filter=Event
```

- [ ] **Step 2: Frontend dev**

```powershell
cd M:\hampas_frontend
npm run dev
```

- [ ] **Step 3: Manual pass**

1. Create event: enter venue name, drag pin, wait for address, save.
2. Open event detail: venue name, address, map visible; click map → Google Maps.
3. Edit event: pin and venue rehydrate; move pin; save; detail updates.
4. “Use my location” centers pin (HTTPS or localhost).
5. Legacy-looking event without coords (if any): text-only location, no crash.

- [ ] **Step 4: Final commits only if fixes needed**

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Required pinnable map on create/edit | 8, 9 |
| Venue name field | 1, 3, 5, 9 |
| Reverse geocode at pin time → store address | 6, 9 + backend 1–3 |
| Detail: venue → address → map | 10 |
| Map opens Google Maps | 5, 7, 10 |
| Leaflet + OSM | 7, 8 |
| Backend expose coords (policy change) | 2 |
| Required validation | 3 |
| Seeders | 4 |
| Legacy degrade | 9, 10 |
| Tests | 2, 3, 5, 6, 7, 9, 10 |

No remaining TBD placeholders. Field names consistent: `venue_name`, `location_address`, `latitude`, `longitude`, `googleMapsUrl`, `reverseGeocode`.
`)