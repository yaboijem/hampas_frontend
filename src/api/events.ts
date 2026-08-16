import { api } from './client';
import type { EventItem } from './types';

export async function getEvent(id: number): Promise<EventItem> {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

export async function createEvent(form: FormData): Promise<EventItem> {
  const { data } = await api.post('/events', form);
  return data;
}

export async function updateEvent(id: number, form: FormData): Promise<EventItem> {
  const { data } = await api.put(`/events/${id}`, form);
  return data;
}

export async function deleteEvent(id: number): Promise<void> {
  await api.delete(`/events/${id}`);
}
