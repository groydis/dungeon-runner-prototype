import { seoForPage, type SiteSeo } from '../src/seo/siteSeo';
import { type SitePage } from '../src/ui/siteRoute';

export function applySeoToHtml(response: Response, page: SitePage): Response {
  const seo = seoForPage(page);
  const json = JSON.stringify(seo.jsonLd);
  return new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(seo.title);
      },
    })
    .on('meta[name="description"]', contentRewriter(seo.description))
    .on('meta[property="og:title"]', contentRewriter(seo.title))
    .on('meta[property="og:description"]', contentRewriter(seo.description))
    .on('meta[property="og:url"]', contentRewriter(seo.canonical))
    .on('meta[property="og:image"]', contentRewriter(seo.image))
    .on('meta[property="og:image:alt"]', contentRewriter(seo.imageAlt))
    .on('meta[name="twitter:title"]', contentRewriter(seo.title))
    .on('meta[name="twitter:description"]', contentRewriter(seo.description))
    .on('meta[name="twitter:image"]', contentRewriter(seo.image))
    .on('meta[name="twitter:image:alt"]', contentRewriter(seo.imageAlt))
    .on('link[rel="canonical"]', hrefRewriter(seo.canonical))
    .on('#seo-json-ld', {
      element(element) {
        element.setInnerContent(json, { html: true });
      },
    })
    .transform(response);
}

function contentRewriter(value: SiteSeo['description']): HTMLRewriterElementContentHandlers {
  return {
    element(element) {
      element.setAttribute('content', value);
    },
  };
}

function hrefRewriter(value: string): HTMLRewriterElementContentHandlers {
  return {
    element(element) {
      element.setAttribute('href', value);
    },
  };
}
