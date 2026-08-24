import { api } from './client';
import type { Paginated } from './types';

export type AdminReport = {
  id: number;
  reporter: { id: number; name: string };
  target_type: 'user' | 'event';
  target_id: number;
  reason: string;
  details: string | null;
  created_at: string;
};

export async function getReportReasons(): Promise<{ reasons: string[] }> {
  const { data } = await api.get('/report-reasons');
  return data;
}

export async function submitReport(payload: {
  target_type: 'user' | 'event';
  target_id: number;
  reason: string;
  details?: string;
}): Promise<{ report: { id: number } }> {
  const { data } = await api.post('/reports', payload);
  return data;
}

export async function listAdminReports(params?: {
  page?: number;
  per_page?: number;
}): Promise<Paginated<AdminReport>> {
  const { data } = await api.get<Paginated<AdminReport>>('/admin/reports', {
    params: {
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 50,
    },
  });
  return data;
}
