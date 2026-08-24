import { describe, expect, it } from 'vitest';
import { exactSitePageFromPath, pathForSitePage, sitePageFromPath } from './siteRoute';

describe('site routes', () => {
  it('maps content pages, including a trailing slash', () => {
    expect(sitePageFromPath('/about')).toBe('about');
    expect(sitePageFromPath('/about/')).toBe('about');
    expect(sitePageFromPath('/classes')).toBe('classes');
    expect(sitePageFromPath('/classes/')).toBe('classes');
    expect(sitePageFromPath('/privacy')).toBe('privacy');
    expect(sitePageFromPath('/support/')).toBe('support');
    expect(exactSitePageFromPath('/about')).toBe('about');
    expect(exactSitePageFromPath('/privacy/')).toBe('privacy');
    expect(pathForSitePage('privacy')).toBe('/privacy');
    expect(pathForSitePage('classes')).toBe('/classes');
  });

  it('treats unknown paths as Home in the SPA, but not as a marketing URL', () => {
    expect(sitePageFromPath('/')).toBe('home');
    expect(sitePageFromPath('')).toBe('home');
    expect(sitePageFromPath('/play')).toBe('home');
    expect(exactSitePageFromPath('/')).toBe('home');
    expect(exactSitePageFromPath('/play')).toBeNull();
    expect(pathForSitePage('home')).toBe('/');
  });
});
