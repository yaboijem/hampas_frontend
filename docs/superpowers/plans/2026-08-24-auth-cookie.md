# Auth Cookie (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Implement **after** backend plan in `hampas_backend/docs/superpowers/plans/2026-08-24-auth-cookie.md` (session login live).

**Goal:** Browser SPA uses cookie session + CSRF; remove `localStorage` bearer tokens.

**Architecture:** Axios credentials + XSRF; `ensureCsrfCookie` before auth mutations; AuthContext bootstraps via `getMe` only; Vite proxies `/sanctum`.

**Tech Stack:** Axios, Vite, React, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-24-auth-cookie-design.md` (+ backend full copy)
- Short names: `auth-cookie.md`
- Backend must return `{ user }` without `token` on login/register
- Branch `auth-cookie`; don’t stage unrelated WIP
- Default local API base remains `/api` (proxy)

## File map

| Path | Change |
|------|--------|
| `src/api/client.ts` | credentials, drop Bearer |
| `src/api/csrf.ts` | csrf-cookie fetch |
| `src/api/auth.ts` | types without token; csrf before posts |
| `src/auth/AuthContext.tsx` | no hampas_token; signIn(user) |
| `src/pages/Auth/LoginPage.tsx` | signIn(user) |
| `src/pages/Auth/RegisterPage.tsx` | signIn(user) |
| `vite.config.ts` | proxy `/sanctum` |
| `src/test/**` | no localStorage token; mock csrf |
| `.env.example` | note `/api` default |

---

### Task 1: Axios + CSRF

**Files:**
- Modify: `src/api/client.ts`
- Create: `src/api/csrf.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: client.ts**

```ts
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let handlingUnauthorized = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = String(error.config?.url ?? '');
      const isAuthAttempt =
        url.includes('/login') ||
        url.includes('/register') ||
        url.includes('/forgot-password');
      if (!isAuthAttempt && !handlingUnauthorized) {
        handlingUnauthorized = true;
        window.dispatchEvent(new CustomEvent('hampas:unauthorized'));
        handlingUnauthorized = false;
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: csrf.ts**

```ts
import axios from 'axios';
import { API_BASE_URL } from '../config';

/** Origin for Sanctum routes (strip trailing /api). */
export function apiOrigin(): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  if (base.endsWith('/api')) return base.slice(0, -4) || '';
  if (base === '/api') return '';
  try {
    const u = new URL(base, window.location.origin);
    return u.origin;
  } catch {
    return '';
  }
}

export async function ensureCsrfCookie(): Promise<void> {
  const origin = apiOrigin();
  await axios.get(`${origin}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
}
```

When `API_BASE_URL` is `/api`, origin is `''` → request goes to `/sanctum/csrf-cookie` on same host (Vite proxy).

- [ ] **Step 3: vite.config.ts proxy**

```ts
proxy: {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  '/sanctum': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  '/storage': { target: 'http://127.0.0.1:8000', changeOrigin: true },
},
```

- [ ] **Step 4: Commit**

```powershell
git add src/api/client.ts src/api/csrf.ts vite.config.ts
git commit -m "feat: axios credentials and csrf cookie helper"
```

---

### Task 2: Auth API + Context

**Files:**
- Modify: `src/api/auth.ts`
- Modify: `src/auth/AuthContext.tsx`
- Modify: LoginPage, RegisterPage (signIn calls)

- [ ] **Step 1: auth.ts**

Change return types to `{ user: User }` (no token).

Wrap mutating auth calls:

```ts
import { ensureCsrfCookie } from './csrf';

export async function login(...): Promise<{ user: User }> {
  await ensureCsrfCookie();
  const { data } = await api.post('/login', { email, password });
  return data;
}

export async function register(...): Promise<{ user: User }> {
  await ensureCsrfCookie();
  const { data } = await api.post('/register', payload);
  return data;
}

// forgotPassword, resetPassword: ensureCsrfCookie first too
// logout: ensureCsrfCookie optional; still withCredentials
```

- [ ] **Step 2: AuthContext**

```ts
interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => void;  // was (token, user)
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

// bootstrap:
useEffect(() => {
  getMe()
    .then(({ user }) => setUser(normalizeUser(user)))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);

const signIn = (nextUser: User) => {
  setUser(normalizeUser(nextUser));
};

const signOut = async () => {
  try {
    await apiLogout();
  } catch { /* clear anyway */ }
  setUser(null);
};
```

Remove all `localStorage` `hampas_token` usage.

- [ ] **Step 3: LoginPage / RegisterPage**

Find `signIn(token, user)` → `signIn(user)`.

- [ ] **Step 4: Grep**

```powershell
Select-String -Path src -Pattern "hampas_token|signIn\([^,]+," -Recurse
```

Fix remaining.

- [ ] **Step 5: Commit**

```powershell
git add src/api/auth.ts src/auth/AuthContext.tsx src/pages/Auth/
git commit -m "feat: session auth without localStorage token"
```

---

### Task 3: Tests

**Files:** any test setting `hampas_token` or expecting token from login mock

- [ ] **Step 1: Grep tests**

```powershell
Select-String -Path src/test -Pattern "hampas_token|token:"
```

- [ ] **Step 2: Mock csrf in auth tests if needed**

```ts
vi.mock('../api/csrf', () => ({
  ensureCsrfCookie: vi.fn().mockResolvedValue(undefined),
  apiOrigin: () => '',
}));
```

- [ ] **Step 3: login/register mocks return `{ user }` only

- [ ] **Step 4: AuthContext tests — bootstrap calls getMe without pre-set token

- [ ] **Step 5: `npm test` all green

- [ ] **Step 6: Commit**

```powershell
git add src/test
git commit -m "test: session cookie auth without bearer storage"
```

---

### Task 4: Verify FE

- [ ] `npm test`  
- [ ] `npm run build`  
- [ ] Manual: login via `npm run dev` against local API with proxy  

---

## Spec coverage (FE)

| Spec | Task |
|------|------|
| withCredentials / no Bearer | 1 |
| csrf-cookie | 1–2 |
| AuthContext no token | 2 |
| Vite sanctum proxy | 1 |
| Tests | 3 |

## Order

1. Backend plan complete + tests green  
2. This FE plan  
3. Deploy BE env then FE  
