# Event venue pin map — Design

**Date:** 2026-08-21  
**Status:** Approved for planning  
**Scope:** Frontend (`hampas_frontend`) + backend (`hampas_backend`) — pinnable venue map on create/edit; venue name, pin address, and clickable map on event detail

## Problem

Organizers set event coordinates only via optional “Use my location” GPS. There is no venue name, no way to drop a pin on a map, and event detail shows only barangay/city. The API stores `latitude`/`longitude` but **intentionally omits them from JSON** (tests assert coordinates never appear). Players cannot see or open the exact venue location.

## Goals

- Replace the optional GPS strip on create/edit with a **required pinnable map** plus **venue name**.
- Reverse-geocode the pin (Nominatim) at pin time and store a human-readable **location address**.
- On **EventDetailPage**, show in order:
  1. Location (venue name)
  2. Pin location address
  3. Map with pin (clickable → Google Maps)
- Keep barangay/city for place context and existing listing/filter behavior.
- Touch backend so coordinates and new fields are accepted, stored, and returned on event payloads.

## Non-goals

- Google Maps JS SDK or paid geocoding
- Driving directions UI inside the app
- Per-user private location display (player GPS for nearby remains separate; privacy policy still applies to *user* location)
- Changing nearby-discovery math beyond using the organizer pin as today
- Full address autocomplete / place search (pin + reverse geocode only for v1)

## Approach

**A — Leaflet + OSM editor; store pin + reverse-geocode at pin time**

- Interactive Leaflet map on create/edit; required pin; “Use my location” only recenters the pin.
- Debounced Nominatim reverse geocode on pin settle → `location_address`.
- Detail: venue name → address → read-only clickable Leaflet map → `https://www.google.com/maps?q={lat},{lng}`.

## Data model (backend)

Existing on `events`:

| Column | Today | Change |
|--------|--------|--------|
| `latitude` | nullable decimal | **Required** on create/update validation |
| `longitude` | nullable decimal | **Required** on create/update validation |
| `barangay` | nullable | Unchanged |
| `city` | required | Unchanged |

New columns on `events`:

| Column | Type | Notes |
|--------|------|--------|
| `venue_name` | string, max 255 | Required on create/update |
| `location_address` | string, max 500, nullable | Reverse-geocoded at pin time; may be null if geocode fails |

- Migration in `hampas_backend`.
- `Event` model `$fillable` + casts unchanged for lat/lng floats; add new string fields.
- Seeders: set sample `venue_name` (and optional `location_address`) so detail demos work.

### Privacy / API policy change

Previously: event responses **never** contained coordinates (user-location privacy conflated with venue).

**New rule:** Venue pin is **public** for anyone who can read the event. Expose on all event serializations that power the app (list, show, hosted, admin) so edit can rehydrate the map:

- `latitude` (number | null for legacy rows)
- `longitude` (number | null)
- `venue_name` (string | null for legacy)
- `location_address` (string | null)

Update/remove tests:

- `EventTest::test_event_response_never_contains_coordinates`
- `EventListingTest` assertions that content must not contain `latitude`/`longitude`

Replace with assertions that coordinates **are** present when set, and remain numeric.

Player geolocation for nearby discovery is unchanged and still not displayed as the user’s exact position.

## API

### Create `POST /events` / Update (POST spoof PUT) `/events/{id}`

Form fields (multipart, same as today):

| Field | Validation |
|-------|------------|
| `venue_name` | required, string, max 255 |
| `location_address` | nullable, string, max 500 |
| `latitude` | required, numeric, between -90 and 90 |
| `longitude` | required, numeric, between -180 and 180 |
| `barangay`, `city`, … | as today |

Frontend no longer falls back to city center when pin is missing; backend rejects missing coords.

### `EventResource`

Add to payload:

```json
{
  "venue_name": "SM City Clark Court 3",
  "location_address": "Manuel A. Roxas Hwy, Angeles, Pampanga, Philippines",
  "latitude": 15.1690,
  "longitude": 120.5800,
  "barangay": "Malabanias",
  "city": "Angeles City"
}
```

Legacy events without pin: `latitude`/`longitude`/`venue_name` may be null; frontend degrades gracefully.

## Frontend

### Dependencies

- `leaflet`, `react-leaflet`, `@types/leaflet`
- Import Leaflet CSS once (app entry or shared map module)

### Types (`EventItem`)

```ts
venue_name?: string | null;
location_address?: string | null;
latitude?: number | null;
longitude?: number | null;
```

### Modules

| Module | Role |
|--------|------|
| `src/lib/mapsLink.ts` | `googleMapsUrl(lat, lng)` → Google Maps query URL |
| `src/lib/reverseGeocode.ts` | Nominatim reverse geocode; debounce-friendly; abortable; app User-Agent / referrer-friendly usage |
| `src/components/EventLocationPicker.tsx` | Venue name + interactive map + Use my location + address status |
| `src/components/EventMap.tsx` | Read-only map with pin; whole control opens maps (new tab); keyboard accessible |

### Create/Edit (`EventForm`)

1. **Venue name** required text field.
2. Replace GPS-only strip with **EventLocationPicker**:
   - Map defaults to city center (`cityCenter(city)` / `PAMPANGA_CENTER`) on create.
   - Pin always required; marker draggable; click map to move.
   - Track `pinTouched` (user dragged/tapped or used GPS). On **city** change: if not `pinTouched`, snap pin to new city center and re-geocode; if touched, leave pin.
   - “Use my location” sets pin from geolocation and marks touched.
   - On drag end / programmatic move: debounce reverse geocode → `location_address` (or clear with “Address unavailable” message if fail).
3. Submit: `venue_name`, `location_address` (may be empty string omitted or empty), `latitude`, `longitude` — **no** city-center fallback.
4. Edit: seed from `initial.venue_name`, `initial.latitude/longitude`, `initial.location_address`; if coords missing (legacy), start at city center and require user to confirm pin before save.

### Event detail (`EventDetailPage`)

Replace single **Where** row with a **Location** section:

1. **Venue name** (primary) — if missing, fall back to `formatEventPlace(barangay, city)`.
2. **Pin address** (muted) — if `location_address` present.
3. **Place line** — barangay/city when venue name is shown (secondary context).
4. **EventMap** when lat/lng present — clickable → Google Maps; focusable; `rel="noopener noreferrer"`; aria-label e.g. “Open venue in Google Maps”.

Distance row/chip unchanged when `distance_km` is set.

### Reverse geocode (Nominatim)

- Endpoint: OSM Nominatim reverse API (lat, lon, zoom ~18, `addressdetails=1`).
- Debounce ~500ms after pin settles; cancel in-flight on new move.
- Respect usage policy: identifiable User-Agent / app name; no bulk abuse.
- Format display string from `display_name` or composed address parts.
- Failure: allow save; store null/empty `location_address`.

## UX copy

- Venue label: “Venue name”
- Placeholder example: e.g. court or facility name
- Map helper: “Tap the map or drag the pin”
- GPS button: “Use my location” (centers pin)
- Geocoding: “Looking up address…”
- Geocode fail: “Address unavailable — pin will still be saved”
- Validation: require venue name + pin before submit

## Edge cases

| Case | Behavior |
|------|----------|
| Geocode fails | Save coords; omit address line on detail |
| No GPS permission | User pins manually |
| Legacy event, no coords | Detail: text only, no map; edit: must place pin to save |
| Legacy event, coords but no venue_name | Detail: place (barangay/city) as title line; map if coords |
| Nominatim rate limit | Debounce; show temporary error; keep last good address or empty |
| Open maps on iOS/Android | Google Maps URL still works (app or browser handoff) |

## Testing

### Backend

- Create/update require `venue_name`, `latitude`, `longitude`.
- Resource includes `venue_name`, `location_address`, `latitude`, `longitude`.
- Remove “never contains coordinates” tests; assert coords round-trip.

### Frontend

- `mapsLink` unit test.
- `reverseGeocode` with mocked fetch.
- Form: cannot submit without venue + pin; submits expected FormData keys.
- Detail: renders venue → address → map link with correct `href` (mock map component if needed for jsdom).

## Implementation order

1. Backend migration + model + validation + `EventResource` + test updates + seeder tweaks  
2. Frontend types + maps helpers + Leaflet components  
3. `EventForm` integration  
4. `EventDetailPage` Location section  
5. Frontend tests + manual pass on create → detail → open maps  

## Success criteria

- Organizer must name the venue and place a pin to save.
- Detail shows venue name, pin address (when available), and a map that opens Google Maps at the pin.
- Nearby discovery continues to use stored coordinates.
- No regression to barangay/city listing behavior.
)