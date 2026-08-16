import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import {
  SKILL_LABEL,
  TYPE_LABEL,
  formatEventPlace,
  formatEventWhen,
} from '../events/eventLabels';

export default function EventCard({ event }: { event: EventItem }) {
  const place = formatEventPlace(event.barangay, event.city);
  const when = formatEventWhen(event.starts_at);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-sky-tint via-electric/30 to-cobalt">
        {event.photo_url ? (
          <img
            src={event.photo_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>
            🏐
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-white/70 px-2.5 py-1 text-xs font-semibold text-navy backdrop-blur-md">
          {SKILL_LABEL[event.skill_level]}
        </span>
        {event.distance_km !== undefined && (
          <span className="absolute bottom-3 left-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-medium text-white">
            {event.distance_km} km away
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-display text-lg font-bold text-navy group-hover:text-cobalt">
          {event.title}
        </h2>
        <p className="text-sm text-muted">{when}</p>
        <p className="text-sm text-muted">{place}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <span className="rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text">
            🏐 {TYPE_LABEL[event.event_type]}
          </span>
          <span className="rounded-full bg-ice px-2.5 py-1 text-xs font-medium text-muted">
            {SKILL_LABEL[event.skill_level]}
          </span>
        </div>
      </div>
    </Link>
  );
}
