# TanStack Query design (discovery)

## Goal

Add **TanStack Query** and a shared **API error helper**, then migrate **EventsPage** and **EventDetailPage** reads to cached server state—without rewriting the whole frontend.

## Scope

**In**

- Install `@tanstack/react-query`
- `QueryClient` + `QueryClientProvider`
- `getApiErrorMessage` helper
- Query key factory for events
- Migrate `EventsPage` list/nearby loads to `useQuery`
- Migrate `EventDetailPage` `getEvent` to `useQuery`
- Invalidate/refetch detail after local mutations already on those pages (delete, apply refresh) where straightforward
- Update discovery/event-detail tests for `QueryClientProvider`
- Short names: `query-design.md`, plan `query.md`

**Out**

- NotificationsContext poll → RQ
- Admin / profile / applications list pages
- Auth forms
- Full app mutation standardization
- Changing discovery UX (filters, geo, weather)

## Current state

- Axios `api` client + modular `src/api/*`
- Pages: `useEffect` + `useState` loading/error
- Errors: ad hoc `isAxiosError` / string casts; some pages use `showToast`
- `EventsPage`: nearby vs manual modes, client-side type/skill filters on nearby
- `EventDetailPage`: load by id, refresh helpers, delete

## Approach

Foundation + discovery only (chosen). Keep existing `src/api/*` functions as query `queryFn`s.

## Foundation

### Dependency

```bash
npm install @tanstack/react-query
```

Use v5 API (`useQuery`, `useMutation`, `QueryClient`).

### `src/lib/queryClient.ts`

```ts
export function makeQueryClient(): QueryClient
// defaults: staleTime 30_000, retry 1, refetchOnWindowFocus true (library default OK)
export const queryClient = makeQueryClient() // or create per app mount in main
```

Prefer **one client** created in `main.tsx` (or module singleton) for simplicity.

### Provider

In `main.tsx` (inside or outside `BrowserRouter`—either works; place **outside** `BrowserRouter` is fine):

```tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</QueryClientProvider>
```

### `src/lib/apiError.ts`

```ts
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string
```

Rules:

1. If Axios error with `response.data.message` string → use it  
2. Else if `response.data.errors` object (Laravel) → first field’s first message  
3. Else if `err instanceof Error` → `err.message`  
4. Else fallback  

No toast inside helper—callers choose toast vs inline error.

### `src/lib/queryKeys.ts`

```ts
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters: Record<string, unknown>) => ['events', 'list', filters] as const,
    nearby: (lat: number, lng: number, radiusKm: number) =>
      ['events', 'nearby', lat, lng, radiusKm] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
  },
};
```

## EventsPage

- **Manual mode:** `useQuery({ queryKey: queryKeys.events.list(filters), queryFn: () => listEvents(filters), enabled: mode === 'manual' && ... })`
- **Nearby mode:** `useQuery({ queryKey: queryKeys.events.nearby(...), queryFn: () => nearbyEvents(...), enabled: mode === 'nearby' && coords ready })`
- Replace local `loading` / `loadError` with `isPending` / `isFetching` / `error` + `getApiErrorMessage`
- Keep geo permission flow, weather, client-side filters on nearby results
- Do not change URL/API contracts

## EventDetailPage

- `useQuery({ queryKey: queryKeys.events.detail(id), queryFn: () => getEvent(id), enabled: Number.isFinite(id) })`
- Loading/error UI from query
- After successful delete → `queryClient.removeQueries` detail + invalidate `events.all` (or list/nearby)
- Existing refresh-on-focus/custom events: prefer `queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) })` instead of manual `setEvent`

## Testing

- Vitest: wrap renders that hit migrated pages with `QueryClientProvider` and a **fresh** `QueryClient` (`retry: false` in tests)
- Optional tiny unit test for `getApiErrorMessage`
- Existing `discovery.test.tsx` / `event-detail.test.tsx` must pass (update mocks/wrappers as needed)

## Success criteria

1. Discovery + detail still behave the same for users  
2. Remounting detail within `staleTime` does not always hit network (cache)  
3. Shared error parsing on those pages  
4. Lint/typecheck/tests green  
5. No change to notifications/admin yet  

## Risks

- Tests forgetting provider → “No QueryClient” — fix wrappers  
- Double-fetch in StrictMode — RQ handles; don’t add extra effects  
- Nearby `enabled` must wait for coords to avoid bad keys  
