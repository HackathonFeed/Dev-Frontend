import { apiRequest } from './client';
import type { TrackedProjectApi } from './types';

export async function listTrackedProjects(): Promise<TrackedProjectApi[]> {
  return apiRequest<TrackedProjectApi[]>('/tracked-projects');
}

export async function registerTrackedHackathon(
  hackathonId: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/register/${hackathonId}`, {
    method: 'POST',
  });
}

export async function getTrackedProject(projectId: string): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}`);
}

export async function updateTrackedProject(
  projectId: string,
  body: { title?: string; concept?: string },
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteTrackedProject(projectId: string): Promise<void> {
  await apiRequest<null>(`/tracked-projects/${projectId}`, { method: 'DELETE' });
}

export async function completeTrackedStep(
  projectId: string,
  stepId: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(
    `/tracked-projects/${projectId}/steps/${stepId}/complete`,
    { method: 'POST' },
  );
}

export async function undoTrackedStep(projectId: string): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}/steps/undo`, {
    method: 'POST',
  });
}

export async function addTrackedMilestone(
  projectId: string,
  text: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}/milestones`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function toggleTrackedMilestone(
  projectId: string,
  milestoneId: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(
    `/tracked-projects/${projectId}/milestones/${milestoneId}`,
    { method: 'PATCH' },
  );
}

export async function addTrackedNote(
  projectId: string,
  note: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function addTrackedTeamMember(
  projectId: string,
  roleName: string,
): Promise<TrackedProjectApi> {
  return apiRequest<TrackedProjectApi>(`/tracked-projects/${projectId}/team`, {
    method: 'POST',
    body: JSON.stringify({ role_name: roleName }),
  });
}
