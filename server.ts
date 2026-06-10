import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://www.hackathonfeed.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://0.0.0.0:8000';

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
  categories?: string[];
  tags?: string[];
  eligibility?: string[];
  registrations?: number | null;
};

type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

async function fetchHackathon(id: string): Promise<HackathonApi | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/hackathons/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const body = (await response.json()) as ApiEnvelope<HackathonApi> | HackathonApi;
    return 'data' in body ? body.data : (body as HackathonApi);
  } catch {
    return null;
  }
}

async function fetchAllHackathonsForSitemap(): Promise<HackathonApi[]> {
  try {
    const collected: HackathonApi[] = [];
    let page = 1;
    while (page < 50) {
      const resp = await fetch(
        `${BACKEND_URL}/api/v1/hackathons?page=${page}&page_size=100&only_open=false`,
      );
      if (!resp.ok) break;
      const body = (await resp.json()) as ApiEnvelope<{ items: HackathonApi[]; pages: number }> | {
        items: HackathonApi[];
        pages: number;
      };
      const payload = 'data' in body ? body.data : body;
      collected.push(...(payload.items ?? []));
      if (page >= (payload.pages ?? 1)) break;
      page += 1;
    }
    return collected;
  } catch {
    return [];
  }
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

type RouteSeo = {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  robots?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function seoForPath(pathname: string): RouteSeo {
  const canonical = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

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
    robots: 'noindex, follow',
  };
}

async function injectSeo(html: string, pathname: string): Promise<string> {
  const hackathonMatch = pathname.match(/^\/h\/([a-zA-Z0-9_-]+)\/?$/);
  if (hackathonMatch) {
    const hack = await fetchHackathon(hackathonMatch[1]);
    if (hack) {
      const seo: RouteSeo = {
        title: `${hack.title}${hack.prize_pool ? ` — ${hack.prize_pool} Prize Pool` : ''} | HackathonFeed`,
        description: `${hack.title} on ${hack.source_platform ?? 'HackathonFeed'}. ${hack.organizer ? `Organized by ${hack.organizer}. ` : ''}${hack.prize_pool ?? ''} ${hack.deadline ? `Deadline: ${hack.deadline}.` : ''}`.trim(),
        canonical: `${SITE_ORIGIN}/h/${hack.id}`,
        ogImage: hack.thumbnail ?? DEFAULT_OG_IMAGE,
      };
      let next = applySeoTags(html, seo);
      const jsonLd = `<script type="application/ld+json" id="hackathon-event-jsonld">${JSON.stringify(buildEventJsonLd(hack))}</script>`;
      next = next.replace('</head>', `${jsonLd}</head>`);
      return next;
    }
  }

  return applySeoTags(html, seoForPath(pathname));
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

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function readRawBody(req: express.Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('multipart/form-data')) {
    next();
    return;
  }
  express.json()(req, res, next);
});

// Proxy FastAPI backend through same origin (avoids CORS / localhost vs 127.0.0.1 issues)
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization as string;
    }
    const contentType = req.headers['content-type'];
    if (contentType) {
      headers['Content-Type'] = contentType as string;
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const isMultipart =
      typeof contentType === 'string' && contentType.includes('multipart/form-data');

    let requestBody: BodyInit | undefined;
    if (hasBody) {
      if (isMultipart) {
        const rawBody = await readRawBody(req);
        if (!rawBody.length) {
          res.status(400).json({
            success: false,
            message: 'Upload request arrived without a file body. Retry the upload.',
          });
          return;
        }
        requestBody = rawBody.buffer.slice(
          rawBody.byteOffset,
          rawBody.byteOffset + rawBody.byteLength
        ) as ArrayBuffer;
      } else {
        requestBody = JSON.stringify(req.body ?? {});
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody,
    });

    const responseBody = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(responseBody);
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(502).json({
      success: false,
      message: 'Backend unavailable. Check BACKEND_URL or your Render API deployment.',
    });
  }
});

app.use('/uploads', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
    const response = await fetch(targetUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    res.send(buffer);
  } catch (error) {
    console.error('Uploads proxy error:', error);
    res.status(502).send('Uploads unavailable');
  }
});

app.get('/health', async (_req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const body = await response.text();
    res.status(response.status).type('application/json').send(body);
  } catch {
    res.status(502).json({
      success: false,
      message: 'Backend unavailable',
      data: { status: 'offline' },
    });
  }
});

// Lazy-loaded GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY environment variable is not configured in Secrets. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API: Validate Hackathon Idea Pitch
app.post('/api/validate-idea', async (req, res) => {
  try {
    const { projectTitle, hackathonName, techStack, conceptPitch } = req.body;
    if (!projectTitle || !conceptPitch) {
      return res.status(400).json({ error: 'Project Title and Concept Pitch are required.' });
    }

    const ai = getGenAI();

    const systemInstruction = `You are the Neural Forge Chief Strategist, an esteemed global hackathon judge, and elite chief systems architect of the Weimar-Tech Laboratory.
You analyze hackathon submissions and mock drafts with absolute directness, profound clarity, and modernist engineering brilliance ("Form Follows Function", "No fluff, no decorations, just pure raw utility").

Analyze the project detail strictly and provide a structured JSON response evaluating:
1. Technical Feasibility (how realistic is it to execute this in a 36-hour window? Give an integer score out of 10)
2. Originality Score (is this another standard generic wrapper, or a genuine utility? Give an integer score out of 10)
3. Brutalist Directness (does the user solve the problem directly or decorate empty features? Give an integer score out of 10)
4. Key Strengths (3 bullet points of what makes this idea strong, asymmetric, or competitive)
5. Required Upgrades (3 custom, advanced, specific engineering upgrades or features they MUST implement to win the grand prize)
6. Suggested Teammates (3 technical specialist roles they should recruit right away to build this successfully)
7. Verdict Summary (1-2 sentences of bold, high-impact overview of their project concept)
8. Critique (A detailed, beautifully written modernist Art-and-Technology review in Markdown format discussing spatial logic, server Authoritativeness, and direct value to users)
9. Visual Theme Proposal (A brilliant visual motif style suggestion suitable for their front-end, e.g. "Space Grotesk typography printed over high-contrast yellow cards with thick pitch-black blocks").`;

    const modelName = 'gemini-3.5-flash';
    const contents = `Evaluate the following Hackathon project pitch request:
- Project Title: "${projectTitle}"
- Target Hackathon: "${hackathonName || 'Any global hackathon'}"
- Technologies chosen: "${techStack || 'Not specified'}"
- Concept Pitch: "${conceptPitch}"`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feasibilityScore: { type: Type.INTEGER, description: "Score out of 10 for executable feasibility" },
            originalityScore: { type: Type.INTEGER, description: "Score out of 10 for true uniqueness" },
            brutalistDirectness: { type: Type.INTEGER, description: "Score out of 10 representing form-following-function speed and directness" },
            verdictSummary: { type: Type.STRING, description: "A bold, punchy 1-sentence tagline of the feedback" },
            critique: { type: Type.STRING, description: "Detailed critical masterwork evaluation formatted beautifully in standard Markdown" },
            keyStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Must contain exactly 3 strong points of the project"
            },
            requiredUpgrades: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Must contain exactly 3 advanced technical upgrade features to win"
            },
            suggestedTeammates: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 3 team members role titles with witty descriptions"
            },
            visualThemeProposal: { type: Type.STRING, description: "A high-concept visual style design prompt for their front-end interface" },
          },
          required: [
            'feasibilityScore',
            'originalityScore',
            'brutalistDirectness',
            'verdictSummary',
            'critique',
            'keyStrengths',
            'requiredUpgrades',
            'suggestedTeammates',
            'visualThemeProposal',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error('Error validating hackathon idea:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze your hackathon idea' });
  }
});

let sitemapCache: { xml: string; expires: number } | null = null;
const SITEMAP_TTL_MS = 10 * 60 * 1000;

app.get('/sitemap.xml', async (_req, res) => {
  try {
    if (sitemapCache && sitemapCache.expires > Date.now()) {
      res.type('application/xml').send(sitemapCache.xml);
      return;
    }
    const hackathons = await fetchAllHackathonsForSitemap();
    const urls = [
      { loc: `${SITE_ORIGIN}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${SITE_ORIGIN}/hackathons`, changefreq: 'daily', priority: '0.9' },
      ...hackathons.map((h) => ({
        loc: `${SITE_ORIGIN}/h/${h.id}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: h.deadline ?? h.end_date ?? undefined,
      })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${(u as any).lastmod ? `\n    <lastmod>${escapeHtml(String((u as any).lastmod))}</lastmod>` : ''}\n  </url>`,
  )
  .join('\n')}
</urlset>`;
    sitemapCache = { xml, expires: Date.now() + SITEMAP_TTL_MS };
    res.type('application/xml').send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).type('text/plain').send('Sitemap generation failed.');
  }
});

// Vite middleware & Client serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/uploads') ||
        req.path === '/health' ||
        /\.[a-zA-Z0-9]+$/.test(req.path)
      ) {
        return next();
      }
      try {
        const templatePath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const html = await injectSeo(template, req.path);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const indexTemplate = fs.readFileSync(indexPath, 'utf-8');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      const html = await injectSeo(indexTemplate, req.path);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HackathonFeed Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
