import { describe, expect, it } from 'vitest';
import {
  applySeoToDocument,
  canonicalUrlForPage,
  seoForPage,
  titleForSitePage,
} from './siteSeo';

describe('site SEO', () => {
  it('uses absolute canonical URLs and unique titles', () => {
    expect(titleForSitePage('home')).toBe('The Hollow Mile');
    expect(titleForSitePage('about')).toBe('About — The Hollow Mile');
    expect(titleForSitePage('classes')).toBe('Classes — The Hollow Mile');
    expect(titleForSitePage('privacy')).toBe('Privacy — The Hollow Mile');
    expect(titleForSitePage('support')).toBe('Support — The Hollow Mile');
    expect(canonicalUrlForPage('home')).toBe('https://hollowmile.com/');
    expect(canonicalUrlForPage('classes')).toBe('https://hollowmile.com/classes');
    expect(seoForPage('home').image).toBe('https://hollowmile.com/images/website-hero.jpg');
    expect(seoForPage('classes').image).toBe('https://hollowmile.com/images/classes/rogue.png');
  });

  it('describes a free browser game on Home', () => {
    const seo = seoForPage('home');
    expect(seo.description).toContain('Play The Hollow Mile free');
    expect(seo.description).toContain('Coming soon to iOS');
    const json = seo.jsonLd as {
      '@graph': Array<{ '@type': string; offers?: { price: string } }>;
    };
    expect(json['@graph'].some((node) => node['@type'] === 'WebSite')).toBe(true);
    expect(json['@graph'].some((node) => node['@type'] === 'VideoGame')).toBe(true);
    expect(json['@graph'].find((node) => node['@type'] === 'VideoGame')?.offers?.price).toBe('0');
  });

  it('uses matching schema types for content pages', () => {
    expect((seoForPage('about').jsonLd as { '@type': string })['@type']).toBe('AboutPage');
    expect((seoForPage('classes').jsonLd as { '@type': string })['@type']).toBe('CollectionPage');
    expect((seoForPage('privacy').jsonLd as { '@type': string })['@type']).toBe('PrivacyPolicy');
    expect((seoForPage('support').jsonLd as { '@type': string })['@type']).toBe('ContactPage');
  });

  it('writes title, canonical, and Open Graph tags into the document', () => {
    const root = createSeoRoot();
    applySeoToDocument('about', root);
    expect(root.title).toBe('About — The Hollow Mile');
    expect(root.element('meta[name="description"]').getAttribute('content')).toContain(
      'Greyden Scott',
    );
    expect(root.element('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://hollowmile.com/about',
    );
    expect(root.element('meta[property="og:url"]').getAttribute('content')).toBe(
      'https://hollowmile.com/about',
    );
    expect(root.element('#seo-json-ld').textContent).toContain('AboutPage');
  });
});

function createSeoRoot(): ParentNode & { title?: string; element(selector: string): FakeMeta } {
  const nodes = new Map<string, FakeMeta>();
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:url"]',
    'meta[property="og:image"]',
    'meta[property="og:image:alt"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:alt"]',
    'link[rel="canonical"]',
    '#seo-json-ld',
  ]) {
    nodes.set(selector, new FakeMeta());
  }
  return {
    title: '',
    querySelector(selector: string) {
      return nodes.get(selector) as unknown as Element | null;
    },
    element(selector: string) {
      const node = nodes.get(selector);
      if (!node) {
        throw new Error(`Missing ${selector}`);
      }
      return node;
    },
  } as ParentNode & { title?: string; element(selector: string): FakeMeta };
}

class FakeMeta {
  textContent = '';
  private readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
}
