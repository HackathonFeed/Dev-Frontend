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
  Globe,
  Trophy,
  Settings,
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
import { ThemeToggle } from './components/ThemeToggle';
import { DashboardLeaderboard } from './components/DashboardLeaderboard';
import { SavedHackathonsPanel } from './components/SavedHackathonsPanel';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ProfilePhotoSettings } from './components/ProfilePhotoSettings';
import { useTheme } from './context/ThemeContext';

function parsePublicProfileUsername(): string | null {
  const match = window.location.pathname.match(/^\/u\/([a-zA-Z0-9_-]{3,30})\/?$/);
  return match?.[1]?.toLowerCase() ?? null;
}

export default function App() {
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, refreshUser } = useAuth();
  const { isDark, setTheme } = useTheme();

  // --- Core Routing/Tab state ---
  const [activeTab, setActiveTab] = useState<'landing' | 'explore' | 'tracker' | 'validator' | 'auth'>('landing');

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingTab, setPendingTab] = useState<'tracker' | 'explore' | 'validator' | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'hackathons' | 'projects' | 'team' | 'settings' | 'profile'>('dashboard');

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

  // Router and redirection helper functions
  const handleTrackerAccess = () => {
    if (!isAuthenticated) {
      setPendingTab('tracker');
      setActiveTab('auth');
    } else {
      setDashboardTab('projects');
    }
  };

  const handleSaveProfile = async (data: { name: string; interests: string[]; username?: string }) => {
    const updated = await updateProfile(data);
    await refreshUser();
    return updated;
  };

  useEffect(() => {
    checkHealth().then(setBackendOnline);
  }, []);

  useEffect(() => {
    const syncPublicProfileRoute = () => {
      setPublicProfileUsername(parsePublicProfileUsername());
    };
    window.addEventListener('popstate', syncPublicProfileRoute);
    return () => window.removeEventListener('popstate', syncPublicProfileRoute);
  }, []);

  const goHomeFromPublicProfile = useCallback(() => {
    window.history.pushState({}, '', '/');
    setPublicProfileUsername(null);
  }, []);

  const goToProfile = useCallback(() => {
    if (!user?.username) return;
    window.history.pushState({}, '', `/u/${user.username}`);
    setPublicProfileUsername(user.username);
  }, [user?.username]);

  const backToWorkspace = useCallback(() => {
    window.history.pushState({}, '', '/');
    setPublicProfileUsername(null);
  }, []);

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
    setActiveTab('auth');
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
        setDashboardTab('projects');
        setPendingRegisterHack(null);
      } else if (pendingTab === 'explore') {
        setDashboardTab('hackathons');
      } else {
        setDashboardTab('dashboard');
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
    setActiveTab('landing');
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

  const handleHackathonRegister = async (hackOrTitle: string | {
    title: string;
    id?: string;
    prizePool?: string;
    deadline?: string;
    url?: string;
  }) => {
    const fromList = typeof hackOrTitle === 'string'
      ? hackathons.find((h) => h.title === hackOrTitle)
      : hackathons.find((h) => h.id === hackOrTitle.id || h.title === hackOrTitle.title);

    const title = typeof hackOrTitle === 'string' ? hackOrTitle : hackOrTitle.title;
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
        setDashboardTab('projects');
      } else {
        setPendingRegisterHack(payload);
        setPendingTab('tracker');
        setActiveTab('auth');
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
      setActiveTab('auth');
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
  const [isValidatorModalOpen, setIsValidatorModalOpen] = useState(false);

  useEffect(() => {
    if (dashboardTab === 'team') {
      setIsValidatorModalOpen(true);
    }
  }, [dashboardTab]);

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
    hack: {
      title: string;
      id?: string;
      prizePool?: string;
      deadline?: string;
      url?: string;
    },
    className: string,
    label: React.ReactNode = 'REGISTER',
  ) => {
    const loadingKey = hack.id ?? hack.title;
    const isLoading = registerLoading === loadingKey;
    const isRegistered = isHackathonRegistered(trackedApps, hack);

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRegistered) return;
          void handleHackathonRegister(hack);
        }}
        disabled={isLoading || isRegistered}
        title={isRegistered ? 'You are registered for this hackathon' : undefined}
        className={`${className}${
          isRegistered
            ? ' !bg-[#16a34a] !text-white hover:!bg-[#16a34a] hover:!text-white cursor-default'
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
      onValidate={(title) => {
        setValHackathon(title);
        if (isAuthenticated) {
          setIsValidatorModalOpen(true);
        } else {
          setActiveTab('validator');
        }
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
        onBackToWorkspace={isAuthenticated ? backToWorkspace : undefined}
        onOpenPrivateSettings={
          isAuthenticated
            ? () => {
                backToWorkspace();
                setDashboardTab('settings');
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
                DEVFORGE
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
                onClick={() => setDashboardTab('dashboard')}
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
                onClick={() => setDashboardTab('hackathons')}
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
                onClick={() => setDashboardTab('projects')}
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
                onClick={() => setDashboardTab('team')}
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

              <button
                onClick={() => setDashboardTab('settings')}
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
            </nav>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => setIsValidatorModalOpen(true)}
              className="w-full bg-[#1a1a1a] text-white border-3 border-black py-4 px-4 font-headline font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black hover:translate-y-[-1px] transform duration-100 text-center cursor-pointer active:translate-y-[3px] active:shadow-none"
            >
              SUBMIT PROJECT
            </button>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-mono text-[9px] uppercase font-bold text-zinc-500">Appearance</span>
              <ThemeToggle size="sm" showLabel />
            </div>

            <button 
              onClick={handleLogout}
              className="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] uppercase font-bold text-zinc-500 hover:text-[#e63b2e] transition-colors cursor-pointer w-full py-2 border-2 border-transparent hover:border-black hover:bg-white"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
              TERMINATE SESSION
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
                    ACTIVE FORGES ({filteredHackathons.length})
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
          {dashboardTab === 'team' && !isValidatorModalOpen && (
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

              <div className="bg-white border-4 border-black p-10 shadow-[6px_6px_0px_0px_#0055ff] text-center max-w-xl mx-auto">
                <Sparkles className="w-12 h-12 mx-auto text-[#0055ff] mb-4" strokeWidth={2.5} />
                <p className="font-mono text-xs uppercase font-bold text-zinc-500 mb-6">
                  Validate your project pitch before you build or submit.
                </p>
                <button
                  type="button"
                  onClick={() => setIsValidatorModalOpen(true)}
                  className="bg-black text-white font-headline font-black text-sm uppercase px-8 py-4 border-2 border-black shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black cursor-pointer"
                >
                  Launch AI Validator
                </button>
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
                  Tweak live database simulators, credential values and session states.
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

                {/* Block 1 */}
                <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4">
                  <h3 className="font-headline font-black text-lg uppercase text-[#0055ff] border-b border-zinc-100 pb-2">Profile & Credentials</h3>
                  
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-zinc-600">IDENTIFICATION PROTOCOL: <span className="font-bold text-[#1a1a1a]">{user?.email ?? '—'}</span></p>
                    <p className="text-zinc-600">BACKEND STATUS: <span className={`font-bold ${backendOnline ? 'text-emerald-600' : 'text-[#e63b2e]'}`}>{backendOnline === null ? 'CHECKING...' : backendOnline ? 'CONNECTED' : 'OFFLINE'}</span></p>
                    <p className="text-zinc-600">SECURITY INDEX: <span className="font-bold text-[#1a1a1a]">LEVEL 3 ACTIVE CLIENT</span></p>
                    <p className="text-zinc-600">NEURAL ENGINE INTEGRATION: <span className="font-medium text-emerald-600 font-bold">GOOGLE_GEMINI://V3.5_OK</span></p>
                    <p className="text-zinc-600">LOCATION ACCESS: <span className="font-bold text-[#1a1a1a]">GLOBAL SECURE REMOTE INGRESS</span></p>
                  </div>
                </div>

                <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4">
                  <h3 className="font-headline font-black text-lg uppercase text-[#e63b2e] border-b border-zinc-100 pb-2">Appearance</h3>
                  
                  <div className="space-y-4 font-mono text-[11px] uppercase font-bold text-zinc-600">
                    <p className="normal-case text-zinc-500 text-xs leading-relaxed">
                      Switch between light and dark brutalist themes. Your choice is saved on this device.
                    </p>
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <span>Current: <span className="text-[#1a1a1a]">{isDark ? 'Dark' : 'Light'}</span></span>
                      <ThemeToggle size="md" showLabel />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-2 border-2 border-black font-headline font-black text-[10px] uppercase cursor-pointer ${
                          !isDark ? 'bg-[#ffcc00] text-black' : 'bg-transparent text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-2 border-2 border-black font-headline font-black text-[10px] uppercase cursor-pointer ${
                          isDark ? 'bg-[#ffcc00] text-black' : 'bg-transparent text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

                {/* Block 2 — simulator options */}
                <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4">
                  <h3 className="font-headline font-black text-lg uppercase text-[#e63b2e] border-b border-zinc-100 pb-2">Simulator Options</h3>
                  
                  <div className="space-y-4 font-mono text-[11px] uppercase font-bold text-zinc-600">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-[#0055ff] focus:ring-0 focus:outline-none border-2 border-black w-4 h-4" />
                      <span>Simulate real-time WebSocket ping state (12ms)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-[#0055ff] focus:ring-0 focus:outline-none border-2 border-black w-4 h-4" />
                      <span>Persist project trackers into Local Storage</span>
                    </label>
                  </div>
                </div>

              </div>

              <SavedHackathonsPanel
                bookmarks={savedBookmarks}
                onRemove={toggleBookmark}
                onOpenHackathon={setSelectedHackathonId}
                onBrowseHackathons={() => setDashboardTab('hackathons')}
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

        {/* 
          ========================================================
          DYNAMIC AI IDEA CRITIQUE / VALIDATOR MODEL OVERLAY
          ========================================================
        */}
        {isValidatorModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
            <div className="bg-white border-4 border-black p-6 md:p-10 shadow-[6px_6px_0px_0px_#ffcc00] max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-[8px] flex flex-col gap-6 relative animate-scaleIn">
              
              <button 
                onClick={() => {
                  setIsValidatorModalOpen(false);
                  setValidationResult(null);
                }}
                className="absolute top-4 right-4 md:top-6 md:right-6 font-headline font-black text-xs uppercase px-3 py-1.5 border-2 border-black bg-[#eee9e0] hover:bg-[#e63b2e] hover:text-white cursor-pointer select-none transition-colors"
              >
                ✕ CANCEL PROTOCOL
              </button>

              <div className="border-b-4 border-black pb-4">
                <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-0.5 px-2.5 uppercase font-bold tracking-wider">
                  NEURAL ANALYSIS ENGINE V3.5
                </span>
                <h3 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter mt-1">
                  AI PROJECT IDEA CRITIQUE
                </h3>
              </div>

              {/* Pitch input details form */}
              <form onSubmit={handleValidateIdea} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-zinc-500 mb-1">Proposed Project Title *</label>
                    <input 
                      type="text" required
                      className="w-full bg-zinc-50 p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                      value={valTitle}
                      onChange={(e) => setValTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold text-zinc-500 mb-1">Target Event / Forge *</label>
                    <select 
                      className="w-full bg-zinc-50 p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                      value={valHackathon}
                      onChange={(e) => setValHackathon(e.target.value)}
                    >
                      {hackathons.map((h) => (
                        <option key={h.id} value={h.title}>{h.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-zinc-500 mb-1">Proposed Technologies (e.g. Solidity, React, Rust, @google/genai)</label>
                  <input 
                    type="text"
                    className="w-full bg-zinc-50 p-3 border-2 border-black font-extrabold text-xs uppercase focus:outline-none"
                    value={valStack}
                    onChange={(e) => setValStack(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-zinc-500 mb-1">Operational Concept Pitch (Raw & Direct)</label>
                  <textarea 
                    rows={3} required
                    className="w-full bg-zinc-50 p-3 border-2 border-black font-semibold text-xs uppercase focus:outline-none font-mono"
                    value={valPitch}
                    onChange={(e) => setValPitch(e.target.value)}
                    placeholder="Describe how your project satisfies Weimar design purity and core gas routing elements..."
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dashed border-zinc-200">
                  <p className="font-mono text-[10px] uppercase text-zinc-400 font-bold">Powered by Gemini AI Direct Proxy</p>
                  <button 
                    type="submit"
                    disabled={isValidating}
                    className="bg-[#ffcc00] border-3 border-black font-headline font-black text-xs uppercase tracking-wider py-3.5 px-8 hover:bg-[#1a1a1a] hover:text-[#ffcc00] cursor-pointer disabled:opacity-55 shadow-[3px_3px_0px_0px_#e63b2e]"
                  >
                    {isValidating ? 'RECRUITING CRITIQUE...' : 'SUMMON JURY REPORT'}
                  </button>
                </div>
              </form>

              {/* Dynamic Loading Overlay representation */}
              {isValidating && (
                <div className="bg-[#eee9e0] border-3 border-black p-6 text-center space-y-4 animate-pulse rounded-[4px]">
                  <div className="w-12 h-12 rounded-full border-4 border-black border-t-[#ffcc00] animate-spin mx-auto"></div>
                  <p className="font-mono text-xs uppercase font-extrabold text-[#1a1a1a]">
                    {VALIDATION_TAGLINES[activeTaglineIndex]}
                  </p>
                </div>
              )}

              {/* Report Showcase from AI */}
              {validationResult && !isValidating && (
                <div className="bg-[#eee9e0] border-3 border-black p-6 rounded-[4px] space-y-6 animate-scaleIn">
                  <div className="border-b-2 border-black pb-2">
                    <h4 className="font-headline font-black text-xl text-[#e63b2e] uppercase">Jury Critique Log Report</h4>
                  </div>

                  {/* Neobrutalist gauges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border-2 border-black p-3.5 text-center shadow-[2px_2px_0px_0px_#101010]">
                      <span className="font-mono text-[9px] uppercase font-bold text-zinc-400">FEASIBILITY INDEX</span>
                      <p className="font-headline font-black text-3xl text-[#0055ff]">{validationResult.feasibilityScore}%</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3.5 text-center shadow-[2px_2px_0px_0px_#101010]">
                      <span className="font-mono text-[9px] uppercase font-bold text-zinc-400">ORIGINALITY INDEX</span>
                      <p className="font-headline font-black text-3xl text-[#e63b2e]">{validationResult.originalityScore}%</p>
                    </div>
                    <div className="bg-white border-2 border-black p-3.5 text-center shadow-[2px_2px_0px_0px_#101010]">
                      <span className="font-mono text-[9px] uppercase font-bold text-zinc-400">BRUTALIST PURITY</span>
                      <p className="font-headline font-black text-3xl text-emerald-600">{validationResult.brutalistDirectness}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-headline font-black text-sm uppercase text-[#1a1a1a]">EXECUTIVE VERDICT</h5>
                    <p className="font-mono text-xs uppercase font-bold text-[#e63b2e] bg-white border border-black p-3 leading-snug">{validationResult.verdictSummary}</p>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <h5 className="font-headline font-black text-sm uppercase text-[#1a1a1a] font-sans">CRITICAL CRITIQUE LOG</h5>
                    <div className="bg-white border border-black p-4 leading-relaxed uppercase font-bold text-[#1a1a1a]/85 max-h-48 overflow-y-auto">
                      <Markdown>{validationResult.critique}</Markdown>
                    </div>
                  </div>

                  {/* Upgrades or Teammates list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-white border border-black p-4 space-y-2 rounded-[2px]">
                      <span className="font-headline font-black text-xs uppercase font-sans text-secondary block">KEY STRENGTHS</span>
                      {validationResult.keyStrengths.map((str, idx) => (
                        <p key={idx} className="uppercase font-bold text-emerald-600">✓ {str}</p>
                      ))}
                    </div>
                    <div className="bg-white border border-black p-4 space-y-2 rounded-[2px]">
                      <span className="font-headline font-black text-xs uppercase font-sans text-[#e63b2e] block">REQUIRED REFACTORS</span>
                      {validationResult.requiredUpgrades.map((upg, idx) => (
                        <p key={idx} className="uppercase font-bold text-[#e63b2e]">⚠ {upg}</p>
                      ))}
                    </div>
                  </div>

                  {/* Proposed aesthetic pairing */}
                  <div className="bg-[#1a1a1a] text-[#ffcc00] p-4 font-mono text-xs uppercase">
                    <span className="text-zinc-400 block text-[9px] font-bold">CRAFT LAYOUT THEME DIRECTION:</span>
                    <p className="font-bold pt-1">{validationResult.visualThemeProposal}</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={async () => {
                        const hack = hackathons.find((h) => h.title === valHackathon);
                        await exportValidatedProject({
                          title: valTitle.trim(),
                          hackathonName: valHackathon,
                          hackathonId: hack?.id,
                          prizePool: hack?.prizePool ?? '—',
                          deadline: hack?.deadline ?? '',
                          concept: valPitch.trim(),
                          validationSummary: validationResult.verdictSummary,
                        });
                        setIsValidatorModalOpen(false);
                        setValidationResult(null);
                        setDashboardTab('projects');
                      }}
                      className="bg-emerald-500 text-white font-headline font-black text-xs uppercase border-2 border-black py-2.5 px-6 shadow-[2px_2px_0px_0px_#101010] hover:bg-black transition-all cursor-pointer"
                    >
                      LINK ANALYSIS TO WORKFLOW PIPELINES
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

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
      <nav id="navbar-brutalist" className="bg-white w-full sticky top-0 z-50 border-b-4 border-primary shadow-[0px_4px_0px_0px_#1a1a1a]">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            {/* Visual Red Block representing structural element */}
            <span className="w-8 h-8 bg-secondary border-3 border-[#1a1a1a] hidden sm:block"></span>
            
            <button 
              onClick={() => { setActiveTab('landing'); clearHackathonFilters(); }}
              className="text-3xl font-black text-[#1a1a1a] uppercase tracking-tighter font-headline hover:text-secondary transition-colors cursor-pointer text-left"
            >
              HACKATHON FEED
            </button>
          </div>

          {/* Clean minimalist design layout matches the initial mockup screenshot */}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <ThemeToggle size="sm" />
              <div className="hidden sm:block font-mono text-[11px] text-[#1a1a1a] bg-[#eee9e0] border-2 border-[#1a1a1a] px-3 py-1.5 font-bold uppercase tracking-wider">
                ACTIVE_SYS: <span className="text-secondary">{user?.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-[#e63b2e] text-white font-headline font-black text-xs uppercase px-4 py-2 border-2 border-black hover:bg-black transition-all cursor-pointer"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggle size="sm" />
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="bg-white text-[#1a1a1a] font-headline font-black text-xs uppercase px-4 py-2 border-2 border-black hover:bg-[#ffcc00] transition-all cursor-pointer"
              >
                LOG IN
              </button>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="bg-[#1a1a1a] text-white font-headline font-black text-sm uppercase px-5 py-2.5 border-3 border-black shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black transition-all cursor-pointer"
              >
                SIGN UP
              </button>
            </div>
          )}
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
                      setActiveTab('explore');
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
                  onClick={() => setActiveTab('explore')}
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
                  onClick={() => setActiveTab('validator')}
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
                    onClick={() => setActiveTab('explore')}
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
                    onClick={() => setActiveTab('validator')}
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
                    onClick={() => setActiveTab('explore')}
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
                            setActiveTab('validator');
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
                            setActiveTab('validator');
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
                  onClick={() => setActiveTab('validator')}
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
        {activeTab === 'explore' && (
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
                      onClick={() => { setActiveTab('validator'); }}
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
                {(hackathonFilters.theme || hackathonFilters.domain || hackathonFilters.platform) && (
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
                              setActiveTab('validator');
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
          <div className="max-w-[1440px] mx-auto px-6 py-12">
            
            {/* Header banner */}
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
              <p className="font-mono text-xs uppercase text-[#1a1a1a]/60 max-w-md font-bold">
                Run your hackathon draft concept through our elite jurors. Get scores, checklists, teammate rosters, and architectural critique.
              </p>
            </div>

            {/* Split layout: Input Panel on Left, Result Workspace on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form Input Deck (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                <div className="bg-white border-4 border-primary p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-5">
                  
                  <div className="flex justify-between items-center pb-2 border-b-2 border-primary">
                    <span className="font-headline font-black uppercase text-base text-secondary flex items-center gap-1.5">
                      <Layers className="w-5 h-5 text-[#0055ff]" />
                      Composition Deck
                    </span>
                    <span className="font-mono text-[9px] bg-primary text-background px-2 font-bold py-0.5">GEMINI FLASH V3.5</span>
                  </div>

                  <form onSubmit={handleValidateIdea} className="space-y-4">
                    
                    <div>
                      <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">
                        1. Proposed App Project Title *
                      </label>
                      <input 
                        type="text" required
                        className="w-full bg-surface-container p-3 border-2 border-primary tracking-wide focus:outline-none uppercase text-xs font-mono font-black"
                        placeholder="e.g. AGI Sovereign Middleware"
                        value={valTitle}
                        onChange={(e) => setValTitle(e.target.value)}
                        disabled={isValidating}
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">
                        2. Target Hackathon Forge *
                      </label>
                      <select 
                        className="w-full bg-surface-container p-3 border-2 border-primary text-xs uppercase font-extrabold focus:outline-none"
                        value={valHackathon}
                        onChange={(e) => setValHackathon(e.target.value)}
                        disabled={isValidating}
                      >
                        {hackathons.map((h) => (
                          <option key={h.id} value={h.title}>
                            {h.title}
                          </option>
                        ))}
                        <option value="Any global hackathon">Other Global Forge (Indie)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">
                        3. Intended Technology Stack
                      </label>
                      <input 
                        type="text"
                        className="w-full bg-surface-container p-3 border-2 border-primary tracking-wide focus:outline-none uppercase text-xs font-mono font-bold"
                        placeholder="e.g. solidity, react, python, webrtc"
                        value={valStack}
                        onChange={(e) => setValStack(e.target.value)}
                        disabled={isValidating}
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">
                        4. Concept & Innovation Pitch *
                      </label>
                      <textarea 
                        rows={6} required
                        className="w-full bg-surface-container p-3 border-2 border-primary tracking-wide focus:outline-none text-xs font-mono text-primary font-bold uppercase"
                        placeholder="Detail the actual engineering flow. Speak conceptually about what you will build. Avoid flowery corporate jargon, solve the user problem directly..."
                        value={valPitch}
                        onChange={(e) => setValPitch(e.target.value)}
                        disabled={isValidating}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isValidating || !valTitle.trim() || !valPitch.trim()}
                      className="w-full flex items-center justify-center gap-3 bg-[#e63b2e] text-white py-4 font-headline uppercase font-black text-sm border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] tracking-wider hover:bg-black hover:text-white transition-all text-center cursor-pointer disabled:opacity-50"
                    >
                      {isValidating ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          ENGINES POWERING ON...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-[#ffcc00]" />
                          VALIDATE WITH NEURAL AJUROR
                        </>
                      )}
                    </button>

                  </form>

                </div>

                {/* Past brainstorming local history list card */}
                {pastValidations.length > 0 && (
                  <div className="bg-[#1a1a1a] text-white p-6 border-4 border-primary">
                    <div className="flex justify-between items-center pb-2 border-b-2 border-[#f5f0e8]/20 mb-4">
                      <span className="font-headline font-black uppercase text-sm text-[#ffcc00]">
                        Brainstorm Archives ({pastValidations.length})
                      </span>
                      <button 
                        onClick={clearEvaluationHistory}
                        className="text-[10px] font-mono text-secondary hover:text-white transition-colors cursor-pointer uppercase border border-secondary px-1"
                        title="Delete past history from explorer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {pastValidations.map((hist) => (
                        <div 
                          key={hist.id}
                          onClick={() => {
                            setValidationResult(hist.data);
                            setValTitle(hist.title);
                            setValPitch(hist.pitch);
                          }}
                          className="p-3 border-2 border-[#f5f0e8]/20 bg-[#1a1a1a] hover:bg-[#faf7f2]/10 cursor-pointer font-mono text-xs flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-center text-[10px] text-white/50 mb-1">
                            <span>#{hist.data.feasibilityScore}/10 Feasibility</span>
                            <span>{hist.date}</span>
                          </div>
                          <span className="font-headline font-extrabold text-[#ffcc00] uppercase truncate">
                            {hist.title}
                          </span>
                          <span className="text-[10px] text-white/60 uppercase line-clamp-1 truncate block">
                            {hist.pitch}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Outputs panel on Right (lg:col-span-7) */}
              <div className="lg:col-span-7">
                
                {/* 1. Loading active state screen */}
                {isValidating && (
                  <div className="bg-[#eee9e0] border-4 border-dashed border-primary/50 text-center py-24 px-6 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      {/* Stylized custom CSS spinner blocks */}
                      <div className="w-16 h-16 border-8 border-secondary border-t-primary-container animate-spin rounded-none"></div>
                      <span className="absolute top-5 left-5 text-xl font-bold select-none text-secondary">✦</span>
                    </div>

                    <div className="space-y-2">
                      <p className="font-headline text-2xl font-black uppercase text-primary tracking-wide">
                        Constructing Critical Verdict
                      </p>
                      
                      <div className="bg-primary text-background font-mono text-xs uppercase px-4 py-2 font-bold inline-block border-2 border-primary animate-pulse">
                        &quot; {VALIDATION_TAGLINES[activeTaglineIndex]} &quot;
                      </div>
                    </div>

                    <p className="font-mono text-[10px] uppercase text-[#1a1a1a]/60 max-w-sm">
                      Form following function. The Gemini Chief strategist model compiles your technologic stack constraints against real hackathon scoring schemas.
                    </p>
                  </div>
                )}

                {/* 2. Standard inactive blank placeholder */}
                {!isValidating && !validationResult && (
                  <div className="bg-background border-4 border-dashed border-primary/40 text-center py-24 px-6 flex flex-col items-center justify-center gap-4">
                    <span className="text-6xl text-secondary">✦</span>
                    <div>
                      <h4 className="font-headline text-2xl font-black uppercase text-primary">
                        No active validation feedback
                      </h4>
                      <p className="font-mono text-xs uppercase text-primary/60 mt-1 max-w-md mx-auto">
                        Your draft coordinates have not been sent yet. Click the &ldquo;Compile with Neural Ajuror&rdquo; button to analyze technical feasibility.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Output Result Active Dashboard card */}
                {validationResult && (
                  <div className="space-y-6">
                    
                    {/* Scores dashboard overview */}
                    <div className="bg-white border-4 border-primary p-6 shadow-[6px_6px_0px_0px_#1a1a1a]">
                      
                      <div className="flex justify-between items-center pb-2 border-b-2 border-[#1a1a1a] mb-6">
                        <span className="font-headline font-black text-xl uppercase text-secondary">
                          Jurist Board Analytics
                        </span>
                        <span className="font-mono text-xs uppercase font-extrabold bg-primary text-background px-2">
                          Evaluated
                        </span>
                      </div>

                      {/* Score metrics bar grids */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        
                        {/* Metric 1 */}
                        <div className="bg-surface-container-low border-2 border-primary p-4 flex flex-col justify-between items-center text-center">
                          <span className="font-mono text-[10px] uppercase font-bold text-primary/60">
                            Technical Feasibility
                          </span>
                          <span className="font-headline font-black text-5xl text-[#0055ff] my-2 select-none">
                            {validationResult.feasibilityScore}<span className="text-xl text-[#1a1a1a]">/10</span>
                          </span>
                          {/* Colored block bar representation representing Bauhaus visual */}
                          <div className="w-full bg-primary/10 h-2 border border-primary">
                            <div className="bg-[#0055ff] h-full" style={{ width: `${validationResult.feasibilityScore * 10}%` }}></div>
                          </div>
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-surface-container-low border-2 border-primary p-4 flex flex-col justify-between items-center text-center">
                          <span className="font-mono text-[10px] uppercase font-bold text-primary/60">
                            Originality Quotient
                          </span>
                          <span className="font-headline font-black text-5xl text-secondary my-2 select-none">
                            {validationResult.originalityScore}<span className="text-xl text-[#1a1a1a]">/10</span>
                          </span>
                          <div className="w-full bg-primary/10 h-2 border border-primary">
                            <div className="bg-secondary h-full" style={{ width: `${validationResult.originalityScore * 10}%` }}></div>
                          </div>
                        </div>

                        {/* Metric 3 */}
                        <div className="bg-surface-container-low border-2 border-primary p-4 flex flex-col justify-between items-center text-center">
                          <span className="font-mono text-[10px] uppercase font-bold text-primary/60">
                            Brutalist Directiveness
                          </span>
                          <span className="font-headline font-black text-5xl text-[#1a1a1a] my-2 select-none">
                            {validationResult.brutalistDirectness}<span className="text-xl text-[#1a1a1a]">/10</span>
                          </span>
                          <div className="w-full bg-primary/10 h-2 border border-primary">
                            <div className="bg-[#1a1a1a] h-full" style={{ width: `${validationResult.brutalistDirectness * 10}%` }}></div>
                          </div>
                        </div>

                      </div>

                      {/* Verdict banner */}
                      <div className="bg-[#ffcc00] border-2 border-primary p-4 font-mono font-bold text-xs uppercase mb-6 text-[#1a1a1a]">
                        <span className="font-extrabold text-secondary block mb-1">■ Core Verdict Tagline:</span>
                        &ldquo; {validationResult.verdictSummary} &rdquo;
                      </div>

                      {/* Checklist Upgrades to win */}
                      <div className="space-y-4">
                        <h4 className="font-headline font-black text-sm uppercase text-[#1a1a1a] flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-secondary" />
                          Required Upgrades to Take First Place:
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {validationResult.requiredUpgrades.map((upgrade, i) => (
                            <div key={i} className="bg-surface-container-lowest border-2 border-primary p-3 font-mono text-[11px] font-bold uppercase text-secondary">
                              <span className="text-primary font-black mr-1">{i + 1}.</span> {upgrade}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Master art critic critique panel */}
                    <div className="bg-white border-4 border-primary p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-4">
                      
                      <div className="flex justify-between items-center pb-2 border-b-2 border-primary">
                        <span className="font-headline font-black text-sm uppercase text-[#1a1a1a] flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-[#0055ff]" />
                          Weimar-Tech Architectural Review
                        </span>
                        <span className="font-mono text-[9px] uppercase font-bold text-secondary">Master Evaluation</span>
                      </div>

                      {/* Markdown rendered layout review */}
                      <div className="text-xs font-mono critic-content">
                        <Markdown>{validationResult.critique}</Markdown>
                      </div>

                    </div>

                    {/* Roster & Styling blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Teammates recommendation card */}
                      <div className="bg-white border-4 border-primary p-4 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-3">
                        <h4 className="font-headline font-black text-xs uppercase text-secondary flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#0055ff]" />
                          Recruit These Experts:
                        </h4>
                        
                        <ul className="space-y-2">
                          {validationResult.suggestedTeammates.map((teammate, i) => (
                            <li key={i} className="font-mono text-[10px] font-bold uppercase p-2 bg-surface-container-low border border-primary leading-tight">
                              <span className="text-secondary font-black block mb-0.5">■ Role {i+1}</span>
                              {teammate}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Styling Proposal */}
                      <div className="bg-primary text-white border-4 border-primary p-4 shadow-[4px_4px_0px_0px_#ffcc00] space-y-3">
                        <h4 className="font-headline font-black text-xs uppercase text-[#ffcc00] flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-white" />
                          Front-End Visual Motif:
                        </h4>
                        
                        <p className="font-mono text-[10px] text-white/90 leading-relaxed uppercase">
                          {validationResult.visualThemeProposal}
                        </p>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                          <button 
                            onClick={async () => {
                              const hack = hackathons.find((h) => h.title === valHackathon);
                              await exportValidatedProject({
                                title: valTitle.trim(),
                                hackathonName: valHackathon,
                                hackathonId: hack?.id,
                                prizePool: hack?.prizePool ?? '$100,000',
                                deadline: hack?.deadline ?? '',
                                concept: validationResult.verdictSummary,
                                validationSummary: validationResult.verdictSummary,
                                extraMilestones: validationResult.requiredUpgrades,
                                extraTeam: ['Lead Builder', 'Architect API proxy'],
                              });
                              setActiveTab('tracker');
                            }}
                            className="bg-white text-black text-[10px] font-headline font-black py-2 px-3 uppercase border-2 border-white hover:bg-secondary hover:text-white transition-all cursor-pointer inline-block"
                          >
                            Export project to Tracker
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>

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
                  setActiveTab('landing');
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
                    onClick={() => { setAuthMode('login'); setAuthError(null); }}
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
                    onClick={() => { setAuthMode('register'); setAuthError(null); }}
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
    </>
  );
}
