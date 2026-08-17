# Profile page design

## Goal

Redesign the Profile page UI to match HAMPAS Events visual language while keeping existing role/field APIs and behaviors.

## Scope

**In scope**
- Visual/UX polish of `ProfilePage`
- Hero, role chips, account strip (auth user), role edit cards, add-role card
- Loading skeleton, error alert, save/add feedback
- Human-readable labels (e.g. skill levels, positions) without changing API values

**Out of scope**
- Avatar upload, password/email edit, public profiles
- New API endpoints or role types
- Changing profile business rules

## Structure

### 1. Page hero
- Eyebrow: `YOUR COURT ID`
- Title: `Profile` (font-display, navy)
- Subtitle: one line on managing player/coach/organizer details
- Role chips row: capitalized labels for each owned role; empty state muted text “No roles yet”

### 2. Account strip (optional content)
- When `useAuth().user` is available: card with name + email (read-only)
- When loading/absent: omit or show minimal placeholder; do not block role editing

### 3. Role cards (one per owned role)
- Card: surface, border, radius-card, soft shadow
- Header: role emoji + “{Role} details” heading
- Fields from existing `ROLE_FIELDS` with EventForm-like controls:
  - Label: uppercase tracking chip-text style
  - Input/select: rounded-xl border, focus ring cobalt
- Skill level select options: beginner / intermediate / advanced (API values unchanged); display labels Title Case
- Primary button: `Save {role}` (cobalt)
- While saving: disabled button + busy state
- On success: brief inline confirmation optional (toast not required); reload profile as today

### 4. Add role card
- Shown when user does not have all three roles
- Dashed border treatment to distinguish from owned roles
- Role select: only roles not yet owned (or full list with current owned disabled)
- Dynamic fields for selected role
- Button: `Add role`
- After add: clear new fields, reload profile

### 5. Error
- Top-level `role="alert"` banner (light red / red text), same failure messages as today

### 6. Loading
- Initial load: skeleton blocks for chips + 1–2 cards (no blank flash)

## Data & behavior (unchanged)

- `getProfile`, `addRole`, `updateRole` as in `src/api/profiles.ts`
- `ROLE_FIELDS` keys/types unchanged
- Tests must continue to pass (update selectors only if copy/structure requires; keep accessible names for add role, managed courts, save coach, etc.)

## Visual system

- Tokens: ice, surface, navy, cobalt, border, muted, chip-text, radius-card, shadow-soft
- Match Events page density and EventForm field chrome
- Dark mode: rely on existing CSS variables

## Success criteria

- Profile feels consistent with Events/Create event
- All existing profile tests pass (adjusted for new structure if needed)
- Mobile single column; readable tap targets
- No new dependencies
