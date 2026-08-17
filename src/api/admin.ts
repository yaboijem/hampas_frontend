import { api } from './client';
import type {
  AdminRoleRequest,
  ElevatedRole,
  EventItem,
  Paginated,
  RoleRequestStatus,
  Visibility,
} from './types';

export const ADMIN_PAGE_SIZE = 10;

export type ListAdminRoleRequestsParams = {
  status?: RoleRequestStatus;
  role?: ElevatedRole;
  q?: string;
  page?: number;
  per_page?: number;
};

export type ListAdminEventsParams = {
  visibility: Visibility;
  q?: string;
  page?: number;
  per_page?: number;
};

export async function listAdminRoleRequests(
  params: ListAdminRoleRequestsParams | RoleRequestStatus = 'pending',
): Promise<Paginated<AdminRoleRequest>> {
  const query =
    typeof params === 'string'
      ? { status: params, per_page: ADMIN_PAGE_SIZE, page: 1 }
      : {
          status: params.status ?? 'pending',
          role: params.role,
          q: params.q?.trim() || undefined,
          page: params.page ?? 1,
          per_page: params.per_page ?? ADMIN_PAGE_SIZE,
        };

  const { data } = await api.get<Paginated<AdminRoleRequest>>('/admin/role-requests', {
    params: query,
  });
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

export async function listAdminEvents(
  visibilityOrParams: Visibility | ListAdminEventsParams,
): Promise<Paginated<EventItem>> {
  const params: ListAdminEventsParams =
    typeof visibilityOrParams === 'string'
      ? {
          visibility: visibilityOrParams,
          page: 1,
          per_page: ADMIN_PAGE_SIZE,
        }
      : {
          visibility: visibilityOrParams.visibility,
          q: visibilityOrParams.q?.trim() || undefined,
          page: visibilityOrParams.page ?? 1,
          per_page: visibilityOrParams.per_page ?? ADMIN_PAGE_SIZE,
        };

  const { data } = await api.get<Paginated<EventItem>>('/admin/events', {
    params,
  });
  return data;
}

export async function approveEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/approve`);
  return data;
}

export async function rejectEvent(id: number): Promise<EventItem> {
  const { data } = await api.patch<EventItem>(`/admin/events/${id}/reject`);
  return data;
}
