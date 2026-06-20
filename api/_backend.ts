const DIRECT_BACKEND = 'https://dev-backend-rho.vercel.app';

/** Local dev BACKEND_URL values must not be used on Vercel serverless functions. */
function isLocalBackendUrl(url: string): boolean {
  return /^(https?:\/\/)?(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?/i.test(url);
}

/**
 * Resolve where serverless SEO/sitemap handlers should fetch hackathon data.
 * Prefers BACKEND_URL when it points at a real host; otherwise uses the
 * same-origin /api/v1 proxy (vercel.json) or the production backend URL.
 */
export function resolveBackendOrigin(req?: { headers?: { host?: string } }): string {
  const env = process.env.BACKEND_URL?.replace(/\/$/, '');
  if (env && !isLocalBackendUrl(env)) {
    return env;
  }

  const host = req?.headers?.host;
  if (host && !host.includes('localhost')) {
    return `https://${host}`;
  }

  return DIRECT_BACKEND;
}

export function backendApiUrl(path: string, req?: { headers?: { host?: string } }): string {
  const origin = resolveBackendOrigin(req);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
