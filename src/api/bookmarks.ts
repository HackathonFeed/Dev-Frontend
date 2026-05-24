import { apiRequest } from './client';
import type { Bookmark } from './types';

export async function listBookmarks(): Promise<Bookmark[]> {
  return apiRequest<Bookmark[]>('/bookmarks');
}

export async function addBookmark(hackathonId: string): Promise<Bookmark> {
  return apiRequest<Bookmark>(`/bookmarks/${hackathonId}`, { method: 'POST' });
}

export async function removeBookmark(hackathonId: string): Promise<void> {
  await apiRequest<null>(`/bookmarks/${hackathonId}`, { method: 'DELETE' });
}
