# Organizer contact on event detail — Design

**Date:** 2026-08-17  
**Status:** Approved for planning  
**Scope:** Backend + frontend — public organizer contact on event detail; editable on organizer profile

## Problem

Event detail only shows the organizer’s **name**. Users cannot reach organizers by phone, email, or social media without leaving the app or guessing contact channels.

## Goals

- Let organizers store optional public contact fields on their **organizer profile**.
- Expose those fields on every event’s `created_by` payload.
- Show contact number and social/email links on **event detail to all users** who can view the event (guests and signed-in).
- Use **inline SVG icons** for phone, email, Facebook, and Instagram (same style family as existing icon components).

## Non-goals

- Per-event contact overrides
- Additional platforms (TikTok, WhatsApp, X, etc.)
- Requiring contact fields before creating or publishing events
- Public user profile pages
- Using login email as the public contact email (separate field instead)

## Approach

**A — Profile fields + expand `created_by` on event API**

Single source of truth on `organizer_profiles`. Event API nests contact under `created_by`. Event detail renders non-empty fields as tappable links with SVG icons.

## Data model (backend)

Add nullable columns on `organizer_profiles`:

| Column | Type | Notes |
|--------|------|--------|
| `contact_number` | string, max ~32 | Freeform phone; display + `tel:` link |
| `contact_email` | string, max 255 | Valid email; `mailto:` link |
| `facebook_url` | string, max 500 | `http`/`https` URL |
| `instagram_url` | string, max 500 | `http`/`https` URL |

- All optional.
- Empty/whitespace on write → store `null` (or empty string normalized to null).
- `OrganizerProfile` `$fillable` + no special casts beyond strings.
- Migration in `hampas_backend`.

## API

### `PUT /profile/organizer`

Extend validation alongside `managed_courts`:

- `contact_number`: nullable string, max 32  
- `contact_email`: nullable email, max 255  
- `facebook_url`: nullable url (`http`/`https`), max 500  
- `instagram_url`: nullable url (`http`/`https`), max 500  

Response profile object includes the new fields (same shape as `GET /profile` → `organizer`).

### Event resources (`EventResource`)

Eager-load creator’s organizer profile where events are serialized for clients (at least `show`; prefer consistent load on list/admin if cheap).

`created_by` shape:

```json
{
  "id": 3,
  "name": "Alex Organizer",
  "contact_number": "+63…",
  "contact_email": "org@example.com",
  "facebook_url": "https://facebook.com/…",
  "instagram_url": "https://instagram.com/…"
}
```

- Missing organizer profile or unset field → JSON `null`.
- No auth gate on these fields: public to anyone who can read the event.

## Frontend types

Extend:

```ts
// EventItem.created_by
created_by: {
  id: number;
  name: string;
  contact_number?: string | null;
  contact_email?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
};

// ProfileFieldset (organizer fields)
contact_number?: string | null;
contact_email?: string | null;
facebook_url?: string | null;
instagram_url?: string | null;
```

## UI

### Profile → Organizer details

Below managed courts, add four fields (edit + view modes, same save flow as courts):

1. Contact number  
2. Contact email  
3. Facebook URL  
4. Instagram URL  

- Save via existing `updateRole('organizer', payload)` sending **managed_courts plus all four contact fields** in one request (one form, one save).
- View mode: show value or muted “Not set”.
- Validation errors from API surface with existing profile error UI.

### Event detail

In the facts `<dl>` card (after **Organizer** name row), add a **Contact** section when **at least one** contact field is non-empty:

| Field | Control |
|-------|---------|
| Phone | `tel:` link, label = number text |
| Email | `mailto:` link, label = email text |
| Facebook | external link, label “Facebook” |
| Instagram | external link, label “Instagram” |

- External links: `target="_blank"`, `rel="noopener noreferrer"`.
- If all contact fields empty/null: omit Contact block entirely (name only — current behavior).
- Visible to all viewers of the page (no owner-only or auth check).

### Icons (SVG)

- Add a small shared module (e.g. `src/components/ContactIcons.tsx`) following `WeatherIcons.tsx` patterns:
  - `PhoneIcon`, `EmailIcon`, `FacebookIcon`, `InstagramIcon`
  - Inline SVG, `currentColor`, configurable `size` / `className`
  - Decorative: `aria-hidden` on icons when adjacent text/link provides the name
- Use icons next to each contact row on **event detail** (and optionally next to profile field labels if it stays clean; detail page is required).

## Edge cases

- Whitespace-only values → treat as empty; do not render row.
- Creator without organizer profile row → all contact nulls.
- Invalid email/URL on profile save → 422; do not crash event detail if bad legacy data (render only if string present; browser handles bad `href` poorly — prefer not to link obviously invalid values if cheap to guard).
- List cards: **out of scope** unless trivial; contact is detail-page focused.

## Testing

### Backend

- Profile update accepts and returns new organizer fields.
- Event show includes contact fields under `created_by` when set; nulls when unset.

### Frontend

- Profile organizer form can edit/save contact fields (mock API).
- Event detail: with contact data → phone/email/social links + icons present.
- Event detail: all null → no Contact block; organizer name still shown.
- Update `baseEvent` fixtures in event-detail tests as needed.

## Files (expected)

| Area | Files |
|------|--------|
| Backend | migration; `OrganizerProfile`; `ProfileController`; `EventResource`; event load paths; feature tests |
| Frontend | `src/api/types.ts`; `ProfilePage.tsx`; `EventDetailPage.tsx`; `ContactIcons.tsx` (new); `event-detail.test.tsx`; profile tests as needed |

## Success criteria

- [ ] Organizer can set contact number, contact email, Facebook URL, Instagram URL on profile.
- [ ] Event detail shows those values to any user viewing the event, with SVG icons and correct link types.
- [ ] Empty fields are hidden; missing data does not break the page.
- [ ] Backend and frontend tests cover happy path and empty path.
