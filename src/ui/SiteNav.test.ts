import { describe, expect, it } from 'vitest';
import { SiteNav } from './SiteNav';

describe('site nav', () => {
  it('routes Home and About without following the link', () => {
    const root = createNavRoot();
    const visits: string[] = [];
    const nav = new SiteNav(
      () => visits.push('home'),
      () => visits.push('about'),
      root,
    );

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
    nav.dispose();
  });
});

function createNavRoot(): ParentNode & {
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  nodes.set('site-nav', new FakeElement());
  nodes.set('nav-home', new FakeElement());
  nodes.set('nav-about', new FakeElement());
  nodes.get('site-nav')!.hidden = false;
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
      preventDefault: () => {
        this.defaultPrevented = true;
      },
    } as Event;
    this.dispatchEvent(event);
  }
}
