# Admin reports UI design

## Goal

Give admins a read-only **Reports** screen to review user-submitted event/user reports, using the existing `GET /api/admin/reports` API.

## Scope

**In (frontend)**

- `listAdminReports` API helper + types
- `AdminReportsPage` at `/admin/reports` (RequireAuth + RequireAdmin)
- Header/menu nav link for admins
- Paginated list: reporter, target (type + id, link events), reason label, details, created_at
- Vitest coverage for list render
- Short names: `reports-design.md`, plan `reports.md`, `AdminReportsPage.tsx`

**Out**

- Report status / dismiss / resolve workflow (no DB column yet)
- Backend changes (unless response shape blocks FE)
- Pending badge count for reports
- Changing user-facing `ReportModal`

## Current state

| Layer | Status |
|-------|--------|
| BE `POST /api/reports` | Works (verified users) |
| BE `GET /api/admin/reports` | Paginated list + reporter |
| FE `ReportModal` | Submit only |
| FE admin UI | Missing |

API item shape (from controller):

```ts
{
  id: number;
  reporter: { id: number; name: string };
  target_type: 'user' | 'event';
  target_id: number;
  reason: string;
  details: string | null;
  created_at: string; // ISO
}
```

Laravel paginator: `data`, `links`, `meta` (same as other admin lists).

## Approach

Standalone admin page + nav (chosen). Match `AdminUsersPage` / requests chrome (surface cards, cobalt accents, `AdminPagination` if used elsewhere).

## FE modules

### `src/api/reports.ts`

Add:

```ts
export type AdminReport = { ... };

export async function listAdminReports(params?: {
  page?: number;
  per_page?: number;
}): Promise<Paginated<AdminReport>>;
```

Keep existing `getReportReasons` / `submitReport`.

### Reason labels

Share labels with `ReportModal` (extract `REPORT_REASON_LABELS` to `src/content/reportReasons.ts` or import a shared const) so admin and submit UI stay consistent.

### `src/pages/Admin/AdminReportsPage.tsx`

- Load page 1 on mount; pagination controls
- Loading / empty / error states (`getApiErrorMessage` if available)
- Each row/card:
  - Reason (human label)
  - Target: `Event #id` → `Link` to `/events/:id` when `target_type === 'event'`; `User #id` plain text when user
  - Reporter name
  - Details (if any)
  - Relative or locale date from `created_at`
- No action buttons (read-only)

### Routing (`App.tsx`)

```tsx
<Route path="/admin/reports" element={
  <RequireAuth><RequireAdmin><AdminReportsPage /></RequireAdmin></RequireAuth>
} />
```

### Nav (`AppHeader`)

For `user.is_admin`, add link next to Admin requests / Users: **Reports** → `/admin/reports`.

## Testing

- `src/test/admin-reports-page.test.tsx`: mock `listAdminReports`, assert reason/reporter/link render
- Optional: nav link visible for admin (pattern from admin-header tests)

## Success criteria

1. Admin can open Reports and see API data  
2. Event targets deep-link to event detail  
3. Non-admins still blocked by RequireAdmin  
4. Tests green  

## Risks

- Event may be deleted → link 404s (acceptable)  
- User target has no name in API — show id only  
