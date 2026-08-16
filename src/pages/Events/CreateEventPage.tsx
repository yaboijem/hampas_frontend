import { useNavigate } from 'react-router-dom';
import EventForm from './EventForm';
import { createEvent } from '../../api/events';

export default function CreateEventPage() {
  const navigate = useNavigate();
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
