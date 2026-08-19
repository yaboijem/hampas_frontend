import { Link } from 'react-router-dom';
import type { EventItem } from '../api/types';
import {
  SKILL_BADGE_CLASS,
  SKILL_BADGE_OVERLAY_CLASS,
  SKILL_LABEL,
  formatEventPlace,
  formatEventWhen,
  typeLabel,
} from '../events/eventLabels';
import BrandMark from './BrandMark';
import TypeMark from './TypeMark';

/**
 * CUSTOMIZE EVENT CARDS HERE → src/components/EventCard.tsx
 *
 * - Layout / chrome: this file (image, title, chips, hover, spacing)
 * - Type marks + labels: src/events/eventLabels.ts + TypeMark
 * - Skill colors: src/events/eventLabels.ts → SKILL_BADGE_CLASS, SKILL_BADGE_OVERLAY_CLASS
 * - Used on: Events list (EventsPage). Detail page is EventDetailPage.tsx
 */
export default function EventCard({
  event,
  index = 0,
}: {
  event: EventItem;
  /** Stagger enter animation (ms delay = index * 70). */
  index?: number;
}) {
  const place = formatEventPlace(event.barangay, event.city);
  const when = formatEventWhen(event.starts_at);
  const skillLabel = SKILL_LABEL[event.skill_level];
  const skillBodyClass = SKILL_BADGE_CLASS[event.skill_level];
  const skillOverlayClass = SKILL_BADGE_OVERLAY_CLASS[event.skill_level];

  return (
    <Link
      to={`/events/${event.id}`}
      className="event-card-enter group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
      style={{ ['--event-card-delay' as string]: `${index * 70}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-sky-tint via-electric/30 to-cobalt">
        {event.photo_url ? (
          <img
            src={event.photo_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden>
            <BrandMark size={56} className="opacity-90 drop-shadow-sm" />
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${skillOverlayClass}`}
        >
          {skillLabel}
        </span>
        {event.distance_km !== undefined && (
          <span className="absolute bottom-3 left-3 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy">
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
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text">
            <TypeMark type={event.event_type} size={14} />
            {typeLabel(event.event_type)}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${skillBodyClass}`}>
            {skillLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
