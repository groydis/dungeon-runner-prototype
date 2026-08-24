import { normalisedPath } from '../ui/siteRoute';

const APEX_HOST = 'hollowmile.com';

/** 301 apex + no trailing slash. One hop for www and /about/. */
export function redirectToCanonicalHost(request: Request): Response | null {
  const url = new URL(request.url);
  const host = url.hostname === `www.${APEX_HOST}` ? APEX_HOST : url.hostname;
  const pathname = normalisedPath(url.pathname);
  if (url.hostname === host && url.pathname === pathname) {
    return null;
  }
  url.hostname = host;
  url.pathname = pathname;
  const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
  return Response.redirect(url.href, status);
}
