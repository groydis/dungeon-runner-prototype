export type SitePage = 'home' | 'classes' | 'about' | 'privacy' | 'support';

const PAGE_TITLES: Record<SitePage, string> = {
  home: 'The Hollow Mile',
  classes: 'Classes — The Hollow Mile',
  about: 'About — The Hollow Mile',
  privacy: 'Privacy — The Hollow Mile',
  support: 'Support — The Hollow Mile',
};

export function isSitePage(value: string | null | undefined): value is SitePage {
  return (
    value === 'home' ||
    value === 'classes' ||
    value === 'about' ||
    value === 'privacy' ||
    value === 'support'
  );
}

export function sitePageFromPath(pathname: string): SitePage {
  const path = pathname.replace(/\/+$/, '') || '/';
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
  return 'home';
}

export function pathForSitePage(page: SitePage): string {
  return page === 'home' ? '/' : `/${page}`;
}

export function titleForSitePage(page: SitePage): string {
  return PAGE_TITLES[page];
}
