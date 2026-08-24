import { requireElement } from './dom';
import { type SitePage } from './siteRoute';

/** Home / About links. Hidden once Play starts the run. */
export class SiteNav {
  private readonly navEl: HTMLElement;
  private readonly homeLink: HTMLAnchorElement;
  private readonly aboutLink: HTMLAnchorElement;
  private readonly aboutPlayLink: HTMLAnchorElement | null;
  private readonly onHomeClick = (event: Event): void => {
    event.preventDefault();
    this.homeHandler();
  };
  private readonly onAboutClick = (event: Event): void => {
    event.preventDefault();
    this.aboutHandler();
  };

  constructor(
    private readonly homeHandler: () => void,
    private readonly aboutHandler: () => void,
    root: ParentNode = document,
  ) {
    this.navEl = requireElement(root, '#site-nav');
    this.homeLink = requireElement(root, '#nav-home') as HTMLAnchorElement;
    this.aboutLink = requireElement(root, '#nav-about') as HTMLAnchorElement;
    this.aboutPlayLink = root.querySelector('#about-play');
    this.homeLink.addEventListener('click', this.onHomeClick);
    this.aboutLink.addEventListener('click', this.onAboutClick);
    this.aboutPlayLink?.addEventListener('click', this.onHomeClick);
  }

  setActive(page: SitePage): void {
    if (page === 'home') {
      this.homeLink.setAttribute('aria-current', 'page');
      this.aboutLink.removeAttribute('aria-current');
      return;
    }
    this.aboutLink.setAttribute('aria-current', 'page');
    this.homeLink.removeAttribute('aria-current');
  }

  hide(): void {
    this.navEl.hidden = true;
  }

  show(): void {
    this.navEl.hidden = false;
  }

  dispose(): void {
    this.homeLink.removeEventListener('click', this.onHomeClick);
    this.aboutLink.removeEventListener('click', this.onAboutClick);
    this.aboutPlayLink?.removeEventListener('click', this.onHomeClick);
  }
}
