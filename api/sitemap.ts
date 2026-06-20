// Vercel serverless function: GET /sitemap.xml
// Mapped via vercel.json: rewrite /sitemap.xml -> /api/sitemap
// Generates a sitemap that includes every hackathon from the backend so Google can
// discover individual /h/<id> URLs.

import { backendApiUrl } from './_backend';

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://www.hackathonfeed.com';

type HackathonApi = {
  id: string;
  deadline?: string | null;
  end_date?: string | null;
};

type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchAllHackathons(
  req?: { headers?: { host?: string } },
): Promise<HackathonApi[]> {
  const collected: HackathonApi[] = [];
  let page = 1;
  while (page < 50) {
    try {
      const resp = await fetch(
        backendApiUrl(
          `/api/v1/hackathons?page=${page}&page_size=100&only_open=false`,
          req,
        ),
      );
      if (!resp.ok) break;
      const body = (await resp.json()) as
        | ApiEnvelope<{ items: HackathonApi[]; pages: number }>
        | { items: HackathonApi[]; pages: number };
      const payload = 'data' in body ? body.data : body;
      collected.push(...(payload.items ?? []));
      if (page >= (payload.pages ?? 1)) break;
      page += 1;
    } catch {
      break;
    }
  }
  return collected;
}

// Vercel Node.js function signature
export default async function handler(req: any, res: any) {
  try {
    const hackathons = await fetchAllHackathons(req);
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
    (u: any) =>
      `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${escapeXml(String(u.lastmod))}</lastmod>` : ''}\n  </url>`,
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache 10 min at the edge; revalidate in background for an extra hour
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    );
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send('Sitemap generation failed');
  }
}
