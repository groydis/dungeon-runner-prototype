export type SitePage = 'home' | 'classes' | 'about' | 'privacy' | 'support';

export const SITE_PAGES: readonly SitePage[] = [
  'home',
  'classes',
  'about',
  'privacy',
  'support',
];

export function isSitePage(value: string | null | undefined): value is SitePage {
  return (
    value === 'home' ||
    value === 'classes' ||
    value === 'about' ||
    value === 'privacy' ||
    value === 'support'
  );
}

export function normalisedPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function sitePageFromPath(pathname: string): SitePage {
  return exactSitePageFromPath(pathname) ?? 'home';
}

/** Known marketing routes only. Unknown paths are not treated as Home. */
export function exactSitePageFromPath(pathname: string): SitePage | null {
  const path = normalisedPath(pathname);
  if (path === '/') {
    return 'home';
  }
  if (path === '/classes') {
    return 'classes';
  }
  if (path === '/about') {
    return 'about';
  }
  if (path === '/privacy') {
    return 'privacy';
  }
  if (path === '/support') {
    return 'support';
  }
  return null;
}

export function pathForSitePage(page: SitePage): string {
  return page === 'home' ? '/' : `/${page}`;
}
