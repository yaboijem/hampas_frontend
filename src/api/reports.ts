import { api } from './client';

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
