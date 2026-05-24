import { apiRequest } from './client';
import type { LeaderboardEntryApi, UserHackathonStatsApi } from './types';

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntryApi[]> {
  return apiRequest<LeaderboardEntryApi[]>(`/users/leaderboard?limit=${limit}`);
}

export async function getUserHackathonStats(userId: string): Promise<UserHackathonStatsApi> {
  return apiRequest<UserHackathonStatsApi>(`/users/${userId}/hackathon-stats`);
}
