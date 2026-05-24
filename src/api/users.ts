import { apiRequest } from './client';
import type { User, UserHackathonStatsApi } from './types';

export function buildPublicProfileUrl(username: string): string {
  return `${window.location.origin}/u/${username}`;
}

export async function getPublicProfile(username: string): Promise<UserHackathonStatsApi> {
  return apiRequest<UserHackathonStatsApi>(`/users/public/${encodeURIComponent(username)}`);
}

export async function updateProfile(data: {
  name?: string;
  username?: string;
  interests?: string[];
  avatar_url?: string | null;
}): Promise<User> {
  return apiRequest<User>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadProfileAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<User>('/users/me/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function removeProfileAvatar(): Promise<User> {
  return apiRequest<User>('/users/me/avatar', {
    method: 'DELETE',
  });
}
