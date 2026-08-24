import {
  pathForSitePage,
  type SitePage,
} from '../ui/siteRoute';

export const SITE_ORIGIN = 'https://hollowmile.com';
export const SITE_NAME = 'The Hollow Mile';
const HERO_IMAGE = `${SITE_ORIGIN}/images/website-hero.jpg`;
const HERO_ALT = 'A knight and dungeon skeletons standing in a torchlit stone hall.';
const CLASS_IMAGE = `${SITE_ORIGIN}/images/classes/rogue.png`;
const CLASS_ALT = 'A hooded rogue on a stone dais, dagger in hand.';

export interface SiteSeo {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly ogType: 'website';
  readonly image: string;
  readonly imageAlt: string;
  readonly jsonLd: unknown;
}

const PAGE_SEO: Record<SitePage, Omit<SiteSeo, 'canonical' | 'jsonLd'>> = {
  home: {
    title: SITE_NAME,
    description:
      'Play The Hollow Mile free in your browser. A mobile-first dungeon roguelite: choose a class, advance one row at a time, and survive the road below. Coming soon to iOS.',
    ogType: 'website',
    image: HERO_IMAGE,
    imageAlt: HERO_ALT,
  },
  classes: {
    title: 'Classes — The Hollow Mile',
    description:
      'Meet the six who walk The Hollow Mile: Rogue, Ranger, Mage, Knight, Barbarian, and Lorekeeper. Play free in your browser. Coming soon to iOS.',
    ogType: 'website',
    image: CLASS_IMAGE,
    imageAlt: CLASS_ALT,
  },
  about: {
    title: 'About — The Hollow Mile',
    description:
      'The Hollow Mile is a mobile-first, tile-based dungeon roguelite by Greyden Scott. Play free in your browser, join the iOS waitlist, or write to hello@hollowmile.com.',
    ogType: 'website',
    image: HERO_IMAGE,
    imageAlt: HERO_ALT,
  },
  privacy: {
    title: 'Privacy — The Hollow Mile',
    description:
      'Privacy policy for The Hollow Mile: how waitlist email is used, what anonymous play telemetry records, and how to ask for your address to be removed.',
    ogType: 'website',
    image: HERO_IMAGE,
    imageAlt: HERO_ALT,
  },
  support: {
    title: 'Support — The Hollow Mile',
    description:
      'Get help with The Hollow Mile. Email hello@hollowmile.com for browser play, the iOS waitlist, and App Store support.',
    ogType: 'website',
    image: HERO_IMAGE,
    imageAlt: HERO_ALT,
  },
};

const publisher = {
  '@type': 'Person',
  name: 'Greyden Scott',
  email: 'hello@hollowmile.com',
  url: SITE_ORIGIN,
};

export function canonicalUrlForPage(page: SitePage): string {
  const path = pathForSitePage(page);
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

export function seoForPage(page: SitePage): SiteSeo {
  const base = PAGE_SEO[page];
  const canonical = canonicalUrlForPage(page);
  return {
    ...base,
    canonical,
    jsonLd: jsonLdForPage(page, canonical, base.description, base.image),
  };
}

export function titleForSitePage(page: SitePage): string {
  return seoForPage(page).title;
}

export function applySeoToDocument(page: SitePage, root: ParentNode & { title?: string } = document): void {
  const seo = seoForPage(page);
  if ('title' in root) {
    root.title = seo.title;
  }
  setMeta(root, 'meta[name="description"]', 'content', seo.description);
  setMeta(root, 'meta[property="og:title"]', 'content', seo.title);
  setMeta(root, 'meta[property="og:description"]', 'content', seo.description);
  setMeta(root, 'meta[property="og:url"]', 'content', seo.canonical);
  setMeta(root, 'meta[property="og:image"]', 'content', seo.image);
  setMeta(root, 'meta[property="og:image:alt"]', 'content', seo.imageAlt);
  setMeta(root, 'meta[name="twitter:title"]', 'content', seo.title);
  setMeta(root, 'meta[name="twitter:description"]', 'content', seo.description);
  setMeta(root, 'meta[name="twitter:image"]', 'content', seo.image);
  setMeta(root, 'meta[name="twitter:image:alt"]', 'content', seo.imageAlt);
  setMeta(root, 'link[rel="canonical"]', 'href', seo.canonical);
  const jsonLd = root.querySelector('#seo-json-ld');
  if (jsonLd) {
    jsonLd.textContent = JSON.stringify(seo.jsonLd);
  }
}

function jsonLdForPage(
  page: SitePage,
  canonical: string,
  description: string,
  image: string,
): unknown {
  const website = {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    publisher,
  };
  if (page === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        website,
        {
          '@type': 'VideoGame',
          name: SITE_NAME,
          url: canonical,
          description,
          image,
          genre: ['Roguelike', 'RolePlayingGame'],
          playMode: 'SinglePlayer',
          applicationCategory: 'GameApplication',
          operatingSystem: 'Web browser',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'AUD',
            availability: 'https://schema.org/InStock',
          },
          author: publisher,
        },
      ],
    };
  }
  const pageType =
    page === 'about'
      ? 'AboutPage'
      : page === 'privacy'
        ? 'PrivacyPolicy'
        : page === 'support'
          ? 'ContactPage'
          : 'CollectionPage';
  return {
    '@context': 'https://schema.org',
    '@type': pageType,
    name: PAGE_SEO[page].title,
    description,
    url: canonical,
    isPartOf: website,
    image,
  };
}

function setMeta(root: ParentNode, selector: string, attribute: string, value: string): void {
  const element = root.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}
