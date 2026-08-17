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

export default function AdminRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));
  const { counts, refresh } = useAdminPendingCountsContext();

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

      {tab === 'coach' ? (
        <RoleRequestsPanel role="coach" onChanged={() => void refresh()} />
      ) : null}
      {tab === 'organizer' ? (
        <RoleRequestsPanel role="organizer" onChanged={() => void refresh()} />
      ) : null}
      {tab === 'events' ? (
        <EventRequestsPanel onChanged={() => void refresh()} />
      ) : null}
    </div>
  );
}
