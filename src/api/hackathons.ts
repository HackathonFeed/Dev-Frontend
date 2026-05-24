import { apiRequest } from './client';
import type {
  HackathonApi,
  HackathonListParams,
  HackathonSearchParams,
  Paginated,
} from './types';

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listHackathons(
  params: HackathonListParams = {}
): Promise<Paginated<HackathonApi>> {
  return apiRequest<Paginated<HackathonApi>>(
    `/hackathons${toQuery(params as Record<string, string | number | boolean | undefined>)}`
  );
}

export async function searchHackathons(
  params: HackathonSearchParams
): Promise<Paginated<HackathonApi>> {
  return apiRequest<Paginated<HackathonApi>>(
    `/hackathons/search${toQuery({ ...params } as Record<string, string | number | boolean | undefined>)}`
  );
}

export async function getTrendingHackathons(limit = 10): Promise<HackathonApi[]> {
  return apiRequest<HackathonApi[]>(`/hackathons/trending?limit=${limit}`);
}

export async function getHackathon(id: string): Promise<HackathonApi> {
  return apiRequest<HackathonApi>(`/hackathons/${id}`);
}
