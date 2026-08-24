import { describe, expect, it } from 'vitest';
import { SiteNav } from './SiteNav';

describe('site nav', () => {
  it('routes data-page links without following them', () => {
    const root = createNavRoot();
    const visits: string[] = [];
    const nav = new SiteNav((page) => visits.push(page), root);

    root.element('nav-home').click();
    root.element('nav-about').click();
    expect(visits).toEqual(['home', 'about']);
    expect(root.element('nav-home').defaultPrevented).toBe(true);
    expect(root.element('nav-about').defaultPrevented).toBe(true);

    nav.setActive('about');
    expect(root.element('nav-about').getAttribute('aria-current')).toBe('page');
    expect(root.element('nav-home').getAttribute('aria-current')).toBeNull();

    nav.hide();
    expect(root.element('site-nav').hidden).toBe(true);
    expect(root.element('site-legal').hidden).toBe(true);
    nav.show();
    expect(root.element('site-legal').hidden).toBe(false);
    nav.dispose();
  });
});

function createNavRoot(): ParentNode & {
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  nodes.set('site-nav', new FakeElement());
  nodes.set('site-legal', new FakeElement());
  const home = new FakeElement();
  home.setAttribute('data-page', 'home');
  home.setAttribute('data-current', 'true');
  const about = new FakeElement();
  about.setAttribute('data-page', 'about');
  about.setAttribute('data-current', 'true');
  nodes.set('nav-home', home);
  nodes.set('nav-about', about);
  nodes.get('site-nav')!.hidden = false;
  nodes.get('site-legal')!.hidden = false;
  return {
    querySelector(selector: string) {
      return nodes.get(selector.slice(1)) as unknown as HTMLElement | null;
    },
    querySelectorAll(selector: string) {
      if (selector !== '[data-page]') {
        return [] as unknown as NodeListOf<Element>;
      }
      return [home, about] as unknown as NodeListOf<Element>;
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
  defaultPrevented = false;
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    const bucket = this.listeners.get(type) ?? new Set();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === 'function') {
        listener(event);
      }
    }
    return true;
  }

  click(): void {
    const event = {
      type: 'click',
      currentTarget: this,
      preventDefault: () => {
        this.defaultPrevented = true;
      },
    } as unknown as Event;
    this.dispatchEvent(event);
  }
}
