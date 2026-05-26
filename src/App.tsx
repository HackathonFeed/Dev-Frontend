import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Check, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Trash2, 
  MapPin, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ChevronRight, 
  LayoutGrid, 
  PlusCircle, 
  CheckSquare, 
  Square, 
  Compass, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Clock,
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  Trophy,
  Settings,
  Twitter,
  LogOut,
  Bookmark,
  Loader2
} from 'lucide-react';
import { Hackathon, TrackedApplication, ValidatorResponse } from './types';
import Markdown from 'react-markdown';

// --- Modular imports ---
import { VALIDATION_TAGLINES } from './data';
import { CircuitBoardIllustration } from './components/CircuitBoardIllustration';
import { PublicProfileView } from './components/PublicProfileView';
import { ProjectsTimelineView } from './components/ProjectsTimelineView';
import { AiComingSoonModal } from './components/AiComingSoonModal';
import { HackathonDetailModal } from './components/HackathonDetailModal';
import { HackathonStatusBadge } from './components/HackathonStatusBadge';
import {
  HackathonFilters,
  DEFAULT_HACKATHON_FILTERS,
  type HackathonFilterValues,
} from './components/HackathonFilters';
import { useAuth, ApiError } from './context/AuthContext';
import { useHackathons } from './hooks/useHackathons';
import { useTrackedProjects } from './hooks/useTrackedProjects';
import {
  addBookmark,
  removeBookmark,
  listBookmarks,
  updateProfile,
  getAdminStats,
  triggerScrape,
  checkHealth,
  type Bookmark as ApiBookmark,
} from './api';
import { mapHackathonsFromApi } from './lib/mapHackathon';
import { isHackathonRegistered } from './lib/trackedProjects';
import { DashboardLeaderboard } from './components/DashboardLeaderboard';
import { SavedHackathonsPanel } from './components/SavedHackathonsPanel';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ProfilePhotoSettings } from './components/ProfilePhotoSettings';

function parsePublicProfileUsername(): string | null {
  const match = window.location.pathname.match(/^\/u\/([a-zA-Z0-9_-]{3,30})\/?$/);
  return match?.[1]?.toLowerCase() ?? null;
}

type RegisterHackathonPayload = {
  title: string;
  id?: string;
  prizePool?: string;
  deadline?: string;
  url?: string;
  statusLabel?: string;
  endDate?: string;
  apiStatus?: Hackathon['apiStatus'];
};

type SocialHandles = {
  github: string;
  linkedin: string;
  x: string;
  website: string;
};

const EMPTY_SOCIAL_HANDLES: SocialHandles = {
  github: '',
  linkedin: '',
  x: '',
  website: '',
};

function isPastDate(value: string | undefined): boolean {
  if (!value || value === 'TBD') return false;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parsed < today;
}

function isEndedHackathon(hack: Partial<RegisterHackathonPayload> | undefined): boolean {
  if (!hack) return false;
  return (
    hack.apiStatus === 'ended' ||
    hack.statusLabel?.toLowerCase() === 'ended' ||
    isPastDate(hack.endDate)
  );
}

type ActiveTab = 'landing' | 'explore' | 'tracker' | 'validator' | 'auth';
type AuthMode = 'login' | 'register';
type DashboardTab = 'dashboard' | 'hackathons' | 'projects' | 'gallery' | 'team' | 'settings' | 'profile';

const PROTECTED_PATHS = new Set([
  '/explore',
  '/tracker',
  '/ai-validate',
  '/validator',
  '/dashboard',
  '/hackathons',
  '/tracking',
  '/project-gallery',
  '/settings',
  '/profile',
]);

function activeTabFromPath(pathname: string): ActiveTab {
  if (pathname === '/login' || pathname === '/signup' || PROTECTED_PATHS.has(pathname)) return 'auth';
  return 'landing';
}

function authModeFromPath(pathname: string): AuthMode {
  return pathname === '/signup' ? 'register' : 'login';
}

function dashboardTabFromPath(pathname: string): DashboardTab {
  switch (pathname) {
    case '/hackathons':
      return 'hackathons';
    case '/tracking':
      return 'projects';
    case '/project-gallery':
      return 'gallery';
    case '/ai-validate':
      return 'team';
    case '/settings':
      return 'settings';
    case '/profile':
      return 'profile';
    case '/dashboard':
    default:
      return 'dashboard';
  }
}

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, refreshUser } = useAuth();

  // --- Core Routing/Tab state ---
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => activeTabFromPath(window.location.pathname));

  const [authMode, setAuthMode] = useState<AuthMode>(() => authModeFromPath(window.location.pathname));
  const [pendingTab, setPendingTab] = useState<'tracker' | 'explore' | 'validator' | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(() => dashboardTabFromPath(window.location.pathname));

  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // Form states for login/register
  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Backend connection & pagination
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [hackathonPage, setHackathonPage] = useState(1);
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [savedBookmarks, setSavedBookmarks] = useState<ApiBookmark[]>([]);
  const [bookmarkLoading, setBookmarkLoading] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState<string | null>(null);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);
  const [adminStats, setAdminStats] = useState<{ total_hackathons: number; total_searches: number } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [publicProfileUsername, setPublicProfileUsername] = useState<string | null>(
    () => parsePublicProfileUsername(),
  );
  const [socialHandles, setSocialHandles] = useState<SocialHandles>(EMPTY_SOCIAL_HANDLES);
  const [socialSaveMessage, setSocialSaveMessage] = useState<string | null>(null);
  const [socialSaveLoading, setSocialSaveLoading] = useState(false);

  const applyRoute = useCallback((pathname = window.location.pathname) => {
    const profileUsername = parsePublicProfileUsername();
    setPublicProfileUsername(profileUsername);
    if (profileUsername) return;

    setActiveTab(activeTabFromPath(pathname));
    setAuthMode(authModeFromPath(pathname));
    setDashboardTab(dashboardTabFromPath(pathname));
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    applyRoute(path);
  }, [applyRoute]);

  useEffect(() => {
    if (authLoading || parsePublicProfileUsername()) return;

    const path = window.location.pathname;
    let nextPath: string | null = null;

    if (isAuthenticated) {
      if (path === '/' || path === '/login' || path === '/signup') nextPath = '/dashboard';
      if (path === '/explore') nextPath = '/hackathons';
      if (path === '/tracker') nextPath = '/tracking';
    } else if (PROTECTED_PATHS.has(path)) {
      nextPath = '/login';
    }

    if (nextPath && nextPath !== path) {
      window.history.replaceState({}, '', nextPath);
      applyRoute(nextPath);
      return;
    }

    applyRoute(path);
  }, [applyRoute, authLoading, isAuthenticated]);

  // Router and redirection helper functions
  const handleTrackerAccess = () => {
    if (!isAuthenticated) {
      setPendingTab('tracker');
      navigateTo('/login');
    } else {
      navigateTo('/tracking');
    }
  };

  const handleSaveProfile = async (data: { name: string; interests: string[]; username?: string }) => {
    const updated = await updateProfile(data);
    await refreshUser();
    return updated;
  };

  const sanitizeSocialHandle = (field: keyof SocialHandles, value: string) => {
    const withoutProtocol = value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[?#]/)[0]
      .replace(/\/+$/g, '');
    const handle = withoutProtocol.replace(/^@/, '');

    switch (field) {
      case 'github':
        return handle.replace(/^github\.com\//i, '').split('/')[0];
      case 'linkedin':
        return handle.replace(/^linkedin\.com\/in\//i, '').split('/')[0];
      case 'x':
        return handle.replace(/^(x|twitter)\.com\//i, '').split('/')[0];
      case 'website':
        return withoutProtocol;
    }
  };

  const patchSocialHandle = (field: keyof SocialHandles, value: string) => {
    setSocialHandles((prev) => ({ ...prev, [field]: sanitizeSocialHandle(field, value) }));
    setSocialSaveMessage(null);
  };

  const saveSocialHandles = async () => {
    if (!user || socialSaveLoading) return;
    const normalizedHandles = {
      github: sanitizeSocialHandle('github', socialHandles.github),
      linkedin: sanitizeSocialHandle('linkedin', socialHandles.linkedin),
      x: sanitizeSocialHandle('x', socialHandles.x),
      website: sanitizeSocialHandle('website', socialHandles.website),
    };
    setSocialHandles(normalizedHandles);
    setSocialSaveLoading(true);
    setSocialSaveMessage(null);
    try {
      await updateProfile({
        github_username: normalizedHandles.github || null,
        linkedin_username: normalizedHandles.linkedin || null,
        twitter_username: normalizedHandles.x || null,
        website: normalizedHandles.website || null,
      });
      await refreshUser();
      setSocialSaveMessage('Social handles saved.');
    } catch (error) {
      setSocialSaveMessage(error instanceof ApiError ? error.message : 'Failed to save social handles.');
    } finally {
      setSocialSaveLoading(false);
    }
  };

  useEffect(() => {
    checkHealth().then(setBackendOnline);
  }, []);

  useEffect(() => {
    if (!user) {
      setSocialHandles(EMPTY_SOCIAL_HANDLES);
      return;
    }

    setSocialHandles({
      github: user.github_username ?? '',
      linkedin: user.linkedin_username ?? '',
      x: user.twitter_username ?? '',
      website: user.website ?? '',
    });
  }, [user]);

  useEffect(() => {
    const syncPublicProfileRoute = () => {
      applyRoute();
    };
    window.addEventListener('popstate', syncPublicProfileRoute);
    return () => window.removeEventListener('popstate', syncPublicProfileRoute);
  }, [applyRoute]);

  const goHomeFromPublicProfile = useCallback(() => {
    navigateTo('/');
  }, [navigateTo]);

  const goToProfile = useCallback(() => {
    if (!user?.username) return;
    navigateTo(`/u/${user.username}`);
  }, [navigateTo, user?.username]);

  const backToWorkspace = useCallback(() => {
    navigateTo('/dashboard');
  }, [navigateTo]);

  useEffect(() => {
    if (publicProfileUsername && user?.username && publicProfileUsername !== user.username) {
      window.history.replaceState({}, '', `/u/${user.username}`);
      setPublicProfileUsername(user.username);
    }
  }, [publicProfileUsername, user?.username]);

  const loadBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarkIds(new Set());
      setSavedBookmarks([]);
      return;
    }
    try {
      const bookmarks = await listBookmarks();
      setSavedBookmarks(bookmarks);
      setBookmarkIds(new Set(bookmarks.map((b) => b.hackathon_id)));
    } catch {
      setSavedBookmarks([]);
      setBookmarkIds(new Set());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    if (user?.role === 'admin' && dashboardTab === 'settings') {
      getAdminStats()
        .then(setAdminStats)
        .catch(() => setAdminStats(null));
    }
  }, [user?.role, dashboardTab]);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthError(null);
    setApiError(null);
    navigateTo(mode === 'login' ? '/login' : '/signup');
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail || !inputEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (authMode === 'register' && inputName.trim().length < 2) {
      setAuthError('Name must be at least 2 characters.');
      return;
    }
    if (inputPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        await register(inputName.trim(), inputEmail.trim(), inputPassword);
      } else {
        await login(inputEmail.trim(), inputPassword);
      }

      setInputPassword('');
      if (authMode === 'register') {
        setInputName('');
      }

      if (pendingTab === 'tracker') {
        setTrackHackathonName(pendingRegisterHack?.title ?? trackHackathonName);
        navigateTo('/tracking');
        setPendingRegisterHack(null);
      } else if (pendingTab === 'explore') {
        navigateTo('/hackathons');
      } else {
        navigateTo('/dashboard');
      }
      setPendingTab(null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof TypeError && err.message.includes('fetch')
            ? 'Cannot reach backend. Check your connection or the Render API deployment.'
            : 'Authentication failed. Check credentials and try again.';
      setAuthError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    logout();
    setAuthError(null);
    navigateTo('/');
    setBookmarkIds(new Set());
    setSavedBookmarks([]);
  };

  const [isAddingHackathon, setIsAddingHackathon] = useState(false);
  const [hackathonFilters, setHackathonFilters] = useState<HackathonFilterValues>({
    ...DEFAULT_HACKATHON_FILTERS,
  });

  const patchHackathonFilters = (patch: Partial<HackathonFilterValues>) => {
    setHackathonFilters((prev) => ({ ...prev, ...patch }));
  };

  const clearHackathonFilters = () => {
    setHackathonFilters({ ...DEFAULT_HACKATHON_FILTERS });
  };

  const {
    hackathons,
    themes: apiThemes,
    platforms: apiPlatforms,
    loading: hackathonsLoading,
    error: hackathonsError,
    total: hackathonTotal,
    pages: hackathonPages,
    refetch: refetchHackathons,
  } = useHackathons({
    page: hackathonPage,
    pageSize: 20,
    ...hackathonFilters,
    sort: 'deadline',
  });

  useEffect(() => {
    setHackathonPage(1);
  }, [hackathonFilters]);

  const {
    trackedApps,
    setTrackedApps,
    stepActionLoading,
    addProject,
    registerHackathonInterest,
    exportValidatedProject,
    recordBookmark,
    completeStep,
    undoLastStep,
    updateStage: updateTrackedStage,
    toggleMilestone,
    addMilestone: handleAddMilestone,
    addSpecialist: handleAddSpecialist,
    recordValidation,
    addNote,
    deleteProject: handleDeleteTracked,
  } = useTrackedProjects(isAuthenticated, setApiError);

  const handleHackathonRegister = async (hackOrTitle: string | RegisterHackathonPayload) => {
    const fromList = typeof hackOrTitle === 'string'
      ? hackathons.find((h) => h.title === hackOrTitle)
      : hackathons.find((h) => h.id === hackOrTitle.id || h.title === hackOrTitle.title);

    const title = typeof hackOrTitle === 'string' ? hackOrTitle : hackOrTitle.title;
    if (isEndedHackathon(fromList) || (typeof hackOrTitle !== 'string' && isEndedHackathon(hackOrTitle))) {
      setApiError('This hackathon has ended. Registration is no longer available.');
      return;
    }

    const payload = {
      title,
      id: typeof hackOrTitle === 'string' ? fromList?.id : (hackOrTitle.id ?? fromList?.id),
      prizePool: typeof hackOrTitle === 'string'
        ? (fromList?.prizePool ?? '—')
        : (hackOrTitle.prizePool ?? fromList?.prizePool ?? '—'),
      deadline: typeof hackOrTitle === 'string'
        ? (fromList?.deadline ?? '')
        : (hackOrTitle.deadline ?? fromList?.deadline ?? ''),
      url: typeof hackOrTitle === 'string' ? fromList?.url : (hackOrTitle.url ?? fromList?.url),
    };

    const loadingKey = payload.id ?? payload.title;
    setRegisterLoading(loadingKey);

    try {
      await registerHackathonInterest({
        hackathonName: payload.title,
        hackathonId: payload.id,
        prizePool: payload.prizePool,
        deadline: payload.deadline,
      });
      setTrackHackathonName(payload.title);

      if (payload.url) {
        window.open(payload.url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (isAuthenticated) {
        navigateTo('/tracking');
      } else {
        setPendingRegisterHack(payload);
        setPendingTab('tracker');
        navigateTo('/login');
      }
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Failed to start hackathon tracking.');
    } finally {
      setRegisterLoading(null);
    }
  };

  const handleAddNewTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackProjectTitle.trim()) return;

    const targetHack = hackathons.find((h) => h.title === trackHackathonName);
    try {
      await addProject({
        title: trackProjectTitle.trim(),
        hackathonName: trackHackathonName,
        hackathonId: targetHack?.id,
        prizePool: targetHack?.prizePool ?? '$5,000',
        deadline: targetHack?.deadline ?? '',
        concept: trackConcept,
      });
      setTrackProjectTitle('');
      setTrackConcept('');
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Failed to add tracked project.');
    }
  };

  const toggleBookmark = async (hackathonId: string) => {
    if (!isAuthenticated) {
      setPendingTab('explore');
      navigateTo('/login');
      return;
    }
    setBookmarkLoading(hackathonId);
    try {
      if (bookmarkIds.has(hackathonId)) {
        await removeBookmark(hackathonId);
      } else {
        await addBookmark(hackathonId);
        const hack = hackathons.find((h) => h.id === hackathonId);
        if (hack) {
          recordBookmark(hack.title, hack.id);
        }
      }
      await loadBookmarks();
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Bookmark action failed.');
    } finally {
      setBookmarkLoading(null);
    }
  };

  // --- Hackathon creator form inputs ---
  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTagsString, setNewTagsString] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // --- Tracked application creation form inputs ---
  const [trackHackathonName, setTrackHackathonName] = useState('AGI Frontiers');
  const [pendingRegisterHack, setPendingRegisterHack] = useState<{
    title: string;
    id?: string;
    prizePool?: string;
    deadline?: string;
    url?: string;
  } | null>(null);
  const [trackProjectTitle, setTrackProjectTitle] = useState('');
  const [trackConcept, setTrackConcept] = useState('');

  // --- AI Idea Validator Input States ---
  const [valTitle, setValTitle] = useState('Modular Sovereign Router');
  const [valHackathon, setValHackathon] = useState('AGI Frontiers');
  const [valStack, setValStack] = useState('React 19, Express, @google/genai, Tailwind v4');
  const [valPitch, setValPitch] = useState('An automated gas-less routing mechanism that processes user tasks offline and resolves cryptographic validation server-side to hide critical parameters from browser inspect protocols.');

  // --- AI Response / Critiques ---
  const [isValidating, setIsValidating] = useState(false);
  const [activeTaglineIndex, setActiveTaglineIndex] = useState(0);
  const [validationResult, setValidationResult] = useState<ValidatorResponse | null>(null);
  const [isAiComingSoonOpen, setIsAiComingSoonOpen] = useState(false);

  const openAiComingSoon = () => setIsAiComingSoonOpen(true);

  // Saved evaluation history (stored in localStorage)
  const [pastValidations, setPastValidations] = useState<{ id: string; title: string; date: string; pitch: string; data: ValidatorResponse }[]>(() => {
    try {
      const stored = localStorage.getItem('hackathon_feed_evaluations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Cycle the loading taglines
  useEffect(() => {
    let interval: any = null;
    if (isValidating) {
      interval = setInterval(() => {
        setActiveTaglineIndex((prev) => (prev + 1) % VALIDATION_TAGLINES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isValidating]);

  // Persist evaluations
  useEffect(() => {
    try {
      localStorage.setItem('hackathon_feed_evaluations', JSON.stringify(pastValidations));
    } catch (e) {
      console.error('Failed to persist evaluations:', e);
    }
  }, [pastValidations]);

  // --- Create/Join Hackathon (local preview only — backend is scrape-sourced) ---
  const handleCreateHackathon = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('Hackathons are sourced from the backend scraper. Use bookmarks to save events.');
    setIsAddingHackathon(false);
  };

  // --- TRIGGER GEMINI VALIDATOR CALL ---
  const handleValidateIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!valTitle.trim() || !valPitch.trim()) return;

    setIsValidating(true);
    setApiError(null);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: valTitle.trim(),
          hackathonName: valHackathon,
          techStack: valStack.trim(),
          conceptPitch: valPitch.trim()
        })
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || 'The Weimar neural model failed to process validation.');
      }

      const critiqueData: ValidatorResponse = await response.json();
      setValidationResult(critiqueData);

      // Save into history
      const logItem = {
        id: `eval-${Date.now()}`,
        title: valTitle.trim(),
        date: new Date().toISOString().split('T')[0],
        pitch: valPitch.trim(),
        data: critiqueData
      };
      setPastValidations([logItem, ...pastValidations]);

    } catch (err: any) {
      console.error('Error validating pitch:', err);
      setApiError(err.message || 'Connecting to Gemini API failed. Please verify Secrets configuration.');
    } finally {
      setIsValidating(false);
    }
  };

  // --- Wipe Evaluation History ---
  const clearEvaluationHistory = () => {
    setPastValidations([]);
    localStorage.removeItem('hackathon_feed_evaluations');
  };

  // Theme chips from backend API (use original theme string for API filter)
  const filteredHackathons = hackathons;

  const renderPagination = () => (
    hackathonPages > 1 ? (
      <div className="flex items-center justify-center gap-4 mt-8 font-mono text-xs font-bold uppercase">
        <button
          type="button"
          disabled={hackathonPage <= 1 || hackathonsLoading}
          onClick={() => setHackathonPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 border-2 border-black bg-white disabled:opacity-40 hover:bg-[#ffcc00] cursor-pointer"
        >
          ← Prev
        </button>
        <span className="text-zinc-600">
          Page {hackathonPage} / {hackathonPages} · {hackathonTotal.toLocaleString()} total
        </span>
        <button
          type="button"
          disabled={hackathonPage >= hackathonPages || hackathonsLoading}
          onClick={() => setHackathonPage((p) => p + 1)}
          className="px-4 py-2 border-2 border-black bg-white disabled:opacity-40 hover:bg-[#ffcc00] cursor-pointer"
        >
          Next →
        </button>
      </div>
    ) : null
  );

  const renderBookmarkButton = (hackId: string) => (
    <button
      type="button"
      onClick={() => toggleBookmark(hackId)}
      disabled={bookmarkLoading === hackId}
      className={`border-2 border-primary p-2 text-xs font-headline font-black uppercase flex items-center gap-1 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a] ${
        bookmarkIds.has(hackId)
          ? 'bg-[#ffcc00] text-black'
          : 'bg-white text-primary hover:bg-primary-container'
      }`}
      title={bookmarkIds.has(hackId) ? 'Remove bookmark' : 'Save hackathon'}
    >
      {bookmarkLoading === hackId ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Bookmark className={`w-3.5 h-3.5 ${bookmarkIds.has(hackId) ? 'fill-black' : ''}`} />
      )}
    </button>
  );

  const renderRegisterButton = (
    hack: RegisterHackathonPayload,
    className: string,
    label: React.ReactNode = 'REGISTER',
  ) => {
    const loadingKey = hack.id ?? hack.title;
    const isLoading = registerLoading === loadingKey;
    const isRegistered = isHackathonRegistered(trackedApps, hack);
    const matchingHack = hackathons.find((h) => h.id === hack.id || h.title === hack.title);
    const isEnded = isEndedHackathon(hack) || isEndedHackathon(matchingHack);

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRegistered || isEnded) return;
          void handleHackathonRegister(hack);
        }}
        disabled={isLoading || isRegistered || isEnded}
        title={
          isEnded
            ? 'This hackathon has ended'
            : isRegistered
              ? 'You are registered for this hackathon'
              : undefined
        }
        className={`${className}${
          isRegistered
            ? ' !bg-[#16a34a] !text-white hover:!bg-[#16a34a] hover:!text-white cursor-default'
            : isEnded
              ? ' !bg-zinc-400 !text-white hover:!bg-zinc-400 hover:!text-white cursor-not-allowed opacity-80'
              : isLoading
                ? ' opacity-80 cursor-wait'
                : ''
        }`}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Registering...
          </span>
        ) : isRegistered ? (
          'REGISTERED'
        ) : isEnded ? (
          'EVENT ENDED'
        ) : (
          label
        )}
      </button>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-mono text-sm uppercase font-bold">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        Restoring session...
      </div>
    );
  }

  const hackathonDetailModal = selectedHackathonId ? (
    <HackathonDetailModal
      hackathonId={selectedHackathonId}
      onClose={() => setSelectedHackathonId(null)}
      isBookmarked={bookmarkIds.has(selectedHackathonId)}
      bookmarkLoading={bookmarkLoading === selectedHackathonId}
      onToggleBookmark={toggleBookmark}
      registerLoading={!!selectedHackathonId && registerLoading === selectedHackathonId}
      isRegistered={isHackathonRegistered(trackedApps, {
        id: selectedHackathonId,
        title: hackathons.find((h) => h.id === selectedHackathonId)?.title ?? '',
      })}
      onRegister={async (payload) => {
        await handleHackathonRegister(payload);
        if (isAuthenticated) setSelectedHackathonId(null);
      }}
      onTrack={async (title) => {
        await handleHackathonRegister(title);
        if (isAuthenticated) setSelectedHackathonId(null);
      }}
      onValidate={() => {
        openAiComingSoon();
      }}
    />
  ) : null;

  if (publicProfileUsername) {
    return (
      <PublicProfileView
        username={publicProfileUsername}
        onHome={goHomeFromPublicProfile}
        currentUser={user}
        trackedApps={trackedApps}
        socialHandles={
          user?.username.toLowerCase() === publicProfileUsername.toLowerCase()
            ? socialHandles
            : undefined
        }
        onBackToWorkspace={isAuthenticated ? backToWorkspace : undefined}
        onOpenPrivateSettings={
          isAuthenticated
            ? () => {
                navigateTo('/settings');
              }
            : undefined
        }
      />
    );
  }

  if (isAuthenticated) {
    const displayUsername = user?.name?.toUpperCase() ?? user?.email?.split('@')[0].toUpperCase() ?? 'HACKER_01';

    return (
      <>
      <div id="authenticated-workspace" className="min-h-screen bg-background text-primary font-sans antialiased flex flex-col md:flex-row selection:bg-[#ffcc00] selection:text-[#1a1a1a]">
        
        {/* ========================================================
            LEFT SIDEBAR NAVIGATION
            ======================================================== */}
        <aside className="w-full md:w-[280px] bg-[#eee9e0] border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col justify-between p-6 shrink-0 md:h-screen md:sticky md:top-0 overflow-y-auto z-40">
          <div>
            <div className="flex items-center gap-3 border-b-2 border-black pb-4">
              <span className="w-5 h-5 bg-[#e63b2e] border-2 border-[#1a1a1a]"></span>
              <span className="font-headline font-black text-2xl tracking-tighter text-[#1a1a1a] uppercase italic select-none">
                HackathonFeed
              </span>
            </div>

            {/* Profile Avatar Box matching screenshot precisely */}
            <div 
              onClick={goToProfile}
              title="View your public profile"
              className="border-3 border-black p-4 mt-6 flex items-center gap-3.5 transition-all select-none cursor-pointer rounded-[8px] bg-white border-black text-[#1a1a1a] shadow-[4px_4px_0px_0px_#1a1a1a] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_#1a1a1a] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#1a1a1a]"
            >
              {user ? (
                <ProfileAvatar
                  name={user.name}
                  avatarUrl={user.avatar_url}
                  size="sm"
                  showOnlineBadge
                />
              ) : (
                <div className="w-11 h-11 bg-zinc-900 border-2 border-black overflow-hidden rounded-[6px] shrink-0 flex items-center justify-center">
                  <span className="font-headline font-black text-sm text-[#ffcc00]">?</span>
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-headline font-black text-xs uppercase tracking-tight text-[#1a1a1a] truncate">
                  {user?.name ?? 'User'}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                  {user?.role ?? 'member'}
                </p>
              </div>
            </div>

            {/* Navigation Lists with Offset Shadows */}
            <nav className="flex flex-col gap-3 mt-8">
              <button
                onClick={() => navigateTo('/dashboard')}
                className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                  dashboardTab === 'dashboard'
                    ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                    : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4 shrink-0" strokeWidth={3} />
                  DASHBOARD
                </span>
                <span className="text-[10px] opacity-30 select-none">»</span>
              </button>

              <button
                onClick={() => navigateTo('/hackathons')}
                className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                  dashboardTab === 'hackathons'
                    ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                    : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  HACKATHONS
                </span>
                <span className="text-[10px] opacity-30 select-none">»</span>
              </button>

              <button
                onClick={() => navigateTo('/tracking')}
                className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                  dashboardTab === 'projects'
                    ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                    : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  TRACKING
                </span>
                <span className="text-[10px] opacity-30 select-none">»</span>
              </button>

              <button
                onClick={() => navigateTo('/project-gallery')}
                className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                  dashboardTab === 'gallery'
                    ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                    : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Layers className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  PROJECT GALLERY
                </span>
                <span className="text-[10px] opacity-30 select-none">»</span>
              </button>

              <button
                onClick={() => navigateTo('/ai-validate')}
                className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                  dashboardTab === 'team'
                    ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                    : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  AI VALIDATE
                </span>
                <span className="text-[10px] opacity-30 select-none">»</span>
              </button>

            </nav>
          </div>

          <div className="mt-8 space-y-4">
            <button 
              onClick={() => navigateTo('/settings')}
              className={`w-full flex items-center justify-between px-4 py-3 font-headline font-black text-xs uppercase tracking-wider transition-all border-3 cursor-pointer ${
                dashboardTab === 'settings'
                  ? 'bg-[#ffcc00] border-black text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a]'
                  : 'bg-white border-black text-primary hover:bg-[#ffcc00]/10 hover:translate-y-[-2px] active:translate-y-0 shadow-[3px_3px_0px_0px_#1a1a1a]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Settings className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                SETTINGS
              </span>
              <span className="text-[10px] opacity-30 select-none">»</span>
            </button>
          </div>
        </aside>

        {/* ========================================================
            RIGHT CONTENT AREA / MAIN BODY PANELS
            ======================================================== */}
        <main className="flex-1 min-h-screen bg-background p-6 md:p-10 overflow-y-auto max-w-[1440px] mx-auto w-full">
          
          {/* 
            --------------------------------------------------------
            SUB-TAB: DASHBOARD REPLICA VIEW (As shown in mockup)
            --------------------------------------------------------
          */}
          {dashboardTab === 'dashboard' && (
            <div className="space-y-12 animate-fadeIn">
              {user && (
                <DashboardLeaderboard
                  currentUser={user}
                  trackedApps={trackedApps}
                />
              )}
            </div>
          )}

          {/* 
            --------------------------------------------------------
            SUB-TAB: HACKATHONS / FORGES PORTAL VIEW
            --------------------------------------------------------
          */}
          {dashboardTab === 'hackathons' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Header block */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4 mb-8">
                <div>
                  <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest select-none">
                    BROWSE ACTIVE CYBER FORGES
                  </span>
                  <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter mt-2">
                    HACKATHONS ({hackathonTotal.toLocaleString()})
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddingHackathon(!isAddingHackathon)}
                  className="bg-[#ffcc00] border-3 border-black py-2.5 px-6 font-headline font-black text-xs uppercase mt-3 md:mt-0 tracking-wider shadow-[3px_3px_0px_0px_#101010] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
                >
                  {isAddingHackathon ? 'CLOSE HOST DRAWER ✕' : '+ CUSTOM EVENT FORGE'}
                </button>
              </div>

              {/* Add Custom Hackathon Drawer form if toggled */}
              {isAddingHackathon && (
                <div className="bg-[#ffcc00] border-4 border-black p-6 md:p-8 shadow-[4px_4px_0px_0px_#101010] rounded-[6px] animate-fadeIn space-y-6">
                  <div className="border-b-2 border-black pb-2 flex justify-between items-center">
                    <h3 className="font-headline font-black text-xl uppercase">Host A Cyber-Forge / Create Event</h3>
                    <button onClick={() => setIsAddingHackathon(false)} className="font-black text-sm hover:text-[#e63b2e]">✕ CANCEL</button>
                  </div>

                  <form onSubmit={handleCreateHackathon} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Forge Title / Hackathon Name *</label>
                        <input 
                          type="text" required placeholder="e.g. AGI MULTIVERSE PROT"
                          className="w-full bg-white p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                          value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Prize Allocation Pool *</label>
                        <input 
                          type="text" required placeholder="e.g. $250,000 USD"
                          className="w-full bg-white p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                          value={newPrize} onChange={(e) => setNewPrize(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Target Submission Deadline *</label>
                        <input 
                          type="date" required
                          className="w-full bg-white p-3 border-2 border-black font-extrabold text-xs focus:outline-none"
                          value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col justify-between">
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Forge Location Parameters</label>
                        <input 
                          type="text" placeholder="e.g. Berlin / Online"
                          className="w-full bg-white p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                          value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Skill Category Tags (separated by comma)</label>
                        <input 
                          type="text" placeholder="e.g. RUST, PRIVACY, ZERO_KNOWLEDGE"
                          className="w-full bg-white p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                          value={newTagsString} onChange={(e) => setNewTagsString(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[11px] font-bold uppercase mb-1">Direct Operational Synopsis</label>
                        <textarea 
                          rows={2} placeholder="Briefly summarize core algorithmic benchmarks..."
                          className="w-full bg-white p-2 border-2 border-black font-semibold text-xs uppercase focus:outline-none"
                          value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 pt-2 border-t border-black flex justify-end">
                      <button 
                        type="submit"
                        className="bg-[#1a1a1a] text-white py-3.5 px-8 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#ffffff] hover:bg-white hover:text-black hover:shadow-none transition-all cursor-pointer"
                      >
                        PUBLISH EVENT FORGE
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Advanced filters panel */}
              <HackathonFilters
                values={hackathonFilters}
                themes={apiThemes}
                platforms={apiPlatforms}
                total={hackathonTotal}
                loading={hackathonsLoading}
                onChange={patchHackathonFilters}
                onClear={clearHackathonFilters}
              />

              {/* Grid cards listing */}
              {hackathonsLoading ? (
                <div className="py-24 text-center font-mono uppercase text-sm font-bold text-zinc-500 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading hackathons from backend...
                </div>
              ) : hackathonsError ? (
                <div className="border-4 border-dashed border-[#e63b2e] py-16 text-center font-mono uppercase text-sm font-bold text-[#e63b2e] space-y-3">
                  <p>{hackathonsError}</p>
                  <button onClick={() => refetchHackathons()} className="underline text-[#0055ff]">Retry connection</button>
                </div>
              ) : filteredHackathons.length === 0 ? (
                <div className="border-4 border-dashed border-zinc-300 py-24 text-center font-mono uppercase text-sm font-bold text-zinc-400">
                  Zero active forges matches current specifications.
                  <button onClick={clearHackathonFilters} className="block mx-auto mt-2 underline text-[#0055ff]">Wipe search parameters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredHackathons.map((hack) => (
                    <div 
                      key={hack.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedHackathonId(hack.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedHackathonId(hack.id);
                        }
                      }}
                      className="bg-white border-3 border-black p-6 flex flex-col justify-between gap-6 hover:translate-y-[-2px] transition-all cursor-pointer"
                      style={{ boxShadow: `6px 6px 0px 0px ${hack.cardShadow}` }}
                    >
                      <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                        <HackathonStatusBadge hack={hack} compact />
                        <div className="text-right">
                          <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold leading-none">ALLOCATED VALUE</p>
                          <p className="font-headline font-black text-xl text-[#0055ff]">{hack.prizePool}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-headline font-black text-2xl uppercase tracking-tight text-[#1a1a1a]">
                          {hack.title}
                        </h3>
                        <p className="text-xs font-semibold text-zinc-500 uppercase leading-snug">
                          {hack.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-zinc-400 font-mono text-[10px]">
                          <span className="flex items-center gap-1 uppercase font-bold"><MapPin className="w-3.5 h-3.5" /> {hack.location}</span>
                          <span className="flex items-center gap-1 uppercase font-bold"><Calendar className="w-3.5 h-3.5" /> DUE: {hack.deadline}</span>
                          <span className="flex items-center gap-1 uppercase font-bold"><Users className="w-3.5 h-3.5" /> {hack.participantsCount} Bakers</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-zinc-100 pt-4 flex-wrap gap-2">
                        <div className="flex flex-wrap gap-1">
                          {hack.tags.map((t) => (
                            <span key={t} className="bg-zinc-100 font-mono text-[9px] font-extrabold px-1.5 py-0.5 border border-zinc-300">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          {renderBookmarkButton(hack.id)}
                          {hack.url && (
                            <a
                              href={hack.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-2 border-black p-2 text-[#0055ff] hover:bg-[#0055ff] hover:text-white transition-all"
                              title="Open hackathon page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {renderRegisterButton(
                            {
                              title: hack.title,
                              id: hack.id,
                              prizePool: hack.prizePool,
                              deadline: hack.deadline,
                              url: hack.url,
                            },
                            'bg-[#0055ff] text-white font-headline font-black text-xs uppercase px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-all cursor-pointer',
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {renderPagination()}

            </div>
          )}

          {/* 
            --------------------------------------------------------
            SUB-TAB: PROJECTS / APPLICATION KANBAN TRACKER
            --------------------------------------------------------
          */}
          {dashboardTab === 'projects' && (
            <ProjectsTimelineView
              trackedApps={trackedApps}
              view="all"
              stepActionLoading={stepActionLoading}
              onCompleteStep={completeStep}
              onUndoLastStep={undoLastStep}
              onToggleMilestone={toggleMilestone}
              onAddMilestone={handleAddMilestone}
              onAddNote={addNote}
              onDeleteProject={handleDeleteTracked}
            />
          )}

          {dashboardTab === 'gallery' && (
            <ProjectsTimelineView
              trackedApps={trackedApps}
              view="gallery"
              stepActionLoading={stepActionLoading}
              onCompleteStep={completeStep}
              onUndoLastStep={undoLastStep}
              onToggleMilestone={toggleMilestone}
              onAddMilestone={handleAddMilestone}
              onAddNote={addNote}
              onDeleteProject={handleDeleteTracked}
            />
          )}

          {/* 
            --------------------------------------------------------
            SUB-TAB: AI VALIDATE
            --------------------------------------------------------
          */}
          {dashboardTab === 'team' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4 mb-8">
                <div>
                  <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest select-none">
                    Neural analysis engine
                  </span>
                  <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter mt-2">
                    AI Validate
                  </h2>
                </div>
                <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold max-w-sm text-center md:text-right mt-2 md:mt-0 leading-tight">
                  Run your hackathon idea through AI jurors for scores, critique, and upgrade suggestions.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-10 md:p-16 shadow-[6px_6px_0px_0px_#0055ff] text-center max-w-xl mx-auto">
                <Sparkles className="w-12 h-12 mx-auto text-[#0055ff] mb-4" strokeWidth={2.5} />
                <h3 className="font-headline font-black text-3xl uppercase tracking-tight mb-3">
                  Coming soon
                </h3>
                <p className="font-mono text-xs uppercase font-bold text-zinc-500">
                  AI idea validation is on the way. Check back soon.
                </p>
              </div>
            </div>
          )}

          {/* 
            --------------------------------------------------------
            SUB-TAB: SETTINGS PANEL
            --------------------------------------------------------
          */}
          {dashboardTab === 'settings' && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4 mb-8">
                <div>
                  <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest select-none">
                    SYSTEM TUNE CONTROLS
                  </span>
                  <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter mt-2">
                    WORKSPACE SETTINGS
                  </h2>
                </div>
                <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold max-w-sm text-center md:text-right mt-2 md:mt-0 leading-tight">
                  Manage your profile photo, social handles, and session.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {user && (
                  <ProfilePhotoSettings
                    user={user}
                    onUpdated={async () => {
                      await refreshUser();
                    }}
                  />
                )}

                <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4 md:col-span-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-2">
                    <h3 className="font-headline font-black text-lg uppercase text-[#0055ff]">Social Media Handles</h3>
                    {socialSaveMessage && (
                      <span className="font-mono text-[10px] uppercase font-bold text-emerald-600">
                        {socialSaveMessage}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-500">
                        <Github className="w-3.5 h-3.5 text-[#1a1a1a]" />
                        GitHub
                      </span>
                      <div className="flex items-center bg-zinc-50 border-2 border-black">
                        <span className="px-3 border-r-2 border-black text-zinc-500">
                          <Github className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={socialHandles.github}
                          onChange={(e) => patchSocialHandle('github', e.target.value)}
                          placeholder="username"
                          className="w-full bg-transparent p-3 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-500">
                        <Linkedin className="w-3.5 h-3.5 text-[#0055ff]" />
                        LinkedIn
                      </span>
                      <div className="flex items-center bg-zinc-50 border-2 border-black">
                        <span className="px-3 border-r-2 border-black text-[#0055ff]">
                          <Linkedin className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={socialHandles.linkedin}
                          onChange={(e) => patchSocialHandle('linkedin', e.target.value)}
                          placeholder="username"
                          className="w-full bg-transparent p-3 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-500">
                        <Twitter className="w-3.5 h-3.5 text-[#1d9bf0]" />
                        X / Twitter
                      </span>
                      <div className="flex items-center bg-zinc-50 border-2 border-black">
                        <span className="px-3 border-r-2 border-black text-[#1d9bf0]">
                          <Twitter className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={socialHandles.x}
                          onChange={(e) => patchSocialHandle('x', e.target.value)}
                          placeholder="username"
                          className="w-full bg-transparent p-3 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-500">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        Portfolio / Website
                      </span>
                      <div className="flex items-center bg-zinc-50 border-2 border-black">
                        <span className="px-3 border-r-2 border-black text-emerald-600">
                          <Globe className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={socialHandles.website}
                          onChange={(e) => patchSocialHandle('website', e.target.value)}
                          placeholder="your.site"
                          className="w-full bg-transparent p-3 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveSocialHandles}
                      disabled={socialSaveLoading}
                      className="bg-[#ffcc00] text-black border-2 border-black px-5 py-3 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
                    >
                      {socialSaveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {socialSaveLoading ? 'Saving...' : 'Save handles'}
                    </button>
                  </div>
                </div>

                <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4 md:col-span-2">
                  <h3 className="font-headline font-black text-lg uppercase text-[#e63b2e] border-b border-zinc-100 pb-2">Session</h3>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="font-mono text-[11px] uppercase font-bold text-zinc-600">
                      Sign out of your HackathonFeed workspace on this device.
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center gap-2 bg-[#e63b2e] text-white border-2 border-black px-5 py-3 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#101010] hover:bg-black transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={2.5} />
                      Log out
                    </button>
                  </div>
                </div>

              </div>

              <SavedHackathonsPanel
                bookmarks={savedBookmarks}
                onRemove={toggleBookmark}
                onOpenHackathon={setSelectedHackathonId}
                onBrowseHackathons={() => navigateTo('/hackathons')}
              />

              {user?.role === 'admin' && (
                <div className="bg-[#1a1a1a] text-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#ffcc00] space-y-4">
                  <h3 className="font-headline font-black text-xl uppercase text-[#ffcc00]">Admin Console</h3>
                  {adminStats && (
                    <div className="font-mono text-xs space-y-1">
                      <p>Total hackathons: <span className="font-bold text-white">{adminStats.total_hackathons.toLocaleString()}</span></p>
                      <p>Total searches: <span className="font-bold text-white">{adminStats.total_searches}</span></p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={adminLoading}
                      onClick={async () => {
                        setAdminLoading(true);
                        try {
                          const result = await triggerScrape();
                          setAdminNotice(`Scrape ${result.status}.`);
                        } catch (err) {
                          setApiError(err instanceof ApiError ? err.message : 'Scrape failed.');
                        } finally {
                          setAdminLoading(false);
                        }
                      }}
                      className="bg-[#ffcc00] text-black font-headline font-black text-xs uppercase px-4 py-2 border-2 border-white hover:bg-white disabled:opacity-50 cursor-pointer"
                    >
                      {adminLoading ? 'Queuing...' : 'Trigger Scrape'}
                    </button>
                    <button
                      type="button"
                      onClick={() => getAdminStats().then(setAdminStats).catch(() => null)}
                      className="bg-white text-black font-headline font-black text-xs uppercase px-4 py-2 border-2 border-[#ffcc00] hover:bg-[#ffcc00] cursor-pointer"
                    >
                      Refresh Stats
                    </button>
                  </div>
                </div>
              )}

              {adminNotice && (
                <div className="bg-[#ffcc00]/20 border-3 border-[#ffcc00] p-4 font-mono text-xs font-bold text-black flex justify-between items-center">
                  <span>{adminNotice}</span>
                  <button type="button" onClick={() => setAdminNotice(null)} className="font-black cursor-pointer bg-transparent border-none">[X]</button>
                </div>
              )}

            </div>
          )}


        </main>

        <AiComingSoonModal
          open={isAiComingSoonOpen}
          onClose={() => setIsAiComingSoonOpen(false)}
        />


      </div>
      {hackathonDetailModal}
      </>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background text-primary font-body antialiased flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      
      {/* 
        ========================================================
        TopNavBar: Striking Neo-Brutalist Nav bar
        ========================================================
      */}
      <nav id="navbar-brutalist" className="bg-[#eee9e0] w-full sticky top-0 z-50 border-b-3 border-primary">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-2 max-w-[1440px] mx-auto gap-4">
          <button
            onClick={() => { navigateTo('/'); clearHackathonFilters(); }}
            className="flex items-center gap-2 font-headline font-black text-sm uppercase tracking-tight text-[#1a1a1a] cursor-pointer bg-transparent border-none"
          >
            <span className="w-5 h-5 bg-[#ffcc00] border-2 border-black grid place-items-center text-[10px] leading-none">H</span>
            HackathonFeed
          </button>

          <div className="hidden md:flex items-center gap-8 font-mono text-[9px] uppercase font-black">
            <button onClick={() => openAuth('login')} className="border-b-2 border-black bg-transparent cursor-pointer">Discover</button>
            <button onClick={handleTrackerAccess} className="bg-transparent cursor-pointer">Track</button>
            <button onClick={() => openAuth('login')} className="bg-transparent cursor-pointer">Validate</button>
            <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="bg-transparent cursor-pointer">About</button>
          </div>

          <button
            type="button"
            onClick={() => openAuth('register')}
            className="bg-[#ffcc00] border-2 border-black px-4 py-1.5 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-colors cursor-pointer"
          >
            Start Building
          </button>
        </div>
      </nav>

      {/* ERROR CAPTURING BANNER */}
      {apiError && (
        <div id="error-alert-bar" className="bg-secondary text-white p-4 font-mono text-sm border-b-4 border-primary flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <span className="font-extrabold uppercase">[NEURAL ERROR]</span> {apiError}
            </div>
          </div>
          <button 
            onClick={() => setApiError(null)}
            className="px-3 py-1 border-2 border-white font-headline text-xs hover:bg-white hover:text-secondary uppercase font-extrabold cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* MASTER CONTENT GRID AREA */}
      <main className="flex-grow">

        {/* 
          ========================================================================
          TAB 0: SCREENSHOT REPLICA LANDING PAGE (DEFAULT)
          ========================================================================
        */}
        {activeTab === 'landing' && (
          <div className="animate-fadeIn bg-[#eee9e0] bg-grid">
            <section className="relative overflow-hidden border-b-4 border-black min-h-[560px] flex items-center">
              <div className="max-w-[1440px] mx-auto px-6 py-16 md:py-24 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-6 relative z-10">
                  <span className="inline-block bg-black text-white font-mono text-[10px] uppercase font-black px-3 py-1 mb-6">
                    The developers command center
                  </span>
                  <h1 className="font-headline font-black uppercase tracking-tighter leading-[0.86] text-6xl md:text-7xl lg:text-[88px] text-[#1a1a1a]">
                    Aggregate.<br />
                    Track.<br />
                    <span className="text-[#e63b2e]">Validate.</span>
                  </h1>
                  <p className="mt-6 max-w-sm border-l-4 border-[#ffcc00] pl-4 font-body text-sm md:text-base font-bold leading-snug text-[#1a1a1a]">
                    The ultimate Bauhaus-inspired platform to discover global hackathons, manage your applications, and validate ideas with AI.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => openAuth('register')}
                      className="bg-[#ffcc00] border-3 border-black px-6 py-3 font-headline font-black text-xs uppercase shadow-[4px_4px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-colors cursor-pointer"
                    >
                      Start Building
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuth('login')}
                      className="bg-white border-3 border-black px-6 py-3 font-headline font-black text-xs uppercase shadow-[4px_4px_0px_0px_#101010] hover:bg-[#ffcc00] transition-colors cursor-pointer"
                    >
                      Login to Explore
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6 hidden md:flex justify-center lg:justify-end relative min-h-[330px]">
                  <div className="absolute right-4 top-8 w-28 h-28 bg-[#e63b2e] rounded-full border-3 border-black" />
                  <div className="absolute left-4 bottom-16 w-20 h-20 bg-[#ffcc00] border-3 border-black" />
                  <div className="relative mt-10 w-[430px] h-[230px] bg-[#8a8a82] border-4 border-black shadow-[8px_8px_0px_0px_#101010] rotate-2 grid place-items-center">
                    <div className="absolute inset-8 border-2 border-black bg-grid opacity-80" />
                    <div className="relative w-28 h-28 bg-white/80 rounded-full border border-white grid place-items-center">
                      <div className="bg-black text-white px-5 py-4 font-headline font-black text-sm uppercase leading-tight text-center">
                        Building<br />Future<br />Of Code
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-[#171717] text-[#ffcc00] border-b-4 border-black">
              <div className="max-w-[1440px] mx-auto px-6 py-9 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="font-headline font-black text-5xl md:text-6xl tracking-tighter">5000+</p>
                  <p className="font-mono text-[10px] uppercase font-black text-white mt-1">Hackathons listed</p>
                </div>
                <div>
                  <p className="font-headline font-black text-5xl md:text-6xl tracking-tighter">20k+</p>
                  <p className="font-mono text-[10px] uppercase font-black text-white mt-1">Active developers</p>
                </div>
                <div>
                  <p className="font-headline font-black text-5xl md:text-6xl tracking-tighter">$2M+</p>
                  <p className="font-mono text-[10px] uppercase font-black text-white mt-1">Prize pools tracked</p>
                </div>
              </div>
            </section>

            <section className="py-16 md:py-20 border-b-4 border-black">
              <div className="max-w-[1440px] mx-auto px-6">
                <h2 className="font-headline font-black uppercase text-4xl md:text-5xl tracking-tighter mb-12">
                  Core <span className="bg-black text-white px-2">Modules</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      icon: <Search className="w-6 h-6" />,
                      title: 'Global Search',
                      body: 'All hackathons in one place. Filter by tech stack, prize pool, or location with our high-speed indexing engine.',
                      action: 'Learn More',
                      onClick: () => openAuth('login'),
                      color: 'bg-white',
                      iconColor: 'bg-black text-[#ffcc00]',
                    },
                    {
                      icon: <Calendar className="w-6 h-6" />,
                      title: 'Application Tracker',
                      body: 'Never miss a deadline. Centralized dashboard to manage submissions, team formation, and milestone updates.',
                      action: 'Access Tracker',
                      onClick: handleTrackerAccess,
                      color: 'bg-[#ffcc00]',
                      iconColor: 'bg-black text-[#ffcc00]',
                    },
                    {
                      icon: <HelpCircle className="w-6 h-6" />,
                      title: 'AI Idea Validator',
                      body: 'Is your project worth building? Get instant feedback on feasibility, market fit, and prize potential.',
                      action: 'Test Idea',
                      onClick: () => openAuth('login'),
                      color: 'bg-white',
                      iconColor: 'bg-[#e63b2e] text-white',
                    },
                  ].map((module) => (
                    <article
                      key={module.title}
                      onClick={module.onClick}
                      className={`${module.color} border-4 border-black p-6 min-h-[260px] flex flex-col justify-between shadow-[4px_4px_0px_0px_#101010] hover:-translate-y-1 transition-transform cursor-pointer`}
                    >
                      <div>
                        <div className={`${module.iconColor} w-12 h-12 border-2 border-black grid place-items-center mb-7`}>
                          {module.icon}
                        </div>
                        <h3 className="font-headline font-black text-xl uppercase tracking-tight mb-3">{module.title}</h3>
                        <p className="font-body text-sm font-bold leading-snug text-[#1a1a1a]/80">{module.body}</p>
                      </div>
                      <div className="flex items-center justify-between border-t-2 border-black pt-4 mt-8">
                        <span className="font-headline font-black text-[10px] uppercase">{module.action}</span>
                        <span className="font-headline font-black">+</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="py-14 md:py-20 border-b-4 border-black">
              <div className="max-w-[1440px] mx-auto px-6">
                <div className="relative overflow-hidden bg-[#171717] text-white border-4 border-black p-8 md:p-14 min-h-[260px]">
                  <div className="relative z-10 max-w-xl">
                    <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter leading-none">
                      Join the <span className="text-[#ffcc00]">Builder</span><br />Revolution.
                    </h2>
                    <p className="font-body text-sm font-bold mt-5 mb-8 text-white/80">
                      Form follows function. Your hackathon journey simplified. Registration is open for the 2024 season.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        openAuth('register');
                      }}
                      className="flex flex-col sm:flex-row gap-3 max-w-lg"
                    >
                      <input
                        type="email"
                        placeholder="YOUR@EMAIL.COM"
                        onChange={(e) => setInputEmail(e.target.value)}
                        className="bg-white text-black border-2 border-black px-4 py-3 font-mono text-xs font-black uppercase focus:outline-none flex-1"
                      />
                      <button
                        type="submit"
                        className="bg-[#ffcc00] text-black border-2 border-black px-5 py-3 font-headline font-black text-[10px] uppercase hover:bg-white transition-colors cursor-pointer"
                      >
                        Register Now
                      </button>
                    </form>
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-[#ffcc00]/10 skew-x-[-16deg] translate-x-16" />
                  <div className="absolute right-10 bottom-0 h-40 w-40 bg-[#e63b2e]/30" />
                </div>
              </div>
            </section>

            <footer className="bg-[#171717] text-white border-t-4 border-[#ffcc00] min-h-[260px] relative overflow-hidden">
              <div className="max-w-[1440px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between gap-8 relative z-10">
                <div>
                  <h3 className="font-headline font-black uppercase text-[#ffcc00] text-xl mb-3">HackathonFeed</h3>
                  <p className="font-mono text-[9px] uppercase text-white/60 font-bold">
                    © 2026 HackathonFeed. Form<br />follows function.
                  </p>
                </div>
                <div className="flex gap-8 font-mono text-[9px] uppercase font-black text-white">
                  <button onClick={() => openAuth('login')} className="bg-transparent cursor-pointer">Terms</button>
                  <button onClick={() => openAuth('login')} className="bg-transparent cursor-pointer">Privacy</button>
                  <button onClick={() => openAuth('login')} className="bg-transparent cursor-pointer">Twitter</button>
                  <button onClick={() => openAuth('login')} className="bg-transparent cursor-pointer">Github</button>
                </div>
                <div className="flex gap-2">
                  <span className="w-8 h-8 bg-white text-black border-2 border-white grid place-items-center font-headline font-black">□</span>
                  <span className="w-8 h-8 bg-white text-black border-2 border-white grid place-items-center font-headline font-black">*</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full font-headline font-black text-[120px] md:text-[180px] uppercase tracking-[0.4em] text-white/[0.03] leading-none pl-6">
                Bauhaus
              </div>
            </footer>
          </div>
        )}

        {false && activeTab === 'landing' && (
          <div className="animate-fadeIn">
            
            {/* HERO SECTION CONTAINER - Yellow background matching screenshot exactly */}
            <section className="relative bg-[#ffcc00] border-b-4 border-primary w-full overflow-hidden py-16 md:py-24 animate-fadeIn">
              <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Left Column contents */}
                <div className="z-10 lg:col-span-7 flex flex-col items-start">
                  
                  <h1 className="font-headline text-6xl md:text-8xl lg:text-[115px] font-black uppercase tracking-tighter leading-[0.82] text-primary mb-10 select-none">
                    BUILD<br />THE<br />FUTURE
                  </h1>

                  {/* Search input exactly styled */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      navigateTo('/explore');
                    }}
                    className="bg-white border-4 border-primary w-full max-w-xl shadow-[4px_4px_0px_0px_#1a1a1a] p-2 flex items-center mb-8 gap-3"
                  >
                    <Search className="w-6 h-6 text-[#1a1a1a] pl-1 shrink-0" />
                    <input 
                      type="text"
                      className="w-full bg-transparent border-none text-base font-bold font-body placeholder:text-primary/40 focus:ring-0 focus:outline-none uppercase"
                      placeholder="Search Every Hackathon, Bounties, Tech..."
                      value={hackathonFilters.search}
                      onChange={(e) => patchHackathonFilters({ search: e.target.value })}
                    />
                    <button 
                      type="submit"
                      className="bg-[#1a1a1a] text-white font-headline font-black px-6 py-2.5 uppercase hover:bg-secondary hover:text-white transition-colors text-xs"
                    >
                      FIND
                    </button>
                  </form>

                  <button 
                    onClick={handleTrackerAccess}
                    className="inline-block bg-[#1a1a1a] text-white font-headline font-black text-xl uppercase px-10 py-5 border-4 border-primary shadow-[6px_6px_0px_0px_#ffffff] hover:bg-[#ffcc00] hover:text-black transition-all hover:shadow-[4px_4px_0px_0px_#1a1a1a] active:translate-x-1 active:translate-y-1 cursor-pointer"
                  >
                    START TRACKING
                  </button>

                </div>

                {/* Right Side Motherboard high-fidelity visual illustration */}
                <div className="lg:col-span-5 hidden lg:block bg-white border-4 border-primary shadow-[8px_8px_0px_0px_#1a1a1a] p-4 aspect-video flex items-center justify-center">
                  <CircuitBoardIllustration />
                </div>

              </div>
            </section>

            {/* THREE VERTICAL WHITE FEATURE PANELS */}
            <section className="bg-[#f5f0e8] py-16 border-b-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Panel 1 */}
                <div 
                  onClick={() => navigateTo('/explore')}
                  className="bg-white border-4 border-primary p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#1a1a1a]"
                >
                  <div className="w-16 h-16 bg-[#eee9e0] border-3 border-primary flex items-center justify-center group-hover:bg-[#ffcc00] transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                      HACKATHON AGGREGATOR
                    </h3>
                    <p className="font-body text-sm font-bold text-primary/70 leading-relaxed uppercase">
                      Explore every hackathon across the web in one place. Filter by tech stacks, prize pools, and timelines.
                    </p>
                  </div>
                </div>

                {/* Panel 2 */}
                <div 
                  onClick={handleTrackerAccess}
                  className="bg-white border-4 border-primary p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#0055ff]"
                >
                  <div className="w-16 h-16 bg-[#eee9e0] border-3 border-primary flex items-center justify-center group-hover:bg-[#0055ff] group-hover:text-white transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
                    <Layers className="w-8 h-8 text-primary group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                      APPLICATION TRACKER
                    </h3>
                    <p className="font-body text-sm font-bold text-primary/70 leading-relaxed uppercase">
                      Monitor your status, deadlines, and submissions effortlessly on custom-built brutalist Kanban pipelines.
                    </p>
                  </div>
                </div>

                {/* Panel 3 */}
                <div 
                  onClick={() => openAiComingSoon()}
                  className="bg-white border-4 border-primary p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#e63b2e]"
                >
                  <div className="w-16 h-16 bg-[#eee9e0] border-3 border-primary flex items-center justify-center group-hover:bg-[#e63b2e] group-hover:text-white transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
                    <Sparkles className="w-8 h-8 text-primary group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                      AI IDEA VALIDATOR
                    </h3>
                    <p className="font-body text-sm font-bold text-primary/70 leading-relaxed uppercase">
                      Get instant feedback on your project concepts from our neural engineering jury. Pitch, score, upgrade.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* "HOW IT WORKS" BLOCKS ROW */}
            <section className="bg-[#f5f0e8] py-16 border-b-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6">
                
                <h2 className="font-headline text-5xl md:text-6xl font-black uppercase text-center tracking-tighter mb-16 select-none">
                  HOW IT WORKS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Block 01 */}
                  <div 
                    onClick={() => navigateTo('/explore')}
                    className="bg-[#ffcc00] border-4 border-primary p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
                  >
                    <span className="font-headline font-black text-3xl">01</span>
                    <div>
                      <h4 className="font-headline font-black text-xl uppercase mb-2">DISCOVER</h4>
                      <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                        Explore our vast database matching your skill set parameters. Find the perfect forge.
                      </p>
                    </div>
                  </div>

                  {/* Block 02 */}
                  <div 
                    onClick={() => openAiComingSoon()}
                    className="bg-[#eee9e0] border-4 border-primary p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
                  >
                    <span className="font-headline font-black text-3xl">02</span>
                    <div>
                      <h4 className="font-headline font-black text-xl uppercase mb-2">VALIDATE</h4>
                      <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                        Run your short ideas on our neural engine to check potential feasibility and get required upgrades.
                      </p>
                    </div>
                  </div>

                  {/* Block 03 */}
                  <div 
                    onClick={handleTrackerAccess}
                    className="bg-[#e63b2e] text-white border-4 border-primary p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
                  >
                    <span className="font-headline font-black text-3xl">03</span>
                    <div>
                      <h4 className="font-headline font-black text-xl uppercase mb-2 text-white">TRACK</h4>
                      <p className="font-mono text-xs font-bold uppercase leading-relaxed text-white/90">
                        Manage applications, teams, and milestones on our kanban boards. Move seamlessly to release.
                      </p>
                    </div>
                  </div>

                  {/* Block 04 */}
                  <div 
                    onClick={handleTrackerAccess}
                    className="bg-white border-4 border-primary p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
                  >
                    <span className="font-headline font-black text-3xl">04</span>
                    <div>
                      <h4 className="font-headline font-black text-xl uppercase mb-2">BUILD</h4>
                      <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                        Focus on execution and winning hackathons targeting your stack. Form follows function.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* "TRENDING FORGES" - Dark thematic block */}
            <section className="bg-[#1a1a1a] text-white py-20 border-b-4 border-primary bg-grid-light">
              <div className="max-w-[1440px] mx-auto px-6">
                
                <div className="flex justify-between items-center mb-12 border-b-2 border-white/20 pb-4">
                  <h2 className="font-headline text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
                    TRENDING FORGES
                  </h2>
                  <button 
                    onClick={() => navigateTo('/explore')}
                    className="font-headline font-bold text-sm uppercase text-[#ffcc00] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    VIEW ALL ↗
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Card 1: AGI Frontiers */}
                  <div className="bg-white text-primary border-4 border-[#ffcc00] p-8 flex flex-col justify-between gap-8 shadow-[6px_6px_0px_0px_#ffcc00]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-[#1a1a1a] text-white text-[10px] font-mono font-bold uppercase py-1 px-3">
                          LIVE NOW
                        </span>
                        <span className="font-headline font-black text-xl text-secondary">$500,000 PRIZE POOL</span>
                      </div>
                      <h3 className="font-headline font-black text-3xl uppercase tracking-tight text-[#1a1a1a]">
                        AGI Frontiers
                      </h3>
                      <p className="font-mono text-xs font-bold uppercase text-primary/75 leading-relaxed">
                        Forge the sovereign artificial general intelligence middleware. Highly technical, raw algorithmic implementations only.
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-primary/10">
                      <div className="flex gap-2">
                        <span className="border border-primary px-2 py-0.5 text-[9px] font-mono font-bold bg-[#eee9e0]">#AI/ML</span>
                        <span className="border border-primary px-2 py-0.5 text-[9px] font-mono font-bold bg-[#eee9e0]">#Web3</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setValHackathon('AGI Frontiers');
                            openAiComingSoon();
                          }}
                          className="bg-[#eee9e0] border-2 border-primary text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#ffcc00]"
                        >
                          AI PLAN
                        </button>
                        {renderRegisterButton(
                          { title: 'AGI Frontiers' },
                          'bg-[#1a1a1a] text-white border-2 border-primary text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-secondary',
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: DeFi Summer Hack */}
                  <div className="bg-[#eee9e0] text-primary border-4 border-primary p-8 flex flex-col justify-between gap-8 shadow-[6px_6px_0px_0px_#0055ff]">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-[#0055ff] text-white text-[10px] font-mono font-bold uppercase py-1 px-3">
                          STARTS IN 3 DAYS
                        </span>
                        <span className="font-headline font-black text-xl text-[#0055ff]">$150,000 PRIZE POOL</span>
                      </div>
                      <h3 className="font-headline font-black text-3xl uppercase tracking-tight text-[#1a1a1a]">
                        DeFi Summer Hack
                      </h3>
                      <p className="font-mono text-xs font-bold uppercase text-primary/75 leading-relaxed">
                        Deconstruct legacy liquidity routing protocols. Build highly efficient AMMs and zero-knowledge privacy pools.
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-primary/10">
                      <div className="flex gap-2">
                        <span className="border border-primary px-2 py-0.5 text-[9px] font-mono font-bold bg-white">#Solidity</span>
                        <span className="border border-primary px-2 py-0.5 text-[9px] font-mono font-bold bg-white">#DeFi</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setValHackathon('DeFi Summer Hack');
                            openAiComingSoon();
                          }}
                          className="bg-white border-2 border-primary text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#0055ff] hover:text-white"
                        >
                          AI PLAN
                        </button>
                        {renderRegisterButton(
                          { title: 'DeFi Summer Hack' },
                          'bg-[#1a1a1a] text-white border-2 border-primary text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-secondary',
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* "FORM FOLLOWS FUNCTION" SECTION */}
            <section className="bg-[#f5f0e8] py-20 border-b-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Left Side Header */}
                <div className="lg:col-span-6 space-y-6">
                  <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1a1a1a] leading-[0.9]">
                    FORM<br />FOLLOWS<br />FUNCTION.
                  </h2>
                  <div className="border-4 border-primary p-6 bg-white shadow-[4px_4px_0px_0px_#1a1a1a] max-w-md">
                    <p className="font-body text-base font-bold text-primary/80 uppercase leading-relaxed">
                      We stripped away the noise. No fluff. No distractions. Just the tools hand-built for builders, start-ups, and hackers to evaluate feasibility, track task streams, and win.
                    </p>
                  </div>
                </div>

                {/* Right Side Stats block */}
                <div className="lg:col-span-6 grid grid-cols-2 gap-6">
                  
                  <div className="bg-[#ffcc00] border-4 border-primary p-8 flex flex-col justify-center items-center h-52 text-center shadow-[6px_6px_0px_0px_#1a1a1a]">
                    <span className="font-display text-5xl md:text-6xl font-black tracking-tight mb-2 select-none text-[#1a1a1a]">500+</span>
                    <span className="font-headline text-xs font-black uppercase text-[#1a1a1a]">ACTIVE FORGES</span>
                  </div>

                  <div className="bg-white border-4 border-primary p-8 flex flex-col justify-center items-center h-52 text-center shadow-[6px_6px_0px_0px_#0055ff]">
                    <span className="font-display text-5xl md:text-6xl font-black tracking-tight mb-2 select-none text-[#1a1a1a]">10k+</span>
                    <span className="font-headline text-xs font-black uppercase text-[#1a1a1a]">BUILDERS</span>
                  </div>

                </div>

              </div>
            </section>

            {/* "BUILT BY BUILDERS" TESTIMONIAL QUOTES */}
            <section className="bg-[#f5f0e8] py-20 border-b-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6">
                
                <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter text-center mb-16 select-none border-b-4 border-primary pb-4">
                  BUILT BY BUILDERS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Testimonial 1 */}
                  <div className="bg-white border-4 border-primary p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
                    <div>
                      <span className="font-display text-5xl font-black text-secondary select-none block mb-2">“</span>
                      <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                        HackathonFeed completely changed how I find events. I won 3 hackathons last month just by tracking everything here.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t-2 border-primary/10">
                      <div className="w-10 h-10 bg-[#0055ff] border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black text-sm uppercase">Sarah J.</h4>
                        <p className="font-mono text-[9px] font-bold uppercase text-primary/60">Full Stack Developer</p>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial 2 */}
                  <div className="bg-[#ffcc00] border-4 border-primary p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
                    <div>
                      <span className="font-display text-5xl font-black text-[#1a1a1a] select-none block mb-2">“</span>
                      <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                        The AI Idea Validator saved our team a week of debating. We pivoted early and took home the grand prize on AGI Frontiers with their neural feedback upgraded roster.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t-2 border-primary/10">
                      <div className="w-10 h-10 bg-[#e63b2e] border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black text-sm uppercase">Team Void</h4>
                        <p className="font-mono text-[9px] font-bold uppercase text-[#1a1a1a]/60">Web3 Startup Group</p>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial 3 */}
                  <div className="bg-white border-4 border-primary p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
                    <div>
                      <span className="font-display text-5xl font-black text-[#0055ff] select-none block mb-2">“</span>
                      <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                        Stop using heavy corporate spreadsheets. The clean minimal tracker dashboard is pure gold for serial builders and hackers who want clean focus.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t-2 border-primary/10">
                      <div className="w-10 h-10 bg-[#1a1a1a] border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black text-sm uppercase">Marcus T.</h4>
                        <p className="font-mono text-[9px] font-bold uppercase text-primary/60">AI Lead Researcher</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* "READY TO FORGE" RED Call to Action Section */}
            <section className="bg-[#e63b2e] py-20 text-center border-b-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6 space-y-10">
                <h2 className="font-headline text-5xl md:text-8xl font-black uppercase text-white tracking-tighter select-none">
                  READY TO FORGE?
                </h2>
                
                <button 
                  onClick={() => openAiComingSoon()}
                  className="bg-[#1a1a1a] text-white font-headline font-black text-xl uppercase px-12 py-5 border-4 border-white shadow-[6px_6px_0px_0px_#ffcc00] hover:bg-white hover:text-black hover:shadow-none transition-all active:translate-x-1 active:translate-y-1 cursor-pointer"
                >
                  JOIN NOW ↗
                </button>
              </div>
            </section>

          </div>
        )}

        {/* 
          ========================================================================
          TAB 1: HOME LANDING & HACKATHON EXPLORATION
          ========================================================================
        */}
        {false && activeTab === 'explore' && (
          <div>
            
            {/* HERO SECTION CONTAINER */}
            <section className="relative bg-primary-container border-b-4 border-primary w-full overflow-hidden bg-grid">
              <div className="max-w-[1440px] mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Visual text highlights */}
                <div className="z-10 lg:col-span-7 flex flex-col items-start">
                  
                  <div className="bg-[#1a1a1a] text-white font-mono text-xs font-bold py-1 px-3 mb-6 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    Centralised Forge Hub
                  </div>

                  <h1 className="font-headline text-5xl md:text-7xl lg:text-[105px] font-black uppercase tracking-tighter leading-[0.85] text-primary mb-8 select-none">
                    BUILD<br />THE<br />FUTURE
                  </h1>

                  {/* Fully functional high-contrast search input */}
                  <div className="bg-background bauhaus-border w-full max-w-xl bauhaus-shadow p-2 flex items-center mb-8 gap-3">
                    <Search className="w-6 h-6 text-[#1a1a1a] pl-1 shrink-0" />
                    <input 
                      type="text"
                      className="w-full bg-transparent border-none text-lg font-bold font-body placeholder:text-primary/40 focus:ring-0 focus:outline-none uppercase"
                      placeholder="Search hackathons, bounties, tech..."
                      value={hackathonFilters.search}
                      onChange={(e) => patchHackathonFilters({ search: e.target.value })}
                    />
                    {hackathonFilters.search && (
                      <button 
                        onClick={() => patchHackathonFilters({ search: '' })}
                        className="text-xs font-mono font-bold bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 px-2 py-1 uppercase"
                      >
                        Clear
                      </button>
                    )}
                    <button 
                      type="button"
                      className="bg-primary text-background font-headline font-bold px-6 py-3 uppercase hover:bg-secondary hover:text-white transition-colors cursor-pointer border-none"
                      onClick={() => setHackathonPage(1)}
                    >
                      Find
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => { openAiComingSoon(); }}
                      className="inline-block bg-primary text-background font-headline font-black text-lg md:text-xl uppercase px-8 py-4 bauhaus-border bauhaus-shadow hover:bg-background hover:text-primary transition-all duration-100 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#1a1a1a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
                    >
                      Summon AI Validator
                    </button>

                    <button 
                      type="button"
                      onClick={() => setIsAddingHackathon(true)}
                      className="inline-block bg-white text-primary font-headline font-black text-lg md:text-xl uppercase px-8 py-4 bauhaus-border bauhaus-shadow hover:bg-primary-container transition-all duration-100 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#1a1a1a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
                    >
                      + Host A Forge
                    </button>
                  </div>
                </div>

                {/* Right Side Grit Visual Mockup representing high-fidelity black-and-white asset */}
                <div className="relative h-[300px] lg:h-[500px] w-full z-0 lg:col-span-5 hidden md:block">
                  <div 
                    className="absolute inset-0 bg-[#0055ff]/40 bg-cover bg-center bg-no-repeat bauhaus-border bauhaus-shadow mix-blend-overlay"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')` }}
                  ></div>
                  <div className="absolute inset-x-4 bottom-4 bg-[#1a1a1a] text-white p-4 font-mono text-xs uppercase border-2 border-white space-y-1">
                    <div className="font-bold flex justify-between">
                      <span>Server Terminal</span>
                      <span className="text-[#ffcc00] animate-pulse">● online</span>
                    </div>
                    <p className="text-[10px] text-white/70">
                      System nodes are mapping {hackathonTotal.toLocaleString()} active global developer forges. Strip the fluff. Form follows function.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* Filters panel */}
            <section className="max-w-[1440px] mx-auto px-6 py-8">
              <HackathonFilters
                values={hackathonFilters}
                themes={apiThemes}
                platforms={apiPlatforms}
                total={hackathonTotal}
                loading={hackathonsLoading}
                onChange={patchHackathonFilters}
                onClear={clearHackathonFilters}
              />
            </section>

            {/* ADD A HACKATHON MODAL/DRAWER IF OPENED */}
            {isAddingHackathon && (
              <section className="max-w-[1440px] mx-auto px-6 py-8 bg-[#ffcc00] border-b-4 border-primary animate-fadeIn flex flex-col gap-6">
                <div className="flex justify-between items-center pb-2 border-b-2 border-primary">
                  <h3 className="font-headline font-black text-2xl uppercase">Host A Cyber-Forge / New Event</h3>
                  <button 
                    onClick={() => setIsAddingHackathon(false)} 
                    className="p-1 px-3 border-2 border-primary bg-background hover:bg-secondary hover:text-white font-mono text-xs font-bold"
                  >
                    CLOSE [X]
                  </button>
                </div>
                
                <form onSubmit={handleCreateHackathon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Hackathon Forge Name *</label>
                    <input 
                      type="text" required
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase font-bold"
                      placeholder="e.g. BERLIN AGENT SUMMIT"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Prize Pool Valuation *</label>
                    <input 
                      type="text" required
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase font-bold"
                      placeholder="e.g. $100,000"
                      value={newPrize}
                      onChange={(e) => setNewPrize(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Submission Deadline *</label>
                    <input 
                      type="date" required
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase font-bold"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Location / Axis *</label>
                    <input 
                      type="text" required
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase font-bold"
                      placeholder="e.g. Berlin / Online"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Topics / Tech Tags (Comma-separated)</label>
                    <input 
                      type="text"
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase font-bold"
                      placeholder="AI/ML, Solidity, React, Zero-Knowledge"
                      value={newTagsString}
                      onChange={(e) => setNewTagsString(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-xs font-extrabold uppercase mb-1">Core Pitch / Description</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-white p-3 border-3 border-primary focus:outline-none focus:ring-0 uppercase text-xs font-mono font-bold"
                      placeholder="Detail the constraints and expected submissions parameters..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-[#1a1a1a] text-white p-4 font-headline uppercase font-black text-base border-3 border-black shadow-[4px_4px_0px_0px_#ffffff] hover:bg-white hover:text-black hover:shadow-none transition-all cursor-pointer"
                    >
                      PUBLISH EVENT FORGE
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* DYNAMIC FORGES LIST: Beautiful Brutalist Cards */}
            <section className="max-w-[1440px] mx-auto px-6 py-16">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b-4 border-primary pb-3">
                <div>
                  <h2 className="font-headline text-4xl md:text-6xl font-black uppercase tracking-tighter">
                    Active Forges ({hackathonTotal.toLocaleString()})
                  </h2>
                  <p className="font-mono text-xs uppercase text-[#1a1a1a]/60 mt-1">
                    Explore available hackathons. Select a card to recruit team members or trigger validation.
                  </p>
                </div>
                {(hackathonFilters.theme.length > 0 ||
                  hackathonFilters.domain.length > 0 ||
                  hackathonFilters.platform.length > 0) && (
                  <span className="font-mono text-xs bg-secondary text-white py-1 px-3 border-2 border-primary mt-2 md:mt-0">
                    Filtered
                  </span>
                )}
              </div>

              {hackathonsLoading ? (
                <div className="py-20 text-center font-mono uppercase text-lg text-primary/60 flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Loading hackathons from backend...
                </div>
              ) : hackathonsError ? (
                <div className="bg-surface-container-high border-4 border-dashed border-[#e63b2e] py-20 text-center font-mono uppercase text-lg text-[#e63b2e] space-y-4">
                  <p>{hackathonsError}</p>
                  <button onClick={() => refetchHackathons()} className="underline text-[#0055ff] font-bold">Retry connection</button>
                </div>
              ) : filteredHackathons.length === 0 ? (
                <div className="bg-surface-container-high border-4 border-dashed border-primary/40 py-20 text-center font-mono uppercase text-lg text-primary/60">
                  No Active Forges matching search parameter.
                  <button 
                    onClick={clearHackathonFilters}
                    className="block mx-auto mt-4 underline text-[#0055ff] font-bold"
                  >
                    RESET QUERY STACK
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredHackathons.map((hack) => (
                    <div 
                      key={hack.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedHackathonId(hack.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedHackathonId(hack.id);
                        }
                      }}
                      className="bg-white text-primary bauhaus-border p-6 flex flex-col justify-between h-auto gap-6 hover:-translate-y-1 transition-all cursor-pointer"
                      style={{ boxShadow: `8px 8px 0px 0px ${hack.cardShadow}` }}
                    >
                      {/* Top Badging row */}
                      <div className="flex justify-between items-start">
                        <HackathonStatusBadge hack={hack} />
                        <div className="text-right">
                          <span className="font-mono text-xs uppercase text-[#1a1a1a]/60 block font-bold">Prize Pool</span>
                          <span className="font-headline font-black text-2xl text-secondary block">{hack.prizePool}</span>
                        </div>
                      </div>

                      {/* Info layout block */}
                      <div className="space-y-2">
                        <h4 className="font-headline text-3xl font-black uppercase tracking-tight leading-none">
                          {hack.title}
                        </h4>
                        <p className="font-body text-sm font-bold text-primary/70 leading-relaxed font-mono text-xs">
                          {hack.description}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="flex items-center gap-1 font-mono text-xs text-primary/60 uppercase font-black mr-2">
                            <MapPin className="w-3.5 h-3.5" />
                            {hack.location}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-primary/60 uppercase font-black mr-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Deadline: {hack.deadline}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-primary/60 uppercase font-black">
                            <Users className="w-3.5 h-3.5" />
                            {hack.participantsCount} Bakers
                          </span>
                        </div>
                      </div>

                      {/* Interactive Action tools */}
                      <div className="flex justify-between items-end pt-4 border-t-2 border-dashed border-primary/20">
                        {/* Chips list */}
                        <div className="flex flex-wrap gap-1">
                          {hack.tags.map((tag) => (
                            <span key={tag} className="border-2 border-primary px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-surface">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Interactive flow actions list */}
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {renderBookmarkButton(hack.id)}
                          {hack.url && (
                            <a
                              href={hack.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-2 border-primary p-2 text-[#0055ff] hover:bg-[#0055ff] hover:text-white transition-all"
                              title="Open hackathon page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button 
                            onClick={() => {
                              setValHackathon(hack.title);
                              openAiComingSoon();
                            }}
                            className="bg-primary-container border-2 border-primary p-2 text-xs font-headline font-black uppercase tracking-tight flex items-center gap-1 hover:bg-secondary hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]"
                            title="Analyze proposed idea for this event"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Plan
                          </button>

                          {renderRegisterButton(
                            {
                              title: hack.title,
                              id: hack.id,
                              prizePool: hack.prizePool,
                              deadline: hack.deadline,
                              url: hack.url,
                            },
                            'bg-[#0055ff] text-white border-2 border-primary p-2 text-xs font-headline font-black uppercase tracking-tight flex items-center gap-1 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]',
                            <>
                              Register
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </>,
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
              {renderPagination()}
            </section>

            {/* Testimonials */}
            <section className="bg-surface-container-highest py-20 border-t-4 border-primary">
              <div className="max-w-[1440px] mx-auto px-6">
                <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter mb-16 text-center select-none">
                  BUILT BY<br />BUILDERS
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-background bauhaus-border bauhaus-shadow p-8 flex flex-col justify-between hover:-translate-y-1 transition-all">
                    <div>
                      <span className="font-display text-4xl block text-secondary font-black mb-4">“</span>
                      <p className="font-body font-bold text-lg leading-relaxed mb-6">
                        &quot;HackathonFeed completely changed how I find events. I won 3 hackathons last month just by tracking everything here.&quot;
                      </p>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t-4 border-primary">
                      <div className="w-12 h-12 bg-tertiary border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black uppercase text-base">Sarah J.</h4>
                        <p className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">Full Stack Developer</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary-container bauhaus-border bauhaus-shadow p-8 flex flex-col justify-between hover:-translate-y-1 transition-all md:-translate-y-6">
                    <div>
                      <span className="font-display text-4xl block text-[#1a1a1a] font-black mb-4">“</span>
                      <p className="font-body font-bold text-lg leading-relaxed mb-6">
                        &quot;The AI Idea Validator saved our team a week of debating. We pivoted early and took home the grand prize on AGI Frontiers with their neural feedback upgraded roster.&quot;
                      </p>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t-4 border-primary">
                      <div className="w-12 h-12 bg-secondary border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black uppercase text-base">Team Void</h4>
                        <p className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">Web3 Startup Group</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background bauhaus-border bauhaus-shadow p-8 flex flex-col justify-between hover:-translate-y-1 transition-all">
                    <div>
                      <span className="font-display text-4xl block text-[#0055ff] font-black mb-4">“</span>
                      <p className="font-body font-bold text-lg leading-relaxed mb-6">
                        &quot;Stop using heavy corporate spreadsheets. The clean minimal tracker dashboard is pure gold for serial builders and hackers who want clean focus.&quot;
                      </p>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t-4 border-primary">
                      <div className="w-12 h-12 bg-primary border-2 border-primary"></div>
                      <div>
                        <h4 className="font-headline font-black uppercase text-base">Marcus T.</h4>
                        <p className="font-mono text-[10px] font-bold text-on-surface-variant uppercase">AI Lead Researcher</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* Why HackathonFeed Stats banner */}
            <section className="bg-primary text-background py-16 px-6 bg-grid-light border-t-4 border-primary">
              <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="font-headline text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#ffcc00] leading-none mb-4">
                    FORM FOLLOWS FUNCTION.
                  </h2>
                  <p className="font-body text-xl font-bold max-w-lg text-[#faf7f2]/90 leading-relaxed uppercase">
                    We stripped away the noise. No corporate bloated templates. No telemetry lag. Just pristine brutalist tools designed to find, track, validate, and win.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#ffcc00] text-[#1a1a1a] border-4 border-white p-6 flex flex-col justify-center items-center text-center aspect-square shadow-[6px_6px_0px_0px_#ffffff]">
                    <span className="font-display text-5xl md:text-6xl font-black tracking-tighter mb-1 select-none">500+</span>
                    <span className="font-headline text-sm font-black uppercase">Hackathons</span>
                  </div>
                  <div className="bg-secondary text-white border-4 border-white p-6 flex flex-col justify-center items-center text-center aspect-square shadow-[6px_6px_0px_0px_#ffffff]">
                    <span className="font-display text-5xl md:text-6xl font-black tracking-tighter mb-1 select-none">10k+</span>
                    <span className="font-headline text-sm font-black uppercase">Cyber Builders</span>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {/* 
          ========================================================================
          TAB 2: SUBMISSION TRACKER WORKSPACE
          ========================================================================
        */}
        {activeTab === 'tracker' && (
          <div className="max-w-[1440px] mx-auto px-6 py-12">
            
            {/* Header outline */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-4 border-primary pb-6 mb-10 gap-4">
              <div>
                <span className="font-mono text-xs bg-[#1a1a1a] text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
                  PROPRIETARY BUILD LOGGER
                </span>
                <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter mt-2">
                  APPLICATION TRACKER
                </h2>
              </div>
              <p className="font-mono text-xs uppercase text-[#1a1a1a]/60 max-w-md font-bold">
                Map project milestones and submission workflow pipelines. Keep track of deadlines directly.
              </p>
            </div>

            {/* Split layout: Register Tracker Application drawer & Kanban boards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Creator segment */}
              <div className="lg:col-span-1 bg-surface-container-low border-4 border-primary p-6 h-fit text-primary space-y-6">
                <div>
                  <h3 className="font-display font-black text-xl uppercase tracking-tight flex items-center gap-2 text-secondary">
                    <PlusCircle className="w-5 h-5" />
                    TRACK NEW PLAN
                  </h3>
                  <p className="font-mono text-[11px] uppercase text-[#1a1a1a]/70 font-semibold mt-1">
                    Map hackathon target files onto your active tracker:
                  </p>
                </div>

                <form onSubmit={handleAddNewTracking} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase font-bold text-primary mb-1">
                      Choose Active Forge *
                    </label>
                    <select 
                      className="w-full bg-white p-2.5 border-2 border-primary font-bold uppercase text-xs"
                      value={trackHackathonName}
                      onChange={(e) => setTrackHackathonName(e.target.value)}
                    >
                      {hackathons.map((h) => (
                        <option key={h.id} value={h.title}>
                          {h.title} ({h.prizePool})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase font-bold text-primary mb-1">
                      Proposed Project Title *
                    </label>
                    <input 
                      type="text" required
                      className="w-full bg-white p-2.5 border-2 border-primary text-xs uppercase font-extrabold focus:outline-none"
                      placeholder="e.g. Sovereign Router"
                      value={trackProjectTitle}
                      onChange={(e) => setTrackProjectTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase font-bold text-primary mb-1">
                      Concept Pitch Objective
                    </label>
                    <textarea 
                      rows={4}
                      className="w-full bg-white p-2 text-xs font-mono font-bold focus:outline-none uppercase"
                      placeholder="e.g. Non-custodial liquidity escrow protocol resolved on-chain..."
                      value={trackConcept}
                      onChange={(e) => setTrackConcept(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#1a1a1a] text-white py-3 px-4 font-headline uppercase font-black text-xs border-2 border-black tracking-wider hover:bg-[#ffcc00] hover:text-black hover:scale-95 transition-all text-center cursor-pointer"
                  >
                    ADD TO TRACKER BOARD
                  </button>
                </form>
              </div>

              {/* Kanban Pipelines segments */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                
                {/* COLUMN BUCKET GENERATOR */}
                {(['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'] as TrackedApplication['stage'][]).map((stage) => {
                  
                  const stageApps = trackedApps.filter(app => app.stage === stage);
                  
                  let bgHeaderColor = 'bg-[#1a1a1a] text-white';
                  if (stage === 'In Progress') bgHeaderColor = 'bg-[#0055ff] text-white';
                  if (stage === 'Submitted') bgHeaderColor = 'bg-[#ffcc00] text-black';
                  if (stage === 'Accepted / Win') bgHeaderColor = 'bg-secondary text-white';

                  return (
                    <div key={stage} className="border-4 border-primary bg-white min-h-[500px] flex flex-col">
                      
                      {/* Stage Headers bar representing strict structure */}
                      <div className={`p-3 font-headline font-black text-center text-xs uppercase border-b-4 border-primary ${bgHeaderColor}`}>
                        {stage} ({stageApps.length})
                      </div>

                      {/* Content panel holding tracked applications cards */}
                      <div className="p-3 space-y-4 flex-grow bg-surface-container/30">
                        {stageApps.length === 0 ? (
                          <div className="text-center font-mono py-12 uppercase text-[10px] text-primary/40 border-2 border-dashed border-primary/20 bg-white">
                            Empty Pipeline
                          </div>
                        ) : (
                          stageApps.map((app) => {
                            const completedMilestones = app.milestones.filter(m => m.completed).length;
                            const totalMilestones = app.milestones.length;
                            const ratio = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

                            return (
                              <div 
                                key={app.id} 
                                className="bg-white border-2 border-primary shadow-[3px_3px_0px_0px_#1a1a1a] p-3 flex flex-col gap-3 relative hover:scale-102 transition-transform"
                              >
                                
                                {/* Trash button directly on top right corner */}
                                <button 
                                  onClick={() => handleDeleteTracked(app.id)}
                                  className="absolute top-2 right-2 text-[#da2a2a] hover:text-red hover:scale-110 cursor-pointer"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <div>
                                  <span className="font-mono text-[9px] uppercase font-bold text-secondary">
                                    {app.hackathonName}
                                  </span>
                                  <h4 className="font-headline font-bold text-sm uppercase leading-tight tracking-tight mt-0.5 max-w-[130px] truncate">
                                    {app.title}
                                  </h4>
                                </div>

                                <p className="font-body text-[10px] uppercase font-semibold text-primary/70 line-clamp-2 max-h-8">
                                  {app.concept}
                                </p>

                                {/* Progress ratios bar */}
                                <div>
                                  <div className="flex justify-between font-mono text-[8px] uppercase font-black mb-1">
                                    <span>Milestones checklist</span>
                                    <span>{completedMilestones}/{totalMilestones}</span>
                                  </div>
                                  <div className="w-full bg-primary/10 h-1.5 border border-primary">
                                    <div className="bg-[#e63b2e] h-full" style={{ width: `${ratio}%` }}></div>
                                  </div>
                                </div>

                                <div className="space-y-1.5 border-t border-[#1a1a1a]/10 pt-2">
                                  {app.milestones.map((m) => (
                                    <div 
                                      key={m.id}
                                      onClick={() => toggleMilestone(app.id, m.id)}
                                      className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono select-none hover:text-secondary"
                                    >
                                      {m.completed ? (
                                        <CheckSquare className="w-3 h-3 text-[#0055ff] shrink-0" />
                                      ) : (
                                        <Square className="w-3 h-3 text-primary shrink-0" />
                                      )}
                                      <span className={m.completed ? "line-through text-primary/40 uppercase" : "uppercase font-bold"}>
                                        {m.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Dynamic Milestone Adder Form */}
                                <div className="border-t border-[#1a1a1a]/10 pt-2">
                                  <input 
                                    type="text" 
                                    placeholder="+ ADD MILESTONE"
                                    className="w-full text-[8.5px] font-mono p-1 border border-primary uppercase font-extrabold focus:outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const inputVal = e.currentTarget.value;
                                        handleAddMilestone(app.id, inputVal);
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                  />
                                </div>

                                {/* Roster of recruited Roles tags list */}
                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {app.team.map((t, idx) => (
                                    <span key={idx} className="bg-primary/5 text-primary text-[8px] uppercase tracking-wide font-mono font-black border border-primary px-1">
                                      {t}
                                    </span>
                                  ))}
                                  
                                  <input 
                                    type="text" 
                                    placeholder="+ recruited specialist"
                                    className="w-16 text-[7.5px] font-mono py-0.5 border-none p-0 uppercase focus:outline-none flex-grow"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const inputVal = e.currentTarget.value;
                                        handleAddSpecialist(app.id, inputVal);
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                  />
                                </div>

                                {/* Action Buttons Stage shifts row */}
                                <div className="grid grid-cols-2 gap-1 border-t border-[#1a1a1a]/10 pt-2 mt-auto">
                                  
                                  {stage !== 'Idea / Backlog' && (
                                    <button 
                                      onClick={() => {
                                        const stages: TrackedApplication['stage'][] = ['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'];
                                        const currentIdx = stages.indexOf(stage);
                                        updateTrackedStage(app.id, stages[currentIdx - 1]);
                                      }}
                                      className="border border-primary text-[8px] font-mono uppercase bg-white hover:bg-primary-container p-1 text-center font-bold"
                                    >
                                      ← Back
                                    </button>
                                  )}

                                  {stage !== 'Accepted / Win' && (
                                    <button 
                                      onClick={() => {
                                        const stages: TrackedApplication['stage'][] = ['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'];
                                        const currentIdx = stages.indexOf(stage);
                                        updateTrackedStage(app.id, stages[currentIdx + 1]);
                                      }}
                                      className="border border-primary text-[8px] font-mono uppercase bg-[#1a1a1a] text-white hover:bg-secondary p-1 text-center font-extrabold col-start-2"
                                    >
                                      Next →
                                    </button>
                                  )}

                                </div>

                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>

            </div>

          </div>
        )}

        {/* 
          ========================================================================
          TAB 3: AI IDEA VALIDATOR INTERACTIVE CONSOLE
          ========================================================================
        */}
        {activeTab === 'validator' && (
          <div className="max-w-[1440px] mx-auto px-6 py-12 animate-fadeIn">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-4 border-primary pb-6 mb-10 gap-4">
              <div>
                <span className="font-mono text-xs bg-secondary text-white py-1 px-3 uppercase font-bold tracking-widest flex items-center gap-2 w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                  WEIMAR AI NEURAL ENGINE
                </span>
                <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter mt-2">
                  AI IDEA VALIDATOR
                </h2>
              </div>
            </div>
            <div className="bg-white border-4 border-primary p-10 md:p-16 shadow-[6px_6px_0px_0px_#1a1a1a] text-center max-w-xl mx-auto">
              <Sparkles className="w-12 h-12 mx-auto text-[#0055ff] mb-4" strokeWidth={2.5} />
              <h3 className="font-headline font-black text-3xl uppercase tracking-tight mb-3">
                Coming soon
              </h3>
              <p className="font-mono text-xs uppercase font-bold text-zinc-500">
                AI idea validation is on the way. Check back soon.
              </p>
            </div>
          </div>
        )}

        {/*
          ========================================================================
          TAB 4: HIGH-FIDELITY AUTOMATION REPLICA AUTHENTICATOR
          ========================================================================
        */}
        {activeTab === 'auth' && (
          <div className="bg-[#f5f0e8] py-16 px-4 md:px-8 flex items-center justify-center min-h-[75vh] animate-fadeIn">
            <div className="bg-white border-4 border-[#1a1a1a] rounded-[12px] p-8 md:p-12 shadow-[0px_8px_0px_0px_#0055ff] max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative">
              
              {/* Back button link */}
              <button 
                onClick={() => {
                  navigateTo('/');
                  setPendingTab(null);
                }}
                className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-1.5 font-headline font-black text-xs uppercase tracking-wider text-primary hover:text-[#e63b2e] group transition-colors cursor-pointer"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                RETURN TO BASE
              </button>

              {/* Left Column: Visual Brand Identity */}
              <div className="md:col-span-6 flex flex-col justify-between pt-10 gap-8">
                <div className="space-y-6">
                  {/* Yellow logo element */}
                  <div className="w-16 h-16 bg-[#ffcc00] border-3 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#1a1a1a] select-none">
                    <span className="font-headline font-black text-2xl text-primary">HF</span>
                  </div>

                  <div>
                    <h2 className="font-headline font-black text-5xl md:text-[68px] leading-[0.85] tracking-tighter text-[#1a1a1a] uppercase select-none">
                      HACKATHON
                    </h2>
                    <h3 className="font-headline font-black text-5xl md:text-[68px] leading-[0.85] tracking-tighter text-[#e63b2e] uppercase select-none">
                      FEED
                    </h3>
                  </div>

                  <p className="font-headline font-black text-sm uppercase text-primary leading-tight max-w-sm select-none">
                    FORM FOLLOWS FUNCTION. CODE FOLLOWS LOGIC. JOIN THE COLLECTIVE.
                  </p>
                </div>

                {/* Cyberpunk circuit wire / terminal diagram representation */}
                <div className="bg-[#1a1a1a] p-4 border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_#ffcc00] font-mono text-[10px] text-zinc-400 select-none overflow-hidden h-40 relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e63b2e] block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                      <span className="ml-1 text-zinc-500">FEED_STREAM://ACTIVE_PROT</span>
                    </div>
                    <p className="text-[#ffcc00] font-bold">» SYS.INIT: PROTOCOL_GATE_V3_5</p>
                    <p className="opacity-75">» CONSTRUCTING WEIMAR_BUILD_ENGINE_v42.TS...</p>
                    <p className="opacity-50">» ESTABLISHING PERSISTENT CLOUD SECURITY CODES...</p>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600 font-extrabold text-[9px]">
                    <span>SECURE CONSOLE</span>
                    <span>v3.5 // AUTHWAY</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Form UI */}
              <div className="md:col-span-6 flex flex-col justify-center pt-10 md:pt-14 pb-4">
                
                {/* Toggles */}
                <div className="flex items-center gap-6 mb-8 font-headline">
                  <button 
                    type="button"
                    onClick={() => { navigateTo('/login'); setAuthError(null); }}
                    className={`text-sm tracking-wider uppercase font-black transition-colors pb-1 cursor-pointer ${
                      authMode === 'login' 
                        ? 'text-primary border-b-4 border-primary' 
                        : 'text-primary/40 hover:text-primary'
                    }`}
                  >
                    LOGIN
                  </button>
                  <span className="text-primary/30 text-xl font-thin select-none">|</span>
                  <button 
                    type="button"
                    onClick={() => { navigateTo('/signup'); setAuthError(null); }}
                    className={`text-sm tracking-wider uppercase font-black transition-colors pb-1 cursor-pointer ${
                      authMode === 'register' 
                        ? 'text-primary border-b-4 border-[#ffcc00]' 
                        : 'text-primary/40 hover:text-primary'
                    }`}
                  >
                    CREATE ACCOUNT
                  </button>
                </div>

                <form onSubmit={handleAuthenticate} className="space-y-6">

                  {authError && (
                    <div className="bg-[#e63b2e]/10 border-2 border-[#e63b2e] p-3 font-mono text-[10px] font-bold text-[#e63b2e] uppercase">
                      {authError}
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div>
                      <label className="block font-mono text-[11px] uppercase font-bold text-primary mb-2 select-none tracking-wider">
                        DISPLAY NAME
                      </label>
                      <input 
                        type="text" 
                        required
                        minLength={2}
                        placeholder="JOHN DOE"
                        className="w-full bg-white p-3 border-2 border-primary font-bold placeholder:text-primary/20 text-[#1a1a1a] uppercase text-xs focus:ring-0 focus:outline-none"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Identification */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase font-bold text-primary mb-2 select-none tracking-wider">
                      EMAIL IDENTIFICATION
                    </label>
                    <input 
                      type="email" 
                      required
                      placeholder="SYS.ADMIN@HACKATHON.DEV"
                      className="w-full bg-white p-3 border-2 border-primary font-bold placeholder:text-primary/20 text-[#1a1a1a] uppercase text-xs focus:ring-0 focus:outline-none"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-mono text-[11px] uppercase font-bold text-primary select-none tracking-wider">
                        SECURITY PROTOCOL
                      </label>
                      <button 
                        type="button"
                        onClick={() => setApiError('Verification key recovery signal dispatched to neural index.')}
                        className="font-mono text-[10px] uppercase text-primary/60 hover:text-primary underline cursor-pointer"
                      >
                        FORGOT PROTOCOL?
                      </button>
                    </div>
                    <input 
                      type="password" 
                      required
                      placeholder="•••••••••••••"
                      className="w-full bg-white p-3 border-2 border-primary font-mono text-[#1a1a1a] text-xs focus:ring-0 focus:outline-none"
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                    />
                  </div>

                  {/* Main Yellow Block Submit Button */}
                  <button 
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-[#ffcc00] border-3 border-black p-4 uppercase font-headline font-black text-sm tracking-tight flex items-center justify-between shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ffcc00] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 text-left"
                  >
                    {isAuthenticating ? 'AUTHENTICATING...' : authMode === 'login' ? 'AUTHENTICATE' : 'GENERATE CREDENTIALS'}
                    <span className="font-sans text-xl font-bold">→</span>
                  </button>

                </form>

                <p className="mt-6 font-mono text-[10px] uppercase text-primary/50 text-center">
                  Backend: {backendOnline === null ? 'checking...' : backendOnline ? 'connected' : 'offline — check hackathonfeed-api.onrender.com'}
                </p>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* 
        ========================================================
        Footer: Brutalist black and white footer
        ========================================================
      */}
      <footer id="footer-brutalist" className="bg-[#1a1a1a] text-white border-t-4 border-primary">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-10 gap-6 max-w-[1440px] mx-auto">
          <div className="font-headline text-xl font-black text-background">
            HACKATHONFEED
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 font-body text-xs font-bold uppercase">
            <span className="text-background/80 hover:text-[#ffcc00] transition-colors cursor-pointer">Privacy policy</span>
            <span className="text-background/80 hover:text-[#ffcc00] transition-colors cursor-pointer">Terms of use</span>
            <span className="text-background/80 hover:text-[#ffcc00] transition-colors cursor-pointer flex items-center gap-1">
              Github repository
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
            <span className="text-background/80 hover:text-[#ffcc00] transition-colors cursor-pointer">Discord server</span>
          </div>

          <div className="text-background/40 font-body text-[10px] font-bold uppercase text-center md:text-right">
            © 2026 HACKATHONFEED. ALL RIGHTS RESERVED. FORM FOLLOWS PLURALITY.
          </div>
        </div>
      </footer>

    </div>
    {hackathonDetailModal}
    <AiComingSoonModal
      open={isAiComingSoonOpen}
      onClose={() => setIsAiComingSoonOpen(false)}
    />
    </>
  );
}
