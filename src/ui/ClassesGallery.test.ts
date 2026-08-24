import { describe, expect, it } from 'vitest';
import { ClassesGallery } from './ClassesGallery';

describe('classes gallery', () => {
  it('plays motion only on the selected class', () => {
    const root = createGalleryRoot();
    const gallery = new ClassesGallery(root, () => false);

    gallery.activate();
    expect(root.featured.src).toBe('/images/classes/rogue.webp');
    expect(root.featured.alt).toBe('Rogue portrait');
    expect(root.name.textContent).toBe('Rogue');
    expect(root.rogue.getAttribute('aria-pressed')).toBe('true');
    expect(root.ranger.getAttribute('aria-pressed')).toBe('false');

    root.ranger.click();
    expect(root.featured.src).toBe('/images/classes/ranger.webp');
    expect(root.name.textContent).toBe('Ranger');
    expect(root.lore.textContent).toBe('Ranger lore.');
    expect(root.ranger.getAttribute('aria-pressed')).toBe('true');
    expect(root.rogue.getAttribute('aria-pressed')).toBe('false');

    gallery.rest();
    expect(root.featured.src).toBe('/images/classes/ranger.png');
    gallery.dispose();
  });

  it('keeps a still when reduced motion is preferred', () => {
    const root = createGalleryRoot();
    const gallery = new ClassesGallery(root, () => true);
    gallery.activate();
    expect(root.featured.src).toBe('/images/classes/rogue.png');
    root.ranger.click();
    expect(root.featured.src).toBe('/images/classes/ranger.png');
  });
});

function createGalleryRoot(): ParentNode & {
  featured: FakeImage;
  name: FakeElement;
  lore: FakeElement;
  rogue: FakeButton;
  ranger: FakeButton;
} {
  const featured = new FakeImage('/images/classes/rogue.png');
  const name = new FakeElement();
  name.textContent = 'Rogue';
  const lore = new FakeElement();
  lore.textContent = 'Rogue lore.';
  const rogue = new FakeButton({
    name: 'Rogue',
    lore: 'Rogue lore.',
    alt: 'Rogue portrait',
    still: '/images/classes/rogue.png',
    motion: '/images/classes/rogue.webp',
    pressed: true,
  });
  const ranger = new FakeButton({
    name: 'Ranger',
    lore: 'Ranger lore.',
    alt: 'Ranger portrait',
    still: '/images/classes/ranger.png',
    motion: '/images/classes/ranger.webp',
    pressed: false,
  });
  const nodes = new Map<string, FakeElement>([
    ['class-featured-image', featured],
    ['class-featured-name', name],
    ['class-featured-lore', lore],
  ]);
  return {
    featured,
    name,
    lore,
    rogue,
    ranger,
    querySelector(selector: string) {
      return nodes.get(selector.slice(1)) as unknown as HTMLElement | null;
    },
    querySelectorAll(selector: string) {
      if (selector !== '[data-class-pick]') {
        return [] as unknown as NodeListOf<Element>;
      }
      return [rogue, ranger] as unknown as NodeListOf<Element>;
    },
  } as ParentNode & {
    featured: FakeImage;
    name: FakeElement;
    lore: FakeElement;
    rogue: FakeButton;
    ranger: FakeButton;
  };
}

class FakeElement {
  textContent = '';
  alt = '';
}

class FakeImage extends FakeElement {
  constructor(public src: string) {
    super();
  }
}

class FakeButton {
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor(fields: {
    name: string;
    lore: string;
    alt: string;
    still: string;
    motion: string;
    pressed: boolean;
  }) {
    this.attributes.set('data-name', fields.name);
    this.attributes.set('data-lore', fields.lore);
    this.attributes.set('data-alt', fields.alt);
    this.attributes.set('data-still', fields.still);
    this.attributes.set('data-motion', fields.motion);
    this.attributes.set('aria-pressed', fields.pressed ? 'true' : 'false');
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const bucket = this.listeners.get(type) ?? new Set();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  focus(): void {}

  click(): void {
    const event = {
      type: 'click',
      currentTarget: this,
      preventDefault() {},
    } as unknown as Event;
    for (const listener of this.listeners.get('click') ?? []) {
      if (typeof listener === 'function') {
        listener(event);
      }
    }
  }
}
