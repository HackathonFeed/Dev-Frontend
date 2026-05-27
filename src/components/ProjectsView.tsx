import { useState } from 'react';
import {
  Loader2,
  Trophy,
  ExternalLink,
  Github,
  Eye,
  Heart,
  Search,
  Users,
} from 'lucide-react';
import {
  useProjects,
  DEFAULT_PROJECT_FILTERS,
  type ProjectsFilterValues,
} from '../hooks/useProjects';
import type { ProjectApi } from '../api';

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

export function ProjectsView() {
  const [filters, setFilters] = useState<ProjectsFilterValues>({ ...DEFAULT_PROJECT_FILTERS });
  const [page, setPage] = useState(1);

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

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white border-3 border-black p-4 sm:p-6 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search title or tagline..."
              value={filters.search}
              onChange={(e) => patchFilter({ search: e.target.value })}
              className="w-full bg-[#fafafa] pl-10 pr-3 py-3 border-2 border-black font-mono text-xs uppercase font-bold focus:outline-none focus:bg-white"
            />
          </div>

          {/* Platform */}
          <select
            value={filters.platform}
            onChange={(e) => patchFilter({ platform: e.target.value })}
            className="md:col-span-3 bg-[#fafafa] px-3 py-3 border-2 border-black font-mono text-xs uppercase font-bold focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="">ALL PLATFORMS</option>
            {platforms.map((p) => (
              <option key={p.platform} value={p.platform}>
                {p.platform} ({p.count})
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => patchFilter({ sort: e.target.value as ProjectsFilterValues['sort'] })}
            className="md:col-span-2 bg-[#fafafa] px-3 py-3 border-2 border-black font-mono text-xs uppercase font-bold focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="likes">SORT: LIKES</option>
            <option value="views">SORT: VIEWS</option>
            <option value="recent">SORT: RECENT</option>
          </select>

          {/* Winners toggle */}
          <button
            type="button"
            onClick={() => patchFilter({ winnersOnly: !filters.winnersOnly })}
            className={`md:col-span-2 px-3 py-3 border-2 border-black font-headline font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              filters.winnersOnly
                ? 'bg-[#ffcc00] text-black shadow-[2px_2px_0px_0px_#1a1a1a]'
                : 'bg-white text-zinc-500 hover:bg-[#ffcc00]/10'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />
            WINNERS
          </button>
        </div>

        {/* Technology chips */}
        {technologies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-200">
            <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 pr-2 self-center">
              TECH:
            </span>
            {technologies.slice(0, 20).map((t) => (
              <button
                key={t.technology}
                type="button"
                onClick={() =>
                  patchFilter({
                    technology: filters.technology === t.technology ? '' : t.technology,
                  })
                }
                className={`font-mono text-[10px] font-bold uppercase px-2 py-1 border-2 border-black transition-all cursor-pointer ${
                  filters.technology === t.technology
                    ? 'bg-[#0055ff] text-white shadow-[1px_1px_0px_0px_#1a1a1a]'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                #{t.technology} <span className="opacity-60">{t.count}</span>
              </button>
            ))}
            {(filters.search || filters.platform || filters.technology || filters.winnersOnly) && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-mono text-[10px] font-bold uppercase px-2 py-1 border-2 border-[#e63b2e] bg-white text-[#e63b2e] ml-auto cursor-pointer hover:bg-[#e63b2e] hover:text-white"
              >
                CLEAR ALL
              </button>
            )}
          </div>
        )}
      </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project, idx) => (
            <ProjectCard
              key={project.id}
              project={project}
              shadowColor={shadowFor(idx)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {pages > 1 && (
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
    </div>
  );
}

// ── Project card ────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectApi;
  shadowColor: string;
}

function ProjectCard({ project, shadowColor }: ProjectCardProps) {
  return (
    <article
      className="bg-white border-3 border-black flex flex-col overflow-hidden hover:translate-y-[-2px] transition-all min-w-0"
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

        {/* Hackathon link */}
        {project.hackathon_name && (
          <a
            href={project.hackathon_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[10px] uppercase font-bold text-[#0055ff] hover:underline truncate"
            title={project.hackathon_name}
          >
            ↳ {project.hackathon_name}
          </a>
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

          {/* External links */}
          <div className="flex items-center gap-1">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border-2 border-black p-1.5 bg-white hover:bg-[#1a1a1a] hover:text-[#ffcc00] transition-all"
                title="View on GitHub"
              >
                <Github className="w-3 h-3" strokeWidth={2.5} />
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border-2 border-black p-1.5 bg-white hover:bg-[#0055ff] hover:text-white transition-all"
                title="View demo"
              >
                <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
              </a>
            )}
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0055ff] text-white font-headline font-black text-[10px] uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-all"
            >
              VIEW
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
