import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Check, Compass, ExternalLink, Bookmark, Loader2, Copy, Link2 } from 'lucide-react';
import type { Bookmark as ApiBookmark, User } from '../api/types';
import { deriveApiStatusFromDates, getHackathonStatusLabel } from '../lib/mapHackathon';
import { buildPublicProfileUrl } from '../api/users';
import type { TrackedApplication } from '../types';
import { buildUserStatsFromTrackedApps } from '../lib/userHackathonStats';

interface ProfileViewProps {
  user: User;
  bookmarks: ApiBookmark[];
  trackedApps: TrackedApplication[];
  setDashboardTab: (tab: 'dashboard' | 'hackathons' | 'projects' | 'team' | 'settings' | 'profile') => void;
  onSaveProfile: (data: { name: string; interests: string[]; username?: string }) => Promise<User>;
  embedded?: boolean;
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

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'closed':
      return 'bg-zinc-200 text-zinc-800 border-zinc-400';
    case 'upcoming':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'ended':
      return 'bg-zinc-100 text-zinc-600 border-zinc-300';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-300';
  }
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  bookmarks,
  trackedApps,
  setDashboardTab,
  onSaveProfile,
  embedded = false,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [expandedRegRow, setExpandedRegRow] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editInterests, setEditInterests] = useState(user.interests.join(', '));
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setEditName(user.name);
    setEditUsername(user.username);
    setEditInterests(user.interests.join(', '));
  }, [user]);

  const upcomingProject = useMemo(() => {
    const withDeadline = trackedApps
      .filter((app) => app.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    return withDeadline[0] ?? null;
  }, [trackedApps]);

  const hackathonStats = useMemo(
    () => buildUserStatsFromTrackedApps(user, trackedApps),
    [user, trackedApps],
  );

  const handleSave = async () => {
    const name = editName.trim();
    if (name.length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    const interests = editInterests
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSaveProfile({
        name,
        interests,
        username: editUsername.trim().toLowerCase() !== user.username
          ? editUsername.trim().toLowerCase()
          : undefined,
      });
      setIsEditingProfile(false);
      setSuccessMessage('Profile updated successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!user.username) return;
    await navigator.clipboard.writeText(buildPublicProfileUrl(user.username));
    setLinkCopied(true);
    setSuccessMessage('Public profile link copied.');
    window.setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleExport = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
        created_at: user.created_at,
      },
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        saved_at: b.created_at,
        hackathon: b.hackathon,
      })),
      tracked_projects: trackedApps,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user.name.toLowerCase().replace(/\s+/g, '_')}_profile_export.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('Profile data exported.');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {!embedded && (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-black pb-6">
        <div>
          <h2 className="font-headline font-black text-3xl md:text-5xl uppercase italic tracking-tighter text-[#1a1a1a]">
            USER PROFILE & WORKSPACE
          </h2>
          <p className="font-mono text-xs uppercase text-zinc-500 font-bold mt-2">
            Live data from your account — name, interests, and saved hackathons.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
          <span className="font-mono text-[10px] uppercase bg-black text-[#ffcc00] border-2 border-black py-1 px-2.5 font-bold">
            @{user.username}
          </span>
          <button
            type="button"
            onClick={handleCopyProfileLink}
            className="inline-flex items-center gap-2 bg-[#0055ff] text-white border-2 border-black py-1.5 px-4 font-headline font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] hover:text-black cursor-pointer border-none"
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            Share profile
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsEditingProfile(true);
            }}
            className="bg-black text-white border-2 border-black py-1.5 px-4 font-headline font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black hover:translate-y-[-1px] select-none cursor-pointer duration-150 border-none"
          >
            EDIT PROFILE
          </button>
        </div>
      </div>
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black pb-4">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-[#1a1a1a]">
            Account & bookmarks
          </h2>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsEditingProfile(true);
            }}
            className="bg-black text-white border-2 border-black py-1.5 px-4 font-headline font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black cursor-pointer border-none"
          >
            Edit profile
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-[#ffcc00]/20 border-3 border-[#ffcc00] p-4 font-mono text-xs font-bold text-black flex justify-between items-center animate-slideIn">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-black shrink-0 animate-pulse" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-black font-black hover:opacity-70 text-sm cursor-pointer border-none bg-transparent"
          >
            [X]
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-[#e63b2e]/10 border-3 border-[#e63b2e] p-4 font-mono text-xs font-bold text-[#e63b2e] flex justify-between items-center">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-black hover:opacity-70 cursor-pointer border-none bg-transparent"
          >
            [X]
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 ${embedded ? '' : 'lg:grid-cols-12'} gap-8 items-start`}>
        {!embedded && (
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border-3 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] rounded-[8px]">
            <div className="relative w-44 h-44 mx-auto border-4 border-black rounded-[4px] p-1.5 bg-gradient-to-br from-[#ffd700] via-[#ffcc00] to-amber-500 shadow-[3px_3px_0px_0px_#1a1a1a]">
              <div className="w-full h-full border-2 border-black overflow-hidden bg-zinc-900 rounded-[2px] relative flex items-center justify-center">
                <span className="font-headline font-black text-5xl text-[#ffcc00]">
                  {userInitials(user.name)}
                </span>
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#e63b2e] border border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#1a1a1a]">
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                </div>
              </div>
            </div>

            <h3 className="font-headline font-black text-3xl uppercase tracking-tighter text-center mt-5 text-[#1a1a1a]">
              {user.name}
            </h3>
            <p className="font-mono text-[11px] uppercase text-[#0055ff] font-bold text-center mt-1">
              hackathonfeed/u/{user.username}
            </p>
            <p className="font-headline font-black text-xs uppercase text-[#e63b2e] tracking-widest text-center mt-0.5">
              {user.role}
            </p>

            <div className="border-b-2 border-dashed border-zinc-200 my-4" />

            <div className="grid grid-cols-2 gap-4 divide-x-2 divide-zinc-200">
              <div className="text-center">
                <p className="font-headline font-black text-3xl text-[#16a34a] tracking-tight">
                  {hackathonStats.wins.toString().padStart(2, '0')}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-tighter text-zinc-400 font-bold mt-1.5">
                  Wins
                </p>
              </div>
              <div className="text-center">
                <p className="font-headline font-black text-3xl text-[#0055ff] tracking-tight">
                  {hackathonStats.participations.toString().padStart(2, '0')}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-tighter text-zinc-400 font-bold mt-1.5">
                  Participated
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 divide-x-2 divide-zinc-200 mt-4 pt-4 border-t border-dashed border-zinc-200">
              <div className="text-center">
                <p className="font-headline font-black text-3xl text-[#1a1a1a] tracking-tight">
                  {bookmarks.length.toString().padStart(2, '0')}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-tighter text-zinc-400 font-bold mt-1.5">
                  Saved Hackathons
                </p>
              </div>
              <div className="text-center">
                <p className="font-headline font-black text-3xl text-blue-600 tracking-tight">
                  {trackedApps.length.toString().padStart(2, '0')}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-tighter text-zinc-400 font-bold mt-1.5">
                  Tracked Projects
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#ffcc00] border-3 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] rounded-[8px] text-[#1a1a1a]">
            <h4 className="font-headline font-black text-lg uppercase tracking-tight">Account Details</h4>
            <div className="w-16 h-0.5 bg-black mt-1 mb-4" />

            <div className="space-y-4">
              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-[#1a1a1a]/40">Email</p>
                <p className="font-sans font-black text-[13px] tracking-tight break-all mt-1">{user.email}</p>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-[#1a1a1a]/40">Member since</p>
                <p className="font-sans font-extrabold text-[12px] mt-1">{formatDate(user.created_at)}</p>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase font-bold text-[#1a1a1a]/40 mb-1.5">Interests</p>
                {user.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.interests.map((interest) => (
                      <span
                        key={interest}
                        className="font-mono text-[9px] uppercase font-bold px-2 py-1 border-2 border-black bg-white"
                      >
                        #{interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-[12px] text-[#1a1a1a]/70 italic">No interests set yet.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${user.name} <${user.email}>`);
                  setSuccessMessage('Profile contact copied to clipboard.');
                }}
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase font-bold underline cursor-pointer bg-transparent border-none p-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Copy contact info
              </button>
            </div>
          </div>
        </div>
        )}

        <div className={embedded ? 'space-y-8' : 'lg:col-span-8 space-y-8'}>
          <div className="bg-white border-3 border-black p-6 md:p-8 shadow-[5px_5px_0px_0px_#1a1a1a] rounded-[8px]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b-3 border-black pb-4 mb-6 gap-3">
              <h3 className="font-headline font-black text-2xl tracking-tight text-[#1a1a1a] uppercase flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                Saved Hackathons
              </h3>
              <span className="font-mono text-[9px] font-black bg-[#ffcc00] border-2 border-black py-1 px-3 uppercase tracking-wider shadow-[2px_2px_0px_0px_#1a1a1a]">
                {bookmarks.length} bookmark{bookmarks.length === 1 ? '' : 's'}
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="border-4 border-dashed border-zinc-300 py-12 text-center font-mono uppercase text-sm font-bold text-zinc-400">
                No saved hackathons yet.
                <button
                  type="button"
                  onClick={() => setDashboardTab('hackathons')}
                  className="block mx-auto mt-3 underline text-[#0055ff] cursor-pointer bg-transparent border-none"
                >
                  Browse hackathons
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((bookmark) => {
                  const hack = bookmark.hackathon;
                  if (!hack) return null;
                  const rowId = bookmark.id;
                  const isExpanded = expandedRegRow === rowId;

                  return (
                    <div
                      key={bookmark.id}
                      onClick={() => setExpandedRegRow(isExpanded ? null : rowId)}
                      className={`bg-white border-3 border-black p-4 shadow-[3px_3px_0px_0px_#1a1a1a] hover:translate-y-[-1px] transition-all cursor-pointer ${
                        isExpanded ? 'ring-2 ring-blue-600 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <span className="font-mono text-[10px] text-[#e63b2e] font-extrabold uppercase">
                            Saved {formatDate(bookmark.created_at)}
                          </span>
                          <h4 className="font-headline font-black text-xl uppercase tracking-tighter text-[#1a1a1a] mt-1">
                            {hack.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-[10px] border rounded font-bold px-2 py-0.5 uppercase tracking-wide ${statusBadgeClass(
                              deriveApiStatusFromDates(hack) ?? hack.status,
                            )}`}
                          >
                            {hack.status_label ?? getHackathonStatusLabel(hack)}
                          </span>
                          <div className="w-7 h-7 bg-[#eee9e0] border-2 border-black flex items-center justify-center shrink-0">
                            <span className={`font-mono font-bold text-xs ${isExpanded ? 'rotate-90 text-blue-600' : ''}`}>
                              »
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-dashed border-zinc-200 font-sans text-xs space-y-2 text-zinc-700">
                          <p>
                            <span className="font-bold uppercase">Organizer:</span> {hack.organizer || '—'}
                          </p>
                          <p>
                            <span className="font-bold uppercase">Platform:</span> {hack.source_platform}
                          </p>
                          <p>
                            <span className="font-bold uppercase">Prize pool:</span> {hack.prize_pool || 'TBD'}
                          </p>
                          <p>
                            <span className="font-bold uppercase">Deadline:</span> {formatDate(hack.deadline)}
                          </p>
                          <p>
                            <span className="font-bold uppercase">Mode:</span> {hack.mode}
                            {hack.location ? ` · ${hack.location}` : ''}
                          </p>
                          {hack.categories.length > 0 && (
                            <p>
                              <span className="font-bold uppercase">Categories:</span>{' '}
                              {hack.categories.join(', ')}
                            </p>
                          )}
                          {hack.url && (
                            <a
                              href={hack.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[#0055ff] font-bold uppercase underline"
                            >
                              Open hackathon page
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={handleExport}
              className="w-full bg-[#1a1a1a] text-white border-3 border-black py-4 px-6 font-headline font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all cursor-pointer mt-8 border-none"
            >
              Export profile data (JSON)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {upcomingProject ? (
              <div className="sm:col-span-2 bg-[#0055ff] border-3 border-black p-5 shadow-[4px_4px_0px_0px_#1a1a1a] rounded-[8px] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="font-headline font-black text-xl uppercase tracking-tighter leading-none">
                    Next tracked project
                  </h4>
                  <p className="font-mono text-[10px] uppercase font-bold tracking-wide mt-2 text-[#ffcc00]">
                    {upcomingProject.title} · due {formatDate(upcomingProject.deadline)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDashboardTab('projects')}
                  className="bg-[#ffcc00] text-black border-2 border-black py-2 px-4 font-headline font-black text-[10px] uppercase tracking-wider shadow-[2.5px_2.5px_0px_0px_#101010] hover:bg-white cursor-pointer"
                >
                  View tracker
                </button>
              </div>
            ) : (
              <div className="sm:col-span-2 bg-zinc-100 border-3 border-black p-5 rounded-[8px] flex items-center justify-center">
                <p className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                  No tracked projects with deadlines
                </p>
              </div>
            )}

            <div className="sm:col-span-1 bg-[#e63b2e] border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a] rounded-[8px] text-white flex flex-col justify-between items-center text-center gap-4">
              <Compass className="w-8 h-8 text-[#ffcc00] animate-[spin_10s_linear_infinite]" strokeWidth={2.5} />
              <div>
                <p className="font-headline font-black text-xs uppercase tracking-wider">Account role</p>
                <p className="font-mono text-[8.5px] uppercase tracking-tighter text-white/90 font-bold mt-1">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#ffcc00] max-w-lg w-full rounded-[8px] flex flex-col gap-6 relative">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-zinc-100 hover:bg-[#e63b2e] hover:text-white border-2 border-black font-mono font-bold text-sm flex items-center justify-center cursor-pointer"
            >
              X
            </button>

            <div>
              <h4 className="font-headline font-black text-2xl uppercase italic tracking-tighter text-[#1a1a1a]">
                Edit profile
              </h4>
              <p className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                Update name and interests — synced to the database.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-600 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#fcfbfa] border-3 border-black font-sans font-black text-xs p-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-600 mb-1">
                  Public username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase())}
                  placeholder="your-handle"
                  className="w-full bg-[#fcfbfa] border-3 border-black font-mono font-bold text-xs p-3 focus:outline-none"
                />
                <p className="font-mono text-[9px] text-zinc-400 mt-1">
                  Profile URL: {buildPublicProfileUrl(editUsername || user.username)}
                </p>
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-600 mb-1">
                  Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  placeholder="AI, Web3, Design"
                  className="w-full bg-[#fcfbfa] border-3 border-black font-sans font-bold text-xs p-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-600 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-zinc-100 border-3 border-black font-mono font-bold text-xs p-3 opacity-70 cursor-not-allowed"
                />
                <p className="font-mono text-[9px] text-zinc-400 mt-1">Email cannot be changed here.</p>
              </div>
            </div>

            <div className="flex gap-4 border-t-2 border-dashed border-zinc-200 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-black text-white border-3 border-black font-headline font-black text-xs uppercase tracking-widest py-3.5 shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border-none"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-5 bg-white text-zinc-600 border-3 border-black font-headline font-black text-xs uppercase py-3.5 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
