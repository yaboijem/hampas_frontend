import { api } from './client';
import type { AdminRoleRequest, RoleRequestStatus } from './types';

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
