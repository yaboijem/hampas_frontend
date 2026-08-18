import { api } from './client';
import type { EventItem, Paginated } from './types';

export async function getEvent(id: number): Promise<EventItem> {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

export async function createEvent(form: FormData): Promise<EventItem> {
  const { data } = await api.post('/events', form);
  return data;
}

export async function updateEvent(id: number, form: FormData): Promise<EventItem> {
  // PHP does not parse multipart bodies on real PUT requests; spoof via POST.
  form.set('_method', 'PUT');
  const { data } = await api.post(`/events/${id}`, form);
  return data;
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`/events/${id}`);
}

export async function listHostedEvents(): Promise<Paginated<EventItem>> {
  const { data } = await api.get('/me/hosted-events');
  return data;
}

export async function setParticipantsVisibility(
  id: number,
  show_participants_publicly: boolean,
): Promise<{ show_participants_publicly: boolean }> {
  const { data } = await api.patch(`/events/${id}/participants-visibility`, {
    show_participants_publicly,
  });
  return data;
}
