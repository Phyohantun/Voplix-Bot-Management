const LOCAL_FALLBACK = 'http://localhost:3000';

function normalizeSiteUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function getClientSiteUrl(): string {
  const envSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envSiteUrl) return envSiteUrl;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return LOCAL_FALLBACK;
}

export function getServerSiteUrl(origin?: string): string {
  const envSiteUrl =
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.SITE_URL);
  if (envSiteUrl) return envSiteUrl;

  const requestOrigin = normalizeSiteUrl(origin);
  if (requestOrigin) return requestOrigin;

  return LOCAL_FALLBACK;
}
