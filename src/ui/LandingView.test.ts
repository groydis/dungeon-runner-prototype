import { describe, expect, it } from 'vitest';
import { LandingView } from './LandingView';

describe('landing overlay', () => {
  it('starts Play and then hides the title screen', () => {
    const root = createLandingRoot();
    const overlay = new LandingView(root);
    let plays = 0;
    overlay.onPlay(() => {
      plays += 1;
    });

    expect(root.element('landing').hidden).toBe(false);
    expect(root.text('landing-play')).toBe('PLAY');
    root.button('landing-play').click();
    expect(plays).toBe(1);

    overlay.setStarting(true);
    expect(root.text('landing-play')).toBe('LOADING…');
    expect(root.button('landing-play').disabled).toBe(true);

    overlay.hide();
    expect(overlay.hidden).toBe(true);
    expect(root.element('landing').hidden).toBe(true);
    overlay.dispose();
  });
});

function createLandingRoot(): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  nodes.set('landing', new FakeElement());
  nodes.set('landing-play', new FakeElement());
  nodes.get('landing')!.hidden = false;
  nodes.get('landing-play')!.textContent = 'PLAY';
  return {
    querySelector(selector: string) {
      return nodes.get(selector.slice(1)) as unknown as HTMLElement | null;
    },
    button(id: string) {
      return nodes.get(id) as unknown as HTMLButtonElement;
    },
    text(id: string) {
      return nodes.get(id)?.textContent ?? '';
    },
    element(id: string) {
      const node = nodes.get(id);
      if (!node) {
        throw new Error(`Missing element ${id}`);
      }
      return node;
    },
  } as ParentNode & {
    button(id: string): HTMLButtonElement;
    text(id: string): string;
    element(id: string): FakeElement;
  };
}

class FakeElement {
  hidden = true;
  disabled = false;
  textContent = '';
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

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === 'function') {
        listener(event);
      }
    }
    return true;
  }

  click(): void {
    this.dispatchEvent({ type: 'click' } as Event);
  }
}
