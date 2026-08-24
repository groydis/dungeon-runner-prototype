import { PageOverlay } from './PageOverlay';

/** Standalone About page shown at /about. */
export class AboutView extends PageOverlay {
  constructor(root: ParentNode = document) {
    super(root, '#about');
  }
}
