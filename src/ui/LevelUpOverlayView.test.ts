import { describe, expect, it } from 'vitest';
import { PLAYER_BASE_EVADE, PLAYER_EVADE_MAX } from '../game/config';
import {
  LEVEL_UP_EVASIVE_CAPPED_REASON,
  buildLevelUpView,
} from '../game/levelUp';
import {
  LevelUpOverlayView,
  experienceHudText,
  levelHudText,
  levelUpChoiceAriaLabel,
} from './LevelUpOverlayView';

describe('level and XP HUD text', () => {
  it('renders the starting level and next threshold', () => {
    expect(levelHudText(1)).toBe('LVL: 1');
    expect(experienceHudText(0, 3)).toBe('XP: 0 / 3');
  });

  it('renders mid-run progress and a clean cap value', () => {
    expect(levelHudText(4)).toBe('LVL: 4');
    expect(experienceHudText(12, 18)).toBe('XP: 12 / 18');
    expect(experienceHudText(25, null)).toBe('XP: 25');
  });

  it('shows the reached level and next threshold on a level-up view', () => {
    const view = buildLevelUpView(2, 3, PLAYER_BASE_EVADE);
    expect(view.level).toBe(2);
    expect(experienceHudText(view.experience, view.nextLevelExperience)).toBe(
      'XP: 3 / 7',
    );
    expect(view.choices.map((choice) => choice.title)).toEqual([
      'Vitality',
      'Sharpened',
      'Armoured',
      'Evasive',
    ]);
    expect(view.choices.find((choice) => choice.id === 'evasive')).toMatchObject({
      available: true,
      description: '+5 Evade (max 20)',
    });
    expect(view.choices.find((choice) => choice.id === 'evasive')?.description).not.toContain(
      '%',
    );
  });

  it('disables Evasive at 20 and keeps the other choices available', () => {
    const available = buildLevelUpView(2, 3, 16);
    expect(available.choices.find((choice) => choice.id === 'evasive')?.available).toBe(
      true,
    );

    const capped = buildLevelUpView(2, 3, PLAYER_EVADE_MAX);
    const evasive = capped.choices.find((choice) => choice.id === 'evasive');
    expect(evasive).toMatchObject({
      available: false,
      reason: 'capped',
      disabledReason: LEVEL_UP_EVASIVE_CAPPED_REASON,
    });
    expect(
      capped.choices.filter((choice) => choice.id !== 'evasive').every((choice) => choice.available),
    ).toBe(true);
    expect(levelUpChoiceAriaLabel(evasive!)).toBe(
      'Evasive. Unavailable. Evade is already at maximum (20).',
    );
  });
});

describe('level-up overlay disabled state', () => {
  it('disables the Evasive button and exposes why it is unavailable', () => {
    const root = createLevelUpRoot();
    const overlay = new LevelUpOverlayView(root);
    overlay.render(buildLevelUpView(2, 3, PLAYER_EVADE_MAX));

    expect(root.button('level-up-evasive').disabled).toBe(true);
    expect(root.button('level-up-evasive').getAttribute('aria-label')).toBe(
      'Evasive. Unavailable. Evade is already at maximum (20).',
    );
    expect(root.text('level-up-evasive-reason')).toBe(
      'Evade is already at maximum (20).',
    );
    expect(root.button('level-up-vitality').disabled).toBe(false);
    expect(root.button('level-up-sharpened').disabled).toBe(false);
    expect(root.button('level-up-armoured').disabled).toBe(false);
    overlay.dispose();
  });
});

function createLevelUpRoot(): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
} {
  const nodes = new Map<string, FakeElement>();
  const ids = [
    'level-up',
    'level-up-level',
    'level-up-xp',
    'level-up-vitality',
    'level-up-sharpened',
    'level-up-armoured',
    'level-up-evasive',
    'level-up-vitality-title',
    'level-up-sharpened-title',
    'level-up-armoured-title',
    'level-up-evasive-title',
    'level-up-vitality-desc',
    'level-up-sharpened-desc',
    'level-up-armoured-desc',
    'level-up-evasive-desc',
    'level-up-vitality-reason',
    'level-up-sharpened-reason',
    'level-up-armoured-reason',
    'level-up-evasive-reason',
  ];
  for (const id of ids) {
    nodes.set(id, new FakeElement());
  }

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
  } as ParentNode & {
    button(id: string): HTMLButtonElement;
    text(id: string): string;
  };
}

class FakeElement {
  hidden = true;
  disabled = false;
  textContent = '';
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor() {}

  querySelector(): null {
    return null;
  }

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

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
}
