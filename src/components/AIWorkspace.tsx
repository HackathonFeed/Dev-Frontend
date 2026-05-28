import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  Github,
  Heart,
  Layers,
  Loader2,
  MessageSquare,
  PanelLeft,
  PenLine,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import Markdown from 'react-markdown';
import {
  validateIdea,
  listChatSessions,
  createChatSession,
  getChatSession,
  updateChatSession,
  deleteChatSession,
  sendSessionMessage,
  type AiHackathonContext,
  type ChatSession,
  type ChatSessionDetail,
  type ProjectSnippet,
} from '../api/ai';
import type { Bookmark as ApiBookmark } from '../api';
import type { TrackedApplication, ValidatorResponse } from '../types';
import type { User } from '../api/types';
import { VALIDATION_TAGLINES } from '../data';

// ── Types ─────────────────────────────────────────────────────────────────────

type AITab = 'copilot' | 'validator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  projects?: ProjectSnippet[] | null;
}

interface ValidationHistoryItem {
  id: string;
  title: string;
  date: string;
  pitch: string;
  data: ValidatorResponse;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'ai_workspace_history';

const WELCOME_NO_CONTEXT =
  "Hello! I'm your **Hackathon Build Copilot** — context-aware AI built to help you win.\n\n**To get personalized advice:** Select a hackathon from the dropdown above. I'll then know the theme, deadline, prize pool, and judging criteria, and every answer will be tailored to that event.\n\nOr ask me anything and I'll give you general hackathon strategy advice.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadHistory(): ValidationHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ValidationHistoryItem[]) : [];
  } catch { return []; }
}

function saveHistory(h: ValidationHistoryItem[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* quota */ }
}

function bookmarkToContext(b: ApiBookmark): AiHackathonContext | null {
  const h = b.hackathon;
  if (!h) return null;
  return {
    id: h.id,
    title: h.title,
    themes: h.categories ?? [],
    deadline: h.deadline,
    prize_pool: h.prize_pool,
    mode: h.mode,
    source_platform: h.source_platform,
    eligibility: h.eligibility ?? [],
    tags: h.tags ?? [],
  };
}

/** Group sessions into buckets for the sidebar. */
function groupSessions(sessions: ChatSession[]) {
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 7 * 86_400_000;

  const buckets: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 days': [],
    Older: [],
  };

  for (const s of sessions) {
    const t = new Date(s.updated_at).getTime();
    if (t >= todayStart) buckets['Today'].push(s);
    else if (t >= yesterdayStart) buckets['Yesterday'].push(s);
    else if (t >= weekStart) buckets['Last 7 days'].push(s);
    else buckets['Older'].push(s);
  }
  return buckets;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AIWorkspaceProps {
  savedBookmarks: ApiBookmark[];
  trackedApps: TrackedApplication[];
  user: User | null;
}

// ── Root Component ─────────────────────────────────────────────────────────────

export function AIWorkspace({ savedBookmarks, trackedApps, user }: AIWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AITab>('copilot');

  const bookmarkOptions = savedBookmarks
    .filter((b) => b.hackathon != null)
    .map((b) => ({ label: b.hackathon!.title, context: bookmarkToContext(b)!, source: 'bookmark' as const }));

  const bookmarkTitles = new Set(bookmarkOptions.map((o) => o.label));
  const trackedOptions = trackedApps
    .filter((a) => a.hackathonName && !bookmarkTitles.has(a.hackathonName))
    .reduce<{ label: string; context: AiHackathonContext; source: 'tracked' }[]>((acc, a) => {
      if (!acc.find((o) => o.label === a.hackathonName)) {
        acc.push({
          label: a.hackathonName,
          context: {
            id: a.hackathonId ?? null,
            title: a.hackathonName,
            themes: [],
            deadline: a.deadline || null,
            prize_pool: a.prizePool || null,
            mode: null,
            source_platform: null,
            eligibility: [],
            tags: [],
          },
          source: 'tracked',
        });
      }
      return acc;
    }, []);
  const allOptions = [...bookmarkOptions, ...trackedOptions];

  return (
    <div className="flex h-full min-h-0 w-full flex-col animate-fadeIn">
      {/* Tab switcher */}
      <div className="mb-2 flex w-fit shrink-0 gap-0 border-3 border-black shadow-[3px_3px_0px_0px_#1a1a1a]">
        <button
          type="button"
          onClick={() => setActiveTab('copilot')}
          className={`px-5 py-3 font-headline font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'copilot'
              ? 'bg-[#0055ff] text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border-r-2 border-black'
          }`}
        >
          <Bot className="w-3.5 h-3.5" strokeWidth={2.5} />
          COPILOT CHAT
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('validator')}
          className={`px-5 py-3 font-headline font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'validator'
              ? 'bg-[#ffcc00] text-[#1a1a1a]'
              : 'bg-white text-zinc-600 hover:bg-zinc-100 border-l-2 border-black'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
          IDEA VALIDATOR
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === 'copilot' && (
          <CopilotChatTab allOptions={allOptions} user={user} />
        )}
        {activeTab === 'validator' && (
          <IdeaValidatorComingSoon />
        )}
      </div>
    </div>
  );
}

function IdeaValidatorComingSoon() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#1a1a1a]">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center border-3 border-black bg-[#ffcc00] shadow-[4px_4px_0px_0px_#1a1a1a]">
          <Sparkles className="h-8 w-8 text-[#1a1a1a]" strokeWidth={3} />
        </div>
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#0055ff]">
          Idea Validator
        </p>
        <h2 className="mt-2 font-headline text-4xl font-black uppercase tracking-tight text-[#1a1a1a]">
          Coming Soon
        </h2>
        <p className="mt-3 font-mono text-xs font-bold uppercase leading-6 text-zinc-500">
          We are building a sharper validator for scoring ideas, risks, pitch angles, and winning potential.
        </p>
      </div>
    </div>
  );
}

// ── Shared dropdown type ──────────────────────────────────────────────────────

interface HackathonOption {
  label: string;
  context: AiHackathonContext;
  source: 'bookmark' | 'tracked';
}

// ── COPILOT CHAT TAB ──────────────────────────────────────────────────────────

function CopilotChatTab({ allOptions, user }: { allOptions: HackathonOption[]; user: User | null }) {
  // Sessions list state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Active session
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Messages (local — populated from DB or optimistic update)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hackathonContext, setHackathonContext] = useState<AiHackathonContext | null>(null);

  // Input / UI
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Load sessions on mount ────────────────────────────────────────────────

  useEffect(() => { void fetchSessions(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 104)}px`;
  }, [inputValue]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const list = await listChatSessions();
      setSessions(list);
    } catch {
      // Not critical — user might not be logged in
    } finally {
      setSessionsLoading(false);
    }
  };

  // ── Session management ────────────────────────────────────────────────────

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setHackathonContext(null);
    setInputValue('');
    setError(null);
    inputRef.current?.focus();
  };

  const openSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    setSessionLoading(true);
    setError(null);
    try {
      const detail: ChatSessionDetail = await getChatSession(sessionId);
      setCurrentSessionId(detail.id);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
        })),
      );
      setHackathonContext(detail.hackathon_context ?? null);
    } catch {
      setError('Failed to load session.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm !== sessionId) {
      setDeleteConfirm(sessionId);
      setTimeout(() => setDeleteConfirm((prev) => (prev === sessionId ? null : prev)), 3000);
      return;
    }
    setDeleteConfirm(null);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) startNewChat();
    try {
      await deleteChatSession(sessionId);
    } catch {
      void fetchSessions(); // re-sync on error
    }
  };

  const startRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(s.id);
    setRenameValue(s.title);
    setTimeout(() => renameRef.current?.select(), 50);
  };

  const commitRename = async (sessionId: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s)),
    );
    try {
      await updateChatSession(sessionId, { title: trimmed });
    } catch {
      void fetchSessions();
    }
  };

  // ── Hackathon context ─────────────────────────────────────────────────────

  const selectHackathon = async (ctx: AiHackathonContext) => {
    setSelectorOpen(false);
    if (hackathonContext?.title === ctx.title) return;
    setHackathonContext(ctx);
    if (currentSessionId) {
      try {
        await updateChatSession(currentSessionId, { hackathon_context: ctx });
      } catch { /* non-critical */ }
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      let sessionId = currentSessionId;

      // Lazy-create session on first message
      if (!sessionId) {
        try {
          const newSession = await createChatSession({ hackathon_context: hackathonContext });
          sessionId = newSession.id;
          setCurrentSessionId(newSession.id);
          // Add to top of session list
          setSessions((prev) => [
            {
              id: newSession.id,
              title: newSession.title,
              hackathon_title: (newSession.hackathon_context as AiHackathonContext | null)?.title ?? null,
              created_at: newSession.created_at,
              updated_at: newSession.updated_at,
            },
            ...prev,
          ]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create session.');
          return;
        }
      }

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      try {
        const { reply, projects } = await sendSessionMessage(sessionId, { message: trimmed });
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: reply,
            timestamp: new Date().toISOString(),
            projects: projects ?? null,
          },
        ]);
        void fetchSessions(); // refresh list to get updated title + order
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get a response. Check backend connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, isLoading, hackathonContext],
  );

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const grouped = groupSessions(sessions);
  const showWelcome = messages.length === 0 && !sessionLoading;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-visible border-4 border-black shadow-[6px_6px_0px_0px_#1a1a1a]">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 flex flex-col border-r-4 border-black bg-[#fafaf8] transition-all overflow-hidden ${
          sidebarOpen ? 'w-56' : 'w-0'
        }`}
      >
        <div className="m-3 flex items-stretch gap-2">
          <button
            type="button"
            onClick={startNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#0055ff] text-white border-2 border-black font-headline font-black text-xs uppercase tracking-wider hover:bg-black cursor-pointer transition-all shadow-[2px_2px_0px_0px_#1a1a1a]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New Chat
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="w-10 border-2 border-black bg-white hover:bg-[#ffcc00] font-headline font-black text-lg cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]"
            aria-label="Close chat history"
            title="Close chat history"
          >
            ×
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
              <p className="font-mono text-[9px] uppercase font-bold text-zinc-400">
                No chats yet.
                <br />Start a new conversation!
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, group]) => {
              if (group.length === 0) return null;
              return (
                <div key={label}>
                  <div className="px-3 py-1.5 border-b border-zinc-200 sticky top-0 bg-[#fafaf8] z-10">
                    <span className="font-mono text-[9px] font-bold uppercase text-zinc-400">{label}</span>
                  </div>
                  {group.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => void openSession(s.id)}
                      className={`group relative px-3 py-2.5 cursor-pointer border-b border-zinc-100 hover:bg-[#ffcc00]/20 transition-all ${
                        s.id === currentSessionId ? 'bg-[#0055ff]/10 border-l-2 border-l-[#0055ff]' : ''
                      }`}
                    >
                      {renamingId === s.id ? (
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => void commitRename(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRename(s.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white border border-[#0055ff] px-1.5 py-1 font-mono text-xs font-bold focus:outline-none"
                        />
                      ) : (
                        <>
                          <p className="font-mono text-xs font-bold text-zinc-800 truncate leading-tight pr-10">
                            {s.title}
                          </p>
                          {s.hackathon_title && (
                            <p className="font-mono text-[9px] font-bold uppercase text-[#0055ff] truncate mt-0.5 flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5 shrink-0" /> {s.hackathon_title}
                            </p>
                          )}
                          <p className="font-mono text-[9px] text-zinc-400 mt-0.5">
                            {new Date(s.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                          {/* Action buttons — appear on hover */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => startRename(s, e)}
                              className="p-1 hover:bg-[#ffcc00] border border-zinc-300 bg-white cursor-pointer"
                              title="Rename"
                            >
                              <PenLine className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => void handleDeleteSession(s.id, e)}
                              className={`p-1 border cursor-pointer transition-all ${
                                deleteConfirm === s.id
                                  ? 'bg-[#e63b2e] text-white border-[#e63b2e]'
                                  : 'hover:bg-[#e63b2e] hover:text-white border-zinc-300 bg-white'
                              }`}
                              title={deleteConfirm === s.id ? 'Click again to confirm' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-visible bg-white">

        {/* Top bar: sidebar toggle */}
        <div className="shrink-0 border-b-3 border-black px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 border-2 border-black hover:bg-[#ffcc00] cursor-pointer transition-all shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf8]">
          <div className="p-4 sm:p-6 space-y-5">
            {sessionLoading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#0055ff]" />
                <span className="font-mono text-sm font-bold uppercase text-zinc-500">Loading session...</span>
              </div>
            ) : (
              <>
                {showWelcome && (
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-5 h-5 text-[#ffcc00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#1a1a1a] border-2 border-black p-4 sm:p-5 shadow-[3px_3px_0px_0px_#0055ff]">
                        <span className="font-mono text-[10px] font-bold uppercase text-[#ffcc00] mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> COPILOT · READY
                        </span>
                        <div className="prose prose-invert max-w-none font-mono text-sm text-zinc-200 leading-7">
                          <Markdown>{WELCOME_NO_CONTEXT}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg) =>
                  msg.role === 'assistant' ? (
                    <AiMessageBubble key={msg.id} message={msg} />
                  ) : (
                    <UserMessageBubble key={msg.id} message={msg} userName={user?.name} />
                  ),
                )}

                {isLoading && (
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black border-2 border-black flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-[#ffcc00]" />
                    </div>
                    <div className="bg-[#1a1a1a] border-2 border-black p-4 sm:p-5 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-[#ffcc00] animate-spin" />
                      <span className="font-mono text-xs font-bold uppercase text-zinc-400 animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="border-2 border-[#e63b2e] bg-[#e63b2e]/10 p-3 font-mono text-xs font-bold uppercase text-[#e63b2e] flex items-center justify-between gap-3">
                    <span>⚠ {error}</span>
                    <button onClick={() => setError(null)} className="underline cursor-pointer text-[#0055ff] shrink-0">Dismiss</button>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t-3 border-black p-2 flex gap-2 items-end bg-white overflow-visible">
          <div ref={selectorRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSelectorOpen((o) => !o)}
              className={`h-[46px] w-[46px] border-2 border-black font-headline font-black text-xl shadow-[2px_2px_0px_0px_#1a1a1a] cursor-pointer transition-all flex items-center justify-center ${
                hackathonContext ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'bg-white hover:bg-[#ffcc00]'
              }`}
              title={hackathonContext ? `Selected: ${hackathonContext.title}` : 'Add context'}
              aria-label="Add chat context"
              aria-expanded={selectorOpen}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
            {selectorOpen && (
              <ChatContextMenu
                options={allOptions}
                selectedTitle={hackathonContext?.title ?? null}
                onSelect={(ctx) => void selectHackathon(ctx)}
                onClear={() => {
                  setHackathonContext(null);
                  setSelectorOpen(false);
                }}
              />
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); void sendMessage(inputValue); }}
            className="flex-1 flex gap-2 items-end"
          >
            <div className="flex-1 border-2 border-black bg-white focus-within:border-[#0055ff] transition-all">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(inputValue); }
                }}
                disabled={isLoading || sessionLoading}
                placeholder={hackathonContext ? `Ask anything about ${hackathonContext.title}...` : 'Ask me about hackathon strategy, ideas, build plans...'}
                rows={1}
                className="block max-h-[104px] min-h-[42px] w-full overflow-y-auto bg-transparent px-3 py-2.5 font-mono text-sm font-bold leading-5 resize-none focus:outline-none placeholder:text-zinc-400 placeholder:font-normal disabled:opacity-50"
              />
            </div>
            <button type="submit" disabled={!inputValue.trim() || isLoading || sessionLoading}
              className="h-[46px] px-3 sm:px-4 bg-[#0055ff] text-white border-2 border-black font-headline font-black text-xs uppercase shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-2 shrink-0">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /><span className="hidden sm:inline">SEND</span></>}
            </button>
          </form>
        </div>

        <p className="shrink-0 py-1.5 font-mono text-[9px] uppercase text-zinc-400 text-center border-t border-zinc-100">
          <Zap className="w-3 h-3 inline mr-1" />
          Powered by Amazon Nova · History saved to cloud
        </p>
      </div>
    </div>
  );
}

// ── IDEA VALIDATOR TAB ────────────────────────────────────────────────────────

function ValidatorTab({ allOptions, user: _user }: { allOptions: HackathonOption[]; user: User | null }) {
  const [valTitle, setValTitle] = useState('');
  const [valHackathon, setValHackathon] = useState('');
  const [valStack, setValStack] = useState('');
  const [valPitch, setValPitch] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [history, setHistory] = useState<ValidationHistoryItem[]>(() => loadHistory());
  const [hackSelectorOpen, setHackSelectorOpen] = useState(false);
  const hackSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveHistory(history); }, [history]);

  useEffect(() => {
    if (!isValidating) return;
    const t = setInterval(() => setTaglineIndex((i) => (i + 1) % VALIDATION_TAGLINES.length), 3000);
    return () => clearInterval(t);
  }, [isValidating]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (hackSelectorRef.current && !hackSelectorRef.current.contains(e.target as Node)) {
        setHackSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valTitle.trim() || !valPitch.trim()) return;
    setIsValidating(true);
    setError(null);
    setResult(null);
    try {
      const data = await validateIdea({
        projectTitle: valTitle.trim(),
        hackathonName: valHackathon || null,
        techStack: valStack.trim() || null,
        conceptPitch: valPitch.trim(),
      });
      setResult(data);
      const item: ValidationHistoryItem = {
        id: `v_${Date.now()}`,
        title: valTitle.trim(),
        date: new Date().toISOString().split('T')[0],
        pitch: valPitch.trim(),
        data,
      };
      setHistory((prev) => [item, ...prev].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed. Check backend connection.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Input form */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-5">
          <div className="flex justify-between items-center pb-2 border-b-2 border-black">
            <span className="font-headline font-black uppercase text-base text-[#0055ff] flex items-center gap-1.5">
              <Layers className="w-5 h-5" /> Composition Deck
            </span>
            <span className="font-mono text-[9px] bg-black text-white px-2 font-bold py-0.5">AMAZON NOVA</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">1. Project Title *</label>
              <input type="text" required value={valTitle} onChange={(e) => setValTitle(e.target.value)} disabled={isValidating}
                className="w-full bg-[#f5f5f5] p-3 border-2 border-black text-xs font-mono font-black uppercase focus:outline-none focus:bg-white"
                placeholder="e.g. CivicAid AI" />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">2. Target Hackathon</label>
              <div ref={hackSelectorRef} className="relative">
                <button type="button" onClick={() => setHackSelectorOpen((o) => !o)} disabled={isValidating}
                  className="w-full bg-[#f5f5f5] p-3 border-2 border-black text-xs font-mono font-bold uppercase focus:outline-none flex items-center justify-between cursor-pointer hover:bg-white disabled:opacity-50">
                  <span className="truncate">{valHackathon || 'ANY GLOBAL HACKATHON'}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-2" />
                </button>
                {hackSelectorOpen && (
                  <HackathonDropdown options={allOptions} onSelect={(ctx) => { setValHackathon(ctx.title); setHackSelectorOpen(false); }} />
                )}
              </div>
              {valHackathon && (
                <button type="button" onClick={() => setValHackathon('')}
                  className="mt-1 font-mono text-[9px] uppercase font-bold text-zinc-400 hover:text-[#e63b2e] cursor-pointer flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear selection
                </button>
              )}
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">3. Tech Stack</label>
              <input type="text" value={valStack} onChange={(e) => setValStack(e.target.value)} disabled={isValidating}
                className="w-full bg-[#f5f5f5] p-3 border-2 border-black text-xs font-mono font-bold uppercase focus:outline-none focus:bg-white"
                placeholder="e.g. React, Supabase, Python, FastAPI" />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1">4. Concept Pitch *</label>
              <textarea rows={5} required value={valPitch} onChange={(e) => setValPitch(e.target.value)} disabled={isValidating}
                className="w-full bg-[#f5f5f5] p-3 border-2 border-black text-xs font-mono font-bold uppercase resize-none focus:outline-none focus:bg-white"
                placeholder="Describe what you're building, who it's for, and why it wins..." />
            </div>

            {error && (
              <div className="border-2 border-[#e63b2e] bg-[#e63b2e]/10 p-3 font-mono text-[10px] font-bold uppercase text-[#e63b2e]">
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={isValidating || !valTitle.trim() || !valPitch.trim()}
              className="w-full flex items-center justify-center gap-3 bg-[#e63b2e] text-white py-4 font-headline font-black uppercase text-sm border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] transition-all cursor-pointer disabled:opacity-50">
              {isValidating ? (
                <><Clock className="w-5 h-5 animate-spin" /> ANALYSING...</>
              ) : (
                <><Sparkles className="w-5 h-5 text-[#ffcc00]" /> VALIDATE WITH NEURAL JUROR</>
              )}
            </button>
          </form>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-[#1a1a1a] text-white p-5 border-4 border-black">
            <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-800 mb-4">
              <span className="font-headline font-black uppercase text-sm text-[#ffcc00]">Archives ({history.length})</span>
              <button onClick={() => setHistory([])} className="font-mono text-[10px] uppercase font-bold text-zinc-400 hover:text-white border border-zinc-700 px-2 py-0.5 cursor-pointer">Clear</button>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {history.map((h) => (
                <div key={h.id} onClick={() => { setResult(h.data); setValTitle(h.title); setValPitch(h.pitch); }}
                  className="p-3 border-2 border-zinc-800 bg-[#252525] hover:bg-zinc-800 cursor-pointer font-mono text-xs">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>#{h.data.feasibilityScore}/10 Feasibility</span>
                    <span>{h.date}</span>
                  </div>
                  <span className="font-headline font-extrabold text-[#ffcc00] uppercase truncate block">{h.title}</span>
                  <span className="text-[10px] text-zinc-400 uppercase line-clamp-1 mt-0.5">{h.pitch}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results panel */}
      <div className="lg:col-span-7">
        {isValidating && (
          <div className="bg-[#f5f0e8] border-4 border-dashed border-black/50 text-center py-24 px-6 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-8 border-[#0055ff] border-t-white animate-spin rounded-none"></div>
              <span className="absolute top-5 left-5 text-xl font-bold select-none text-[#0055ff]">✦</span>
            </div>
            <div className="space-y-2">
              <p className="font-headline text-2xl font-black uppercase text-black">Constructing Verdict</p>
              <div className="bg-black text-[#ffcc00] font-mono text-xs uppercase px-4 py-2 font-bold inline-block animate-pulse">
                &quot; {VALIDATION_TAGLINES[taglineIndex]} &quot;
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase text-zinc-500 max-w-sm">
              The Amazon Nova Chief Strategist model compiles your stack constraints against hackathon scoring schemas.
            </p>
          </div>
        )}

        {!isValidating && !result && (
          <div className="bg-white border-4 border-dashed border-zinc-300 text-center py-24 px-6 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl text-[#0055ff]">✦</span>
            <div>
              <h4 className="font-headline text-2xl font-black uppercase text-black">No validation yet</h4>
              <p className="font-mono text-xs uppercase text-zinc-400 mt-1 max-w-md mx-auto">
                Fill in the form and hit Validate to get scores, critique, upgrade requirements, and teammate suggestions.
              </p>
            </div>
          </div>
        )}

        {result && !isValidating && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a]">
              <div className="flex justify-between items-center pb-2 border-b-2 border-black mb-6">
                <span className="font-headline font-black text-xl uppercase text-[#0055ff]">Jurist Board Analytics</span>
                <span className="font-mono text-xs uppercase font-extrabold bg-black text-white px-2">EVALUATED</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Feasibility', value: result.feasibilityScore, color: '#0055ff' },
                  { label: 'Originality', value: result.originalityScore, color: '#e63b2e' },
                  { label: 'Directness', value: result.brutalistDirectness, color: '#1a1a1a' },
                ].map((s) => (
                  <div key={s.label} className="bg-zinc-50 border-2 border-black p-4 flex flex-col items-center text-center">
                    <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 mb-1">{s.label}</span>
                    <span className="font-headline font-black text-4xl my-1" style={{ color: s.color }}>
                      {s.value}<span className="text-lg text-black">/10</span>
                    </span>
                    <div className="w-full bg-zinc-200 h-1.5 border border-black mt-1">
                      <div className="h-full" style={{ width: `${s.value * 10}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[#ffcc00] border-2 border-black p-4 font-mono font-bold text-xs uppercase mb-5 text-black">
                <span className="font-extrabold text-[#e63b2e] block mb-1">■ Core Verdict:</span>
                &ldquo; {result.verdictSummary} &rdquo;
              </div>
              <div className="space-y-3">
                <h4 className="font-headline font-black text-sm uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#e63b2e]" strokeWidth={3} /> Required Upgrades:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.requiredUpgrades.map((u, i) => (
                    <div key={i} className="bg-zinc-50 border-2 border-black p-3 font-mono text-[11px] font-bold uppercase text-zinc-700">
                      <span className="font-black text-black mr-1">{i + 1}.</span> {u}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-4">
              <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                <span className="font-headline font-black text-sm uppercase flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#0055ff]" /> Architectural Review
                </span>
                <span className="font-mono text-[9px] uppercase font-bold text-[#e63b2e]">Master Evaluation</span>
              </div>
              <div className="text-xs font-mono prose prose-zinc max-w-none uppercase bg-zinc-50 p-4 border border-zinc-200 leading-relaxed">
                <Markdown>{result.critique}</Markdown>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-3">
                <h4 className="font-headline font-black text-xs uppercase text-[#e63b2e] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#0055ff]" /> Recruit These Experts:
                </h4>
                <ul className="space-y-2">
                  {result.suggestedTeammates.map((t, i) => (
                    <li key={i} className="font-mono text-[10px] font-bold uppercase p-2 bg-zinc-50 border border-black leading-tight">
                      <span className="text-[#0055ff] font-black block mb-0.5">■ Role {i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-black text-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#ffcc00] flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="font-headline font-black text-xs uppercase text-[#ffcc00] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-white" /> Front-End Visual Motif:
                  </h4>
                  <p className="font-mono text-[10px] text-zinc-300 leading-relaxed uppercase">{result.visualThemeProposal}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-zinc-800">
                  {result.keyStrengths.map((s, i) => (
                    <span key={i} className="font-mono text-[9px] font-bold uppercase bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-300">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function HackathonDropdown({ options, onSelect }: { options: HackathonOption[]; onSelect: (ctx: AiHackathonContext) => void }) {
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] max-h-72 overflow-y-auto">
      {options.length === 0 ? (
        <div className="p-4 font-mono text-[10px] uppercase font-bold text-zinc-400 text-center">
          No hackathons saved yet. Bookmark or track one first.
        </div>
      ) : (
        <>
          {(['bookmark', 'tracked'] as const).map((src) => {
            const group = options.filter((o) => o.source === src);
            if (group.length === 0) return null;
            return (
              <div key={src}>
                <div className={`px-3 py-1.5 border-b-2 border-black ${src === 'bookmark' ? 'bg-[#ffcc00]' : 'bg-zinc-100 border-t-2'}`}>
                  <span className="font-mono text-[9px] font-bold uppercase">{src === 'bookmark' ? '★ Bookmarked' : '⬡ Tracked'}</span>
                </div>
                {group.map((opt) => (
                  <button key={opt.label} type="button" onClick={() => onSelect(opt.context)}
                    className="w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-[#ffcc00]/20 cursor-pointer font-mono">
                    <p className="text-xs font-black uppercase truncate">{opt.label}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {opt.context.deadline && <span className="text-[9px] font-bold uppercase text-zinc-500">Due: {opt.context.deadline}</span>}
                      {opt.context.prize_pool && <span className="text-[9px] font-bold uppercase text-zinc-500">{opt.context.prize_pool}</span>}
                      {(opt.context.themes?.length ?? 0) > 0 && (
                        <span className="text-[9px] font-bold uppercase text-zinc-400 truncate">{opt.context.themes!.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function ChatContextMenu({
  options,
  selectedTitle,
  onSelect,
  onClear,
}: {
  options: HackathonOption[];
  selectedTitle: string | null;
  onSelect: (ctx: AiHackathonContext) => void;
  onClear: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(360px,calc(100vw-32px))] border-3 border-black bg-white shadow-[4px_4px_0px_0px_#1a1a1a]">
      <div className="border-b-2 border-black bg-[#ffcc00] px-3 py-2">
        <p className="font-headline text-xs font-black uppercase tracking-wide text-[#1a1a1a]">
          Add to chat
        </p>
      </div>

      <div>
        <div className="flex w-full items-center justify-between gap-3 border-b-2 border-black bg-[#fafaf8] px-3 py-2.5 font-mono text-[10px] font-black uppercase">
          <span className="flex min-w-0 items-center gap-2">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-[#0055ff]" strokeWidth={2.5} />
            <span className="truncate">Registered Hackathons</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[9px] text-zinc-500">
            {options.length}
            <ChevronDown className="h-3 w-3" />
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-4 text-center font-mono text-[10px] font-bold uppercase text-zinc-400">
              No registered hackathons yet.
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = selectedTitle === opt.context.title;
              return (
                <button
                  key={`${opt.source}-${opt.label}`}
                  type="button"
                  onClick={() => onSelect(opt.context)}
                  className={`w-full border-b border-zinc-200 px-3 py-2.5 text-left font-mono transition-all hover:bg-[#ffcc00]/25 ${
                    isSelected ? 'bg-[#0055ff]/10 border-l-4 border-l-[#0055ff]' : ''
                  }`}
                >
                  <p className="truncate text-xs font-black uppercase text-[#1a1a1a]">
                    {opt.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[9px] font-bold uppercase text-[#0055ff]">
                      {opt.source === 'bookmark' ? 'Bookmarked' : 'Tracked'}
                    </span>
                    {opt.context.deadline && (
                      <span className="text-[9px] font-bold uppercase text-zinc-500">
                        Due: {opt.context.deadline}
                      </span>
                    )}
                    {opt.context.prize_pool && (
                      <span className="text-[9px] font-bold uppercase text-zinc-500">
                        {opt.context.prize_pool}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedTitle && (
        <button
          type="button"
          onClick={onClear}
          className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left font-mono text-[10px] font-black uppercase text-[#e63b2e] hover:bg-[#e63b2e]/10"
        >
          <span className="truncate">Clear selected hackathon</span>
          <X className="h-3.5 w-3.5 shrink-0" />
        </button>
      )}
    </div>
  );
}

function AiMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-[#ffcc00]" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="bg-[#1a1a1a] border-2 border-black p-4 shadow-[3px_3px_0px_0px_#0055ff]">
          <span className="font-mono text-[9px] font-bold uppercase text-[#ffcc00] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> COPILOT · {formatTime(message.timestamp)}
          </span>
          <div className="prose prose-invert prose-sm max-w-none font-mono text-[11px] text-zinc-200 leading-relaxed [&_h1]:text-[#ffcc00] [&_h2]:text-[#ffcc00] [&_h3]:text-zinc-300 [&_strong]:text-white [&_code]:bg-zinc-800 [&_code]:px-1 [&_li]:my-0.5">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
        {message.projects && message.projects.length > 0 && (
          <ProjectCards projects={message.projects} />
        )}
      </div>
    </div>
  );
}

// ── Project Cards (shown when Copilot fetches from DB) ────────────────────────

const CARD_SHADOW_COLORS = ['#0055ff', '#e63b2e', '#ffcc00', '#16a34a', '#7c3aed', '#0891b2'];

function ProjectCards({ projects }: { projects: ProjectSnippet[] }) {
  return (
    <div className="min-w-0 space-y-3">
      {/* Header divider */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-zinc-700" />
        <span className="font-mono text-[9px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#ffcc00]" />
          {projects.length} project{projects.length !== 1 ? 's' : ''} from HackFeed
        </span>
        <span className="hidden sm:inline-flex font-mono text-[9px] font-bold uppercase text-zinc-500">
          Scroll sideways
        </span>
        <div className="h-px flex-1 bg-zinc-700" />
      </div>

      {/* Horizontal cards carousel */}
      <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4 pr-4 snap-x snap-mandatory">
        {projects.map((p, idx) => (
          <ChatProjectCard key={p.id} project={p} shadowColor={CARD_SHADOW_COLORS[idx % CARD_SHADOW_COLORS.length]} />
        ))}
      </div>
    </div>
  );
}

function ChatProjectCard({ project: p, shadowColor }: { project: ProjectSnippet; shadowColor: string }) {
  return (
    <article
      className="w-[280px] sm:w-[340px] lg:w-[380px] shrink-0 snap-start bg-white border-2 border-black flex flex-col overflow-hidden hover:-translate-y-[1px] transition-all"
      style={{ boxShadow: `4px 4px 0px 0px ${shadowColor}` }}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-zinc-100 border-b-2 border-black overflow-hidden">
        {p.thumbnail ? (
          <img
            src={p.thumbnail}
            alt={p.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-headline font-black text-2xl text-zinc-300 uppercase">
            {p.title.slice(0, 2)}
          </div>
        )}
        {p.is_winner && (
          <div className="absolute top-2 right-2 bg-[#ffcc00] border-2 border-black px-1.5 py-0.5 flex items-center gap-1 shadow-[2px_2px_0px_0px_#1a1a1a]">
            <Trophy className="w-2.5 h-2.5" strokeWidth={3} />
            <span className="font-headline font-black text-[9px] uppercase">WINNER</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Title + tagline */}
        <div>
          <h3 className="font-headline font-black text-sm uppercase tracking-tight text-[#1a1a1a] leading-tight break-words">
            {p.title}
          </h3>
          {p.tagline && (
            <p className="font-mono text-[10px] text-zinc-500 leading-snug mt-0.5 line-clamp-2">{p.tagline}</p>
          )}
        </div>

        {/* Hackathon */}
        {p.hackathon_name && (
          <span className="font-mono text-[10px] uppercase font-bold text-[#0055ff] truncate">
            ↳ {p.hackathon_name}
          </span>
        )}

        {/* Tech tags */}
        {p.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.technologies.slice(0, 5).map((t) => (
              <span key={t} className="bg-zinc-100 font-mono text-[9px] font-extrabold px-1.5 py-0.5 border border-zinc-300">
                #{t}
              </span>
            ))}
            {p.technologies.length > 5 && (
              <span className="font-mono text-[9px] font-bold text-zinc-400 px-1 py-0.5">+{p.technologies.length - 5}</span>
            )}
          </div>
        )}

        {/* Stats + links row */}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[10px] font-bold">
            {p.likes_count != null && (
              <span className="flex items-center gap-0.5" title="Likes">
                <Heart className="w-3 h-3" />
                {p.likes_count >= 1000 ? `${(p.likes_count / 1000).toFixed(1)}k` : p.likes_count.toLocaleString()}
              </span>
            )}
            {p.views != null && (
              <span className="flex items-center gap-0.5" title="Views">
                <Eye className="w-3 h-3" />
                {p.views >= 1000 ? `${(p.views / 1000).toFixed(1)}k` : p.views.toLocaleString()}
              </span>
            )}
            {p.team_members_count > 0 && (
              <span className="flex items-center gap-0.5" title="Team size">
                <Users className="w-3 h-3" />
                {p.team_members_count}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {p.github_url && (
              <a
                href={p.github_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border-2 border-black p-1 bg-white hover:bg-[#1a1a1a] hover:text-[#ffcc00] transition-all"
                title="View on GitHub"
              >
                <Github className="w-3 h-3" strokeWidth={2.5} />
              </a>
            )}
            {p.demo_url && (
              <a
                href={p.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border-2 border-black p-1 bg-white hover:bg-[#0055ff] hover:text-white transition-all"
                title="View demo"
              >
                <Eye className="w-3 h-3" strokeWidth={2.5} />
              </a>
            )}
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0055ff] text-white font-headline font-black text-[9px] uppercase px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#101010] hover:bg-black hover:text-[#ffcc00] transition-all flex items-center gap-1"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              VIEW
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function UserMessageBubble({ message, userName }: { message: ChatMessage; userName?: string | null }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="w-fit max-w-[82%] sm:max-w-[68%] bg-white border-2 border-black px-3 py-2.5 shadow-[3px_3px_0px_0px_#1a1a1a]">
        <span className="font-mono text-[9px] font-bold uppercase text-[#0055ff] block mb-1.5">
          {userName ? userName.toUpperCase() : 'YOU'} · {formatTime(message.timestamp)}
        </span>
        <p className="font-mono text-sm font-bold text-[#1a1a1a] leading-6 whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className="w-8 h-8 bg-[#0055ff] border-2 border-black flex items-center justify-center shrink-0 mt-0.5 font-headline font-black text-white text-xs">
        {userName ? userName.slice(0, 1).toUpperCase() : 'U'}
      </div>
    </div>
  );
}
