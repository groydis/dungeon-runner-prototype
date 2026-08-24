export type SitePage = 'home' | 'about';

export function sitePageFromPath(pathname: string): SitePage {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/about' ? 'about' : 'home';
}

export function titleForSitePage(page: SitePage): string {
  return page === 'about' ? 'About — The Hollow Mile' : 'The Hollow Mile';
}
