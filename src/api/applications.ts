import { api } from './client';
import type { ApplicationStatus, EventItem, PlayerPosition, SkillLevel } from './types';

export interface Application {
  id: number;
  event_id: number;
  user_id: number;
  status: ApplicationStatus;
}

export interface EventApplicant {
  id: number;
  status: ApplicationStatus;
  user: {
    id: number;
    name: string;
    positions?: PlayerPosition[] | string[];
    skill_level?: SkillLevel | string | null;
  };
}

export async function apply(eventId: number): Promise<{ application: Application }> {
  const { data } = await api.post(`/events/${eventId}/apply`);
  return data;
}

export async function cancelApplication(eventId: number): Promise<void> {
  await api.delete(`/events/${eventId}/apply`);
}

export async function listEventApplications(
  eventId: number,
): Promise<{ data: EventApplicant[] }> {
  const { data } = await api.get(`/events/${eventId}/applications`);
  return data;
}

export async function approveApplication(eventId: number, applicationId: number): Promise<{ application: Application }> {
  const { data } = await api.post(`/events/${eventId}/applications/${applicationId}/approve`);
  return data;
}

export async function rejectApplication(eventId: number, applicationId: number): Promise<{ application: Application }> {
  const { data } = await api.post(`/events/${eventId}/applications/${applicationId}/reject`);
  return data;
}

export async function deleteEventApplication(eventId: number, applicationId: number): Promise<void> {
  await api.delete(`/events/${eventId}/applications/${applicationId}`);
}

export async function myApplications(): Promise<{ data: Array<{ id: number; status: ApplicationStatus; event: EventItem }> }> {
  const { data } = await api.get('/me/applications');
  return data;
}
