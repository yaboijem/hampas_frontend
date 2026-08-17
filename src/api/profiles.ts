import { api } from './client';
import type { ElevatedRole, ProfileFieldset, Role, RoleRequest } from './types';

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

export async function updateRole(
  role: Role,
  fields: ProfileFieldset,
): Promise<{ role: Role; profile: ProfileFieldset }> {
  const { data } = await api.put(`/profile/${role}`, fields);
  return data;
}

export async function listMyRoleRequests(): Promise<RoleRequest[]> {
  const { data } = await api.get('/profile/role-requests');
  return data;
}

export async function createRoleRequest(payload: {
  role: ElevatedRole;
  note?: string;
}): Promise<RoleRequest> {
  const { data } = await api.post('/profile/role-requests', payload);
  return data;
}
