import { api } from './client';
import type { EventItem, Paginated } from './types';

export interface EventFilters {
  event_type?: string;
  skill_level?: string;
  date_from?: string;
  date_to?: string;
  city?: string;
  barangay?: string;
}

export async function listEvents(params: EventFilters): Promise<Paginated<EventItem>> {
  const { data } = await api.get('/events', { params });
  return data;
}

export async function nearbyEvents(lat: number, lng: number, radiusKm = 50): Promise<Paginated<EventItem>> {
  const { data } = await api.get('/events/nearby', { params: { lat, lng, radius_km: radiusKm } });
  return data;
}
