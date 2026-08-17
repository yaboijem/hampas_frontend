# Event card skill indicator colors

## Goal

Color-code skill level badges on event cards so difficulty is scannable at a glance (ski-trail metaphor).

## Scope

- In scope: `EventCard` skill pills (photo overlay + bottom chip)
- Out of scope: Event detail page, filters, profile forms (can reuse the shared map later)

## Color system (ski-trail classic)

| `skill_level` | Meaning | Visual |
|---------------|---------|--------|
| `beginner` | Safe, easy, starting out | Green fill, dark green text |
| `intermediate` | Moderate / middle tier | Blue fill, deep blue text (align with cobalt family) |
| `advanced` | High difficulty / expert | Near-black fill, white text, thin red accent border |
| `all_levels` | No difficulty signal | Neutral ice/muted (unchanged intent) |

### Placement

1. **Photo overlay badge** (top-right): level colors with light translucency + backdrop blur so it stays readable on photos.
2. **Body chip** (bottom row): solid tint classes; same hue family as overlay.

Event type chip stays as today (`sky-tint` / `chip-text`).

## Implementation

### Shared map

Add next to `SKILL_LABEL` in `src/events/eventLabels.ts`:

```ts
export const SKILL_BADGE_CLASS: Record<SkillLevel, string> = {
  beginner: '...',      // green
  intermediate: '...',  // blue
  advanced: '...',      // black + red border, white text
  all_levels: '...',    // neutral
};
```

Optional separate overlay vs body keys only if one class string cannot cover both (prefer one map of shared color tokens; compose layout classes in the component).

### EventCard

- Apply map classes to both skill `<span>`s.
- Keep existing layout/position classes on each span.
- Do not change copy; still use `SKILL_LABEL[event.skill_level]`.

### Styling approach

- Tailwind utility classes only (no new CSS tokens required for v1).
- Light/dark: prefer utilities that remain readable in both modes (e.g. fixed green/blue/black tints that work on light surfaces; overlay already uses frosted treatment).
- Contrast: text must remain readable on its fill (WCAG-ish target for small badges).

## Suggested class direction (implementation may tune)

- Beginner: `bg-emerald-100 text-emerald-800` (body); overlay add `border-emerald-200/60 bg-emerald-100/80 backdrop-blur-md`
- Intermediate: `bg-blue-100 text-blue-800` / overlay frosted blue
- Advanced: `bg-slate-900 text-white border border-red-500/70`
- All levels: keep current neutral (`bg-ice text-muted` body; frosted white overlay)

## Testing

- Existing discovery/card tests that assert skill label text should still pass.
- If tests snapshot class names, update expectations for skill badge classes.
- Manual: cards with beginner / intermediate / advanced / all_levels show distinct colors on both badges.

## Success criteria

- Skill level is identifiable by color without reading the label.
- Beginner reads “easy,” advanced reads “hard,” intermediate sits between.
- Type chip and distance badge styling unchanged.
- No new dependencies.
