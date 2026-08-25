import { describe, expect, it } from 'vitest';
import { getPlayerClassDefinition } from '../game/definitions/classes';
import {
  LEVEL_UP_FREE_POINTS,
  buildLevelUpView,
  isValidLevelUpAllocation,
  playerAttributeSnapshot,
  type LevelUpAllocation,
} from '../game/levelUp';
import {
  LevelUpOverlayView,
  experienceHudText,
  levelHudText,
} from './LevelUpOverlayView';

describe('level and XP HUD text', () => {
  it('renders the starting level and next threshold', () => {
    expect(levelHudText(1)).toBe('LVL: 1');
    expect(experienceHudText(0, 3)).toBe('XP: 0 / 3');
  });

  it('renders mid-run progress and a clean end-of-track value', () => {
    expect(levelHudText(4)).toBe('LVL: 4');
    expect(experienceHudText(12, 18)).toBe('XP: 12 / 18');
    expect(experienceHudText(25, null)).toBe('XP: 25');
  });

  it('shows the reached level, free points, and current attributes', () => {
    const ranger = getPlayerClassDefinition('ranger');
    const attributes = playerAttributeSnapshot({ stats: ranger.startingStats });
    const view = buildLevelUpView(2, 3, attributes);
    expect(view.level).toBe(2);
    expect(view.freePoints).toBe(LEVEL_UP_FREE_POINTS);
    expect(experienceHudText(view.experience, view.nextLevelExperience)).toBe(
      'XP: 3 / 7',
    );
    expect(view.attributes).toEqual({
      str: ranger.startingStats.str,
      con: ranger.startingStats.con,
      def: ranger.startingStats.defence,
      dex: ranger.startingStats.dex,
    });
  });

  it('accepts only non-negative integer allocations that sum to 2', () => {
    expect(isValidLevelUpAllocation({ str: 2, con: 0, def: 0, dex: 0 })).toBe(true);
    expect(isValidLevelUpAllocation({ str: 1, con: 1, def: 0, dex: 0 })).toBe(true);
    expect(isValidLevelUpAllocation({ str: 0, con: 0, def: 0, dex: 0 })).toBe(false);
    expect(isValidLevelUpAllocation({ str: 3, con: 0, def: 0, dex: 0 })).toBe(false);
    expect(isValidLevelUpAllocation({ str: -1, con: 3, def: 0, dex: 0 })).toBe(false);
    expect(isValidLevelUpAllocation({ str: 1.5, con: 0.5, def: 0, dex: 0 })).toBe(
      false,
    );
  });
});

describe('level-up overlay', () => {
  it('enables confirm only after exactly 2 free points are assigned', () => {
    const root = createLevelUpRoot();
    const overlay = new LevelUpOverlayView(root);
    const ranger = getPlayerClassDefinition('ranger');
    overlay.render(
      buildLevelUpView(6, 25, playerAttributeSnapshot({ stats: ranger.startingStats })),
    );

    expect(root.button('level-up-confirm').disabled).toBe(true);
    root.button('level-up-str-plus').click();
    root.button('level-up-dex-plus').click();
    expect(overlay.getAllocation()).toEqual({
      str: 1,
      con: 0,
      def: 0,
      dex: 1,
    } satisfies LevelUpAllocation);
    expect(root.button('level-up-confirm').disabled).toBe(false);
    overlay.dispose();
  });
});

function createLevelUpRoot(): ParentNode & {
  button(id: string): HTMLButtonElement & { click(): void };
} {
  const nodes = new Map<string, FakeElement>();
  const ids = [
    'level-up',
    'level-up-level',
    'level-up-xp',
    'level-up-points',
    'level-up-confirm',
    'level-up-str-value',
    'level-up-con-value',
    'level-up-def-value',
    'level-up-dex-value',
    'level-up-str-minus',
    'level-up-con-minus',
    'level-up-def-minus',
    'level-up-dex-minus',
    'level-up-str-plus',
    'level-up-con-plus',
    'level-up-def-plus',
    'level-up-dex-plus',
  ];
  for (const id of ids) {
    nodes.set(id, new FakeElement());
  }

  return {
    querySelector(selector: string) {
      return nodes.get(selector.slice(1)) as unknown as HTMLElement | null;
    },
    button(id: string) {
      return nodes.get(id) as unknown as HTMLButtonElement & { click(): void };
    },
  } as ParentNode & {
    button(id: string): HTMLButtonElement & { click(): void };
  };
}

class FakeElement {
  hidden = true;
  disabled = false;
  textContent = '';
  private readonly attrs = new Map<string, string>();
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
    this.attrs.set(name, value);
  }

  click(): void {
    for (const listener of this.listeners.get('click') ?? []) {
      if (typeof listener === 'function') {
        listener(new Event('click'));
      } else {
        listener.handleEvent(new Event('click'));
      }
    }
  }
}
