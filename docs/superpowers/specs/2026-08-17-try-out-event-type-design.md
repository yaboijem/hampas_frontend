# Design: Try Out event type

**Date:** 2026-08-17  
**Status:** Approved  
**Scope:** Frontend (`hampas_frontend`) + backend (`hampas_backend`)

## Goal

Add a new event type **Try Out** so hosts can create and filter try-out sessions the same way as open play, league, tournament, training camp, and exclusive.

## Decisions

| Decision | Choice |
|----------|--------|
| Display label | `Try Out` |
| API / DB value | `try_out` |
| Behavior | Identical to existing types (no special apply rules, pricing, or skill defaults) |
| Emoji | `🎯` |
| Approach | Mirror existing type lists end-to-end (not a shared-enum refactor) |

## Current system

- **DB:** MySQL `events.event_type` enum: `open_play`, `league`, `tournament`, `training_camp`, `friendly`
- **API:** `Rule::in([...])` on list filter, create, and update in `EventController`
- **Frontend:** `EventType` union; `TYPE_LABEL` / `TYPE_EMOJI` in `eventLabels.ts`; `EVENT_TYPES` arrays in `EventForm` and `EventsPage`
- **Legacy:** `friendly` is stored/API; UI labels it Exclusive (`exclusive` is FE-only display alias)

## Changes

### Backend

1. **Migration** — Expand enum to include `try_out` using the same MySQL `ALTER TABLE ... MODIFY event_type ENUM(...)` pattern as `2026_08_16_231446_rename_training_event_type_to_training_camp.php` (driver-aware if sqlite in tests).
2. **Validation** — Add `try_out` to all three `event_type` `Rule::in` lists in `EventController` (index, store, update).
3. **Seeder (optional)** — One sample event with `event_type => try_out` in `SampleEventsSeeder` if present.
4. **Test** — Feature test: authenticated user can create an event with `event_type=try_out` (201, JSON path).

### Frontend

1. **`src/api/types.ts`** — Add `'try_out'` to `EventType`.
2. **`src/events/eventLabels.ts`** — `TYPE_LABEL.try_out = 'Try Out'`, `TYPE_EMOJI.try_out = '🎯'`.
3. **`EventForm.tsx`** — Add `{ value: 'try_out', label: 'Try Out' }` to `EVENT_TYPES`.
4. **`EventsPage.tsx`** — Same entry in filter `EVENT_TYPES`.
5. **Tests** — Assert label/emoji in `eventLabels.test.ts`; form can select `try_out` if covered by form tests.

### Out of scope

- Dedicated try-out workflows (rosters, callbacks, paid tryouts)
- Per-type colors or skill defaults
- Refactoring enum lists into a single shared package
- Migrating or renaming existing rows

## Data flow

Create/edit/filter use the same multipart/JSON `event_type` field. Cards and detail pages already render via `typeLabel` / `typeEmoji`, so no component layout changes beyond the type lists.

## Success criteria

- [ ] Create event with type Try Out succeeds API + UI
- [ ] Discovery filter includes Try Out and filters correctly
- [ ] Cards/detail show `🎯 Try Out`
- [ ] Backend + frontend tests for the new value pass
- [ ] Existing event types unchanged

## Risk notes

- MySQL enum alters must list **all** values including the new one; omitting a value drops it from the enum.
- SQLite test DBs may not enforce enum the same way; follow existing migration driver checks.
