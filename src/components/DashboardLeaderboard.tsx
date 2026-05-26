import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Loader2, Medal, Target, Trophy, Users, CheckCircle2 } from 'lucide-react';
import { getLeaderboard } from '../api/leaderboard';
import { ApiError } from '../api/client';
import type { User } from '../api/types';
import type { TrackedApplication } from '../types';
import {
  buildLocalLeaderboardEntry,
  buildUserStatsFromTrackedApps,
  type LeaderboardEntry,
} from '../lib/userHackathonStats';
import { ProfileAvatar } from './ProfileAvatar';

interface DashboardLeaderboardProps {
  currentUser: User;
  trackedApps: TrackedApplication[];
}

const LEADERBOARD_CACHE_KEY = 'hackathon_feed_leaderboard_cache';
const LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

interface LeaderboardCache {
  entries: LeaderboardEntry[];
  cachedAt: number;
}

function readLeaderboardCache(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!raw) return [];
    const cache = JSON.parse(raw) as Partial<LeaderboardCache>;
    if (!Array.isArray(cache.entries) || typeof cache.cachedAt !== 'number') return [];
    if (Date.now() - cache.cachedAt > LEADERBOARD_CACHE_TTL_MS) return cache.entries;
    return cache.entries;
  } catch {
    return [];
  }
}

function writeLeaderboardCache(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(
      LEADERBOARD_CACHE_KEY,
      JSON.stringify({ entries, cachedAt: Date.now() }),
    );
  } catch {
    // Cache is a performance optimization; ignore storage failures.
  }
}

function rankDisplay(rank: number, large = false): React.ReactNode {
  const iconClass = large ? 'w-6 h-6' : 'w-4 h-4';
  if (rank === 1) return <Crown className={`${iconClass} text-[#ffcc00]`} strokeWidth={2.5} />;
  if (rank === 2) return <Medal className={`${iconClass} text-zinc-400`} strokeWidth={2.5} />;
  if (rank === 3) return <Medal className={`${iconClass} text-amber-700`} strokeWidth={2.5} />;
  return (
    <span className={`font-mono font-black ${large ? 'text-lg' : 'text-xs'}`}>
      {rank.toString().padStart(2, '0')}
    </span>
  );
}

export const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  currentUser,
  trackedApps,
}) => {
  const cachedLeaderboard = useMemo(() => readLeaderboardCache(), []);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(cachedLeaderboard);
  const [loadingBoard, setLoadingBoard] = useState(cachedLeaderboard.length === 0);
  const [error, setError] = useState<string | null>(null);

  const localCurrentUserStats = useMemo(
    () => buildUserStatsFromTrackedApps(currentUser, trackedApps),
    [currentUser, trackedApps],
  );

  const yourLeaderboardEntry = useMemo(
    () => leaderboard.find((entry) => entry.user_id === currentUser.id) ?? null,
    [leaderboard, currentUser.id],
  );

  const topLeaderboardEntries = useMemo(() => leaderboard.slice(0, 10), [leaderboard]);

  const showCurrentUserPosition = Boolean(
    yourLeaderboardEntry && !topLeaderboardEntries.some((entry) => entry.user_id === currentUser.id),
  );

  const visibleLeaderboardEntries = useMemo(
    () => (
      showCurrentUserPosition && yourLeaderboardEntry
        ? [...topLeaderboardEntries, yourLeaderboardEntry]
        : topLeaderboardEntries
    ),
    [showCurrentUserPosition, topLeaderboardEntries, yourLeaderboardEntry],
  );

  const loadLeaderboard = useCallback(async () => {
    setError(null);
    try {
      const entries = await getLeaderboard(50);
      if (entries.length > 0) {
        const normalizedEntries = entries.map((entry) => ({
          user_id: entry.user_id,
          name: entry.name,
          username: entry.username ?? null,
          avatar_url: entry.avatar_url ?? null,
          participations: entry.participations,
          submissions: entry.submissions,
          wins: entry.wins,
          rank: entry.rank,
        }));
        setLeaderboard(normalizedEntries);
        writeLeaderboardCache(normalizedEntries);
      } else {
        const localEntry = buildLocalLeaderboardEntry(currentUser, trackedApps);
        setLeaderboard((previous) => (
          previous.length > 0 ? previous : localEntry.participations > 0 ? [localEntry] : []
        ));
      }
    } catch (err) {
      const localEntry = buildLocalLeaderboardEntry(currentUser, trackedApps);
      setLeaderboard((previous) => (
        previous.length > 0 ? previous : localEntry.participations > 0 ? [localEntry] : []
      ));
      setError(
        err instanceof ApiError
          ? 'Global leaderboard unavailable — showing cached data.'
          : 'Could not load leaderboard.',
      );
    } finally {
      setLoadingBoard(false);
    }
  }, [currentUser, trackedApps]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h2 className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tighter text-[#1a1a1a] flex items-center gap-3">
            <Trophy className="w-7 h-7 text-[#ffcc00]" strokeWidth={2.5} />
            Hacker Leaderboard
          </h2>
          <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-2">
            Rankings by wins, submissions, and hackathons participated
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold text-zinc-500">
          <Users className="w-4 h-4" />
          {leaderboard.length} active builder{leaderboard.length === 1 ? '' : 's'}
        </div>
      </div>

      {error && (
        <div className="bg-[#ffcc00]/20 border-2 border-[#ffcc00] px-4 py-3 font-mono text-[10px] uppercase font-bold text-[#1a1a1a]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* Left — your hacker stats */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white border-4 border-black p-4 sm:p-6 shadow-[5px_5px_0px_0px_#0055ff]">
            <p className="font-mono text-[9px] uppercase font-bold text-[#0055ff] tracking-wider">
              Your hacker profile
            </p>

            <div className="flex flex-col items-center text-center mt-5">
              <div className="border-4 border-black p-1 bg-gradient-to-br from-[#ffd700] via-[#ffcc00] to-amber-500 shadow-[3px_3px_0px_0px_#1a1a1a]">
                <ProfileAvatar
                  name={currentUser.name}
                  avatarUrl={currentUser.avatar_url}
                  size="lg"
                  className="rounded-none border-2"
                />
              </div>
              <h3 className="font-headline font-black text-2xl uppercase tracking-tight text-[#1a1a1a] mt-4">
                {currentUser.name}
              </h3>
              <p className="font-mono text-[10px] uppercase font-bold text-[#0055ff] mt-1">
                @{currentUser.username}
              </p>
              {yourLeaderboardEntry && (
                <div className="mt-3 inline-flex items-center gap-2 bg-[#1a1a1a] text-white font-mono text-[9px] uppercase font-bold px-3 py-1.5 border-2 border-black">
                  {rankDisplay(yourLeaderboardEntry.rank)}
                  <span>Global rank #{yourLeaderboardEntry.rank}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <div className="bg-[#ffcc00] border-3 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_#1a1a1a] flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-[#1a1a1a]/60">Participated</p>
                <p className="font-headline font-black text-4xl text-[#1a1a1a] mt-1">
                  {localCurrentUserStats.participations.toString().padStart(2, '0')}
                </p>
              </div>
              <Target className="w-8 h-8 text-[#1a1a1a]/40 shrink-0" strokeWidth={2.5} />
            </div>

            <div className="bg-[#0055ff] border-3 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_#1a1a1a] text-white flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-white/70">Submitted</p>
                <p className="font-headline font-black text-4xl mt-1">
                  {localCurrentUserStats.submissions.toString().padStart(2, '0')}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-white/40 shrink-0" strokeWidth={2.5} />
            </div>

            <div className="bg-[#16a34a] border-3 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_#1a1a1a] text-white flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-white/70">Wins</p>
                <p className="font-headline font-black text-4xl mt-1">
                  {localCurrentUserStats.wins.toString().padStart(2, '0')}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-white/40 shrink-0" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Right — vertical leaderboard entries */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between border-b-3 border-black pb-3 mb-4">
            <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#1a1a1a]">
              Rankings
            </h3>
            <span className="font-mono text-[9px] uppercase font-bold text-zinc-400">
              Top 10
            </span>
          </div>

          {loadingBoard ? (
            <div className="py-16 flex items-center justify-center gap-3 font-mono text-xs uppercase font-bold text-zinc-500 border-4 border-dashed border-zinc-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading leaderboard...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center font-mono text-sm uppercase font-bold text-zinc-400 px-6 border-4 border-dashed border-zinc-300">
              No registrations yet. Register for a hackathon to appear here.
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {visibleLeaderboardEntries.map((entry, index) => {
                const isYou = entry.user_id === currentUser.id;
                const isCurrentUserPositionRow = showCurrentUserPosition && index === visibleLeaderboardEntries.length - 1;
                const avatarUrl =
                  isYou && currentUser.avatar_url ? currentUser.avatar_url : entry.avatar_url;
                const isTopThree = entry.rank <= 3;

                return (
                  <div
                    key={`${entry.user_id}-${isCurrentUserPositionRow ? 'current-user' : 'top'}`}
                    className={`relative bg-white border-3 border-black p-3 sm:p-4 shadow-[3px_3px_0px_0px_#101010] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all ${
                      isYou ? 'ring-2 ring-[#0055ff] bg-[#0055ff]/5' : ''
                    } ${isTopThree ? 'shadow-[4px_4px_0px_0px_#ffcc00]' : ''}`}
                  >
                    {isCurrentUserPositionRow && (
                      <div className="absolute -top-3 left-4 bg-[#0055ff] text-white border-2 border-black px-2 py-0.5 font-mono text-[8px] uppercase font-bold">
                        Your position
                      </div>
                    )}
                    <div className="w-full sm:w-auto flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-[#1a1a1a] border-2 border-black flex items-center justify-center text-white">
                        {rankDisplay(entry.rank, isTopThree)}
                      </div>

                      <ProfileAvatar name={entry.name} avatarUrl={avatarUrl} size="sm" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-headline font-black text-sm uppercase tracking-tight text-[#1a1a1a] truncate">
                          {entry.name}
                        </p>
                        {isYou && (
                          <span className="font-mono text-[8px] uppercase font-bold text-white bg-[#0055ff] px-2 py-0.5 border border-black">
                            You
                          </span>
                        )}
                        </div>
                        {entry.username && (
                          <p className="font-mono text-[9px] uppercase font-bold text-zinc-400 mt-0.5">
                            @{entry.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:shrink-0">
                      <div className="text-center border-2 border-black px-2.5 py-1.5 bg-[#ffcc00]/30 min-w-[52px]">
                        <p className="font-headline font-black text-base text-[#1a1a1a] leading-none">
                          {entry.participations}
                        </p>
                        <p className="font-mono text-[7px] uppercase font-bold text-zinc-500 mt-0.5">Joined</p>
                      </div>
                      <div className="text-center border-2 border-black px-2.5 py-1.5 bg-[#0055ff]/15 min-w-[52px]">
                        <p className="font-headline font-black text-base text-[#0055ff] leading-none">
                          {entry.submissions}
                        </p>
                        <p className="font-mono text-[7px] uppercase font-bold text-zinc-500 mt-0.5">Sent</p>
                      </div>
                      <div className="text-center border-2 border-black px-2.5 py-1.5 bg-[#16a34a]/15 min-w-[52px]">
                        <p className="font-headline font-black text-base text-[#16a34a] leading-none">
                          {entry.wins}
                        </p>
                        <p className="font-mono text-[7px] uppercase font-bold text-zinc-500 mt-0.5">Won</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
