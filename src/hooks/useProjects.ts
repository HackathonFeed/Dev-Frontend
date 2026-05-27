import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listProjects,
  listProjectPlatforms,
  listProjectTechnologies,
  type ProjectApi,
  type ProjectPlatformStats,
  type ProjectTechnologyStats,
} from '../api';

export interface ProjectsFilterValues {
  search: string;
  platform: string;        // single platform (Web/iOS/Android/macOS/Others)
  technology: string;      // single tech tag
  winnersOnly: boolean;
  sort: 'likes' | 'views' | 'recent';
}

export const DEFAULT_PROJECT_FILTERS: ProjectsFilterValues = {
  search: '',
  platform: '',
  technology: '',
  winnersOnly: false,
  sort: 'likes',
};

interface UseProjectsOptions extends Partial<ProjectsFilterValues> {
  page?: number;
  pageSize?: number;
}

export function useProjects({
  page = 1,
  pageSize = 20,
  search = DEFAULT_PROJECT_FILTERS.search,
  platform = DEFAULT_PROJECT_FILTERS.platform,
  technology = DEFAULT_PROJECT_FILTERS.technology,
  winnersOnly = DEFAULT_PROJECT_FILTERS.winnersOnly,
  sort = DEFAULT_PROJECT_FILTERS.sort,
}: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<ProjectApi[]>([]);
  const [platforms, setPlatforms] = useState<ProjectPlatformStats[]>([]);
  const [technologies, setTechnologies] = useState<ProjectTechnologyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProjects({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        platform: platform || undefined,
        technology: technology || undefined,
        is_winner: winnersOnly || undefined,
        sort,
      });
      setProjects(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      setProjects([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, platform, technology, winnersOnly, sort]);

  // Debounce search; fetch immediately on other changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchProjects, search ? 350 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchProjects, search]);

  // Load filter facets once
  useEffect(() => {
    Promise.all([listProjectPlatforms(), listProjectTechnologies(40)])
      .then(([p, t]) => {
        setPlatforms(p);
        setTechnologies(t);
      })
      .catch(() => {
        setPlatforms([]);
        setTechnologies([]);
      });
  }, []);

  return {
    projects,
    platforms,
    technologies,
    loading,
    error,
    total,
    pages,
    refetch: fetchProjects,
  };
}
