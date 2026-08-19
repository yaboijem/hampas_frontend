import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEvent, updateEvent } from '../../api/events';
import { getProfile } from '../../api/profiles';
import type { EventItem, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import EventForm from './EventForm';

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [hostRoles, setHostRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getEvent(Number(id)),
      user?.is_admin
        ? Promise.resolve({ roles: ['coach', 'organizer', 'player'] as Role[] })
        : getProfile().catch(() => ({ roles: [] as Role[] })),
    ])
      .then(([ev, profile]) => {
        if (cancelled) return;
        setEvent(ev);
        setHostRoles(profile.roles);
      })
      .catch(() => {
        if (!cancelled) navigate('/events', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate, user?.is_admin]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <EventForm
      initial={event}
      submitLabel="Save changes"
      hostRoles={hostRoles}
      isAdmin={Boolean(user?.is_admin)}
      onSubmit={async (form) => {
        const updated = await updateEvent(Number(id), form);
        navigate(`/events/${updated.id}`);
      }}
    />
  );
}
