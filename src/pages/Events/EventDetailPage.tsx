import { useCallback, useEffect, useState } from 'react';
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
import BrandMark from '../../components/BrandMark';
import DeleteEventModal from '../../components/DeleteEventModal';
import ReportModal from '../../components/ReportModal';
import TypeMark from '../../components/TypeMark';
import {
  EVENT_DETAIL_REFRESH,
  eventIdFromDetailRefresh,
} from '../../events/eventDetailRefresh';
import {
  SKILL_BADGE_CLASS,
  SKILL_LABEL,
  typeLabel,
  formatEventPlace,
  formatEventWhen,
  hostDisplayName,
  hostRoleLabel,
  resolveHostDisplayAs,
} from '../../events/eventLabels';

const PLAYERS_POLL_MS = 8_000;

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
  const [error] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const eventId = Number(id);

  const load = useCallback(
    async (opts?: { silent?: boolean; hardFail?: boolean }) => {
      if (!Number.isFinite(eventId) || eventId <= 0) return;
      const silent = opts?.silent === true;
      const hardFail = opts?.hardFail !== false && !silent;
      try {
        const next = await getEvent(eventId);
        setEvent(next);
      } catch {
        if (hardFail) navigate('/events', { replace: true });
      }
    },
    [eventId, navigate],
  );

  useEffect(() => {
    void load({ hardFail: true });
  }, [load]);

  useEffect(() => {
    const refresh = () => void load({ silent: true, hardFail: false });
    const onFocus = () => refresh();
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onNotify = (e: Event) => {
      const id = eventIdFromDetailRefresh(e);
      if (id === eventId) refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener(EVENT_DETAIL_REFRESH, onNotify);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener(EVENT_DETAIL_REFRESH, onNotify);
    };
  }, [eventId, load]);

  useEffect(() => {
    if (!event?.show_participants_publicly) return;
    const id = window.setInterval(() => void load({ silent: true, hardFail: false }), PLAYERS_POLL_MS);
    return () => window.clearInterval(id);
  }, [event?.show_participants_publicly, load]);

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
  const canManageApplications = event.is_owner || user?.is_admin === true;
  const org = event.created_by;
  const phone = nonEmpty(org.contact_number) ? org.contact_number.trim() : null;
  const email = nonEmpty(org.contact_email) ? org.contact_email.trim() : null;
  const facebook = nonEmpty(org.facebook_url) ? org.facebook_url.trim() : null;
  const instagram = nonEmpty(org.instagram_url) ? org.instagram_url.trim() : null;
  const hasContact = Boolean(phone || email || facebook || instagram);

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteEvent(event.id);
      setShowDelete(false);
      navigate('/events');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <article className={`relative mx-auto max-w-3xl ${showApplyChrome ? 'pb-32 md:pb-8' : 'pb-8'}`}>
      <Link
        to="/events"
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-sm font-semibold text-chip-text transition hover:bg-cobalt/15"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
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
          <div className="flex h-full w-full items-center justify-center" aria-hidden>
            <BrandMark size={72} className="opacity-90 drop-shadow-sm" />
          </div>
        )}
        {event.distance_km !== undefined && (
          <span className="absolute bottom-3 left-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-medium text-white">
            {event.distance_km} km away
          </span>
        )}
      </div>

      <header className="mb-2 space-y-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy">
          {event.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-tint px-2.5 py-1 text-xs font-medium text-chip-text">
            <TypeMark type={event.event_type} size={14} />
            {typeLabel(event.event_type)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${SKILL_BADGE_CLASS[event.skill_level]}`}
          >
            {SKILL_LABEL[event.skill_level]}
          </span>
        </div>
      </header>

      <section className="mb-4">
        <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
          About
        </h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-navy">{event.description}</p>
      </section>

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
          <dt className="text-sm text-muted">
            {hostRoleLabel(event.created_by.roles, event.host_display_as)}
          </dt>
          <dd className="text-right text-sm font-medium text-navy">
            {hostDisplayName(event.created_by.name, event.created_by.roles, event.host_display_as)}
          </dd>
        </div>
      </dl>

      {(() => {
        const as = resolveHostDisplayAs(event.host_display_as, event.created_by.roles);
        if (as !== 'coach') return null;
        const coach = event.created_by.coach;
        if (!coach) return null;
        const achievements = coach.achievements ?? [];
        const experiences = coach.experiences ?? [];
        const bootcamps = coach.bootcamp_names ?? [];
        if (achievements.length + experiences.length + bootcamps.length === 0) return null;
        return (
          <section
            className="mb-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft"
            aria-labelledby="coach-profile-heading"
          >
            <h2
              id="coach-profile-heading"
              className="font-display text-sm font-semibold uppercase tracking-wide text-muted"
            >
              Coach profile
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              {achievements.length > 0 ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-chip-text">
                    Achievements
                  </dt>
                  <dd className="mt-0.5 text-navy">
                    <ul className="list-disc space-y-1 pl-4">
                      {achievements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {experiences.length > 0 ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-chip-text">
                    Experiences
                  </dt>
                  <dd className="mt-0.5 text-navy">
                    <ul className="list-disc space-y-1 pl-4">
                      {experiences.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {bootcamps.length > 0 ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-chip-text">
                    Bootcamp names
                  </dt>
                  <dd className="mt-0.5 text-navy">
                    <ul className="list-disc space-y-1 pl-4">
                      {bootcamps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        );
      })()}

      {event.show_participants_publicly &&
        event.approved_participants &&
        event.approved_participants.length > 0 && (
          <section className="mb-8" aria-labelledby="event-players-heading">
            <h2
              id="event-players-heading"
              className="mb-2 font-display text-lg font-bold text-navy"
            >
              Players
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-navy">
              {event.approved_participants.map((p) => (
                <li key={p.id} className="pl-1 font-medium">
                  {p.name}
                </li>
              ))}
            </ol>
          </section>
        )}

      {hasContact ? (
        <section className="mb-3" aria-label="Organizer contact">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted">
            Contact Details
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
            'fixed z-30 rounded-[var(--radius-card)] px-2.5 py-2 shadow-soft glass-panel',
            'bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
            'left-[max(1rem,env(safe-area-inset-left,0px))]',
            'right-[max(1rem,env(safe-area-inset-right,0px))]',
            'md:static md:inset-auto md:z-auto md:mb-6 md:rounded-none md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none',
          ].join(' ')}
        >
          <div className="mx-auto w-full max-w-3xl md:mx-0">
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
          {canManageApplications ? (
            <Link
              to={`/events/${event.id}/applications`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-medium text-navy hover:border-cobalt"
            >
              Manage applications
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setShowDelete(true);
            }}
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

      {showDelete ? (
        <DeleteEventModal
          title={event.title}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (!deleteBusy) setShowDelete(false);
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </article>
  );
}
