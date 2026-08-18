# Organizer Notification on Event Apply — Design

**Date:** 2026-08-18  
**Status:** Approved  
**Scope:** Backend (`M:\hampas_backend`) + frontend (`M:\hampas_frontend`)

## Problem

When a player applies to a hosted event, the organizer is not notified. They only discover new applicants by opening Manage Applications.

## Goals

- On successful apply, create a **server-backed in-app notification** for the event owner.
- Message exactly: `{Applicant Name} applied for the event`
- Organizer sees it in the existing bell / notifications page; toast when newly discovered after poll baseline (existing client behavior).
- Tapping the notification opens **Manage applications** for that event (`/events/:id/applications`).

## Non-goals

- Email or web push for this event.
- Including event title in the message.
- Deleting or updating the notification when the applicant cancels.
- Notifying anyone other than the event owner (`created_by`).
- Changing apply UX for the applicant beyond existing success toast.

## Approach

**A — Backend create-on-apply + frontend deep-link by type (chosen)**  
Reuse `user_notifications` and the existing frontend poll/toast/inbox. Backend inserts one row for the owner on apply. Frontend routes `application_received` clicks to the applications page.

---

## 1. Backend

### Trigger

`EventApplicationController::apply` — after the application row is created successfully (HTTP 201 path only).

### Notification row

| Field | Value |
|---|---|
| `user_id` | Event owner (`$event->created_by`) |
| `type` | `application_received` |
| `message` | `{Applicant Name} applied for the event` where name is `$request->user()->name` |
| `data` | `{ event_id, application_id, applicant_name }` |
| `read_at` | `null` |

Use the same `UserNotification::create([...])` pattern as `setStatus` for `application_decision`.

### Rules

- Do not create a notification if apply aborts (own event, not live, already applied, etc.).
- Do not create a notification for the applicant on apply.
- Cancel application does not remove or alter this notification.
- No mail side effect for apply (decision mail stays as-is).

### Tests (`OrganizerHostedNotificationsTest` or `ApplicationTest`)

- Player applies → owner has unread notification with exact message and `type = application_received`.
- Notification `data.event_id` matches the event; `data.applicant_name` matches player name.
- Applicant does not receive this notification on apply.

---

## 2. Frontend

### Display

No change to message rendering: inbox and toast already show `notification.message`. Backend-rendered string is authoritative.

### Deep link

Shared navigation target from a notification item:

| Condition | Path |
|---|---|
| `type === 'application_received'` and `data.event_id` present | `/events/{event_id}/applications` |
| else if `data.event_id` present (e.g. `application_decision`) | `/events/{event_id}` |
| else | no navigation (mark read only) |

Apply in:

- `NotificationsBell` open-item handler
- `NotificationsPage` open-item handler

Prefer a tiny pure helper (e.g. `notificationTargetPath(n): string | null`) so both call sites stay consistent and unit-testable.

### Types

Extend `AppNotification.data` optionally:

```ts
applicant_name?: string;
```

`type` remains `string` (values include `application_decision` and `application_received`).

### Copy (optional polish)

Notifications page subtitle may mention applications as well as decisions (e.g. “Applications and decisions”) — not required for correctness.

### Tests

- Helper or UI: `application_received` with `event_id: 5` navigates to `/events/5/applications`.
- Existing decision notification still navigates to `/events/5` (not applications).

---

## 3. Data flow

```
Player applies
  → POST /events/{id}/apply
  → application created
  → UserNotification for owner (application_received)
Player client: existing "Application submitted." toast (unchanged)
Organizer client poll / focus
  → new unread id after baseline → showToast(message) + badge++
Organizer opens bell / inbox
  → tap → mark read → /events/{id}/applications
```

---

## 4. Success criteria

- [ ] Successful apply creates exactly one owner notification with message `{Name} applied for the event`.
- [ ] Organizer unread count / list includes it; applicant does not get this type on apply.
- [ ] Click opens Manage applications for that event.
- [ ] Decision notifications still open event detail.
- [ ] Backend + frontend tests for the above pass.

## 5. Files (expected)

**Backend**

- `app/Http/Controllers/EventApplicationController.php` — create notification in `apply`
- `tests/Feature/OrganizerHostedNotificationsTest.php` (and/or `ApplicationTest.php`)

**Frontend**

- `src/api/types.ts` — optional `applicant_name`
- `src/notifications/notificationTargetPath.ts` (or similar) — **new** helper
- `src/components/NotificationsBell.tsx`
- `src/pages/Notifications/NotificationsPage.tsx`
- `src/test/notifications.test.tsx` (or small dedicated test)

---

## 6. Resolved defaults

- Message: exact short form, no event title.
- Click target: Manage applications.
- Type string: `application_received`.
- Cancel: leave notification as-is.
- Email: none for apply.
