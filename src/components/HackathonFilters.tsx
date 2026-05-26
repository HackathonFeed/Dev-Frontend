import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { PlatformStats, ThemeCount } from '../api/types';

export type HackathonStatusFilter = 'all' | 'open' | 'closed' | 'upcoming' | 'ended';
export type HackathonModeFilter = 'all' | 'online' | 'offline' | 'hybrid' | 'unknown';

export interface HackathonFilterValues {
  search: string;
  theme: string[];
  domain: string[];
  platform: string[];
  status: Exclude<HackathonStatusFilter, 'all'>[];
  mode: Exclude<HackathonModeFilter, 'all'>[];
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
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const choices = options.filter((opt) => opt.value);
  const selectedLabels = choices
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);
  const summary =
    selectedLabels.length === 0
      ? options[0]?.label ?? `All ${label}`
      : selectedLabels.length > 2
        ? `${selectedLabels.length} selected`
        : selectedLabels.join(', ');
  const toggleOption = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue]
    );
  };

  return (
    <div className="flex flex-col gap-1 min-w-[140px] flex-1">
      <label className="font-mono text-[9px] uppercase font-bold text-zinc-500">{label}</label>
      <details className="relative group">
        <summary className="list-none bg-white border-2 border-black font-mono text-[10px] font-bold uppercase px-2 py-2 focus:outline-none cursor-pointer flex items-center justify-between gap-2">
          <span className="truncate">{summary}</span>
          <span className="text-xs group-open:rotate-180 transition-transform">v</span>
        </summary>
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-white border-2 border-black shadow-[3px_3px_0px_0px_#101010] p-1 space-y-1">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`w-full text-left font-mono text-[10px] font-bold uppercase px-2 py-2 border border-black cursor-pointer ${
              value.length === 0 ? 'bg-[#ffcc00]' : 'bg-white hover:bg-zinc-100'
            }`}
          >
            {options[0]?.label ?? `All ${label}`}
          </button>
          {choices.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase px-2 py-2 hover:bg-zinc-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggleOption(opt.value)}
                className="accent-[#ffcc00]"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </details>
      <span className="font-mono text-[8px] uppercase text-zinc-400 font-bold">
        {value.length ? `${value.length} selected` : 'All'}
      </span>
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
    values.theme.length > 0 ||
    values.domain.length > 0 ||
    values.platform.length > 0 ||
    values.status.length !== 1 ||
    values.status[0] !== 'open' ||
    values.mode.length > 0;

  const toggleValue = <T extends string,>(items: T[], value: T): T[] =>
    items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

  const themeOptions = [
    { value: '', label: 'All themes' },
    ...themes.map((t) => ({ value: t.theme, label: `${t.theme} (${t.count})` })),
  ];

  const domainOptions = [
    { value: '', label: 'All domains' },
    ...themes.map((t) => ({ value: t.theme, label: `${t.theme} (${t.count})` })),
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FilterSelect
          label="Theme"
          value={values.theme}
          onChange={(v) => onChange({ theme: v, domain: v.length ? [] : values.domain })}
          options={themeOptions}
        />
        <FilterSelect
          label="Domain"
          value={values.domain}
          onChange={(v) => onChange({ domain: v, theme: v.length ? [] : values.theme })}
          options={domainOptions}
        />
        <FilterSelect
          label="Format"
          value={values.mode}
          onChange={(v) =>
            onChange({ mode: v as Exclude<HackathonModeFilter, 'all'>[] })
          }
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
                active={
                  opt.value === 'all'
                    ? values.status.length === 0
                    : values.status.includes(opt.value)
                }
                onClick={() =>
                  onChange({
                    status:
                      opt.value === 'all'
                        ? []
                        : toggleValue(values.status, opt.value),
                  })
                }
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
            <FilterChip active={values.platform.length === 0} onClick={() => onChange({ platform: [] })}>
              All
            </FilterChip>
            {platforms.map((p) => (
              <FilterChip
                key={p.platform}
                active={values.platform.includes(p.platform)}
                onClick={() =>
                  onChange({
                    platform: toggleValue(values.platform, p.platform),
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
              active={values.theme.length === 0 && values.domain.length === 0}
              onClick={() => onChange({ theme: [], domain: [] })}
            >
              All
            </FilterChip>
            {themes.slice(0, 10).map((t) => (
              <FilterChip
                key={t.theme}
                active={values.theme.includes(t.theme) || values.domain.includes(t.theme)}
                onClick={() =>
                  onChange({
                    theme: toggleValue(values.theme, t.theme),
                    domain: [],
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
  theme: [],
  domain: [],
  platform: [],
  status: ['open'],
  mode: [],
};
