import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from './EventForm';
import { getEvent, updateEvent } from '../../api/events';
import type { EventItem } from '../../api/types';

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvent(Number(id))
      .then(setEvent)
      .catch(() => navigate('/events', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <EventForm
      initial={event}
      submitLabel="Save changes"
      onSubmit={async (form) => {
        const updated = await updateEvent(Number(id), form);
        navigate(`/events/${updated.id}`);
      }}
    />
  );
}
