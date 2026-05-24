import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listHackathons,
  searchHackathons,
  listThemes,
  listPlatforms,
  type ThemeCount,
  type PlatformStats,
} from '../api';
import { mapHackathonsFromApi } from '../lib/mapHackathon';
import type { Hackathon } from '../types';
import {
  DEFAULT_HACKATHON_FILTERS,
  type HackathonFilterValues,
  type HackathonStatusFilter,
} from '../components/HackathonFilters';

function resolveThemeFilter(filters: HackathonFilterValues): string | undefined {
  return filters.theme ?? filters.domain ?? undefined;
}

function resolveModeFilter(filters: HackathonFilterValues) {
  return filters.mode === 'all' ? undefined : filters.mode;
}

function resolveStatusParams(status: HackathonStatusFilter): {
  only_open?: boolean;
  status?: 'open' | 'closed' | 'upcoming' | 'ended';
} {
  switch (status) {
    case 'open':
      return { only_open: true };
    case 'closed':
    case 'upcoming':
    case 'ended':
      return { only_open: false, status };
    case 'all':
    default:
      return { only_open: false };
  }
}

interface UseHackathonsOptions extends HackathonFilterValues {
  page?: number;
  pageSize?: number;
  sort?: 'deadline' | 'registrations' | 'scraped_at' | 'start_date';
}

export function useHackathons({
  page = 1,
  pageSize = 20,
  search = DEFAULT_HACKATHON_FILTERS.search,
  theme = DEFAULT_HACKATHON_FILTERS.theme,
  domain = DEFAULT_HACKATHON_FILTERS.domain,
  platform = DEFAULT_HACKATHON_FILTERS.platform,
  status = DEFAULT_HACKATHON_FILTERS.status,
  mode = DEFAULT_HACKATHON_FILTERS.mode,
  sort = 'deadline',
}: UseHackathonsOptions = { ...DEFAULT_HACKATHON_FILTERS }) {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [themes, setThemes] = useState<ThemeCount[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterValues: HackathonFilterValues = {
    search,
    theme,
    domain,
    platform,
    status,
    mode,
  };

  const fetchHackathons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParams = resolveStatusParams(status);
      const baseParams = {
        page,
        page_size: pageSize,
        theme: resolveThemeFilter(filterValues),
        platform: platform ?? undefined,
        mode: resolveModeFilter(filterValues),
        sort,
        ...statusParams,
      };

      const result = search.trim()
        ? await searchHackathons({ ...baseParams, search: search.trim() })
        : await listHackathons(baseParams);

      setHackathons(mapHackathonsFromApi(result.items));
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hackathons');
      setHackathons([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, theme, domain, platform, status, mode, sort]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchHackathons, search ? 350 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchHackathons, search]);

  useEffect(() => {
    Promise.all([listThemes(50), listPlatforms()])
      .then(([themeData, platformData]) => {
        setThemes(themeData);
        setPlatforms(platformData);
      })
      .catch(() => {
        setThemes([]);
        setPlatforms([]);
      });
  }, []);

  return {
    hackathons,
    themes,
    platforms,
    loading,
    error,
    total,
    pages,
    refetch: fetchHackathons,
  };
}
