import { api } from './client';
import type {
  AdminRoleRequest,
  EventItem,
  Paginated,
  RoleRequestStatus,
  Visibility,
} from './types';

export async function listAdminRoleRequests(
  status: RoleRequestStatus = 'pending',
): Promise<AdminRoleRequest[]> {
  const { data } = await api.get('/admin/role-requests', { params: { status } });
  return data;
}

export async function approveRoleRequest(id: number): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/approve`);
  return data;
}

export async function rejectRoleRequest(
  id: number,
  reason?: string,
): Promise<AdminRoleRequest> {
  const { data } = await api.post(`/admin/role-requests/${id}/reject`, {
    reason: reason ?? null,
  });
  return data;
}

export async function listAdminEvents(visibility: Visibility): Promise<EventItem[]> {
  const { data } = await api.get<Paginated<EventItem>>('/admin/events', {
    params: { visibility },
  });
  return data.data;
}

export async function approveEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/approve`);
  return data;
}

export async function rejectEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/reject`);
  return data;
}
