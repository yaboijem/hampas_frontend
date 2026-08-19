import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { listMyRoleRequests } from '../api/profiles';
import type { ElevatedRole, RoleRequest } from '../api/types';
import RoleRequestModal from './RoleRequestModal';

type Props = {
  onClose: () => void;
};

export default function CreateEventAccessModal({ onClose }: Props) {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formRole, setFormRole] = useState<ElevatedRole | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !formRole) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, formRole]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMyRoleRequests()
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestFor = (role: ElevatedRole): RoleRequest | undefined => {
    const mine = requests.filter((r) => r.role === role);
    return mine.sort((a, b) => b.id - a.id)[0];
  };

  const coachLatest = latestFor('coach');
  const organizerLatest = latestFor('organizer');

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[200] flex min-h-dvh w-full items-center justify-center bg-navy/45 p-4"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          }}
          role="presentation"
          onClick={onClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-access-title"
            aria-describedby="create-event-access-message"
            className="my-auto w-full max-w-md shrink-0 space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-navy shadow-soft sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h2
                id="create-event-access-title"
                className="font-display text-lg font-bold tracking-tight"
              >
                Hosting is limited
              </h2>
              <p
                id="create-event-access-message"
                className="text-sm leading-relaxed text-muted"
              >
                Only coaches and organizers can create events. If you want to host, send a request
                to an admin for coach or organizer access.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={
                  loading ||
                  coachLatest?.status === 'pending' ||
                  coachLatest?.status === 'approved'
                }
                onClick={() => setFormRole('coach')}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-cobalt px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-electric disabled:opacity-60"
              >
                {coachLatest?.status === 'pending'
                  ? 'Coach request pending'
                  : coachLatest?.status === 'approved'
                    ? 'Coach access granted'
                    : 'Request coach access'}
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  organizerLatest?.status === 'pending' ||
                  organizerLatest?.status === 'approved'
                }
                onClick={() => setFormRole('organizer')}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:border-cobalt disabled:opacity-60"
              >
                {organizerLatest?.status === 'pending'
                  ? 'Organizer request pending'
                  : organizerLatest?.status === 'approved'
                    ? 'Organizer access granted'
                    : 'Request organizer access'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Link
                to="/profile"
                onClick={onClose}
                className="text-sm font-semibold text-cobalt hover:underline"
              >
                Open profile
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy hover:border-cobalt"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {formRole ? (
        <RoleRequestModal
          role={formRole}
          onClose={() => setFormRole(null)}
          onSubmitted={() => {
            void listMyRoleRequests()
              .then(setRequests)
              .catch(() => undefined);
          }}
        />
      ) : null}
    </>
  );
}
