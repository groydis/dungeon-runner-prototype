import { requireElement } from './dom';
import { isSitePage, type SitePage } from './siteRoute';

/** Home / Classes / About / legal links. Hidden once Play starts the run. */
export class SiteNav {
  private readonly navEl: HTMLElement;
  private readonly legalEl: HTMLElement | null;
  private readonly pageLinks: HTMLElement[];
  private readonly onPageClick = (event: Event): void => {
    const link = event.currentTarget as HTMLElement | null;
    const page = link?.getAttribute?.('data-page');
    if (!isSitePage(page)) {
      return;
    }
    event.preventDefault();
    this.onNavigate(page);
  };

  constructor(
    private readonly onNavigate: (page: SitePage) => void,
    root: ParentNode = document,
  ) {
    this.navEl = requireElement(root, '#site-nav');
    this.legalEl = root.querySelector('#site-legal');
    this.pageLinks = Array.from(root.querySelectorAll<HTMLElement>('[data-page]'));
    for (const link of this.pageLinks) {
      link.addEventListener('click', this.onPageClick);
    }
  }

  setActive(page: SitePage): void {
    for (const link of this.pageLinks) {
      const marksCurrent = link.getAttribute('data-current') === 'true';
      if (marksCurrent && link.getAttribute('data-page') === page) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  hide(): void {
    this.navEl.hidden = true;
    if (this.legalEl) {
      this.legalEl.hidden = true;
    }
  }

  show(): void {
    this.navEl.hidden = false;
    if (this.legalEl) {
      this.legalEl.hidden = false;
    }
  }

  dispose(): void {
    for (const link of this.pageLinks) {
      link.removeEventListener('click', this.onPageClick);
    }
  }
}
