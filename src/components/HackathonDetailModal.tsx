import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Bookmark,
  Loader2,
  Trophy,
  Globe,
  Tag,
  Building2,
  Clock,
} from 'lucide-react';
import { getHackathon, type HackathonApi } from '../api';
import { getHackathonStatusLabel, getStatusBadgeClass, isHackathonRegistrationOpen, mapHackathonFromApi } from '../lib/mapHackathon';

function normalizeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function statusLabel(data: HackathonApi): string {
  return getHackathonStatusLabel(data);
}

function statusBadgeClass(data: HackathonApi): string {
  return `${getStatusBadgeClass(data.status)} border-black`;
}

interface HackathonDetailModalProps {
  hackathonId: string;
  onClose: () => void;
  isBookmarked: boolean;
  bookmarkLoading: boolean;
  onToggleBookmark: (id: string) => void;
  registerLoading?: boolean;
  isRegistered?: boolean;
  onRegister?: (payload: {
    title: string;
    id: string;
    prizePool: string;
    deadline: string;
    url?: string;
  }) => void;
  onTrack?: (title: string) => void;
  onValidate?: (title: string) => void;
}

export const HackathonDetailModal: React.FC<HackathonDetailModalProps> = ({
  hackathonId,
  onClose,
  isBookmarked,
  bookmarkLoading,
  onToggleBookmark,
  registerLoading = false,
  isRegistered = false,
  onRegister,
  onTrack,
  onValidate,
}) => {
  const [data, setData] = useState<HackathonApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getHackathon(hackathonId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathon');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const mapped = data ? mapHackathonFromApi(data) : null;
  const thumbnail = normalizeThumbnail(data?.thumbnail);
  const registrationOpen = data ? isHackathonRegistrationOpen(data) : false;
  const eventEnded = mapped?.apiStatus === 'ended';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hackathon-detail-title"
    >
      <div
        className="bg-[#f5f0e8] border-4 border-black w-full md:max-w-3xl max-h-[92vh] overflow-y-auto shadow-[8px_8px_0px_0px_#ffcc00] animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#ffcc00] border-b-4 border-black px-5 py-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold tracking-widest">
            Hackathon Intel
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 font-mono text-xs uppercase font-bold text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            Loading full dossier...
          </div>
        ) : error || !data || !mapped ? (
          <div className="p-8 text-center space-y-4">
            <p className="font-mono text-sm uppercase font-bold text-[#e63b2e]">
              {error ?? 'Hackathon not found'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-headline font-black text-xs uppercase px-4 py-2 border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {thumbnail && (
              <div className="border-b-4 border-black bg-zinc-900 aspect-[21/9] overflow-hidden">
                <img
                  src={thumbnail}
                  alt={data.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black ${statusBadgeClass(data)}`}
                    >
                      {statusLabel(data)}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-white">
                      {data.mode}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#0055ff] text-white">
                      {data.source_platform}
                    </span>
                  </div>
                  <h2
                    id="hackathon-detail-title"
                    className="font-headline font-black text-2xl md:text-4xl uppercase tracking-tight text-[#1a1a1a] leading-tight"
                  >
                    {data.title}
                  </h2>
                  {data.organizer && (
                    <p className="font-mono text-xs uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {data.organizer}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[10px] uppercase text-zinc-500 font-bold">Prize pool</p>
                  <p className="font-headline font-black text-2xl md:text-3xl text-[#0055ff]">
                    {data.prize_pool || 'TBD'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Calendar, label: 'Deadline', value: formatDate(data.deadline) },
                  { icon: Clock, label: 'Starts', value: formatDate(data.start_date) },
                  { icon: Clock, label: 'Ends', value: formatDate(data.end_date) },
                  { icon: Users, label: 'Registrations', value: data.registrations?.toLocaleString() ?? '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#1a1a1a]"
                  >
                    <Icon className="w-4 h-4 text-zinc-400 mb-1" />
                    <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold">{label}</p>
                    <p className="font-headline font-black text-sm uppercase">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow icon={MapPin} label="Location" value={mapped.location} />
                <DetailRow icon={Globe} label="Format" value={data.mode} />
                <DetailRow icon={Users} label="Team size" value={data.team_size || '—'} />
                <DetailRow icon={Trophy} label="Platform ID" value={data.platform_id || '—'} />
              </div>

              {data.eligibility.length > 0 && (
                <section>
                  <h3 className="font-headline font-black text-sm uppercase mb-2 border-b-2 border-black pb-1">
                    Eligibility
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.eligibility.map((item) => (
                      <span
                        key={item}
                        className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-white"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(data.categories.length > 0 || data.tags.length > 0) && (
                <section>
                  <h3 className="font-headline font-black text-sm uppercase mb-2 border-b-2 border-black pb-1 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Categories & Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set([...data.categories, ...data.tags])].map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#ffcc00]/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {data.sponsors.length > 0 && (
                <section>
                  <h3 className="font-headline font-black text-sm uppercase mb-2 border-b-2 border-black pb-1">
                    Sponsors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.sponsors.map((sponsor) => (
                      <span
                        key={sponsor}
                        className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-white"
                      >
                        {sponsor}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {data.scraped_at && (
                <p className="font-mono text-[10px] uppercase text-zinc-400">
                  Last indexed: {formatDate(data.scraped_at)}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2 border-t-2 border-dashed border-zinc-300">
                {data.url && (
                  <button
                    type="button"
                    disabled={registerLoading || isRegistered || !registrationOpen}
                    onClick={() =>
                      onRegister?.({
                        title: data.title,
                        id: data.id,
                        prizePool: data.prize_pool || 'TBD',
                        deadline: data.deadline ?? '',
                        url: data.url,
                      })
                    }
                    className={`inline-flex items-center gap-2 font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black shadow-[3px_3px_0px_0px_#1a1a1a] transition-all disabled:cursor-default cursor-pointer ${
                      isRegistered
                        ? 'bg-[#16a34a] text-white'
                        : !registrationOpen
                          ? 'bg-zinc-400 text-white'
                        : 'bg-[#0055ff] text-white hover:bg-black disabled:opacity-70 disabled:cursor-wait'
                    }`}
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registering...
                      </>
                    ) : isRegistered ? (
                      'Registered'
                    ) : !registrationOpen ? (
                      eventEnded ? 'Event Ended' : 'Registration Closed'
                    ) : (
                      <>
                        Register on {data.source_platform}
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleBookmark(data.id)}
                  disabled={bookmarkLoading}
                  className={`inline-flex items-center gap-2 font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black shadow-[3px_3px_0px_0px_#1a1a1a] cursor-pointer disabled:opacity-50 ${
                    isBookmarked ? 'bg-[#ffcc00] text-black' : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  {bookmarkLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-black' : ''}`} />
                  )}
                  {isBookmarked ? 'Saved' : 'Bookmark'}
                </button>
                {onTrack && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!registrationOpen) return;
                      onTrack(data.title);
                      onClose();
                    }}
                    disabled={!registrationOpen}
                    className={`inline-flex items-center gap-2 font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black transition-all ${
                      registrationOpen
                        ? 'bg-[#1a1a1a] text-white hover:bg-[#ffcc00] hover:text-black cursor-pointer'
                        : 'bg-zinc-400 text-white cursor-not-allowed'
                    }`}
                  >
                    {eventEnded ? 'Event ended' : 'Track build'}
                  </button>
                )}
                {onValidate && (
                  <button
                    type="button"
                    onClick={() => {
                      onValidate(data.title);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 bg-white font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black hover:bg-[#e63b2e] hover:text-white transition-all cursor-pointer"
                  >
                    AI validate idea
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white border-2 border-black p-3">
      <Icon className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold">{label}</p>
        <p className="font-mono text-xs font-bold uppercase text-[#1a1a1a]">{value}</p>
      </div>
    </div>
  );
}
