import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Loader2, Lock, Trophy } from 'lucide-react';
import { ApiError } from '../api/client';
import { getPublicProfile, buildPublicProfileUrl } from '../api/users';
import type { User, UserHackathonStatsApi } from '../api/types';
import type { TrackedApplication } from '../types';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ProfileAvatar } from './ProfileAvatar';
import {
  activityListToMap,
  buildRegistrationHeatmapFromRecords,
  buildRegistrationHeatmapFromTrackedApps,
  mergeActivityMaps,
} from '../lib/activityHeatmap';

interface PublicProfileViewProps {
  username: string;
  onHome: () => void;
  currentUser?: User | null;
  trackedApps?: TrackedApplication[];
  onBackToWorkspace?: () => void;
  onOpenPrivateSettings?: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case 'won':
      return 'Won';
    case 'submitted':
      return 'Submitted';
    case 'participated':
      return 'Registered';
    default:
      return 'Tracking';
  }
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  username,
  onHome,
  currentUser = null,
  trackedApps = [],
  onBackToWorkspace,
  onOpenPrivateSettings,
}) => {
  const [profile, setProfile] = useState<UserHackathonStatsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = currentUser?.username.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicProfile(username)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Profile not found.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const registrationCounts = useMemo(() => {
    const fromApi = activityListToMap(profile?.activity ?? []);
    const base =
      fromApi.size > 0
        ? fromApi
        : buildRegistrationHeatmapFromRecords(profile?.hackathons ?? []);

    if (!isOwner) return base;

    const syncedProjectIds = new Set((profile?.hackathons ?? []).map((record) => record.project_id));
    const localOnly = buildRegistrationHeatmapFromTrackedApps(
      trackedApps.filter((app) => !syncedProjectIds.has(app.id)),
    );
    return mergeActivityMaps(base, localOnly);
  }, [profile, isOwner, trackedApps]);

  const handleCopy = async () => {
    if (!profile) return;
    await navigator.clipboard.writeText(buildPublicProfileUrl(profile.user.username));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-primary font-body antialiased">
      <nav className="bg-white border-b-4 border-black sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={isOwner && onBackToWorkspace ? onBackToWorkspace : onHome}
            className="inline-flex items-center gap-2 font-headline font-black text-sm uppercase tracking-tighter hover:text-[#0055ff] cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {isOwner ? 'Back to workspace' : 'Hackathon Feed'}
          </button>
          <span className="font-mono text-[10px] uppercase font-bold bg-black text-[#ffcc00] px-3 py-1">
            /u/{username}
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm uppercase font-bold text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading profile...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border-4 border-black p-10 text-center shadow-[6px_6px_0px_0px_#e63b2e]">
            <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">Profile not found</h1>
            <p className="font-mono text-sm text-zinc-500 mt-3">{error}</p>
            <button
              type="button"
              onClick={onHome}
              className="mt-6 bg-black text-white font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black cursor-pointer"
            >
              Back to home
            </button>
          </div>
        )}

        {!loading && profile && (
          <>
            <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0px_0px_#0055ff]">
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <ProfileAvatar
                  name={profile.user.name}
                  avatarUrl={profile.user.avatar_url}
                  size="lg"
                  className="border-4 rounded-none"
                />

                <div className="flex-1 space-y-2">
                  <h1 className="font-headline font-black text-4xl uppercase tracking-tighter text-[#1a1a1a]">
                    {profile.user.name}
                  </h1>
                  <p className="font-mono text-sm font-bold text-[#0055ff]">@{profile.user.username}</p>
                  <p className="font-mono text-[10px] uppercase text-zinc-500 font-bold">
                    Member since {formatDate(profile.user.created_at)}
                  </p>
                  {profile.user.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {profile.user.interests.map((interest) => (
                        <span
                          key={interest}
                          className="font-mono text-[9px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#ffcc00] text-[#1a1a1a]"
                        >
                          #{interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 bg-black text-white font-headline font-black text-xs uppercase px-4 py-3 border-2 border-black hover:bg-[#ffcc00] hover:text-black cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy profile link'}
                </button>
              </div>
            </div>

            {isOwner && onOpenPrivateSettings && (
              <div className="bg-[#ffcc00]/20 border-2 border-[#ffcc00] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold text-[#1a1a1a]">
                  <Lock className="w-4 h-4 shrink-0" />
                  Saved hackathons are private and not shown on this public page.
                </div>
                <button
                  type="button"
                  onClick={onOpenPrivateSettings}
                  className="bg-black text-white font-headline font-black text-[10px] uppercase px-4 py-2 border-2 border-black hover:bg-[#0055ff] cursor-pointer shrink-0"
                >
                  Open saved hackathons
                </button>
              </div>
            )}

            <ActivityHeatmap
              counts={registrationCounts}
              title="Hackathon registrations"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Participated', value: profile.participations, color: 'text-[#0055ff]' },
                { label: 'Submitted', value: profile.submissions, color: 'text-[#1a1a1a]' },
                { label: 'Wins', value: profile.wins, color: 'text-emerald-600' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border-3 border-black p-6 text-center shadow-[4px_4px_0px_0px_#1a1a1a]"
                >
                  <p className={`font-headline font-black text-4xl ${stat.color}`}>
                    {stat.value.toString().padStart(2, '0')}
                  </p>
                  <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-2">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a]">
              <div className="flex items-center gap-2 border-b-3 border-black pb-4 mb-6">
                <Trophy className="w-5 h-5" />
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-[#1a1a1a]">
                  Hackathon history
                </h2>
              </div>

              {profile.hackathons.length === 0 ? (
                <p className="font-mono text-sm uppercase font-bold text-zinc-400 text-center py-10">
                  No public hackathon activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {profile.hackathons.map((record) => (
                    <div
                      key={record.project_id}
                      className="border-3 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#faf7f2]"
                    >
                      <div>
                        <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#1a1a1a]">
                          {record.hackathon_name}
                        </h3>
                        <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-1">
                          {record.stage} · Prize {record.prize_pool}
                        </p>
                        {record.registered_at && (
                          <p className="font-mono text-[9px] uppercase text-zinc-400 mt-1">
                            Registered {formatDate(record.registered_at)}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold px-3 py-1 border-2 border-black bg-[#ffcc00] text-[#1a1a1a]">
                        {outcomeLabel(record.outcome)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
