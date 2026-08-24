# Admin reports meta + password-reset route fix

## Goal

1. Stop `Cannot read properties of undefined (reading 'last_page')` on `/admin/reports`.
2. Make email password-reset links open the existing reset UI.

## Root causes

### Reports

`AdminReportsPage` reads `data.meta.last_page` / `data.meta.total` (same `Paginated<T>` shape as other admin lists).

`ReportController::index` returned `response()->json($paginator)` (raw Laravel paginator). That JSON is **flat** (`last_page` at top level, no `meta`), so `data.meta` is `undefined`.

### Password reset

FE already has:

- `ForgotPasswordPage` at `/forgot-password` (linked from Login)
- `ResetPasswordPage` at `/reset-password` (token via `?token=`)

Backend email URL (`AppServiceProvider`):

`{FRONTEND_URL}/password-reset/{token}?email={email}`

Path and token placement did not match the FE route → email links looked like “no UI”.

## Design

### Reports (backend)

Change `ReportController::index` to return the same envelope as `AdminUserController` / `AdminRoleRequestController`:

```json
{
  "data": [ /* serialized reports */ ],
  "links": { "first", "last", "prev", "next" },
  "meta": { "current_page", "last_page", "per_page", "total" }
}
```

Keep item serialization (reporter, target_type, target_id, reason, details, created_at ISO). Honor `page` / `per_page` query if already supported; otherwise keep default page size 50.

FE `AdminReportsPage` / `listAdminReports` unchanged.

### Password reset (frontend)

- Route `/password-reset/:token` → `ResetPasswordPage` (matches email links).
- Keep `/reset-password` as alias (query `token` still works if present).
- `ResetPasswordPage`: token from `useParams().token` first, else `searchParams.get('token')`; email from `searchParams.get('email')`.
- Use `getApiErrorMessage` for failed forgot/reset requests.

No backend email URL change.

## Out of scope

- Report status / resolve workflow
- Profile “change password” (email code flow already exists)
- Mailer configuration

## Testing

- BE: admin reports response asserts `meta.last_page` (and `data` array).
- FE: render `/password-reset/:token?email=…` shows set-new-password UI and submits token from path.
