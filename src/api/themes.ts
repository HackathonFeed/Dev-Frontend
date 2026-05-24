import { apiRequest } from './client';
import type { PlatformStats, ThemeCount } from './types';

export async function listThemes(limit = 30): Promise<ThemeCount[]> {
  return apiRequest<ThemeCount[]>(`/themes?limit=${limit}`);
}

export async function listPlatforms(): Promise<PlatformStats[]> {
  return apiRequest<PlatformStats[]>('/platforms');
}
