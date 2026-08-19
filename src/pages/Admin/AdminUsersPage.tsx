import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  ADMIN_PAGE_SIZE,
  deleteAdminUser,
  listAdminUsers,
} from '../../api/admin';
import type { AdminUserListItem, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import AdminPagination from '../../components/AdminPagination';
import { showToast } from '../../lib/adminNotifications';
import AdminUserDeleteDialog from './AdminUserDeleteDialog';
import AdminUserFormModal from './AdminUserFormModal';

const ROLE_FILTERS: { id: Role; label: string }[] = [
  { id: 'player', label: 'Player' },
  { id: 'coach', label: 'Coach' },
  { id: 'organizer', label: 'Organizer' },
];

const ROLE_CHIP: Record<Role, string> = {
  player: 'Player',
  coach: 'Coach',
  organizer: 'Organizer',
};

function errMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (typeof data?.message === 'string' && data.message) return data.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<null | 'create' | { edit: number }>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [query, roles]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await listAdminUsers({
          q: query,
          roles,
          page,
          per_page: ADMIN_PAGE_SIZE,
        });
        if (!cancelled) {
          setItems(data.data);
          setLastPage(data.meta.last_page);
          setTotal(data.meta.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errMessage(err, 'Failed to load users.'));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, roles, page, reloadToken]);

  const toggleRole = (role: Role) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const refresh = () => setReloadToken((t) => t + 1);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteAdminUser(deleteTarget.id);
      showToast('User deleted');
      setDeleteTarget(null);
      if (items.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        refresh();
      }
    } catch (err) {
      setDeleteError(errMessage(err, 'Delete failed.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const emptyCopy =
    query.trim() || roles.length > 0 ? 'No matching users.' : 'No users yet.';

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Users</h1>
          <p className="text-sm text-muted">Manage accounts, roles, and profiles.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode('create')}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric"
        >
          Add user
        </button>
      </div>

      <label className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 shadow-soft">
        <span className="text-muted" aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          role="searchbox"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
          className="w-full border-0 bg-transparent py-2.5 text-sm text-navy placeholder:text-muted outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
        {ROLE_FILTERS.map((r) => {
          const selected = roles.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleRole(r.id)}
              className={
                selected
                  ? 'inline-flex items-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white'
                  : 'inline-flex items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy'
              }
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">{emptyCopy}</p>
          {!query.trim() && roles.length === 0 ? (
            <button
              type="button"
              onClick={() => setFormMode('create')}
              className="text-sm font-semibold text-cobalt hover:underline"
            >
              Add user
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((u) => {
              const isSelf = authUser?.id === u.id;
              return (
                <li
                  key={u.id}
                  className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft"
                >
                  <p className="font-display font-bold text-navy">{u.name}</p>
                  <p className="text-sm text-muted">{u.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex rounded-full bg-ice px-2 py-0.5 text-[11px] font-semibold text-chip-text"
                      >
                        {ROLE_CHIP[role]}
                      </span>
                    ))}
                    {u.is_admin ? (
                      <span className="inline-flex rounded-full bg-cobalt/15 px-2 py-0.5 text-[11px] font-semibold text-cobalt">
                        Admin
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMode({ edit: u.id })}
                      className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-navy hover:border-cobalt"
                    >
                      Edit
                    </button>
                    {!isSelf ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(u);
                        }}
                        className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-red-200 bg-surface px-3 py-1.5 text-sm font-semibold text-red-700 hover:border-red-400"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <AdminPagination
            page={page}
            lastPage={lastPage}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {formMode === 'create' ? (
        <AdminUserFormModal
          mode="create"
          onClose={() => setFormMode(null)}
          onSaved={() => {
            setPage(1);
            refresh();
          }}
        />
      ) : null}
      {formMode && typeof formMode === 'object' ? (
        <AdminUserFormModal
          mode="edit"
          userId={formMode.edit}
          onClose={() => setFormMode(null)}
          onSaved={refresh}
        />
      ) : null}

      {deleteTarget ? (
        <AdminUserDeleteDialog
          name={deleteTarget.name}
          email={deleteTarget.email}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (!deleteBusy) setDeleteTarget(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  );
}
