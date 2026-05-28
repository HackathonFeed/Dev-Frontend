import { apiRequest } from './client';
import type { AdminStats, AdminUser, AdminUserListResponse, SubscriptionPlan, UserRole } from './types';

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>('/admin/stats');
}

export async function triggerScrape(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/admin/scrape', { method: 'POST' });
}

export async function generateEmbeddings(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/admin/generate-embeddings', { method: 'POST' });
}

export async function deleteHackathon(hackathonId: string): Promise<void> {
  await apiRequest<null>(`/admin/hackathon/${hackathonId}`, { method: 'DELETE' });
}

export interface ListUsersParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export async function listAdminUsers(params: ListUsersParams = {}): Promise<AdminUserListResponse> {
  const { page = 1, page_size = 25, search = '' } = params;
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    ...(search ? { search } : {}),
  });
  return apiRequest<AdminUserListResponse>(`/admin/users?${qs}`);
}

export async function getAdminPlanCounts(): Promise<Record<string, number>> {
  return apiRequest<Record<string, number>>('/admin/users/plan-counts');
}

export async function updateAdminUserRole(userId: string, role: UserRole): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function updateAdminUserPlan(userId: string, plan: SubscriptionPlan): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiRequest<null>(`/admin/users/${userId}`, { method: 'DELETE' });
}
