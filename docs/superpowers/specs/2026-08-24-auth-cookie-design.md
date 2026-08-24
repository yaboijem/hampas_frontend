# Auth cookie hardening design (Sanctum SPA)

> Canonical full spec also lives in **hampas_backend**  
> `docs/superpowers/specs/2026-08-24-auth-cookie-design.md`

## Goal

SPA auth via **httpOnly session cookies** (Sanctum SPA), not `localStorage` bearer tokens.

## Frontend scope (this repo)

- Axios `withCredentials` + XSRF; remove Bearer / `hampas_token`
- `GET /sanctum/csrf-cookie` before login/register
- AuthContext: session via `/user` only; `signIn(user)` without token
- Vite proxy `/sanctum` + `/api`
- Update auth-related tests
- Short names: `auth-cookie-design.md`, plan `auth-cookie.md`

## Backend (sibling repo)

Session login/logout, `statefulApi()`, CORS credentials, session SameSite=None in prod — see backend spec copy.

## FE auth flow

```
ensureCsrfCookie()
POST /api/login → { user }
GET  /api/user  (bootstrap)
POST /api/logout
```

## Success

No token in JS storage; login works with credentials; tests green.
