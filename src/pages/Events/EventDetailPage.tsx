import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteEvent, getEvent } from '../../api/events';
import type { EventItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import ApplyButton from '../../components/ApplyButton';
import {
  EmailIcon,
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
} from '../../components/ContactIcons';
import ReportModal from '../../components/ReportModal';
import {
  SKILL_BADGE_CLASS,
  SKILL_LABEL,
  typeEmoji,
  typeLabel,
  formatEventPlace,
  formatEventWhen,
} from '../../events/eventLabels';

function nonEmpty(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

const contactIconLinkClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-cobalt shadow-soft transition hover:border-cobalt hover:bg-sky-tint';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    getEvent(Number(id))
      .then(setEvent)
      .catch(() => navigate('/events', { replace: true }));
  }, [id, navigate]);

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading event">
        <div className="skeleton-shimmer h-4 w-32 rounded" />
        <div className="skeleton-shimmer aspect-[16/10] rounded-[var(--radius-card)]" />
        <div className="skeleton-shimmer h-8 w-2/3 rounded" />
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-5/6 rounded" />
      </div>
    );
  }

  const place = formatEventPlace(event.barangay, event.city);
  const when = formatEventWhen(event.starts_at);
  const showApplyChrome = !event.is_owner && event.visibility === 'live';
  const canManage =
    event.is_owner ||
    (user?.is_admin === true && event.visibility === 'live');
  const org = event.created_by;
  const phone = nonEmpty(org.contact_number) ? org.contact_number.trim() : null;
  const email = nonEmpty(org.contact_email) ? org.contact_email.trim() : null;
  const facebook = nonEmpty(org.facebook_url) ? org.facebook_url.trim() : null;
  const instagram = nonEmpty(org.instagram_url) ? org.instagram_url.trim() : null;
  const hasContact = Boolean(phone || email || facebook || instagram);

  const remove = async () => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(event.id);
      navigate('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <article className={`relative mx-auto max-w-3xl ${showApplyChrome ? 'pb-28 md:pb-8' : 'pb-8'}`}>
      <Link
        to="/events"
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-sm font-semibold text-chip-text transition hover:bg-cobalt/15"
      >
        <span aria-hidden>←</span>
        Back to events
      </Link>

      {event.visibility !== 'live' && (
        <p className="mb-4 rounded-[var(--radius-control)] border border-amber-500/30 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          Pending review — this event is not public yet.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] border border-border bg-gradient-to-br from-sky-tint via-electric/30 to-cobalt">
        {event.photo_url ? (
          <img
            src={event.photo_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl" aria-hidden>
            🏐
          </div>
        )}
        {event.distance_km !== undefined && (
          <span className="absolute bottom-3 left-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-medium text-white">
            {event.distance_km} km away
          </span>
        )}
      </div>

      <header className="mb-6 space-y-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">
          {event.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text">
            {typeEmoji(event.event_type)} {typeLabel(event.event_type)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${SKILL_BADGE_CLASS[event.skill_level]}`}
          >
            {SKILL_LABEL[event.skill_level]}
          </span>
        </div>
      </header>

      <dl className="mb-6 divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface shadow-soft">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted">When</dt>
          <dd className="text-right text-sm font-medium text-navy">{when}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted">Where</dt>
          <dd className="text-right text-sm font-medium text-navy">{place}</dd>
        </div>
        {event.distance_km !== undefined && (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted">Distance</dt>
            <dd className="text-right text-sm font-medium text-navy">{event.distance_km} km</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted">Organizer</dt>
          <dd className="text-right text-sm font-medium text-navy">{event.created_by.name}</dd>
        </div>
      </dl>

      <section className="mb-8">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          About
        </h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-navy">{event.description}</p>
      </section>

      {hasContact ? (
        <section className="mb-8" aria-label="Organizer contact">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Contact
          </h2>
          <ul className="flex flex-wrap gap-2">
            {phone ? (
              <li>
                <a href={`tel:${phone}`} className={contactIconLinkClass} aria-label={`Call ${phone}`}>
                  <PhoneIcon size={20} />
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a
                  href={`mailto:${email}`}
                  className={contactIconLinkClass}
                  aria-label={`Email ${email}`}
                >
                  <EmailIcon size={20} />
                </a>
              </li>
            ) : null}
            {facebook ? (
              <li>
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactIconLinkClass}
                  aria-label="Facebook"
                >
                  <FacebookIcon size={20} />
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactIconLinkClass}
                  aria-label="Instagram"
                >
                  <InstagramIcon size={20} />
                </a>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {showApplyChrome && (
        <div
          data-testid="event-sticky-cta"
          className={[
            'fixed inset-x-0 bottom-0 z-30 border-t border-border px-4 pt-3 glass-panel',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            'md:static md:z-auto md:mb-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none',
          ].join(' ')}
        >
          <div className="mx-auto max-w-3xl md:mx-0">
            <ApplyButton
              eventId={event.id}
              isOwner={event.is_owner}
              visibility={event.visibility}
              myApplication={event.my_application}
            />
          </div>
        </div>
      )}

      {canManage && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            to={`/events/${event.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-cobalt"
          >
            Edit event
          </Link>
          {event.is_owner ? (
            <Link
              to={`/events/${event.id}/applications`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-cobalt"
            >
              Manage applications
            </Link>
          ) : null}
          <button
            type="button"
            onClick={remove}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete event
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowReport(true)}
        className="text-sm text-muted underline hover:text-navy"
      >
        Report this event
      </button>

      {showReport && (
        <ReportModal
          targetType="event"
          targetId={event.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </article>
  );
}
