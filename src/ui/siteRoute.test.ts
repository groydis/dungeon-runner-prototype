import { describe, expect, it } from 'vitest';
import { sitePageFromPath, titleForSitePage } from './siteRoute';

describe('site routes', () => {
  it('treats /about as the About page, including a trailing slash', () => {
    expect(sitePageFromPath('/about')).toBe('about');
    expect(sitePageFromPath('/about/')).toBe('about');
    expect(titleForSitePage('about')).toBe('About — The Hollow Mile');
  });

  it('treats any other path as Home', () => {
    expect(sitePageFromPath('/')).toBe('home');
    expect(sitePageFromPath('')).toBe('home');
    expect(sitePageFromPath('/play')).toBe('home');
    expect(titleForSitePage('home')).toBe('The Hollow Mile');
  });
});
