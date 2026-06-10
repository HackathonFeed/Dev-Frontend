import { useEffect } from 'react';

type SeoOptions = {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
};

const SITE_ORIGIN = 'https://www.hackathonfeed.com';

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  const el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (el) el.setAttribute(attr, value);
}

export function useSeo({ title, description, canonicalPath, noindex }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[name="twitter:title"]', 'content', title);

    if (canonicalPath) {
      const url = `${SITE_ORIGIN}${canonicalPath}`;
      setMeta('link[rel="canonical"]', 'href', url);
      setMeta('meta[property="og:url"]', 'content', url);
    }

    setMeta(
      'meta[name="robots"]',
      'content',
      noindex ? 'noindex, follow' : 'index, follow',
    );
  }, [title, description, canonicalPath, noindex]);
}
