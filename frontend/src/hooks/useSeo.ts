import { useEffect } from 'react';

const SITE = 'One';
const ORIGIN = 'https://ourneweye.com';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets per-route <title>, meta description, canonical and the key Open Graph
 * tags. No dependency — just mutates document.head on mount. index.html holds
 * the defaults (home page); each page overrides here.
 */
export function useSeo(opts: { title: string; description?: string; path?: string }) {
  const { title, description, path } = opts;
  useEffect(() => {
    const fullTitle = title.includes(SITE) ? title : `${title} — ${SITE}`;
    document.title = fullTitle;

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);

    if (path !== undefined) {
      const url = `${ORIGIN}${path}`;
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = url;
      setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    }
  }, [title, description, path]);
}
