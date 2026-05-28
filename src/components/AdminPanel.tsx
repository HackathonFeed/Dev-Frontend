/**
 * AdminPanel — Neo-Brutalist admin dashboard.
 * Tabs: Overview | Users | Hackathons | System
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  Users,
  Trophy,
  Settings2,
  Trash2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Crown,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Database,
  Activity,
} from 'lucide-react';
import {
  getAdminStats,
  getAdminPlanCounts,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserPlan,
  deleteAdminUser,
  triggerScrape,
  generateEmbeddings,
  deleteHackathon,
} from '../api/admin';
import { listHackathons } from '../api/hackathons';
import type { AdminUser, AdminStats, SubscriptionPlan, UserRole, HackathonApi } from '../api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type AdminTab = 'overview' | 'users' | 'hackathons' | 'system';

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  hacker: 'bg-[#ffcc00] text-[#1a1a1a]',
  builder: 'bg-[#0055ff] text-white',
  champion: 'bg-[#1a1a1a] text-white',
};

const ROLE_COLORS: Record<UserRole, string> = {
  user: 'bg-zinc-100 text-zinc-700',
  moderator: 'bg-[#e63b2e]/20 text-[#e63b2e]',
  admin: 'bg-[#0055ff]/20 text-[#0055ff]',
};

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`font-mono text-[9px] font-black uppercase px-1.5 py-0.5 border border-black tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className={`border-3 border-black p-5 shadow-[4px_4px_0px_0px_#1a1a1a] ${accent}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-black flex items-center justify-center shrink-0">
          <span className="text-[#ffcc00]">{icon}</span>
        </div>
        <span className="font-mono text-[10px] uppercase font-black tracking-widest opacity-70">
          {label}
        </span>
      </div>
      <p className="font-headline font-black text-4xl tracking-tighter">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({
  dialog,
  onCancel,
}: {
  dialog: ConfirmDialog;
  onCancel: () => void;
}) {
  if (!dialog.open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#e63b2e] w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#e63b2e] shrink-0 mt-0.5" strokeWidth={2.5} />
          <div>
            <h3 className="font-headline font-black text-lg uppercase">{dialog.title}</h3>
            <p className="font-mono text-[11px] text-zinc-600 mt-1">{dialog.message}</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={dialog.onConfirm}
            className="flex-1 bg-[#e63b2e] text-white font-headline font-black text-xs uppercase border-2 border-black px-4 py-2.5 shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-[#c0392b] transition-colors cursor-pointer"
          >
            CONFIRM DELETE
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white text-black font-headline font-black text-xs uppercase border-2 border-black px-4 py-2.5 shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({
  stats,
  planCounts,
  loading,
  onRefresh,
}: {
  stats: AdminStats | null;
  planCounts: Record<string, number> | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const totalUsers = planCounts
    ? Object.values(planCounts).reduce((s, c) => s + c, 0)
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
            SYSTEM OVERVIEW
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter mt-1">
            ADMIN DASHBOARD
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-white border-2 border-black px-4 py-2 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
          REFRESH
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-4 h-4" strokeWidth={2.5} />}
          label="Total Users"
          value={loading ? '…' : totalUsers.toLocaleString()}
          accent="bg-white"
        />
        <StatCard
          icon={<Trophy className="w-4 h-4" strokeWidth={2.5} />}
          label="Hackathons"
          value={loading ? '…' : (stats?.total_hackathons ?? 0).toLocaleString()}
          accent="bg-[#ffcc00]"
        />
        <StatCard
          icon={<Activity className="w-4 h-4" strokeWidth={2.5} />}
          label="Total Searches"
          value={loading ? '…' : (stats?.total_searches ?? 0).toLocaleString()}
          accent="bg-white"
        />
        <StatCard
          icon={<Crown className="w-4 h-4" strokeWidth={2.5} />}
          label="Champions"
          value={loading ? '…' : (planCounts?.champion ?? 0).toLocaleString()}
          accent="bg-[#1a1a1a] text-white"
        />
      </div>

      {/* Plan Distribution */}
      {planCounts && (
        <div className="border-3 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#1a1a1a]">
          <h3 className="font-headline font-black text-lg uppercase mb-5 border-b-2 border-black pb-2">
            Plan Distribution
          </h3>
          <div className="space-y-3">
            {(['hacker', 'builder', 'champion'] as SubscriptionPlan[]).map((plan) => {
              const count = planCounts[plan] ?? 0;
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        label={plan.toUpperCase()}
                        className={PLAN_COLORS[plan]}
                      />
                      <span className="font-mono text-[11px] font-bold text-zinc-600">
                        {count.toLocaleString()} users
                      </span>
                    </div>
                    <span className="font-headline font-black text-sm">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-zinc-100 border border-black overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        plan === 'champion'
                          ? 'bg-[#1a1a1a]'
                          : plan === 'builder'
                            ? 'bg-[#0055ff]'
                            : 'bg-[#ffcc00]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────────────────────────────────────
function UsersTab({
  currentAdminId,
  onError,
}: {
  currentAdminId: string;
  onError: (msg: string) => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (pg: number, q: string) => {
      setLoading(true);
      try {
        const res = await listAdminUsers({ page: pg, page_size: 20, search: q });
        setUsers(res.items);
        setTotal(res.total);
        setPages(res.pages);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    fetchUsers(page, search);
  }, [fetchUsers, page, search]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setSearch(v.trim());
    }, 400);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setActionLoading(userId + '-role');
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      flash(`Role updated to ${role}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanChange = async (userId: string, plan: SubscriptionPlan) => {
    setActionLoading(userId + '-plan');
    try {
      const updated = await updateAdminUserPlan(userId, plan);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      flash(`Plan updated to ${plan}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (user: AdminUser) => {
    setConfirm({
      open: true,
      title: 'Delete User',
      message: `Permanently delete "${user.name}" (${user.email})? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm((prev) => ({ ...prev, open: false }));
        setActionLoading(user.id + '-delete');
        try {
          await deleteAdminUser(user.id);
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          setTotal((t) => t - 1);
          flash('User deleted');
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmModal dialog={confirm} onCancel={() => setConfirm((p) => ({ ...p, open: false }))} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
            USER MANAGEMENT
          </span>
          <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter mt-1">
            ALL USERS
            <span className="font-mono text-base font-bold text-zinc-400 ml-3 normal-case tracking-normal">
              ({total})
            </span>
          </h2>
        </div>

        {/* Search */}
        <div className="flex items-center gap-0 border-2 border-black shadow-[3px_3px_0px_0px_#1a1a1a] w-full sm:w-64 bg-white">
          <div className="px-3 py-2.5 border-r-2 border-black">
            <Search className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Search name / email…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 px-3 py-2.5 font-mono text-[11px] bg-transparent outline-none placeholder:text-zinc-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setPage(1); setSearch(''); }}
              className="px-3 py-2.5 hover:text-[#e63b2e] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-[#0055ff] text-white border-2 border-black px-4 py-2.5 font-mono text-[11px] font-bold shadow-[3px_3px_0px_0px_#1a1a1a]">
          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {successMsg}
        </div>
      )}

      {/* Table */}
      <div className="border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] overflow-x-auto bg-white">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-[#1a1a1a] text-white">
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                USER
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                ROLE
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                PLAN
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                AI PTS
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                JOINED
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-center font-black">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" strokeWidth={2} />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 font-mono text-[11px] text-zinc-400 uppercase font-bold">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, idx) => {
                const isSelf = user.id === currentAdminId;
                const busyRole = actionLoading === user.id + '-role';
                const busyPlan = actionLoading === user.id + '-plan';
                const busyDel = actionLoading === user.id + '-delete';
                return (
                  <tr
                    key={user.id}
                    className={`border-b-2 border-black transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f0e8]/60'
                    } hover:bg-[#ffcc00]/10`}
                  >
                    {/* User info */}
                    <td className="px-4 py-3">
                      <p className="font-headline font-black text-[13px] tracking-tight">{user.name}</p>
                      <p className="font-mono text-[9px] text-zinc-500 uppercase font-bold">
                        @{user.username}
                      </p>
                      <p className="font-mono text-[9px] text-zinc-400 truncate max-w-[180px]">
                        {user.email}
                      </p>
                    </td>

                    {/* Role selector */}
                    <td className="px-4 py-3">
                      {busyRole ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" strokeWidth={2} />
                      ) : (
                        <select
                          value={user.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          className={`font-mono text-[10px] uppercase font-black border-2 border-black px-2 py-1 bg-white cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed ${
                            ROLE_COLORS[user.role]
                          }`}
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>

                    {/* Plan selector */}
                    <td className="px-4 py-3">
                      {busyPlan ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" strokeWidth={2} />
                      ) : (
                        <select
                          value={user.subscription_plan}
                          onChange={(e) =>
                            handlePlanChange(user.id, e.target.value as SubscriptionPlan)
                          }
                          className={`font-mono text-[10px] uppercase font-black border-2 border-black px-2 py-1 cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a] ${
                            PLAN_COLORS[user.subscription_plan]
                          }`}
                        >
                          <option value="hacker">hacker</option>
                          <option value="builder">builder</option>
                          <option value="champion">champion</option>
                        </select>
                      )}
                    </td>

                    {/* AI Points */}
                    <td className="px-4 py-3">
                      <span className="font-headline font-black text-lg tracking-tighter">
                        {user.ai_points === -1 ? '∞' : user.ai_points}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 font-mono text-[9px] text-zinc-500 font-bold uppercase whitespace-nowrap">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                          })
                        : '—'}
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-3 text-center">
                      {busyDel ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mx-auto" strokeWidth={2} />
                      ) : (
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleDelete(user)}
                          title={isSelf ? "Can't delete yourself" : 'Delete user'}
                          className="p-1.5 bg-white border-2 border-black hover:bg-[#e63b2e] hover:text-white hover:border-[#e63b2e] transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              PREV
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              NEXT
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hackathons Tab
// ─────────────────────────────────────────────────────────────────────────────
function HackathonsTab({ onError }: { onError: (msg: string) => void }) {
  const [hackathons, setHackathons] = useState<HackathonApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchHackathons = useCallback(
    async (pg: number) => {
      setLoading(true);
      try {
        const res = await listHackathons({ page: pg, page_size: 20 });
        setHackathons(res.items);
        setTotal(res.total);
        setPages(res.pages);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to load hackathons');
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    fetchHackathons(page);
  }, [fetchHackathons, page]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (hack: HackathonApi) => {
    setConfirm({
      open: true,
      title: 'Delete Hackathon',
      message: `Permanently delete "${hack.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setDeleting(hack.id);
        try {
          await deleteHackathon(hack.id);
          setHackathons((prev) => prev.filter((h) => h.id !== hack.id));
          setTotal((t) => t - 1);
          flash('Hackathon deleted');
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Failed to delete hackathon');
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-[#0055ff] text-white',
    upcoming: 'bg-[#ffcc00] text-[#1a1a1a]',
    closed: 'bg-zinc-200 text-zinc-600',
    ended: 'bg-zinc-800 text-white',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmModal dialog={confirm} onCancel={() => setConfirm((p) => ({ ...p, open: false }))} />

      <div>
        <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
          HACKATHON MANAGEMENT
        </span>
        <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter mt-1">
          ALL HACKATHONS
          <span className="font-mono text-base font-bold text-zinc-400 ml-3 normal-case tracking-normal">
            ({total})
          </span>
        </h2>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-[#0055ff] text-white border-2 border-black px-4 py-2.5 font-mono text-[11px] font-bold shadow-[3px_3px_0px_0px_#1a1a1a]">
          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {successMsg}
        </div>
      )}

      <div className="border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] overflow-x-auto bg-white">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-[#1a1a1a] text-white">
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                TITLE
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                PLATFORM
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                STATUS
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-left font-black">
                DEADLINE
              </th>
              <th className="font-mono text-[9px] uppercase tracking-widest px-4 py-3 text-center font-black">
                DEL
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" strokeWidth={2} />
                </td>
              </tr>
            ) : hackathons.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 font-mono text-[11px] text-zinc-400 uppercase font-bold">
                  No hackathons found
                </td>
              </tr>
            ) : (
              hackathons.map((hack, idx) => (
                <tr
                  key={hack.id}
                  className={`border-b-2 border-black transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f0e8]/60'
                  } hover:bg-[#ffcc00]/10`}
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-headline font-black text-[12px] tracking-tight truncate">
                      {hack.title}
                    </p>
                    <p className="font-mono text-[9px] text-zinc-400 truncate">{hack.organizer}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] uppercase font-bold text-zinc-600">
                    {hack.source_platform}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={hack.status ?? 'unknown'}
                      className={STATUS_COLORS[hack.status ?? ''] ?? 'bg-zinc-100 text-zinc-600'}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 font-bold whitespace-nowrap">
                    {hack.deadline
                      ? new Date(hack.deadline).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {deleting === hack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mx-auto" strokeWidth={2} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(hack)}
                        className="p-1.5 bg-white border-2 border-black hover:bg-[#e63b2e] hover:text-white hover:border-[#e63b2e] transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              PREV
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-2 font-headline font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              NEXT
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Tab
// ─────────────────────────────────────────────────────────────────────────────
function SystemTab({ onError }: { onError: (msg: string) => void }) {
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [embedStatus, setEmbedStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [scrapeMsg, setScrapeMsg] = useState('');
  const [embedMsg, setEmbedMsg] = useState('');

  const handleScrape = async () => {
    setScrapeStatus('loading');
    try {
      const res = await triggerScrape();
      setScrapeMsg(res.status);
      setScrapeStatus('done');
    } catch (err) {
      setScrapeMsg(err instanceof Error ? err.message : 'Failed');
      setScrapeStatus('error');
      onError(err instanceof Error ? err.message : 'Scrape failed');
    }
  };

  const handleEmbeddings = async () => {
    setEmbedStatus('loading');
    try {
      const res = await generateEmbeddings();
      setEmbedMsg(res.status);
      setEmbedStatus('done');
    } catch (err) {
      setEmbedMsg(err instanceof Error ? err.message : 'Failed');
      setEmbedStatus('error');
      onError(err instanceof Error ? err.message : 'Embedding generation failed');
    }
  };

  const ActionCard = ({
    icon,
    title,
    desc,
    buttonLabel,
    status,
    msg,
    accent,
    onClick,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    buttonLabel: string;
    status: 'idle' | 'loading' | 'done' | 'error';
    msg: string;
    accent: string;
    onClick: () => void;
  }) => (
    <div className={`border-3 border-black p-6 shadow-[4px_4px_0px_0px_#1a1a1a] ${accent} space-y-4`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
          <span className="text-[#ffcc00]">{icon}</span>
        </div>
        <div>
          <h3 className="font-headline font-black text-lg uppercase">{title}</h3>
          <p className="font-mono text-[10px] text-zinc-600 font-bold">{desc}</p>
        </div>
      </div>

      {status === 'done' && (
        <div className="flex items-center gap-2 bg-[#0055ff] text-white border-2 border-black px-3 py-2 font-mono text-[10px] font-bold">
          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {msg || 'Done'}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 bg-[#e63b2e] text-white border-2 border-black px-3 py-2 font-mono text-[10px] font-bold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {msg || 'Error occurred'}
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={status === 'loading'}
        className="flex items-center gap-2 bg-[#1a1a1a] text-white font-headline font-black text-xs uppercase border-2 border-black px-5 py-3 shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#0055ff] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
        ) : (
          icon
        )}
        {status === 'loading' ? 'RUNNING…' : buttonLabel}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
          SYSTEM CONTROLS
        </span>
        <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter mt-1">
          SYSTEM PANEL
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActionCard
          icon={<Activity className="w-4 h-4" strokeWidth={2.5} />}
          title="TRIGGER SCRAPE"
          desc="Queue a new scraping run to pull the latest hackathons from all sources."
          buttonLabel="TRIGGER SCRAPE"
          status={scrapeStatus}
          msg={scrapeMsg}
          accent="bg-white"
          onClick={handleScrape}
        />
        <ActionCard
          icon={<Database className="w-4 h-4" strokeWidth={2.5} />}
          title="GENERATE EMBEDDINGS"
          desc="Generate vector embeddings for any projects that don't have them yet."
          buttonLabel="GENERATE EMBEDDINGS"
          status={embedStatus}
          msg={embedMsg}
          accent="bg-[#ffcc00]"
          onClick={handleEmbeddings}
        />
      </div>

      {/* Info box */}
      <div className="border-3 border-black bg-[#1a1a1a] text-white p-6 shadow-[4px_4px_0px_0px_#ffcc00] space-y-3">
        <h3 className="font-headline font-black text-lg uppercase text-[#ffcc00]">Admin Notes</h3>
        <ul className="font-mono text-[11px] space-y-2 text-zinc-300 list-disc list-inside">
          <li>Scraping runs are queued — check back in a few minutes for new data.</li>
          <li>Embedding generation runs in the background — large batches may take several minutes.</li>
          <li>Role and plan changes take effect immediately for the user.</li>
          <li>Deleting a user is permanent and removes all their data (bookmarks, tracked projects).</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPanel component
// ─────────────────────────────────────────────────────────────────────────────
interface AdminPanelProps {
  currentUserId: string;
}

export function AdminPanel({ currentUserId }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [planCounts, setPlanCounts] = useState<Record<string, number> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [s, pc] = await Promise.all([getAdminStats(), getAdminPlanCounts()]);
      setStats(s);
      setPlanCounts(pc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'OVERVIEW', icon: <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} /> },
    { id: 'users', label: 'USERS', icon: <Users className="w-3.5 h-3.5" strokeWidth={2.5} /> },
    { id: 'hackathons', label: 'HACKATHONS', icon: <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} /> },
    { id: 'system', label: 'SYSTEM', icon: <Settings2 className="w-3.5 h-3.5" strokeWidth={2.5} /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-black pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[#e63b2e]" strokeWidth={2.5} />
            <span className="font-mono text-[10px] bg-[#e63b2e] text-white py-1 px-3 uppercase font-bold tracking-widest">
              ADMIN ACCESS
            </span>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            ADMIN PANEL
          </h1>
        </div>
        <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold max-w-xs sm:text-right leading-tight">
          Full control over users, hackathons &amp; system operations.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-[#e63b2e] text-white border-3 border-black px-4 py-3 font-mono text-[11px] font-bold shadow-[3px_3px_0px_0px_#1a1a1a]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            {error}
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-headline font-black text-[10px] uppercase tracking-wider border-2 border-black cursor-pointer transition-all ${
              tab === t.id
                ? 'bg-[#1a1a1a] text-white shadow-[3px_3px_0px_0px_#ffcc00]'
                : 'bg-white text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-[#ffcc00]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          stats={stats}
          planCounts={planCounts}
          loading={overviewLoading}
          onRefresh={loadOverview}
        />
      )}
      {tab === 'users' && (
        <UsersTab currentAdminId={currentUserId} onError={setError} />
      )}
      {tab === 'hackathons' && (
        <HackathonsTab onError={setError} />
      )}
      {tab === 'system' && (
        <SystemTab onError={setError} />
      )}
    </div>
  );
}
