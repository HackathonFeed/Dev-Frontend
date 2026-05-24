import type { HackathonApi } from '../api/types';
import type { Hackathon } from '../types';

export type HackathonApiStatus = NonNullable<Hackathon['apiStatus']>;

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || value === 'TBD') return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Client-side fallback when API status is missing. Mirrors backend date rules. */
export function deriveApiStatusFromDates(
  api: Pick<HackathonApi, 'start_date' | 'end_date' | 'deadline' | 'status'>,
): HackathonApiStatus | null {
  if (api.status) return api.status;

  const today = todayDateOnly();
  const endDate = parseDateOnly(api.end_date);
  const deadline = parseDateOnly(api.deadline);
  const startDate = parseDateOnly(api.start_date);

  if (endDate && endDate < today) return 'ended';
  if (deadline && deadline < today) return 'closed';
  if (startDate && startDate > today) return 'upcoming';
  if (endDate || deadline || startDate) return 'open';

  return null;
}

export function getHackathonStatusLabel(
  api: Pick<HackathonApi, 'status' | 'status_label' | 'start_date' | 'end_date' | 'deadline'>,
): string {
  if (api.status_label) return api.status_label;

  const status = deriveApiStatusFromDates(api) ?? api.status;
  switch (status) {
    case 'open': {
      const startDate = parseDateOnly(api.start_date);
      const today = todayDateOnly();
      if (startDate && startDate <= today) return 'Live Now';
      return 'Open for Registration';
    }
    case 'closed':
      return 'Registration Closed';
    case 'upcoming':
      return 'Upcoming';
    case 'ended':
      return 'Ended';
    default:
      return 'Unknown';
  }
}

export function getStatusBadgeClass(apiStatus: Hackathon['apiStatus']): string {
  switch (apiStatus) {
    case 'open':
      return 'bg-emerald-500 text-white border-black';
    case 'closed':
      return 'bg-zinc-800 text-white border-black';
    case 'upcoming':
      return 'bg-[#0055ff] text-white border-black';
    case 'ended':
      return 'bg-zinc-300 text-zinc-800 border-black';
    default:
      return 'bg-zinc-100 text-zinc-700 border-black';
  }
}

export function getCardStatusLabel(hack: Pick<Hackathon, 'statusLabel' | 'apiStatus'>): string {
  if (hack.statusLabel) return hack.statusLabel;

  switch (hack.apiStatus) {
    case 'open':
      return 'Open';
    case 'closed':
      return 'Reg. Closed';
    case 'upcoming':
      return 'Upcoming';
    case 'ended':
      return 'Ended';
    default:
      return 'Unknown';
  }
}

export function isHackathonRegistrationOpen(
  api: Pick<HackathonApi, 'status' | 'start_date' | 'end_date' | 'deadline'>,
): boolean {
  const status = deriveApiStatusFromDates(api) ?? api.status;
  return status === 'open' || status === 'upcoming';
}

const CARD_SHADOWS = ['#ffcc00', '#0055ff', '#e63b2e', '#1a1a1a'];

function formatLocation(api: HackathonApi): string {
  if (api.location) return api.location;
  switch (api.mode) {
    case 'online':
      return 'Global Remote';
    case 'hybrid':
      return 'Hybrid / Remote';
    case 'offline':
      return 'On-site';
    default:
      return 'Online / Remote';
  }
}

function buildDescription(api: HackathonApi): string {
  const parts: string[] = [];
  if (api.organizer) parts.push(`Organized by ${api.organizer}`);
  if (api.source_platform) parts.push(`Platform: ${api.source_platform}`);
  if (api.team_size) parts.push(`Team size: ${api.team_size}`);
  if (api.sponsors?.length) {
    parts.push(`Sponsors: ${api.sponsors.slice(0, 3).join(', ')}`);
  }
  return parts.length > 0
    ? parts.join(' · ')
    : 'Discover this hackathon on HackathonFeed.';
}

export function mapHackathonFromApi(api: HackathonApi, index = 0): Hackathon {
  const apiStatus = deriveApiStatusFromDates(api) ?? api.status ?? null;
  const statusLabel = getHackathonStatusLabel(api);
  const tags = [...new Set([...(api.categories ?? []), ...(api.tags ?? [])])]
    .filter(Boolean)
    .map((t) => t.toUpperCase())
    .slice(0, 6);

  const shadowIndex =
    (api.id.charCodeAt(0) + api.id.charCodeAt(api.id.length - 1) + index) %
    CARD_SHADOWS.length;

  return {
    id: api.id,
    title: api.title,
    prizePool: api.prize_pool || 'TBD',
    deadline: api.deadline || api.end_date || 'TBD',
    startDate: api.start_date ?? undefined,
    endDate: api.end_date ?? undefined,
    tags: tags.length > 0 ? tags : ['GENERAL'],
    location: formatLocation(api),
    statusLabel,
    participantsCount: api.registrations ?? 0,
    description: buildDescription(api),
    cardShadow: CARD_SHADOWS[shadowIndex],
    url: api.url,
    organizer: api.organizer,
    sourcePlatform: api.source_platform,
    mode: api.mode,
    thumbnail: api.thumbnail,
    apiStatus,
  };
}

export function mapHackathonsFromApi(items: HackathonApi[]): Hackathon[] {
  return items.map((item, index) => mapHackathonFromApi(item, index));
}
