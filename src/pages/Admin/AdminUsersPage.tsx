import { useEffect, useId, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  ADMIN_PAGE_SIZE,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
} from '../../api/admin';
import type { AdminUserDetail, AdminUserListItem, Role } from '../../api/types';
import { PLAYER_POSITIONS } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import AdminPagination from '../../components/AdminPagination';
import { SKILL_LABEL } from '../../events/eventLabels';
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

const POSITION_LABEL = Object.fromEntries(
  PLAYER_POSITIONS.map((p) => [p.value, p.label]),
) as Record<string, string>;

function formatGender(g: string): string {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  if (g === 'other') return 'Other';
  return g;
}

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRootRef = useRef<HTMLDivElement>(null);
  const filterPanelId = useId();
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailById, setDetailById] = useState<Record<number, AdminUserDetail>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const helperCount = roles.length;

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [query, roles]);

  useEffect(() => {
    setExpandedId(null);
  }, [page]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!filterRootRef.current?.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

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

  const refresh = () => {
    setDetailById({});
    setReloadToken((t) => t + 1);
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailError(null);
      return;
    }
    setExpandedId(id);
    setDetailError(null);
    if (detailById[id]) return;
    setDetailLoadingId(id);
    void (async () => {
      try {
        const detail = await getAdminUser(id);
        setDetailById((m) => ({ ...m, [id]: detail }));
      } catch (err) {
        setDetailError(errMessage(err, 'Failed to load user details.'));
      } finally {
        setDetailLoadingId((cur) => (cur === id ? null : cur));
      }
    })();
  };

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
          <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Users Management</h1>
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

      <div
        className="relative flex items-center rounded-xl border border-border bg-ice shadow-soft transition focus-within:border-cobalt focus-within:bg-surface focus-within:ring-4 focus-within:ring-cobalt/12 sm:rounded-2xl"
        aria-label="Search and filters"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search users</span>
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted sm:left-3.5"
            aria-hidden
          >
            <svg
              className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
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
            className="w-full border-0 bg-transparent py-2.5 pl-10 pr-2 text-sm text-navy placeholder:text-muted outline-none sm:py-3 sm:pl-11"
          />
        </label>

        <div className="relative shrink-0 pr-1.5 sm:pr-2" ref={filterRootRef}>
          <button
            type="button"
            aria-label={helperCount > 0 ? `Filters, ${helperCount} active` : 'Filters'}
            aria-expanded={filtersOpen}
            aria-controls={filterPanelId}
            onClick={() => setFiltersOpen((o) => !o)}
            className={[
              'relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition sm:h-10 sm:w-10 sm:rounded-xl',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35',
              filtersOpen || helperCount > 0
                ? 'bg-cobalt text-white shadow-soft'
                : 'text-muted hover:bg-surface hover:text-navy',
            ].join(' ')}
          >
            <svg
              className="h-[18px] w-[18px] sm:h-5 sm:w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path d="M3.5 6.5h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8" cy="6.5" r="2.35" fill="currentColor" />
              <circle
                cx="8"
                cy="6.5"
                r="0.95"
                className={filtersOpen || helperCount > 0 ? 'fill-cobalt' : 'fill-ice'}
              />
              <path d="M3.5 12h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="15" cy="12" r="2.35" fill="currentColor" />
              <circle
                cx="15"
                cy="12"
                r="0.95"
                className={filtersOpen || helperCount > 0 ? 'fill-cobalt' : 'fill-ice'}
              />
              <path d="M3.5 17.5h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="17.5" r="2.35" fill="currentColor" />
              <circle
                cx="10"
                cy="17.5"
                r="0.95"
                className={filtersOpen || helperCount > 0 ? 'fill-cobalt' : 'fill-ice'}
              />
            </svg>
            {helperCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-electric px-1 text-[10px] font-bold text-white ring-2 ring-ice">
                {helperCount}
              </span>
            ) : null}
          </button>

          {filtersOpen ? (
            <div
              id={filterPanelId}
              role="dialog"
              aria-label="Role filters"
              className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,16rem)] rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgb(15_23_42_/_0.12)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold text-navy">Roles</p>
                {helperCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setRoles([])}
                    className="text-xs font-semibold text-chip-text hover:underline"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-1" role="group" aria-label="Filter by role">
                {ROLE_FILTERS.map((r) => {
                  const selected = roles.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleRole(r.id)}
                      className={[
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition',
                        selected
                          ? 'bg-cobalt text-white'
                          : 'text-navy hover:bg-ice',
                      ].join(' ')}
                    >
                      {r.label}
                      {selected ? (
                        <span className="text-xs font-bold opacity-90" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
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
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft">
            {items.map((u) => {
              const isSelf = authUser?.id === u.id;
              const open = expandedId === u.id;
              const detail = detailById[u.id];
              return (
                <li key={u.id} className="bg-surface">
                  <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggleExpand(u.id)}
                      className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35"
                    >
                      <div className="flex min-w-0 items-start gap-1.5">
                        <span
                          className="mt-0.5 shrink-0 text-xs text-muted transition-transform"
                          aria-hidden
                          style={{ transform: open ? 'rotate(90deg)' : undefined }}
                        >
                          ›
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <span className="truncate text-sm font-semibold text-navy">
                              {u.name}
                            </span>
                            <span className="truncate text-xs text-muted">{u.email}</span>
                          </span>
                          {!open ? (
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {u.roles.map((role) => (
                                <span
                                  key={role}
                                  className="inline-flex rounded-full bg-ice px-1.5 py-px text-[10px] font-semibold leading-4 text-chip-text"
                                >
                                  {ROLE_CHIP[role]}
                                </span>
                              ))}
                              {u.is_admin ? (
                                <span className="inline-flex rounded-full bg-cobalt/15 px-1.5 py-px text-[10px] font-semibold leading-4 text-cobalt">
                                  Admin
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormMode({ edit: u.id })}
                        className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-2 text-xs font-semibold text-navy hover:border-cobalt"
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
                          className="inline-flex h-8 items-center justify-center rounded-[var(--radius-control)] border border-red-200 bg-surface px-2 text-xs font-semibold text-red-700 hover:border-red-400"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {open ? (
                    <div className="space-y-2 border-t border-border/70 bg-ice/50 px-3 py-2.5 sm:px-4">
                      {detailLoadingId === u.id && !detail ? (
                        <p className="text-xs text-muted">Loading details…</p>
                      ) : null}
                      {detailError && expandedId === u.id && !detail ? (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {detailError}
                        </p>
                      ) : null}
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                        <dt className="text-muted">Name</dt>
                        <dd className="font-medium text-navy">{u.name}</dd>
                        <dt className="text-muted">Email</dt>
                        <dd className="break-all font-medium text-navy">{u.email}</dd>
                        <dt className="text-muted">Birth date</dt>
                        <dd className="font-medium text-navy">{u.birth_date}</dd>
                        <dt className="text-muted">Gender</dt>
                        <dd className="font-medium text-navy">{formatGender(u.gender)}</dd>
                        <dt className="text-muted">Admin</dt>
                        <dd className="font-medium text-navy">{u.is_admin ? 'Yes' : 'No'}</dd>
                        <dt className="text-muted">Roles</dt>
                        <dd className="font-medium text-navy">
                          {u.roles.length
                            ? u.roles.map((r) => ROLE_CHIP[r]).join(', ')
                            : 'None'}
                        </dd>
                        <dt className="text-muted">Joined</dt>
                        <dd className="font-medium text-navy">
                          {new Date(u.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </dd>
                      </dl>
                      {detail?.profiles.player ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                            Player profile
                          </p>
                          <p className="mt-0.5 text-sm text-navy">
                            Positions:{' '}
                            {(detail.profiles.player.positions ?? [])
                              .map((p) => POSITION_LABEL[p] ?? p)
                              .join(', ') || '—'}
                          </p>
                          <p className="text-sm text-navy">
                            Skill:{' '}
                            {detail.profiles.player.skill_level
                              ? (SKILL_LABEL[
                                  detail.profiles.player.skill_level as keyof typeof SKILL_LABEL
                                ] ?? detail.profiles.player.skill_level)
                              : '—'}
                          </p>
                        </div>
                      ) : null}
                      {detail?.profiles.coach ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                            Coach profile
                          </p>
                          <p className="mt-0.5 text-sm text-navy">
                            Achievements:{' '}
                            {Array.isArray(detail.profiles.coach.achievements)
                              ? detail.profiles.coach.achievements.join(', ') || '—'
                              : detail.profiles.coach.achievements || '—'}
                          </p>
                          <p className="text-sm text-navy">
                            Experiences:{' '}
                            {Array.isArray(detail.profiles.coach.experiences)
                              ? detail.profiles.coach.experiences.join(', ') || '—'
                              : detail.profiles.coach.experiences || '—'}
                          </p>
                          <p className="text-sm text-navy">
                            Bootcamps:{' '}
                            {Array.isArray(detail.profiles.coach.bootcamp_names)
                              ? detail.profiles.coach.bootcamp_names.join(', ') || '—'
                              : detail.profiles.coach.bootcamp_names ||
                                detail.profiles.coach.bootcamp_name ||
                                '—'}
                          </p>
                        </div>
                      ) : null}
                      {detail?.profiles.organizer ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                            Organizer profile
                          </p>
                          <p className="mt-0.5 text-sm text-navy">
                            Courts:{' '}
                            {Array.isArray(detail.profiles.organizer.managed_courts)
                              ? detail.profiles.organizer.managed_courts.join(', ') || '—'
                              : detail.profiles.organizer.managed_courts || '—'}
                          </p>
                          <p className="text-sm text-navy">
                            Contact: {detail.profiles.organizer.contact_number || '—'}
                            {' · '}
                            {detail.profiles.organizer.contact_email || '—'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
