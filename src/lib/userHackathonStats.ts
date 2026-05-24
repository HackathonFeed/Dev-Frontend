import type { TrackedApplication } from '../types';
import { isStepComplete } from './trackedProjects';

export type HackathonOutcome = 'won' | 'submitted' | 'participated' | 'tracking';

export interface UserHackathonRecord {
  project_id: string;
  hackathon_id?: string;
  hackathon_name: string;
  prize_pool: string;
  deadline: string;
  stage: string;
  outcome: HackathonOutcome;
  registered_at?: string;
  submitted_at?: string;
  won_at?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  participations: number;
  submissions: number;
  wins: number;
  rank: number;
}

export interface UserHackathonStats {
  user: {
    id: string;
    name: string;
    created_at: string;
  };
  participations: number;
  submissions: number;
  wins: number;
  hackathons: UserHackathonRecord[];
}

function stepAt(app: TrackedApplication, stepId: string): string | undefined {
  return app.completedSteps.find((s) => s.stepId === stepId)?.completedAt;
}

function outcomeFromApp(app: TrackedApplication): HackathonOutcome {
  if (isStepComplete(app, 'accepted')) return 'won';
  if (isStepComplete(app, 'submitted')) return 'submitted';
  if (isStepComplete(app, 'registered')) return 'participated';
  return 'tracking';
}

export function recordFromTrackedApp(app: TrackedApplication): UserHackathonRecord | null {
  if (!isStepComplete(app, 'registered')) return null;

  return {
    project_id: app.id,
    hackathon_id: app.hackathonId,
    hackathon_name: app.hackathonName,
    prize_pool: app.prizePool,
    deadline: app.deadline,
    stage: app.stage,
    outcome: outcomeFromApp(app),
    registered_at: stepAt(app, 'registered'),
    submitted_at: stepAt(app, 'submitted'),
    won_at: stepAt(app, 'accepted'),
  };
}

export function buildUserStatsFromTrackedApps(
  user: { id: string; name: string; created_at: string },
  trackedApps: TrackedApplication[],
): UserHackathonStats {
  const hackathons = trackedApps
    .map(recordFromTrackedApp)
    .filter((record): record is UserHackathonRecord => record !== null)
    .sort((a, b) => {
      const aTime = a.won_at ?? a.submitted_at ?? a.registered_at ?? '';
      const bTime = b.won_at ?? b.submitted_at ?? b.registered_at ?? '';
      return bTime.localeCompare(aTime);
    });

  return {
    user,
    participations: hackathons.length,
    submissions: hackathons.filter((h) => h.outcome === 'submitted' || h.outcome === 'won').length,
    wins: hackathons.filter((h) => h.outcome === 'won').length,
    hackathons,
  };
}

export function buildLocalLeaderboardEntry(
  user: { id: string; name: string; username?: string; avatar_url?: string | null },
  trackedApps: TrackedApplication[],
): LeaderboardEntry {
  const stats = buildUserStatsFromTrackedApps(
    { ...user, created_at: new Date().toISOString() },
    trackedApps,
  );

  return {
    user_id: user.id,
    name: user.name,
    username: user.username,
    avatar_url: user.avatar_url ?? null,
    participations: stats.participations,
    submissions: stats.submissions,
    wins: stats.wins,
    rank: 1,
  };
}
