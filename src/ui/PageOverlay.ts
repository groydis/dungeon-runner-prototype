import { requireElement } from './dom';

/** Full-screen content page shown at a site route. */
export class PageOverlay {
  private readonly pageEl: HTMLElement;

  constructor(root: ParentNode, selector: string) {
    this.pageEl = requireElement(root, selector);
  }

  show(): void {
    this.pageEl.hidden = false;
  }

  hide(): void {
    this.pageEl.hidden = true;
  }

  get hidden(): boolean {
    return Boolean(this.pageEl.hidden);
  }
}
