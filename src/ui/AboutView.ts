import { requireElement } from './dom';

/** Standalone About page shown at /about. */
export class AboutView {
  private readonly pageEl: HTMLElement;

  constructor(root: ParentNode = document) {
    this.pageEl = requireElement(root, '#about');
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
