import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminPendingCountsContext } from '../../admin/AdminPendingCountsContext';
import AdminPendingBadge from '../../components/AdminPendingBadge';
import EventRequestsPanel from './EventRequestsPanel';
import RoleRequestsPanel from './RoleRequestsPanel';

type Tab = 'coach' | 'organizer' | 'events';

function parseTab(raw: string | null): Tab {
  if (raw === 'organizer' || raw === 'events' || raw === 'coach') return raw;
  return 'coach';
}

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  coach: 'Search by name, email, or note',
  organizer: 'Search by name, email, or note',
  events: 'Search by title, city, place, or creator',
};

export default function AdminRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));
  const { counts, refresh } = useAdminPendingCountsContext();
  const [query, setQuery] = useState('');

  const setTab = (next: Tab) => {
    setParams(next === 'coach' ? {} : { tab: next }, { replace: true });
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'coach', label: 'Coach', count: counts.coach },
    { id: 'organizer', label: 'Organizer', count: counts.organizer },
    { id: 'events', label: 'Events', count: counts.events },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
        Admin requests
      </h1>
      <p className="text-sm text-muted">
        Moderate role access and event go-live.
      </p>

      <div
        role="tablist"
        aria-label="Request type"
        className="flex flex-wrap gap-2"
      >
        {tabs.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={
                selected
                  ? 'inline-flex items-center rounded-[var(--radius-control)] bg-cobalt px-3 py-2 text-sm font-semibold text-white'
                  : 'inline-flex items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy'
              }
            >
              {t.label}
              <AdminPendingBadge
                count={t.count}
                label={`${t.label} pending`}
                tone={selected ? 'onCobalt' : 'default'}
              />
            </button>
          );
        })}
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
          placeholder={SEARCH_PLACEHOLDER[tab]}
          aria-label="Search requests"
          className="w-full border-0 bg-transparent py-2.5 text-sm text-navy placeholder:text-muted outline-none"
        />
      </label>

      {tab === 'coach' ? (
        <RoleRequestsPanel
          role="coach"
          query={query}
          onChanged={() => void refresh()}
        />
      ) : null}
      {tab === 'organizer' ? (
        <RoleRequestsPanel
          role="organizer"
          query={query}
          onChanged={() => void refresh()}
        />
      ) : null}
      {tab === 'events' ? (
        <EventRequestsPanel query={query} onChanged={() => void refresh()} />
      ) : null}
    </div>
  );
}
