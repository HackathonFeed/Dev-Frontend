import React, { useEffect, useState } from 'react';
import {
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
  ArrowLeft,
} from 'lucide-react';
import { getHackathon, type HackathonApi } from '../api';
import {
  getHackathonStatusLabel,
  getStatusBadgeClass,
  isHackathonRegistrationOpen,
  mapHackathonFromApi,
} from '../lib/mapHackathon';

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

interface HackathonDetailPageProps {
  hackathonId: string;
  isAuthenticated: boolean;
  isBookmarked: boolean;
  bookmarkLoading: boolean;
  isRegistered: boolean;
  registerLoading: boolean;
  onToggleBookmark: (id: string) => void;
  onRegister: (payload: {
    title: string;
    id: string;
    prizePool: string;
    deadline: string;
    url?: string;
  }) => void;
  onBack: () => void;
  onSignIn: () => void;
}

export const HackathonDetailPage: React.FC<HackathonDetailPageProps> = ({
  hackathonId,
  isAuthenticated,
  isBookmarked,
  bookmarkLoading,
  isRegistered,
  registerLoading,
  onToggleBookmark,
  onRegister,
  onBack,
  onSignIn,
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hackathon');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  const mapped = data ? mapHackathonFromApi(data) : null;
  const thumbnail = normalizeThumbnail(data?.thumbnail);
  const registrationOpen = data ? isHackathonRegistrationOpen(data) : false;
  const eventEnded = mapped?.apiStatus === 'ended';

  useEffect(() => {
    if (!data) return;
    const eventSchema = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: data.title,
      description: mapped?.description ?? data.title,
      startDate: data.start_date ?? undefined,
      endDate: data.end_date ?? data.deadline ?? undefined,
      eventStatus:
        data.status === 'ended'
          ? 'https://schema.org/EventCancelled'
          : 'https://schema.org/EventScheduled',
      eventAttendanceMode:
        data.mode === 'online'
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : data.mode === 'offline'
            ? 'https://schema.org/OfflineEventAttendanceMode'
            : 'https://schema.org/MixedEventAttendanceMode',
      location:
        data.mode === 'online'
          ? { '@type': 'VirtualLocation', url: data.url }
          : {
              '@type': 'Place',
              name: data.location ?? 'Online',
              address: data.location ?? 'Online',
            },
      organizer: data.organizer
        ? { '@type': 'Organization', name: data.organizer }
        : undefined,
      offers: data.prize_pool
        ? {
            '@type': 'Offer',
            name: 'Prize Pool',
            price: data.prize_pool.replace(/[^0-9.]/g, '') || undefined,
            priceCurrency: /₹|INR/i.test(data.prize_pool) ? 'INR' : 'USD',
            url: data.url,
            availability: registrationOpen
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          }
        : undefined,
      url: `https://www.hackathonfeed.com/h/${data.id}`,
      image: thumbnail ?? undefined,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'hackathon-event-jsonld';
    script.text = JSON.stringify(eventSchema);
    document.head.querySelector('#hackathon-event-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.head.querySelector('#hackathon-event-jsonld')?.remove();
    };
  }, [data, mapped?.description, thumbnail, registrationOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center font-mono text-xs uppercase font-bold text-zinc-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading hackathon...
      </div>
    );
  }

  if (error || !data || !mapped) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center gap-4 p-8">
        <p className="font-mono text-sm uppercase font-bold text-[#e63b2e]">
          {error ?? 'Hackathon not found'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-headline font-black text-xs uppercase px-5 py-3 border-2 border-black bg-white shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] cursor-pointer"
        >
          ← Back to hackathons
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] pb-16">
      <header className="sticky top-0 z-40 bg-background border-b-4 border-primary">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 font-headline font-black text-xs uppercase text-primary hover:text-secondary cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            All hackathons
          </button>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onSignIn}
              className="font-headline font-black text-xs uppercase bg-[#ffcc00] text-primary border-2 border-primary px-4 py-2 shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <article className="max-w-[1200px] mx-auto px-6 mt-6">
        {/* Hero: title block + thumbnail side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch">
          <div className="lg:col-span-7 bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_#1a1a1a] flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <span
                className={`font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black ${getStatusBadgeClass(data.status)} border-black`}
              >
                {getHackathonStatusLabel(data)}
              </span>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-white">
                {data.mode}
              </span>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-1 border-2 border-black bg-[#0055ff] text-white">
                {data.source_platform}
              </span>
            </div>

            <h1 className="font-headline font-black text-3xl md:text-4xl xl:text-5xl uppercase tracking-tight text-[#1a1a1a] leading-[0.95]">
              {data.title}
            </h1>

            {data.organizer && (
              <p className="font-mono text-xs uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {data.organizer}
              </p>
            )}

            <div className="mt-auto pt-4 border-t-2 border-dashed border-zinc-200 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase text-zinc-500 font-bold mb-1">Prize pool</p>
                <p className="font-headline font-black text-3xl md:text-4xl text-[#0055ff] leading-none">
                  {data.prize_pool || 'TBD'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-zinc-500 font-mono text-[10px]">
                {data.deadline && (
                  <span className="flex items-center gap-1 uppercase font-bold bg-[#f5f0e8] border-2 border-black px-2 py-1">
                    <Calendar className="w-3.5 h-3.5" /> Due {formatDate(data.deadline)}
                  </span>
                )}
                {mapped.location && (
                  <span className="flex items-center gap-1 uppercase font-bold bg-[#f5f0e8] border-2 border-black px-2 py-1">
                    <MapPin className="w-3.5 h-3.5" /> {mapped.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {thumbnail ? (
            <div className="lg:col-span-5 border-4 border-black bg-zinc-900 aspect-[4/3] lg:aspect-auto overflow-hidden shadow-[8px_8px_0px_0px_#ffcc00] min-h-[260px]">
              <img
                src={thumbnail}
                alt={data.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                width={800}
                height={600}
              />
            </div>
          ) : (
            <div className="lg:col-span-5 border-4 border-black bg-[#ffcc00] aspect-[4/3] lg:aspect-auto shadow-[8px_8px_0px_0px_#1a1a1a] min-h-[260px] flex items-center justify-center">
              <Trophy className="w-24 h-24 text-[#1a1a1a]" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="bg-white border-4 border-black p-6 md:p-10 shadow-[8px_8px_0px_0px_#1a1a1a] space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: 'Deadline', value: formatDate(data.deadline) },
              { icon: Clock, label: 'Starts', value: formatDate(data.start_date) },
              { icon: Clock, label: 'Ends', value: formatDate(data.end_date) },
              { icon: Users, label: 'Registrations', value: data.registrations?.toLocaleString() ?? '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-[#f5f0e8] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#1a1a1a]"
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
            <DetailRow icon={Trophy} label="Platform" value={data.source_platform || '—'} />
          </div>

          {mapped.description && (
            <section>
              <h2 className="font-headline font-black text-base uppercase mb-2 border-b-2 border-black pb-1">
                About this hackathon
              </h2>
              <p className="font-body text-sm text-zinc-700 leading-relaxed">
                {mapped.description}
              </p>
            </section>
          )}

          {data.eligibility.length > 0 && (
            <section>
              <h2 className="font-headline font-black text-base uppercase mb-2 border-b-2 border-black pb-1">
                Eligibility
              </h2>
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
              <h2 className="font-headline font-black text-base uppercase mb-2 border-b-2 border-black pb-1 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categories & Tags
              </h2>
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
              <h2 className="font-headline font-black text-base uppercase mb-2 border-b-2 border-black pb-1">
                Sponsors
              </h2>
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

          <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-dashed border-zinc-300">
            {data.url && (
              <button
                type="button"
                disabled={registerLoading || isRegistered || !registrationOpen}
                onClick={() =>
                  onRegister({
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
          </div>

          {data.scraped_at && (
            <p className="font-mono text-[10px] uppercase text-zinc-400">
              Last indexed: {formatDate(data.scraped_at)}
            </p>
          )}
        </div>
      </article>
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
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 border-2 border-black bg-[#f5f0e8] p-3">
      <Icon className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
      <div>
        <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold">{label}</p>
        <p className="font-headline font-black text-sm uppercase">{value ?? '—'}</p>
      </div>
    </div>
  );
}
