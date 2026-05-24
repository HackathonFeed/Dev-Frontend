import { apiRequest } from './client';
import type { AdminStats } from './types';

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>('/admin/stats');
}

export async function triggerScrape(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/admin/scrape', { method: 'POST' });
}

export async function deleteHackathon(hackathonId: string): Promise<void> {
  await apiRequest<null>(`/admin/hackathon/${hackathonId}`, { method: 'DELETE' });
}
