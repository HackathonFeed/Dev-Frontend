import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { PlatformStats, ThemeCount } from '../api/types';

export type HackathonStatusFilter = 'all' | 'open' | 'closed' | 'upcoming' | 'ended';
export type HackathonModeFilter = 'all' | 'online' | 'offline' | 'hybrid' | 'unknown';

export interface HackathonFilterValues {
  search: string;
  theme: string | null;
  domain: string | null;
  platform: string | null;
  status: HackathonStatusFilter;
  mode: HackathonModeFilter;
}

interface HackathonFiltersProps {
  values: HackathonFilterValues;
  themes: ThemeCount[];
  platforms: PlatformStats[];
  total: number;
  loading?: boolean;
  onChange: (patch: Partial<HackathonFilterValues>) => void;
  onClear: () => void;
  compact?: boolean;
}

const STATUS_OPTIONS: { value: HackathonStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Registration Closed' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
];

const MODE_OPTIONS: { value: HackathonModeFilter; label: string }[] = [
  { value: 'all', label: 'All formats' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'unknown', label: 'Unknown' },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-[10px] font-bold px-2.5 py-1.5 border-2 border-black uppercase transition-all cursor-pointer ${
        active ? 'bg-[#ffcc00] text-black' : 'bg-white hover:bg-zinc-100 text-black'
      }`}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px] flex-1">
      <label className="font-mono text-[9px] uppercase font-bold text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-2 border-black font-mono text-[10px] font-bold uppercase px-2 py-2 focus:outline-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const HackathonFilters: React.FC<HackathonFiltersProps> = ({
  values,
  themes,
  platforms,
  total,
  loading,
  onChange,
  onClear,
  compact = false,
}) => {
  const hasActiveFilters =
    values.search ||
    values.theme ||
    values.domain ||
    values.platform ||
    values.status !== 'open' ||
    values.mode !== 'all';

  const themeOptions = [
    { value: '', label: 'All themes' },
    ...themes.map((t) => ({ value: t.theme, label: `${t.theme} (${t.count})` })),
  ];

  const domainOptions = [
    { value: '', label: 'All domains' },
    ...themes.map((t) => ({ value: t.theme, label: `${t.theme} (${t.count})` })),
  ];

  const platformOptions = [
    { value: '', label: 'All platforms' },
    ...platforms.map((p) => ({
      value: p.platform,
      label: `${p.platform} (${p.open_count} open)`,
    })),
  ];

  return (
    <div className="bg-white border-3 border-black p-4 md:p-5 shadow-[3px_3px_0px_0px_#101010] space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 shrink-0" />
          <span className="font-headline font-black text-sm uppercase">Filters</span>
          <span className="font-mono text-[10px] uppercase text-zinc-500 font-bold">
            {loading ? 'Loading...' : `${total.toLocaleString()} results`}
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-[#e63b2e] hover:underline cursor-pointer bg-transparent border-none"
          >
            <X className="w-3 h-3" />
            Clear all filters
          </button>
        )}
      </div>

      <div className="bg-zinc-50 border-2 border-black p-1.5 flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-500 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search hackathons..."
          className="w-full bg-transparent border-none text-[10px] md:text-xs font-bold uppercase focus:outline-none placeholder:text-zinc-400 py-1"
          value={values.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
        {values.search && (
          <button
            type="button"
            onClick={() => onChange({ search: '' })}
            className="font-mono font-bold text-[9px] bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-600 cursor-pointer border-none"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterSelect
          label="Theme"
          value={values.theme ?? ''}
          onChange={(v) =>
            onChange({ theme: v || null, domain: v ? null : values.domain })
          }
          options={themeOptions}
        />
        <FilterSelect
          label="Domain"
          value={values.domain ?? ''}
          onChange={(v) =>
            onChange({ domain: v || null, theme: v ? null : values.theme })
          }
          options={domainOptions}
        />
        <FilterSelect
          label="Platform"
          value={values.platform ?? ''}
          onChange={(v) => onChange({ platform: v || null })}
          options={platformOptions}
        />
        <FilterSelect
          label="Format"
          value={values.mode}
          onChange={(v) => onChange({ mode: v as HackathonModeFilter })}
          options={MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>

      {!compact && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase font-bold text-zinc-500">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={values.status === opt.value}
                onClick={() => onChange({ status: opt.value })}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {!compact && platforms.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase font-bold text-zinc-500">Quick platforms</p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={!values.platform} onClick={() => onChange({ platform: null })}>
              All
            </FilterChip>
            {platforms.slice(0, 8).map((p) => (
              <FilterChip
                key={p.platform}
                active={values.platform === p.platform}
                onClick={() =>
                  onChange({
                    platform: values.platform === p.platform ? null : p.platform,
                  })
                }
              >
                {p.platform} ({p.open_count})
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {!compact && themes.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase font-bold text-zinc-500">Popular themes</p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={!values.theme && !values.domain}
              onClick={() => onChange({ theme: null, domain: null })}
            >
              All
            </FilterChip>
            {themes.slice(0, 10).map((t) => (
              <FilterChip
                key={t.theme}
                active={values.theme === t.theme || values.domain === t.theme}
                onClick={() =>
                  onChange({
                    theme: values.theme === t.theme ? null : t.theme,
                    domain: null,
                  })
                }
              >
                #{t.theme} ({t.count})
              </FilterChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DEFAULT_HACKATHON_FILTERS: HackathonFilterValues = {
  search: '',
  theme: null,
  domain: null,
  platform: null,
  status: 'open',
  mode: 'all',
};
