// Vercel serverless function: catches all page routes that need SEO meta injection.
// vercel.json rewrites /, /hackathons, /h/:id, /login, /signup, /u/:user here.
// Reads the built index.html (bundled via includeFiles), injects per-route
// title/description/canonical/OG/Twitter, and for /h/:id pulls hackathon data
// from the backend + adds Event JSON-LD.

import { readFileSync } from 'fs';
import { join } from 'path';
import { backendApiUrl } from './_backend';

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://www.hackathonfeed.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

// Read the built index.html once on cold start (bundled via vercel.json includeFiles).
let templateCache: string | null = null;
function loadTemplate(): string {
  if (templateCache) return templateCache;
  // dist/index.html sits at the repo root after `vite build`
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    try {
      templateCache = readFileSync(p, 'utf-8');
      return templateCache;
    } catch {
      // try next
    }
  }
  templateCache = '<!doctype html><html><head><title>HackathonFeed</title></head><body><div id="root"></div></body></html>';
  return templateCache;
}

type RouteSeo = {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  robots?: string;
};

type HackathonApi = {
  id: string;
  title: string;
  organizer?: string | null;
  url?: string | null;
  thumbnail?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  prize_pool?: string | null;
  mode?: string | null;
  location?: string | null;
  status?: string | null;
  source_platform?: string | null;
};

type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function seoForPath(pathname: string): RouteSeo {
  if (pathname === '/' || pathname === '') {
    return {
      title: 'HackathonFeed | Discover, Track, and Win Hackathons',
      description:
        'HackathonFeed helps builders discover active hackathons, track applications, explore winning projects, and use an AI copilot to plan stronger submissions.',
      canonical: `${SITE_ORIGIN}/`,
    };
  }
  if (pathname === '/hackathons' || pathname === '/explore') {
    return {
      title: 'Browse Hackathons — HackathonFeed',
      description:
        'Search and filter hundreds of active hackathons from Devfolio, Devpost, ETHGlobal, and more. Find online, in-person, AI, Web3, and student events with prize pools.',
      canonical: `${SITE_ORIGIN}/hackathons`,
    };
  }
  if (pathname === '/login') {
    return {
      title: 'Sign in to HackathonFeed',
      description: 'Sign in to track hackathon applications, save events, and access your AI copilot.',
      canonical: `${SITE_ORIGIN}/login`,
      robots: 'noindex, follow',
    };
  }
  if (pathname === '/signup') {
    return {
      title: 'Create your HackathonFeed account',
      description: 'Create a free HackathonFeed account to discover hackathons, track applications, and validate ideas with AI.',
      canonical: `${SITE_ORIGIN}/signup`,
      robots: 'noindex, follow',
    };
  }
  const profileMatch = pathname.match(/^\/u\/([a-zA-Z0-9_-]{3,30})\/?$/);
  if (profileMatch) {
    const username = profileMatch[1];
    return {
      title: `@${username} on HackathonFeed`,
      description: `Public hackathon profile for @${username} — projects, hackathons, and submissions on HackathonFeed.`,
      canonical: `${SITE_ORIGIN}/u/${username}`,
    };
  }
  return {
    title: 'HackathonFeed | Discover, Track, and Win Hackathons',
    description:
      'HackathonFeed helps builders discover active hackathons, track applications, explore winning projects, and use an AI copilot to plan stronger submissions.',
    canonical: `${SITE_ORIGIN}${pathname}`,
  };
}

function applySeoTags(html: string, seo: RouteSeo): string {
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const canonical = escapeHtml(seo.canonical);
  const ogImage = escapeHtml(seo.ogImage ?? DEFAULT_OG_IMAGE);
  const robots = escapeHtml(seo.robots ?? 'index, follow');

  let next = html;
  next = next.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  next = next.replace(/<meta\s+name="description"[^>]*>/, `<meta name="description" content="${description}" />`);
  next = next.replace(/<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="${robots}" />`);
  next = next.replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  next = next.replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`);
  next = next.replace(/<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`);
  next = next.replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  next = next.replace(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}" />`);
  next = next.replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`);
  next = next.replace(/<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`);
  next = next.replace(/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${ogImage}" />`);
  return next;
}

async function fetchHackathon(
  id: string,
  req?: { headers?: { host?: string } },
): Promise<HackathonApi | null> {
  try {
    const resp = await fetch(
      backendApiUrl(`/api/v1/hackathons/${encodeURIComponent(id)}`, req),
    );
    if (!resp.ok) return null;
    const body = (await resp.json()) as ApiEnvelope<HackathonApi> | HackathonApi;
    return 'data' in body ? body.data : (body as HackathonApi);
  } catch {
    return null;
  }
}

function buildHackathonSeo(hack: HackathonApi): RouteSeo {
  return {
    title: `${hack.title}${hack.prize_pool ? ` — ${hack.prize_pool} Prize Pool` : ''} | HackathonFeed`,
    description: `${hack.title} on ${hack.source_platform ?? 'HackathonFeed'}. ${
      hack.organizer ? `Organized by ${hack.organizer}. ` : ''
    }${hack.prize_pool ?? ''} ${hack.deadline ? `Deadline: ${hack.deadline}.` : ''}`.trim(),
    canonical: `${SITE_ORIGIN}/h/${hack.id}`,
    ogImage: hack.thumbnail ?? DEFAULT_OG_IMAGE,
  };
}

function injectHackathonPreview(html: string, hack: HackathonApi): string {
  const title = escapeHtml(hack.title);
  const organizer = hack.organizer ? escapeHtml(hack.organizer) : null;
  const prizePool = hack.prize_pool ? escapeHtml(hack.prize_pool) : null;
  const deadline = hack.deadline ? escapeHtml(hack.deadline) : null;
  const platform = hack.source_platform ? escapeHtml(hack.source_platform) : 'HackathonFeed';
  const mode = hack.mode ? escapeHtml(hack.mode) : null;
  const preview = `<main id="ssr-hackathon-preview">
  <h1>${title}</h1>
  <p>${title} on ${platform}${organizer ? `, organized by ${organizer}` : ''}.</p>
  <ul>
    ${prizePool ? `<li>Prize pool: ${prizePool}</li>` : ''}
    ${deadline ? `<li>Deadline: ${deadline}</li>` : ''}
    ${mode ? `<li>Mode: ${mode}</li>` : ''}
  </ul>
  <p><a href="${escapeHtml(hack.url ?? `${SITE_ORIGIN}/h/${hack.id}`)}">View hackathon details</a></p>
</main>`;

  return html.replace('<div id="root"></div>', `<div id="root">${preview}</div>`);
}

function buildEventJsonLd(hack: HackathonApi): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/h/${hack.id}`;
  const mode = (hack.mode ?? 'unknown').toLowerCase();
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: hack.title,
    description: `${hack.title} on ${hack.source_platform ?? 'HackathonFeed'} — ${hack.prize_pool ?? 'prize pool TBD'}.`,
    startDate: hack.start_date ?? undefined,
    endDate: hack.end_date ?? hack.deadline ?? undefined,
    eventStatus:
      hack.status === 'ended'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      mode === 'online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : mode === 'offline'
          ? 'https://schema.org/OfflineEventAttendanceMode'
          : 'https://schema.org/MixedEventAttendanceMode',
    location:
      mode === 'online'
        ? { '@type': 'VirtualLocation', url: hack.url ?? url }
        : {
            '@type': 'Place',
            name: hack.location ?? 'Online',
            address: hack.location ?? 'Online',
          },
    organizer: hack.organizer
      ? { '@type': 'Organization', name: hack.organizer }
      : undefined,
    image: hack.thumbnail ?? DEFAULT_OG_IMAGE,
    url,
  };
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'www.hackathonfeed.com'}`);
  const pathname = url.pathname;

  let html = loadTemplate();

  const hackMatch = pathname.match(/^\/h\/([a-zA-Z0-9_-]+)\/?$/);
  if (hackMatch) {
    const hack = await fetchHackathon(hackMatch[1], req);
    if (hack) {
      html = applySeoTags(html, buildHackathonSeo(hack));
      html = injectHackathonPreview(html, hack);
      const jsonLd = `<script type="application/ld+json" id="hackathon-event-jsonld">${JSON.stringify(buildEventJsonLd(hack))}</script>`;
      html = html.replace('</head>', `${jsonLd}</head>`);
    } else {
      html = applySeoTags(html, seoForPath(pathname));
    }
  } else {
    html = applySeoTags(html, seoForPath(pathname));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
  );
  res.status(200).send(html);
}
