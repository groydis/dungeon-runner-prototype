import { describe, expect, it } from 'vitest';
import { redirectToCanonicalHost } from './hostRedirect';

describe('canonical host redirects', () => {
  it('sends www and trailing slashes to the apex URL in one hop', () => {
    const response = redirectToCanonicalHost(
      new Request('https://www.hollowmile.com/about/'),
    );
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://hollowmile.com/about');
  });

  it('keeps POST method with 308', () => {
    const response = redirectToCanonicalHost(
      new Request('https://www.hollowmile.com/api/waitlist', { method: 'POST' }),
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe('https://hollowmile.com/api/waitlist');
  });

  it('leaves the apex URL alone', () => {
    expect(redirectToCanonicalHost(new Request('https://hollowmile.com/classes'))).toBeNull();
    expect(redirectToCanonicalHost(new Request('https://hollowmile.com/'))).toBeNull();
  });
});
