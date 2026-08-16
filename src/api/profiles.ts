import { api } from './client';
import type { ProfileFieldset, Role } from './types';

export interface ProfileView {
  roles: Role[];
  player: ProfileFieldset | null;
  coach: ProfileFieldset | null;
  organizer: ProfileFieldset | null;
}

export async function getProfile(): Promise<ProfileView> {
  const { data } = await api.get('/profile');
  return data;
}

export async function addRole(role: Role, fields: ProfileFieldset): Promise<{ role: Role; profile: ProfileFieldset }> {
  const { data } = await api.post('/profile/roles', { role, ...fields });
  return data;
}

export async function updateRole(role: Role, fields: ProfileFieldset): Promise<{ role: Role; profile: ProfileFieldset }> {
  const { data } = await api.put(`/profile/${role}`, fields);
  return data;
}
