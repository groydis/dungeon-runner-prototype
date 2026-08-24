import { describe, expect, it } from 'vitest';
import { pathForSitePage, sitePageFromPath, titleForSitePage } from './siteRoute';

describe('site routes', () => {
  it('maps content pages, including a trailing slash', () => {
    expect(sitePageFromPath('/about')).toBe('about');
    expect(sitePageFromPath('/about/')).toBe('about');
    expect(sitePageFromPath('/classes')).toBe('classes');
    expect(sitePageFromPath('/classes/')).toBe('classes');
    expect(sitePageFromPath('/privacy')).toBe('privacy');
    expect(sitePageFromPath('/support/')).toBe('support');
    expect(titleForSitePage('about')).toBe('About — The Hollow Mile');
    expect(titleForSitePage('classes')).toBe('Classes — The Hollow Mile');
    expect(titleForSitePage('privacy')).toBe('Privacy — The Hollow Mile');
    expect(titleForSitePage('support')).toBe('Support — The Hollow Mile');
    expect(pathForSitePage('privacy')).toBe('/privacy');
    expect(pathForSitePage('classes')).toBe('/classes');
  });

  it('treats any other path as Home', () => {
    expect(sitePageFromPath('/')).toBe('home');
    expect(sitePageFromPath('')).toBe('home');
    expect(sitePageFromPath('/play')).toBe('home');
    expect(titleForSitePage('home')).toBe('The Hollow Mile');
    expect(pathForSitePage('home')).toBe('/');
  });
});
