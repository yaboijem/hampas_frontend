import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../../components/EventCard';
import { listEvents, nearbyEvents, type EventFilters } from '../../api/discovery';
import type { EventItem, EventType, SkillLevel } from '../../api/types';
import { fetchWeather, type WeatherSnapshot } from '../../api/weather';
import { ConditionIcon, DropletsIcon, WindIcon } from '../../components/WeatherIcons';
import {
  PAMPANGA_CENTER,
  PAMPANGA_CITIES,
  PAMPANGA_NEARBY_RADIUS_KM,
} from '../../data/pampanga';

type Mode = 'nearby' | 'manual';
type FilterKey = 'type' | 'skill' | 'time';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'open_play', label: 'Open play' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'training_camp', label: 'Training Camp' },
  { value: 'try_out', label: 'Try Out' },
  { value: 'friendly', label: 'Exclusive' },
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
          'inline-flex w-full max-w-full items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition',
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
          className="absolute left-0 z-30 mt-2 w-[min(100vw-2rem,13rem)] sm:w-[min(100vw-2rem,20rem)] rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgb(15_23_42_/_0.12)]"
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
  const [filters, setFilters] = useState<EventFilters>({});
  const [manual, setManual] = useState<{ city: string; barangay: string }>({
    city: '',
    barangay: '',
  });
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<FilterKey | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterRootRef = useRef<HTMLDivElement>(null);
  const filterPanelId = useId();

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!filterRootRef.current?.contains(e.target as Node)) {
        setFiltersOpen(false);
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFiltersOpen(false);
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const focusSearch = () => {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchInputRef.current?.focus({ preventScroll: true });
  };

  const setMenu = useCallback((key: FilterKey | null) => {
    setOpenMenu(key);
  }, []);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  const loadManual = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: EventFilters = { ...filters };
      if (manual.city) params.city = manual.city;
      if (manual.barangay) params.barangay = manual.barangay;
      const page = await listEvents(params);
      setEvents(page.data);
    } catch (err) {
      setEvents([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [filters, manual]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadNearby = useCallback((latitude: number, longitude: number) => {
    setLoading(true);
    setLoadError(null);
    setCoords({ lat: latitude, lng: longitude });
    nearbyEvents(latitude, longitude, PAMPANGA_NEARBY_RADIUS_KM)
      .then((page) => setEvents(page.data))
      .catch((err) => {
        setEvents([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load nearby events.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mode === 'nearby') {
      if (!navigator.geolocation) {
        setGeoHint('Location not supported on this browser. Showing all events.');
        setMode('manual');
        return;
      }
      // Already have coords — don't re-prompt geo on every filter change
      if (coords) {
        return;
      }
      // HTTP on a phone IP is not a secure context — many browsers block GPS there.
      const insecureLan =
        !window.isSecureContext &&
        !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoHint(null);
          loadNearby(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (insecureLan) {
            setGeoHint(
              'Phone browsers block GPS on plain HTTP. Showing Pampanga games from the map center.',
            );
          } else {
            setGeoHint('Location permission denied or timed out. Showing Pampanga games from the map center.');
          }
          // Still load nearby from province center so the list is not empty.
          loadNearby(PAMPANGA_CENTER.lat, PAMPANGA_CENTER.lng);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
      );
      return;
    }
    void loadManual();
  }, [mode, loadNearby, loadManual, coords]);

  useEffect(() => {
    const lat = coords?.lat ?? PAMPANGA_CENTER.lat;
    const lng = coords?.lng ?? PAMPANGA_CENTER.lng;
    let cancelled = false;
    setWeather(null);
    fetchWeather(lat, lng)
      .then((snap) => {
        if (!cancelled) setWeather(snap);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

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
          <p className="mb-1 text-sm font-bold text-muted tracking-wider">
            📍 VOLLEYBALL HUB
          </p>
          <h1 className="font-display text-6xl font-extrabold tracking-tight text-navy">
            {mode === 'nearby' ? 'Games Near\u00A0You' : 'Events in Pampanga'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Explore nearby games, leagues, and camps. Tap to get on&nbsp;court.
          </p>
        </div>
        <button
          type="button"
          onClick={focusSearch}
          className="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-electric"
        >
          Find a game
        </button>
      </div>

      {geoHint ? (
        <p
          role="status"
          className="rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          {geoHint}
        </p>
      ) : null}
      {loadError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {loadError}
        </p>
      ) : null}

      <section
        className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-soft sm:p-5"
        aria-label="Search and filters"
      >
        <div
          className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3"
          aria-label="Local conditions"
        >
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-ice px-2.5 py-1 text-[11px] font-medium text-muted sm:text-xs">
            📍{' '}
            {mode === 'nearby' && coords && !geoHint
              ? 'Near you'
              : mode === 'nearby' && geoHint
                ? 'Pampanga'
                : manual.city || 'Pampanga'}
          </span>
          {weather ? (
            <span
              className="inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-border bg-ice px-2.5 py-1 text-[11px] font-medium text-muted sm:text-xs"
              aria-label={`Weather ${weather.condition}, ${weather.tempC} degrees Celsius, wind ${weather.windKmh} kilometers per hour${
                weather.rainChancePct != null ? `, ${weather.rainChancePct} percent chance of rain` : ''
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ConditionIcon condition={weather.condition} />
                <span>{weather.tempC}°C</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <WindIcon />
                <span>{weather.windKmh} km/h</span>
              </span>
              {weather.rainChancePct != null ? (
                <span className="inline-flex items-center gap-1">
                  <DropletsIcon />
                  <span>{weather.rainChancePct}%</span>
                </span>
              ) : null}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-border bg-ice px-2.5 py-1 text-[11px] font-medium text-muted sm:text-xs">
              Weather…
            </span>
          )}
        </div>

        <div className="relative flex items-center rounded-xl border border-border bg-ice transition focus-within:border-cobalt focus-within:bg-surface focus-within:ring-4 focus-within:ring-cobalt/12 sm:rounded-2xl">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search events</span>
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
              ref={searchInputRef}
              type="search"
              role="searchbox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by event name, city, or barangay"
              className="w-full border-0 bg-transparent py-2.5 pl-10 pr-2 text-sm text-navy placeholder:text-muted outline-none sm:py-3.5 sm:pl-11 sm:text-[15px]"
            />
          </label>

          <div className="relative shrink-0 pr-1.5 sm:pr-2" ref={filterRootRef}>
            <button
              type="button"
              aria-label={helperCount > 0 ? `Filters, ${helperCount} active` : 'Filters'}
              aria-expanded={filtersOpen}
              aria-controls={filterPanelId}
              onClick={() => {
                setFiltersOpen((o) => !o);
                setOpenMenu(null);
              }}
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

            {filtersOpen && (
              <div
                id={filterPanelId}
                role="dialog"
                aria-label="Search filters"
                className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_rgb(15_23_42_/_0.12)]"
              >
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <p className="text-xs font-semibold text-navy">Filters</p>
                  {helperCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearHelpers}
                      className="text-xs font-semibold text-chip-text hover:underline"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <FilterMenu
                    label="Event type"
                    valueLabel={typeLabel}
                    active={Boolean(filters.event_type)}
                    open={openMenu === 'type'}
                    onOpenChange={(next) => setMenu(next ? 'type' : null)}
                  >
                    <p className="mb-2 px-1 text-xs font-medium text-muted">Kind of game</p>
                    <div role="listbox" aria-label="Event type" className="space-y-0.5">
                      <MenuOption
                        label="Any type"
                        selected={!filters.event_type}
                        onClick={() => selectType(undefined)}
                      />
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
                      <MenuOption
                        label="Any skill"
                        selected={!filters.skill_level}
                        onClick={() => selectSkill(undefined)}
                      />
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          From
                        </span>
                        <input
                          type="date"
                          className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-navy outline-none"
                          value={filters.date_from ?? ''}
                          onChange={(e) => setDate('date_from', e.target.value)}
                        />
                      </label>
                      <label className="block rounded-xl border border-border bg-ice px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          To
                        </span>
                        <input
                          type="date"
                          className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-navy outline-none"
                          value={filters.date_to ?? ''}
                          onChange={(e) => setDate('date_to', e.target.value)}
                        />
                      </label>
                    </div>
                  </FilterMenu>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted sm:mt-3">
          <span className="font-semibold text-navy">Tip:</span> Type to search or open filters on the
          right to narrow results.
        </p>
      </section>

      {mode === 'manual' && (
        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4">
          <p className="mb-3 text-sm font-medium text-navy">
            Location unavailable — browse Pampanga, or narrow by city.
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
                <option value="">All Pampanga</option>
                {PAMPANGA_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
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
