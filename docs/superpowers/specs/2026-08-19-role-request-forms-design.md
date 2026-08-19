# Role request forms (coach / organizer) design

## Goal

Replace one-click coach/organizer requests with a proper per-role form that shows **rules and privileges**, requires the user to **scroll through and accept** them, and allows an **optional note** before submitting. Same form UX from **Profile** and the **create-event access modal**.

## Problem

- Users can request elevated access without understanding privileges or responsibilities.
- Coach and organizer are different roles but share the same bare submit path.
- Admins get little context unless the user happens to send a note.

## Scope

### In scope

- Shared `RoleRequestModal` with **role-specific** title + privileges/rules copy
- **Scroll-to-bottom** gate before the accept checkbox is enabled (if content fits without scroll, checkbox enabled immediately)
- **Required** accept checkbox; **optional** free-text note
- Wire from Profile elevated access + CreateEventAccessModal
- Editable FE copy module with draft privileges/rules for coach and organizer
- Submit via existing `POST /profile/role-requests` (`role` + optional `note`)
- FE tests for gate + submit payload + entry points

### Out of scope

- Backend column for `accepted_rules_at` / versioned legal acceptance (v1 FE gate only)
- Changing admin approve/reject flow
- Multi-step wizard pages or dedicated routes
- Player role attach flow
- Email notifications about rules

## Decisions (approved)

| Topic | Choice |
|-------|--------|
| Structure | Shared modal, role-specific content (Approach A) |
| Entry | Profile **and** create-event access modal |
| Note | Optional |
| Accept | Required checkbox |
| Read gate | Must scroll rules panel to bottom before accept enabled |
| Copy location | FE content module (easy manual edit) |

## Information architecture

### Entry → form

```
Profile elevated access
  → "Request coach" / "Request organizer"
  → RoleRequestModal({ role })

CreateEventAccessModal
  → Coach / Organizer actions (when not pending/granted)
  → RoleRequestModal({ role })
  → on success: refresh local request list; toast; close RoleRequestModal
```

### Modal structure

1. Header: title by role  
2. Scroll region (Privileges, then Rules) with bottom-detection  
3. Checkbox (disabled until scrolled to end / no overflow)  
4. Optional note textarea  
5. Actions: Cancel | Submit request  

### Submit rules

- Disabled while: loading, already pending/approved for that role, note not relevant, **accept unchecked**, or busy  
- Note: trim; empty → send `null` / omit  
- Success: toast, callback to parent, close modal  
- Error: toast or inline alert  

## Draft copy (edit in implementation file)

Store in e.g. `src/content/roleRequestCopy.ts`. User may rewrite freely after ship.

### Coach — privileges

- Create and manage your own events (subject to admin go-live review when required).
- Host training-style and open sessions under your name (shown as **Coach {name}** to players).
- Edit your coach profile (achievements, bootcamp name) so players know your background.
- Receive applications and manage attendance for events you host.
- Represent yourself as a coach in the Hampas community in Pampanga.

### Coach — rules

- Host safely and respectfully; you are responsible for how your sessions are run on the ground.
- Be honest in your request note and profile; do not misrepresent experience or credentials.
- Do not spam, harass, or discriminate against players or other hosts.
- Keep event details accurate (time, place, skill level, fees if any).
- Follow Hampas Terms and Privacy Policy; admins may revoke coach access for abuse.
- Cancel or update events promptly if plans change so players are not stranded.

### Organizer — privileges

- Create and manage events for courts, leagues, and community play (subject to admin go-live review when required).
- Maintain organizer contact details (phone, email, socials) shown on your events.
- Manage managed courts and public-facing host information on your profile.
- Review and act on player applications for events you host.
- Build a visible presence as an event organizer on Hampas.

### Organizer — rules

- You are accountable for the events you publish: accurate venue, schedule, and requirements.
- Communicate clearly with applicants (approve/reject in a reasonable time).
- Do not collect or misuse player personal data beyond what is needed to run the event.
- No fraudulent listings, bait-and-switch, or unsafe venues knowingly promoted.
- Follow Hampas Terms and Privacy Policy; admins may revoke organizer access for abuse.
- If you charge fees offline, state that clearly in the event description; Hampas does not process payments.

### Checkbox label

“I have read and accept the privileges and rules for this role.”

### Note field

- Label: “Note to admin (optional)”  
- Placeholder: “Why you want this role, courts you run, experience, etc.”  
- Max length: match API (500 if backend already caps note)

## Frontend architecture

| Piece | Responsibility |
|-------|----------------|
| `src/content/roleRequestCopy.ts` | Privileges/rules strings + titles per role |
| `src/components/RoleRequestModal.tsx` | Scroll gate, accept, optional note, submit |
| `src/pages/Profile/ProfilePage.tsx` | Open modal instead of direct `createRoleRequest` |
| `src/components/CreateEventAccessModal.tsx` | Open modal; refresh requests on success |
| `src/api/profiles.ts` | Existing `createRoleRequest` (unchanged contract) |
| Tests | Modal gate + submit; entry wires |

### Scroll gate (behavior)

- Attach `onScroll` (and measure on mount/resize) to the rules container.  
- `atBottom` when `scrollTop + clientHeight >= scrollHeight - threshold` (e.g. 8–16px).  
- If `scrollHeight <= clientHeight`, treat as already at bottom.  
- Reset `atBottom` / accept when `role` changes or modal reopens.  
- Accept checkbox `disabled={!atBottom}`; uncheck if user somehow toggles role.

### Visual language

Match existing modals (`DeleteEventModal` / `CreateEventAccessModal`): surface card, cobalt primary, muted body, safe-area padding, Escape + scrim to close when not busy.

## Backend

- **No required change** for v1 if `note` is already optional on `createRoleRequest`.  
- Keep throttle `role-requests`.  
- Validation: `note` nullable string max 500; `role` in coach|organizer.

## Testing

- RoleRequestModal: with tall content mock, accept disabled until scroll; with short content, accept enabled.  
- Submit calls API with role and null/omitted note when empty; with note when filled.  
- Submit blocked without accept.  
- Profile: Request coach opens modal with coach title.  
- CreateEventAccessModal: coach button opens modal (not immediate POST).

## Success criteria

1. No one-click elevated request without opening the form.  
2. Distinct coach vs organizer privileges/rules visible in the form.  
3. Cannot accept until scrolled (or no overflow); cannot submit without accept.  
4. Optional note still reaches admin when provided.  
5. Copy is centralized for easy edits.  
6. Tests cover gate and entry points.

## Implementation notes

- Prefer one modal component + copy map over two near-duplicate modals.  
- Do not block ship on legal review; copy is product draft.  
- If create-event modal stacks two dialogs, ensure z-index RoleRequestModal ≥ parent (e.g. z-[210]).
