import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { type AiHackathonContext, chatWithCopilot } from '../api/ai';
import type { Bookmark as ApiBookmark } from '../api';
import type { TrackedApplication } from '../types';
import type { User } from '../api/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface StoredSession {
  hackathonContext: AiHackathonContext | null;
  messages: ChatMessage[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'copilot_chat_session';

const QUICK_PROMPTS = [
  { label: '💡 Suggest 5 project ideas', value: 'Suggest 5 strong project ideas for this hackathon. For each, give: concept, tech stack, MVP scope, and winning angle.' },
  { label: '🏆 What do winners do differently?', value: 'What patterns and strategies separate winning projects from the rest in hackathons like this?' },
  { label: '📋 Build plan for 48 hours', value: 'Create a realistic 48-hour build plan for a typical 2-person team participating in this hackathon. Break it into phases with specific tasks.' },
  { label: '✦ Help me write my pitch', value: 'Walk me through how to write a compelling hackathon pitch for this event. What do judges look for?' },
  { label: '⚠ What risks should I avoid?', value: 'What are the biggest mistakes and risks that cause hackathon projects to fail? Give me specific warnings for this type of hackathon.' },
  { label: '🔧 Suggest a tech stack', value: 'What tech stack would you recommend for building a winning project in this hackathon? Consider speed of development and demo quality.' },
];

const WELCOME_NO_CONTEXT =
  "Hello! I'm your **Hackathon Build Copilot** — context-aware AI that helps you plan, build, and win.\n\n**To get started:** Select a hackathon from the dropdown above. Once you do, I'll know the theme, deadline, prize pool, and judging criteria — and every answer I give will be tailored to that specific event.\n\nOr just ask me anything and I'll give you general hackathon strategy advice.";

const WELCOME_WITH_CONTEXT = (title: string) =>
  `Context loaded: **${title}**.\n\nI now know this hackathon's theme, deadline, prize pool, and requirements. Ask me anything — project ideas, build plans, pitch advice, tech stack, judging strategy, or submission checklist.\n\nWhat would you like to work on first?`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSession(): StoredSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { hackathonContext: null, messages: [] };
    return JSON.parse(raw) as StoredSession;
  } catch {
    return { hackathonContext: null, messages: [] };
  }
}

function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
}

function makeId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function hackathonToContext(b: ApiBookmark): AiHackathonContext | null {
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface CopilotPageProps {
  savedBookmarks: ApiBookmark[];
  trackedApps: TrackedApplication[];
  user: User | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CopilotPage({ savedBookmarks, trackedApps, user }: CopilotPageProps) {
  const stored = loadSession();

  const [hackathonContext, setHackathonContext] = useState<AiHackathonContext | null>(
    stored.hackathonContext,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(stored.messages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist session on every change
  useEffect(() => {
    saveSession({ hackathonContext, messages });
  }, [hackathonContext, messages]);

  // Close selector on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Build hackathon options for the dropdown
  const bookmarkOptions = savedBookmarks
    .filter((b) => b.hackathon != null)
    .map((b) => ({ label: b.hackathon!.title, context: hackathonToContext(b)!, source: 'bookmark' as const }));

  // Also include tracked hackathons not already in bookmarks
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

  const selectHackathon = (ctx: AiHackathonContext) => {
    setSelectorOpen(false);
    if (hackathonContext?.title === ctx.title) return;
    setHackathonContext(ctx);
    setError(null);

    // Add a system welcome message for the new context
    const welcome: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      content: WELCOME_WITH_CONTEXT(ctx.title),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, welcome]);
  };

  const clearContext = () => {
    setHackathonContext(null);
    setError(null);
  };

  const newSession = () => {
    setMessages([]);
    setHackathonContext(null);
    setInputValue('');
    setError(null);
    inputRef.current?.focus();
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      try {
        const { reply } = await chatWithCopilot({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          hackathon_context: hackathonContext ?? null,
        });

        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get a response. Check backend connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, hackathonContext],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(inputValue);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] max-h-[900px] animate-fadeIn">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b-4 border-black pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 shrink-0">
        <div>
          <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest flex items-center gap-2 w-fit">
            <Bot className="w-3 h-3" />
            HACKATHON BUILD COPILOT
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter mt-2">
            AI COPILOT
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 hidden sm:block">
            Context-aware · Hackathon-specific · Built to win
          </span>
          <button
            type="button"
            onClick={newSession}
            className="font-mono text-[10px] font-bold uppercase px-3 py-2 border-2 border-black bg-white hover:bg-[#ffcc00] flex items-center gap-1.5 cursor-pointer transition-all"
            title="Start a new session"
          >
            <RefreshCw className="w-3 h-3" />
            NEW SESSION
          </button>
        </div>
      </div>

      {/* ── Hackathon Selector ─────────────────────────────────────────── */}
      <div className="shrink-0 mb-4 space-y-3">
        {hackathonContext ? (
          /* Context bar — hackathon is selected */
          <div className="bg-[#ffcc00] border-3 border-black p-3 shadow-[3px_3px_0px_0px_#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <Trophy className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div className="min-w-0">
                <p className="font-headline font-black text-sm uppercase tracking-tight truncate">
                  {hackathonContext.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {hackathonContext.deadline && (
                    <span className="font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Deadline: {hackathonContext.deadline}
                    </span>
                  )}
                  {hackathonContext.prize_pool && (
                    <span className="font-mono text-[10px] font-bold uppercase">
                      Prize: {hackathonContext.prize_pool}
                    </span>
                  )}
                  {hackathonContext.mode && (
                    <span className="font-mono text-[10px] font-bold uppercase">
                      {hackathonContext.mode}
                    </span>
                  )}
                  {hackathonContext.themes && hackathonContext.themes.length > 0 && (
                    <span className="font-mono text-[10px] font-bold uppercase text-zinc-700 truncate max-w-[200px]">
                      {hackathonContext.themes.slice(0, 3).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div ref={selectorRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectorOpen((o) => !o)}
                  className="font-mono text-[10px] font-bold uppercase px-3 py-1.5 border-2 border-black bg-white hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer"
                >
                  CHANGE <ChevronDown className="w-3 h-3" />
                </button>
                {selectorOpen && <HackathonDropdown options={allOptions} onSelect={selectHackathon} />}
              </div>
              <button
                type="button"
                onClick={clearContext}
                className="font-mono text-[10px] font-bold uppercase p-1.5 border-2 border-black bg-white hover:bg-[#e63b2e] hover:text-white cursor-pointer"
                title="Clear hackathon context"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* No context — show selector prompt */
          <div ref={selectorRef} className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen((o) => !o)}
              className="w-full bg-white border-3 border-black p-3 shadow-[3px_3px_0px_0px_#1a1a1a] flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-all group"
            >
              <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-zinc-500">
                <Trophy className="w-4 h-4 text-zinc-400" />
                Select a hackathon for personalized advice...
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-[#0055ff]">
                {allOptions.length > 0 ? `${allOptions.length} available` : 'No saved hackathons'}
                <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
              </span>
            </button>
            {selectorOpen && (
              <HackathonDropdown options={allOptions} onSelect={selectHackathon} />
            )}
          </div>
        )}
      </div>

      {/* ── Chat Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto border-3 border-black bg-[#fafaf8] space-y-0">
        <div className="p-4 space-y-4">

          {/* Welcome state */}
          {showWelcome && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#ffcc00]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-[#1a1a1a] border-2 border-black p-4 shadow-[3px_3px_0px_0px_#0055ff]">
                  <span className="font-mono text-[9px] font-bold uppercase text-[#ffcc00] block mb-2">
                    COPILOT · READY
                  </span>
                  <div className="prose prose-invert prose-sm max-w-none font-mono text-[11px] text-zinc-200 leading-relaxed">
                    <Markdown>{WELCOME_NO_CONTEXT}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) =>
            msg.role === 'assistant' ? (
              <AiMessage key={msg.id} message={msg} />
            ) : (
              <UserMessage key={msg.id} message={msg} userName={user?.name} />
            ),
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#ffcc00]" />
              </div>
              <div className="bg-[#1a1a1a] border-2 border-black p-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#ffcc00] animate-spin" />
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-400 animate-pulse">
                  Thinking...
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border-2 border-[#e63b2e] bg-[#e63b2e]/10 p-3 font-mono text-[11px] font-bold uppercase text-[#e63b2e]">
              ⚠ {error}
              <button
                onClick={() => setError(null)}
                className="ml-3 underline cursor-pointer text-[#0055ff]"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Quick Prompts ─────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="shrink-0 mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => void sendMessage(p.value)}
              disabled={isLoading}
              className="font-mono text-[10px] font-bold uppercase px-3 py-2 border-2 border-black bg-white hover:bg-[#ffcc00] disabled:opacity-40 cursor-pointer transition-all shadow-[2px_2px_0px_0px_#1a1a1a]"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="shrink-0 mt-3 flex gap-2 items-end">
        <div className="flex-1 min-w-0 border-3 border-black bg-white shadow-[3px_3px_0px_0px_#1a1a1a] focus-within:shadow-[3px_3px_0px_0px_#0055ff] transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              hackathonContext
                ? `Ask anything about ${hackathonContext.title}...`
                : 'Ask me about hackathon strategy, project ideas, build plans...'
            }
            rows={2}
            className="w-full bg-transparent px-4 py-3 font-mono text-xs font-bold uppercase resize-none focus:outline-none placeholder:text-zinc-400 placeholder:normal-case placeholder:font-normal disabled:opacity-50"
          />
          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase text-zinc-400">
              ENTER to send · SHIFT+ENTER for new line
            </span>
            {inputValue.trim() && (
              <span className="font-mono text-[9px] uppercase text-zinc-400">
                {inputValue.length} chars
              </span>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="h-[72px] px-5 bg-[#0055ff] text-white border-3 border-black font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-2 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">SEND</span>
            </>
          )}
        </button>
      </form>

      {/* ── Footer tip ─────────────────────────────────────────────────── */}
      <p className="shrink-0 mt-2 font-mono text-[9px] uppercase text-zinc-400 text-center">
        <Zap className="w-3 h-3 inline mr-1" />
        Powered by Gemini 2.0 Flash · Session saved locally · Select a hackathon for personalized advice
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DropdownOption {
  label: string;
  context: AiHackathonContext;
  source: 'bookmark' | 'tracked';
}

function HackathonDropdown({
  options,
  onSelect,
}: {
  options: DropdownOption[];
  onSelect: (ctx: AiHackathonContext) => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] max-h-72 overflow-y-auto">
      {options.length === 0 ? (
        <div className="p-4 font-mono text-[10px] uppercase font-bold text-zinc-400 text-center">
          No hackathons saved yet. Bookmark or track a hackathon first.
        </div>
      ) : (
        <>
          {/* Bookmarks group */}
          {options.filter((o) => o.source === 'bookmark').length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-[#ffcc00] border-b-2 border-black">
                <span className="font-mono text-[9px] font-bold uppercase">★ Bookmarked</span>
              </div>
              {options
                .filter((o) => o.source === 'bookmark')
                .map((opt) => (
                  <DropdownRow key={opt.label} opt={opt} onSelect={onSelect} />
                ))}
            </div>
          )}
          {/* Tracked group */}
          {options.filter((o) => o.source === 'tracked').length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-zinc-100 border-b-2 border-black border-t-2">
                <span className="font-mono text-[9px] font-bold uppercase">⬡ Tracked</span>
              </div>
              {options
                .filter((o) => o.source === 'tracked')
                .map((opt) => (
                  <DropdownRow key={opt.label} opt={opt} onSelect={onSelect} />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DropdownRow({
  opt,
  onSelect,
}: {
  opt: DropdownOption;
  onSelect: (ctx: AiHackathonContext) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(opt.context)}
      className="w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-[#ffcc00]/20 cursor-pointer font-mono"
    >
      <p className="text-xs font-black uppercase truncate">{opt.label}</p>
      <div className="flex items-center gap-3 mt-0.5">
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
        {opt.context.themes && opt.context.themes.length > 0 && (
          <span className="text-[9px] font-bold uppercase text-zinc-400 truncate">
            {opt.context.themes.slice(0, 2).join(', ')}
          </span>
        )}
      </div>
    </button>
  );
}

function AiMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-[#ffcc00]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#1a1a1a] border-2 border-black p-4 shadow-[3px_3px_0px_0px_#0055ff]">
          <span className="font-mono text-[9px] font-bold uppercase text-[#ffcc00] block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            COPILOT · {formatTime(message.timestamp)}
          </span>
          <div className="prose prose-invert prose-sm max-w-none font-mono text-[11px] text-zinc-200 leading-relaxed [&_h1]:text-[#ffcc00] [&_h2]:text-[#ffcc00] [&_h3]:text-zinc-300 [&_strong]:text-white [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:rounded-none [&_li]:my-0.5">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ message, userName }: { message: ChatMessage; userName?: string | null }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="flex-1 min-w-0 flex justify-end">
        <div className="max-w-[80%] bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_#1a1a1a]">
          <span className="font-mono text-[9px] font-bold uppercase text-[#0055ff] block mb-2">
            {userName ? userName.toUpperCase() : 'YOU'} · {formatTime(message.timestamp)}
          </span>
          <p className="font-mono text-[11px] font-bold text-[#1a1a1a] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
      <div className="w-8 h-8 bg-[#0055ff] border-2 border-black flex items-center justify-center shrink-0 mt-0.5 font-headline font-black text-white text-xs">
        {userName ? userName.slice(0, 1).toUpperCase() : 'U'}
      </div>
    </div>
  );
}
