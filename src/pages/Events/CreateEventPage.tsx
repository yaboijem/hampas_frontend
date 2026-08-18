import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../../api/events';
import { getProfile } from '../../api/profiles';
import { useAuth } from '../../auth/AuthContext';
import { canCreateEvent } from '../../auth/canCreateEvent';
import CreateEventAccessModal from '../../components/CreateEventAccessModal';
import EventForm from './EventForm';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAllowed(false);
      return;
    }
    if (user.is_admin) {
      setAllowed(true);
      return;
    }

    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (cancelled) return;
        const ok = canCreateEvent(user, profile.roles);
        setAllowed(ok);
        if (!ok) setShowModal(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(false);
          setShowModal(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading || allowed === null) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center text-sm text-muted" role="status">
        Checking hosting access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <>
        {showModal ? (
          <CreateEventAccessModal
            onClose={() => {
              setShowModal(false);
              navigate('/events', { replace: true });
            }}
          />
        ) : null}
        <div className="mx-auto max-w-xl space-y-3 py-10 text-center">
          <p className="text-sm text-muted">
            Only coaches, organizers, and admins can create events.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold text-cobalt hover:underline"
          >
            Request access
          </button>
        </div>
      </>
    );
  }

  return (
    <EventForm
      submitLabel="Create event"
      onSubmit={async (form) => {
        const event = await createEvent(form);
        navigate(`/events/${event.id}`);
      }}
    />
  );
}
