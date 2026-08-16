import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../../components/EventCard';
import { listEvents, nearbyEvents, type EventFilters } from '../../api/discovery';
import type { EventItem, EventType, SkillLevel } from '../../api/types';

type Mode = 'nearby' | 'manual';
type FilterKey = 'type' | 'skill' | 'time';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'open_play', label: 'Open play' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'training_camp', label: 'Training Camp' },
  { value: 'friendly', label: 'Friendly' },
];

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'all_levels', label: 'All levels' },
];

function toLocalDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="skeleton-shimmer aspect-[16/10]" />
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-5 w-2/3 rounded" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
      </div>
    </div>
  );
}

function FilterMenu({
  label,
  valueLabel,
  active,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  valueLabel: string;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => onOpenChange(!open)}
        className={[
          'inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/35',
          active || open
            ? 'border-cobalt bg-cobalt text-white shadow-soft'
            : 'border-border bg-surface text-navy hover:border-electric hover:bg-ice',
        ].join(' ')}
      >
        <span className="truncate">
          <span className={active || open ? 'text-white/80' : 'text-muted'}>{label}</span>
          <span className="mx-1.5 opacity-40">·</span>
          <span>{valueLabel}</span>
        </span>
        <span className={['text-[10px] transition-transform', open ? 'rotate-180' : ''].join(' ')} aria-hidden>
          ▼
        </span>
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-label={label}
          className="absolute left-0 z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgb(15_23_42_/_0.12)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={label}
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
        selected
          ? 'bg-sky-tint text-chip-text'
          : 'text-navy hover:bg-ice',
      ].join(' ')}
    >
      {label}
      {selected ? <span aria-hidden>✓</span> : null}
    </button>
  );
}

export default function EventsPage() {
  const [mode, setMode] = useState<Mode>('nearby');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({ city: 'Angeles City' });
  const [manual, setManual] = useState<{ city: string; barangay: string }>({
    city: 'Angeles City',
    barangay: '',
  });
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<FilterKey | null>(null);

  const setMenu = useCallback((key: FilterKey | null) => {
    setOpenMenu(key);
  }, []);

  const loadManual = useCallback(async () => {
    setLoading(true);
    try {
      const params: EventFilters = { ...filters, city: manual.city };
      if (manual.barangay) params.barangay = manual.barangay;
      const page = await listEvents(params);
      setEvents(page.data);
    } finally {
      setLoading(false);
    }
  }, [filters, manual]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadNearby = useCallback((latitude: number, longitude: number) => {
    setLoading(true);
    setCoords({ lat: latitude, lng: longitude });
    nearbyEvents(latitude, longitude)
      .then((page) => setEvents(page.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mode === 'nearby') {
      if (!navigator.geolocation) {
        setMode('manual');
        return;
      }
      // Already have coords — don't re-prompt geo on every filter change
      if (coords) {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => loadNearby(pos.coords.latitude, pos.coords.longitude),
        () => setMode('manual'),
        { timeout: 5000 },
      );
      return;
    }
    void loadManual();
  }, [mode, loadNearby, loadManual, coords]);

  const selectType = (value: EventType | undefined) => {
    setFilters((f) => ({ ...f, event_type: value }));
    setOpenMenu(null);
  };

  const selectSkill = (value: SkillLevel | undefined) => {
    setFilters((f) => ({ ...f, skill_level: value }));
    setOpenMenu(null);
  };

  const setDate = (key: 'date_from' | 'date_to', value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  const applyDatePreset = (preset: 'today' | 'week' | 'clear') => {
    if (preset === 'clear') {
      setFilters((f) => ({ ...f, date_from: undefined, date_to: undefined }));
      setOpenMenu(null);
      return;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (preset === 'week') end.setDate(end.getDate() + 6);
    setFilters((f) => ({
      ...f,
      date_from: toLocalDateInput(start),
      date_to: toLocalDateInput(end),
    }));
    setOpenMenu(null);
  };

  const helperCount = [filters.event_type, filters.skill_level, filters.date_from || filters.date_to].filter(
    Boolean,
  ).length;

  const clearHelpers = () => {
    setFilters((f) => ({
      ...f,
      event_type: undefined,
      skill_level: undefined,
      date_from: undefined,
      date_to: undefined,
    }));
    setOpenMenu(null);
  };

  const visible = useMemo(() => {
    const eventDay = (iso: string) => toLocalDateInput(new Date(iso));

    return events.filter((e) => {
      if (filters.event_type && e.event_type !== filters.event_type) return false;
      if (filters.skill_level && e.skill_level !== filters.skill_level) return false;
      if (filters.date_from && eventDay(e.starts_at) < filters.date_from) return false;
      if (filters.date_to && eventDay(e.starts_at) > filters.date_to) return false;

      const q = query.trim().toLowerCase();
      if (!q) return true;
      const hay = [e.title, e.city, e.barangay ?? '', e.event_type, e.skill_level]
        .join(' ')
        .toLowerCase()
        .replaceAll('_', ' ');
      return hay.includes(q);
    });
  }, [events, query, filters.event_type, filters.skill_level, filters.date_from, filters.date_to]);

  const typeLabel = EVENT_TYPES.find((t) => t.value === filters.event_type)?.label ?? 'Any';
  const skillLabel = SKILL_LEVELS.find((s) => s.value === filters.skill_level)?.label ?? 'Any';
  const timeLabel =
    filters.date_from || filters.date_to
      ? [filters.date_from, filters.date_to].filter(Boolean).join(' – ')
      : 'Any day';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">
            {mode === 'nearby' ? 'Events near you' : 'Events in Angeles City'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Find open play and join the community.
          </p>
        </div>
        <Link
          to="/events/new"
          className="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-electric"
        >
          Create event
        </Link>
      </div>

      <section
        className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft sm:p-5"
        aria-label="Search and filters"
      >
        <label className="relative block">
          <span className="sr-only">Search events</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            role="searchbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by event name, city, or barangay"
            className="w-full rounded-2xl border border-border bg-ice py-3.5 pl-11 pr-4 text-[15px] text-navy placeholder:text-muted transition focus:border-cobalt focus:bg-surface focus:outline-none focus:ring-4 focus:ring-cobalt/12"
          />
        </label>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-navy">Tip:</span> Type to search, then use the menus below to
          filter by event type, skill level, or date — optional helpers, not required.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterMenu
            label="Event type"
            valueLabel={typeLabel}
            active={Boolean(filters.event_type)}
            open={openMenu === 'type'}
            onOpenChange={(next) => setMenu(next ? 'type' : null)}
          >
            <p className="mb-2 px-1 text-xs font-medium text-muted">Kind of game</p>
            <div role="listbox" aria-label="Event type" className="space-y-0.5">
              <MenuOption label="Any type" selected={!filters.event_type} onClick={() => selectType(undefined)} />
              {EVENT_TYPES.map((t) => (
                <MenuOption
                  key={t.value}
                  label={t.label}
                  selected={filters.event_type === t.value}
                  onClick={() => selectType(t.value)}
                />
              ))}
            </div>
          </FilterMenu>

          <FilterMenu
            label="Skill level"
            valueLabel={skillLabel}
            active={Boolean(filters.skill_level)}
            open={openMenu === 'skill'}
            onOpenChange={(next) => setMenu(next ? 'skill' : null)}
          >
            <p className="mb-2 px-1 text-xs font-medium text-muted">Playing pace</p>
            <div role="listbox" aria-label="Skill level" className="space-y-0.5">
              <MenuOption label="Any skill" selected={!filters.skill_level} onClick={() => selectSkill(undefined)} />
              {SKILL_LEVELS.map((s) => (
                <MenuOption
                  key={s.value}
                  label={s.label}
                  selected={filters.skill_level === s.value}
                  onClick={() => selectSkill(s.value)}
                />
              ))}
            </div>
          </FilterMenu>

          <FilterMenu
            label="Time range"
            valueLabel={timeLabel}
            active={Boolean(filters.date_from || filters.date_to)}
            open={openMenu === 'time'}
            onOpenChange={(next) => setMenu(next ? 'time' : null)}
          >
            <p className="mb-2 px-1 text-xs font-medium text-muted">When is the game?</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-ice"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('week')}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-ice"
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('clear')}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-ice"
              >
                Any day
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="block rounded-xl border border-border bg-ice px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">From</span>
                <input
                  type="date"
                  className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-navy outline-none"
                  value={filters.date_from ?? ''}
                  onChange={(e) => setDate('date_from', e.target.value)}
                />
              </label>
              <label className="block rounded-xl border border-border bg-ice px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">To</span>
                <input
                  type="date"
                  className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-navy outline-none"
                  value={filters.date_to ?? ''}
                  onChange={(e) => setDate('date_to', e.target.value)}
                />
              </label>
            </div>
          </FilterMenu>

          {helperCount > 0 && (
            <button
              type="button"
              onClick={clearHelpers}
              className="rounded-full px-3 py-2 text-sm font-semibold text-chip-text hover:bg-sky-tint"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {mode === 'manual' && (
        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4">
          <p className="mb-3 text-sm font-medium text-navy">
            Location unavailable — browse by city instead.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-muted">
              City
              <select
                aria-label="City"
                className="ml-2 rounded-[var(--radius-control)] border border-border bg-surface px-2 py-1.5 text-navy"
                value={manual.city}
                onChange={(e) => setManual((m) => ({ ...m, city: e.target.value }))}
              >
                <option value="Angeles City">Angeles City</option>
              </select>
            </label>
            <label className="text-sm text-muted">
              Barangay
              <input
                aria-label="Barangay"
                className="ml-2 rounded-[var(--radius-control)] border border-border bg-surface px-2 py-1.5 text-navy"
                value={manual.barangay}
                placeholder="Any barangay"
                onChange={(e) => setManual((m) => ({ ...m, barangay: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="rounded-[var(--radius-control)] border border-border bg-surface px-3 py-1.5 text-sm font-medium text-navy hover:border-cobalt"
              onClick={() => void loadManual()}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="text-4xl" aria-hidden>
            🏐
          </div>
          <h2 className="font-display mt-3 text-xl font-bold text-navy">No events found</h2>
          <p className="mt-1 text-sm text-muted">
            Try different filters, clear search, or create the next game.
          </p>
          <Link
            to="/events/new"
            className="mt-4 inline-flex rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white"
          >
            Create event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
