import { apiRequest } from './client';
import type {
  Paginated,
  ProjectApi,
  ProjectListParams,
  ProjectPlatformStats,
  ProjectTechnologyStats,
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

export async function listProjects(
  params: ProjectListParams = {}
): Promise<Paginated<ProjectApi>> {
  return apiRequest<Paginated<ProjectApi>>(
    `/projects${toQuery(params as Record<string, string | number | boolean | undefined>)}`
  );
}

export async function getProject(id: string): Promise<ProjectApi> {
  return apiRequest<ProjectApi>(`/projects/${id}`);
}

export async function listProjectPlatforms(): Promise<ProjectPlatformStats[]> {
  return apiRequest<ProjectPlatformStats[]>('/projects/platforms');
}

export async function listProjectTechnologies(limit = 40): Promise<ProjectTechnologyStats[]> {
  return apiRequest<ProjectTechnologyStats[]>(`/projects/technologies?limit=${limit}`);
}
