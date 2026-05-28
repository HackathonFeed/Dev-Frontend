import { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Trophy,
  ExternalLink,
  Filter,
  Github,
  Eye,
  Heart,
  Search,
  Users,
  X,
  Lock,
  Zap,
  Unlock,
} from 'lucide-react';
import {
  useProjects,
  DEFAULT_PROJECT_FILTERS,
  type ProjectsFilterValues,
} from '../hooks/useProjects';
import { consumeProjectView } from '../api/subscriptions';
import { ApiError } from '../api/client';
import type { ProjectApi } from '../api';
import type { SubscriptionStatus } from '../api/types';

// Neobrutalist palette used across the dashboard
const CARD_SHADOWS = ['#0055ff', '#e63b2e', '#ffcc00', '#16a34a', '#7c3aed', '#0891b2'];

function shadowFor(index: number): string {
  return CARD_SHADOWS[index % CARD_SHADOWS.length];
}

function compactNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1_000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

const PROJECT_VIEW_COST = 10;
const PROJECT_UNLOCKS_KEY_PREFIX = 'hackathon_feed_project_unlocks';

function projectUnlocksKey(userId: string | null): string {
  return `${PROJECT_UNLOCKS_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

function readUnlockedProjects(userId: string | null): Set<string> {
  try {
    const raw = window.localStorage.getItem(projectUnlocksKey(userId));
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeUnlockedProjects(userId: string | null, projectIds: Set<string>) {
  try {
    window.localStorage.setItem(projectUnlocksKey(userId), JSON.stringify([...projectIds]));
  } catch {
    // localStorage can fail in private browsing; charging still works for this session.
  }
}

interface ProjectsViewProps {
  currentUserId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  onUpgradeClick: () => void;
  onSubscriptionChange: (status: SubscriptionStatus) => void;
}

export function ProjectsView({ currentUserId, subscriptionStatus, onUpgradeClick, onSubscriptionChange }: ProjectsViewProps) {
  const [filters, setFilters] = useState<ProjectsFilterValues>({ ...DEFAULT_PROJECT_FILTERS });
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectApi | null>(null);
  const [unlockingProjectId, setUnlockingProjectId] = useState<string | null>(null);
  const [projectAccessError, setProjectAccessError] = useState<string | null>(null);
  const [unlockedProjectIds, setUnlockedProjectIds] = useState<Set<string>>(() => readUnlockedProjects(currentUserId));

  useEffect(() => {
    setUnlockedProjectIds(readUnlockedProjects(currentUserId));
  }, [currentUserId]);

  const patchFilter = (patch: Partial<ProjectsFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_PROJECT_FILTERS });
    setPage(1);
  };

  const {
    projects,
    platforms,
    technologies,
    loading,
    error,
    total,
    pages,
    refetch,
  } = useProjects({ page, pageSize: 20, ...filters });

  const hasActiveFilters = Boolean(
    filters.search || filters.platform || filters.technology || filters.winnersOnly
  );

  const remainingProjectViews = (() => {
    if (!subscriptionStatus) return 0;
    if (subscriptionStatus.ai_points === -1) return -1;
    return Math.floor(subscriptionStatus.ai_points / PROJECT_VIEW_COST);
  })();
  const projectAccessExhausted =
    subscriptionStatus !== null &&
    subscriptionStatus.ai_points !== -1 &&
    subscriptionStatus.ai_points < PROJECT_VIEW_COST;
  const projectsToShow = projectAccessExhausted
    ? projects.filter((project) => unlockedProjectIds.has(project.id))
    : projects;

  const openProject = async (project: ProjectApi) => {
    if (unlockingProjectId) return;

    if (unlockedProjectIds.has(project.id)) {
      setProjectAccessError(null);
      setSelectedProject(project);
      return;
    }

    if (subscriptionStatus && subscriptionStatus.ai_points !== -1 && subscriptionStatus.ai_points < PROJECT_VIEW_COST) {
      setProjectAccessError(`You need ${PROJECT_VIEW_COST} points to view a project. Upgrade your plan to continue.`);
      onUpgradeClick();
      return;
    }

    setUnlockingProjectId(project.id);
    setProjectAccessError(null);
    try {
      const status = await consumeProjectView();
      onSubscriptionChange(status);
      setUnlockedProjectIds((previous) => {
        const next = new Set(previous);
        next.add(project.id);
        writeUnlockedProjects(currentUserId, next);
        return next;
      });
      setSelectedProject(project);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setProjectAccessError(`You need ${PROJECT_VIEW_COST} points to view a project. Upgrade your plan to continue.`);
        onUpgradeClick();
      } else {
        setProjectAccessError(err instanceof Error ? err.message : 'Could not unlock project details.');
      }
    } finally {
      setUnlockingProjectId(null);
    }
  };

  const filterControls = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search title or tagline..."
            value={filters.search}
            onChange={(e) => patchFilter({ search: e.target.value })}
            className="w-full bg-[#fafafa] pl-8 sm:pl-10 pr-3 py-2 sm:py-3 border-2 border-black font-mono text-[10px] sm:text-xs uppercase font-bold focus:outline-none focus:bg-white"
          />
        </div>

        <select
          value={filters.platform}
          onChange={(e) => patchFilter({ platform: e.target.value })}
          className="md:col-span-3 bg-[#fafafa] px-2.5 sm:px-3 py-2 sm:py-3 border-2 border-black font-mono text-[10px] sm:text-xs uppercase font-bold focus:outline-none focus:bg-white cursor-pointer"
        >
          <option value="">ALL PLATFORMS</option>
          {platforms.map((p) => (
            <option key={p.platform} value={p.platform}>
              {p.platform} ({p.count})
            </option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(e) => patchFilter({ sort: e.target.value as ProjectsFilterValues['sort'] })}
          className="md:col-span-2 bg-[#fafafa] px-2.5 sm:px-3 py-2 sm:py-3 border-2 border-black font-mono text-[10px] sm:text-xs uppercase font-bold focus:outline-none focus:bg-white cursor-pointer"
        >
          <option value="likes">SORT: LIKES</option>
          <option value="views">SORT: VIEWS</option>
          <option value="recent">SORT: RECENT</option>
        </select>

        <button
          type="button"
          onClick={() => patchFilter({ winnersOnly: !filters.winnersOnly })}
          className={`md:col-span-2 px-2.5 sm:px-3 py-2 sm:py-3 border-2 border-black font-headline font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            filters.winnersOnly
              ? 'bg-[#ffcc00] text-black shadow-[2px_2px_0px_0px_#1a1a1a]'
              : 'bg-white text-zinc-500 hover:bg-[#ffcc00]/10'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />
          WINNERS
        </button>
      </div>

      {technologies.length > 0 && (
        <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-2 border-t border-zinc-200">
          <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase text-zinc-500 pr-2 self-center">
            TECH:
          </span>
          {technologies.slice(0, 12).map((t) => (
            <button
              key={t.technology}
              type="button"
              onClick={() =>
                patchFilter({
                  technology: filters.technology === t.technology ? '' : t.technology,
                })
              }
              className={`font-mono text-[9px] sm:text-[10px] font-bold uppercase px-2 py-1 border-2 border-black transition-all cursor-pointer ${
                filters.technology === t.technology
                  ? 'bg-[#0055ff] text-white shadow-[1px_1px_0px_0px_#1a1a1a]'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              #{t.technology} <span className="opacity-60">{t.count}</span>
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-mono text-[9px] sm:text-[10px] font-bold uppercase px-2 py-1 border-2 border-[#e63b2e] bg-white text-[#e63b2e] ml-auto cursor-pointer hover:bg-[#e63b2e] hover:text-white"
            >
              CLEAR ALL
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-black pb-4 mb-8 gap-4">
        <div>
          <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest select-none">
            BUILT AT HACKATHONS
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-tighter mt-2 break-words">
            PROJECTS ({total.toLocaleString()})
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold max-w-sm sm:text-right leading-tight">
          Real submissions scraped from Devfolio. Sort by likes, views, or recency.
        </p>
      </div>

      <div className="border-3 border-black bg-[#ffcc00]/20 p-4 sm:p-5 shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 border-2 border-black bg-[#ffcc00] flex items-center justify-center">
            <Zap className="w-5 h-5" strokeWidth={3} />
          </div>
          <div>
            <p className="font-headline font-black text-lg uppercase tracking-tight text-[#1a1a1a]">
              Project details cost {PROJECT_VIEW_COST} points
            </p>
            <p className="font-mono text-[10px] uppercase font-bold text-zinc-600 leading-relaxed">
              {remainingProjectViews === -1
                ? 'Your plan has unlimited points. Open any project details.'
                : `You have ${subscriptionStatus?.ai_points ?? 0} points, enough for ${remainingProjectViews} project view${remainingProjectViews === 1 ? '' : 's'}.`}
            </p>
            {projectAccessError && (
              <p className="mt-2 font-mono text-[10px] uppercase font-bold text-[#e63b2e]">
                {projectAccessError}
              </p>
            )}
          </div>
        </div>
        {remainingProjectViews !== -1 && remainingProjectViews <= 1 && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="inline-flex items-center justify-center gap-2 bg-[#1a1a1a] text-white border-2 border-black px-4 py-2 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#0055ff] hover:bg-[#0055ff] cursor-pointer transition-all"
          >
            <Zap className="w-4 h-4" strokeWidth={3} />
            Upgrade plan
          </button>
        )}
      </div>

      {projectAccessExhausted && (
        <div className="border-4 border-black bg-white p-8 sm:p-10 text-center shadow-[6px_6px_0px_0px_#e63b2e]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center border-3 border-black bg-[#e63b2e] text-white shadow-[3px_3px_0px_0px_#1a1a1a]">
            <Lock className="w-8 h-8" strokeWidth={3} />
          </div>
          <p className="font-headline font-black text-3xl uppercase tracking-tight text-[#1a1a1a]">
            Project access locked
          </p>
          <p className="mx-auto mt-3 max-w-xl font-mono text-xs uppercase font-bold text-zinc-500 leading-6">
            You need {PROJECT_VIEW_COST} points to browse and unlock projects. Upgrade your plan to continue exploring the project database.
          </p>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="mt-6 inline-flex items-center justify-center gap-2 bg-[#0055ff] text-white border-2 border-black px-6 py-3 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] cursor-pointer transition-all"
          >
            <Zap className="w-4 h-4" strokeWidth={3} />
            Upgrade plan
          </button>
        </div>
      )}

      {!projectAccessExhausted && (
        <>
          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div className="sm:hidden bg-white border-2 border-black p-2.5 shadow-[2px_2px_0px_0px_#1a1a1a]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-headline font-black text-xs uppercase">Project filters</p>
                  <p className="font-mono text-[9px] uppercase text-zinc-500 font-bold">
                    {total.toLocaleString()} projects
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="bg-[#ffcc00] border-2 border-black px-3 py-1.5 font-headline font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_#101010]"
              >
                Open filters
              </button>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center justify-between gap-2 border-t-2 border-black mt-2 pt-2">
                <span className="font-mono text-[9px] uppercase font-bold text-zinc-500">
                  Filters active
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-[#e63b2e] bg-transparent border-none"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="hidden sm:block bg-white border-3 border-black p-4 sm:p-6 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-4">
            {filterControls}
          </div>

          {mobileFiltersOpen && (
            <div
              className="sm:hidden fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm p-3 flex items-end"
              role="dialog"
              aria-modal="true"
              onClick={() => setMobileFiltersOpen(false)}
            >
              <div
                className="w-full max-h-[76vh] overflow-y-auto bg-white border-3 border-black p-3 shadow-[4px_4px_0px_0px_#ffcc00] space-y-3 animate-fadeIn"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-2">
                  <div>
                    <p className="font-headline font-black text-base uppercase">Project filters</p>
                    <p className="font-mono text-[9px] uppercase text-zinc-500 font-bold">
                      {total.toLocaleString()} projects
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="bg-black text-white border-2 border-black w-8 h-8 font-headline font-black text-lg"
                    aria-label="Close project filters"
                  >
                    ×
                  </button>
                </div>
                {filterControls}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full bg-[#ffcc00] border-2 border-black py-2 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#101010]"
                >
                  Show projects
                </button>
              </div>
            </div>
          )}

        </>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center font-mono uppercase text-sm font-bold text-zinc-500 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading projects from backend...
        </div>
      ) : error ? (
        <div className="border-4 border-dashed border-[#e63b2e] py-16 text-center font-mono uppercase text-sm font-bold text-[#e63b2e] space-y-3">
          <p>{error}</p>
          <button onClick={() => refetch()} className="underline text-[#0055ff]">
            Retry connection
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="border-4 border-dashed border-zinc-300 py-24 text-center font-mono uppercase text-sm font-bold text-zinc-400">
          No projects match the current filters.
          <button
            onClick={clearFilters}
            className="block mx-auto mt-2 underline text-[#0055ff]"
          >
            Clear filters
          </button>
        </div>
      ) : projectAccessExhausted && projectsToShow.length === 0 ? (
        <div className="border-4 border-dashed border-zinc-300 py-16 text-center font-mono uppercase text-sm font-bold text-zinc-400">
          No unlocked projects on this page. Upgrade to unlock more projects.
        </div>
      ) : (
        <div className="space-y-6">
          {projectAccessExhausted && (
            <p className="font-mono text-[10px] uppercase font-bold text-zinc-500">
              Showing your already unlocked projects. Upgrade to unlock new projects.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {projectsToShow.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                shadowColor={shadowFor(idx)}
                isUnlocking={unlockingProjectId === project.id}
                isUnlocked={unlockedProjectIds.has(project.id)}
                onOpen={() => void openProject(project)}
              />
            ))}
          </div>
        </div>
      )}

      {!projectAccessExhausted && pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 font-mono text-xs font-bold uppercase">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 border-2 border-black bg-white disabled:opacity-40 hover:bg-[#ffcc00] cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-zinc-600">
            Page {page} / {pages} · {total.toLocaleString()} total
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border-2 border-black bg-white disabled:opacity-40 hover:bg-[#ffcc00] cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}

// ── Project card ────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectApi;
  shadowColor: string;
  isUnlocking: boolean;
  isUnlocked: boolean;
  onOpen: () => void;
}

function ProjectCard({ project, shadowColor, isUnlocking, isUnlocked, onOpen }: ProjectCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isUnlocking) onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!isUnlocking) onOpen();
        }
      }}
      className="bg-white border-3 border-black flex flex-col overflow-hidden hover:translate-y-[-2px] transition-all min-w-0 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#0055ff]"
      style={{ boxShadow: `5px 5px 0px 0px ${shadowColor}` }}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-zinc-100 border-b-2 border-black overflow-hidden">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-headline font-black text-3xl text-zinc-300 uppercase">
            {project.title.slice(0, 2)}
          </div>
        )}
        {project.is_winner && (
          <div className="absolute top-2 right-2 bg-[#ffcc00] border-2 border-black px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#1a1a1a]">
            <Trophy className="w-3 h-3" strokeWidth={3} />
            <span className="font-headline font-black text-[10px] uppercase">WINNER</span>
          </div>
        )}
        <div
          className={`absolute left-2 top-2 border-2 border-black px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_#1a1a1a] ${
            isUnlocked ? 'bg-[#16a34a] text-white' : 'bg-[#1a1a1a] text-[#ffcc00]'
          }`}
        >
          {isUnlocked ? <Unlock className="w-3 h-3" strokeWidth={3} /> : <Lock className="w-3 h-3" strokeWidth={3} />}
          <span className="font-headline font-black text-[10px] uppercase">
            {isUnlocked ? 'UNLOCKED' : `${PROJECT_VIEW_COST} PTS`}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-headline font-black text-base sm:text-lg uppercase tracking-tight text-[#1a1a1a] break-words leading-tight">
            {project.title}
          </h3>
          {project.tagline && (
            <p className="text-xs font-semibold text-zinc-500 leading-snug mt-1 line-clamp-2">
              {project.tagline}
            </p>
          )}
        </div>

        {/* Hackathon label */}
        {project.hackathon_name && (
          <span
            className="font-mono text-[10px] uppercase font-bold text-[#0055ff] hover:underline truncate"
            title={project.hackathon_name}
          >
            ↳ {project.hackathon_name}
          </span>
        )}

        {/* Prize */}
        {project.is_winner && project.prize && (
          <div className="bg-[#ffcc00]/30 border border-[#ffcc00] px-2 py-1.5">
            <p className="font-mono text-[10px] uppercase font-bold text-[#1a1a1a] leading-tight">
              🏆 {project.prize}
            </p>
          </div>
        )}

        {/* Tech tags (top 5) */}
        {project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologies.slice(0, 5).map((t) => (
              <span
                key={t}
                className="bg-zinc-100 font-mono text-[9px] font-extrabold px-1.5 py-0.5 border border-zinc-300"
              >
                #{t}
              </span>
            ))}
            {project.technologies.length > 5 && (
              <span className="font-mono text-[9px] font-bold text-zinc-400 px-1 py-0.5">
                +{project.technologies.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[10px] font-bold">
            <span className="flex items-center gap-1" title="Likes">
              <Heart className="w-3 h-3" />
              {compactNumber(project.likes_count)}
            </span>
            <span className="flex items-center gap-1" title="Views">
              <Eye className="w-3 h-3" />
              {compactNumber(project.views)}
            </span>
            {project.team_members.length > 0 && (
              <span className="flex items-center gap-1" title="Team size">
                <Users className="w-3 h-3" />
                {project.team_members.length}
              </span>
            )}
          </div>

          {/* Details action */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isUnlocking) onOpen();
              }}
              disabled={isUnlocking}
              className={`font-headline font-black text-[10px] uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#101010] transition-all disabled:opacity-60 ${
                isUnlocked
                  ? 'bg-[#16a34a] text-white hover:bg-black hover:text-[#ffcc00]'
                  : 'bg-[#0055ff] text-white hover:bg-black hover:text-[#ffcc00]'
              }`}
            >
              {isUnlocking ? (
                'UNLOCKING...'
              ) : isUnlocked ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
                  VIEW
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" strokeWidth={3} />
                  UNLOCK
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

interface ProjectDetailModalProps {
  project: ProjectApi;
  onClose: () => void;
}

function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const scrapedDate = project.scraped_at
    ? new Date(project.scraped_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-detail-title"
    >
      <div
        className="bg-[#f5f0e8] border-4 border-black w-full md:max-w-4xl max-h-[92vh] overflow-y-auto shadow-[8px_8px_0px_0px_#0055ff] animate-fadeIn"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#ffcc00] border-b-4 border-black px-5 py-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
            Project Intel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Close project details"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {project.thumbnail && (
          <div className="border-b-4 border-black bg-zinc-900 aspect-[21/9] overflow-hidden">
            <img
              src={project.thumbnail}
              alt={project.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="p-5 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-white">
                  {project.source_platform}
                </span>
                {project.is_winner && (
                  <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#ffcc00] flex items-center gap-1">
                    <Trophy className="w-3 h-3" strokeWidth={3} />
                    Winner
                  </span>
                )}
                {scrapedDate && (
                  <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#0055ff] text-white flex items-center gap-1">
                    <Calendar className="w-3 h-3" strokeWidth={3} />
                    {scrapedDate}
                  </span>
                )}
              </div>

              <h2
                id="project-detail-title"
                className="font-headline font-black text-3xl md:text-5xl uppercase tracking-tight text-[#1a1a1a] leading-none"
              >
                {project.title}
              </h2>

              {project.tagline && (
                <p className="font-mono text-sm font-bold text-zinc-600 leading-relaxed">
                  {project.tagline}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 shrink-0">
              <MetricBox icon={<Heart className="w-4 h-4" />} label="Likes" value={compactNumber(project.likes_count)} />
              <MetricBox icon={<Eye className="w-4 h-4" />} label="Views" value={compactNumber(project.views)} />
              <MetricBox icon={<Users className="w-4 h-4" />} label="Team" value={project.team_members.length || '—'} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {project.description && (
                <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
                  <h3 className="font-headline font-black text-sm uppercase mb-2">Description</h3>
                  <p className="font-mono text-xs font-bold text-zinc-600 leading-6 whitespace-pre-wrap">
                    {project.description}
                  </p>
                </section>
              )}

              {project.description_sections.length > 0 && (
                <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-4">
                  <h3 className="font-headline font-black text-sm uppercase">Project details</h3>
                  {project.description_sections.map((section) => (
                    <div key={section.title} className="border-t border-zinc-200 pt-3 first:border-t-0 first:pt-0">
                      <p className="font-headline font-black text-xs uppercase text-[#0055ff]">
                        {section.title}
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold text-zinc-600 leading-6 whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#ffcc00] space-y-3">
                <h3 className="font-headline font-black text-sm uppercase">URLs</h3>
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border-2 border-black bg-[#1a1a1a] text-white px-3 py-2 font-headline font-black text-xs uppercase hover:bg-[#ffcc00] hover:text-[#1a1a1a] transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      GitHub URL
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {project.demo_url && (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 border-2 border-black bg-[#0055ff] text-white px-3 py-2 font-headline font-black text-xs uppercase hover:bg-black hover:text-[#ffcc00] transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Demo URL
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border-2 border-black bg-white px-3 py-2 font-headline font-black text-xs uppercase hover:bg-zinc-100 transition-colors"
                >
                  <span>Source page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {!project.github_url && !project.demo_url && (
                  <p className="font-mono text-[10px] uppercase font-bold text-zinc-400">
                    No GitHub or demo URL available for this project.
                  </p>
                )}
              </section>

              {project.hackathon_name && (
                <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
                  <p className="font-mono text-[10px] uppercase font-bold text-zinc-500">Hackathon</p>
                  {project.hackathon_url ? (
                    <a
                      href={project.hackathon_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block font-headline font-black text-base uppercase text-[#0055ff] hover:underline"
                    >
                      {project.hackathon_name}
                    </a>
                  ) : (
                    <p className="mt-1 font-headline font-black text-base uppercase text-[#1a1a1a]">
                      {project.hackathon_name}
                    </p>
                  )}
                  {project.prize && (
                    <p className="mt-3 font-mono text-[10px] uppercase font-bold text-zinc-600">
                      Prize: {project.prize}
                    </p>
                  )}
                  {project.prize_description && (
                    <p className="mt-1 font-mono text-[10px] uppercase font-bold text-zinc-500 leading-5">
                      {project.prize_description}
                    </p>
                  )}
                </section>
              )}

              {project.technologies.length > 0 && (
                <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
                  <h3 className="font-headline font-black text-sm uppercase mb-3">Tech stack</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {project.technologies.map((technology) => (
                      <span key={technology} className="bg-zinc-100 font-mono text-[9px] font-extrabold px-2 py-1 border border-zinc-300">
                        #{technology}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {project.team_members.length > 0 && (
                <section className="bg-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a]">
                  <h3 className="font-headline font-black text-sm uppercase mb-3">Team</h3>
                  <div className="space-y-2">
                    {project.team_members.map((member) => (
                      <div key={member.username} className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold text-zinc-600">
                        {member.profile_image ? (
                          <img
                            src={member.profile_image}
                            alt={member.full_name ?? member.username}
                            className="w-7 h-7 border-2 border-black object-cover bg-zinc-100"
                            onError={(event) => {
                              (event.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="w-7 h-7 border-2 border-black bg-[#1a1a1a] text-[#ffcc00] flex items-center justify-center font-headline">
                            {(member.full_name ?? member.username).slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate">
                          {member.full_name ?? member.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="border-2 border-black bg-white px-3 py-2 text-center shadow-[2px_2px_0px_0px_#1a1a1a]">
      <div className="mx-auto mb-1 flex justify-center text-[#0055ff]">{icon}</div>
      <p className="font-headline font-black text-lg leading-none text-[#1a1a1a]">{value}</p>
      <p className="mt-0.5 font-mono text-[8px] uppercase font-bold text-zinc-500">{label}</p>
    </div>
  );
}
