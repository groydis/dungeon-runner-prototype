import { describe, expect, it } from 'vitest';
import { AboutView } from './AboutView';

describe('about page', () => {
  it('shows and hides the About overlay', () => {
    const root = createAboutRoot();
    const page = new AboutView(root);

    expect(page.hidden).toBe(true);
    page.show();
    expect(page.hidden).toBe(false);
    expect(root.element('about').hidden).toBe(false);
    page.hide();
    expect(page.hidden).toBe(true);
  });
});

function createAboutRoot(): ParentNode & {
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  nodes.set('about', new FakeElement());
  return {
    querySelector(selector: string) {
      return nodes.get(selector.slice(1)) as unknown as HTMLElement | null;
    },
    element(id: string) {
      const node = nodes.get(id);
      if (!node) {
        throw new Error(`Missing element ${id}`);
      }
      return node;
    },
  } as ParentNode & { element(id: string): FakeElement };
}

class FakeElement {
  hidden = true;
}
