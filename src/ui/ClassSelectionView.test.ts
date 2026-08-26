import { describe, expect, it } from 'vitest';
import {
  buildClassSelectionView,
  getPlayerClassDefinition,
  PLAYER_CLASS_IDS,
} from '../game/definitions/classes';
import { GameOverView } from './GameOverView';
import { HudView } from './HudView';
import {
  ClassSelectionView,
  classHudText,
  classSelectAriaLabel,
} from './ClassSelectionView';

describe('class HUD text', () => {
  it('shows the selected class name and a placeholder before selection', () => {
    expect(classHudText('Rogue')).toBe('CLASS: Rogue');
    expect(classHudText('Ranger')).toBe('CLASS: Ranger');
    expect(classHudText('')).toBe('CLASS: —');
    expect(classHudText('Rogue')).not.toContain('%');
  });
});

describe('class-selection overlay', () => {
  it('renders one class at a time with its flavour, starting stats, and position', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    const view = buildClassSelectionView();
    overlay.show(view);

    expect(root.element('class-select').hidden).toBe(false);
    expect(view.classes.map((option) => option.id)).toEqual([...PLAYER_CLASS_IDS]);
    const rogue = view.classes[0];
    expect(root.text('class-current-name')).toBe('Rogue');
    expect(root.text('class-current-desc')).toBe(rogue.description);
    expect(root.text('class-carousel-position')).toBe('1 / 6');
    expect(root.text('class-stat-health')).toBe('18');
    expect(root.text('class-stat-attack')).toBe('8');
    expect(root.text('class-stat-defence')).toBe('1');
    expect(root.text('class-stat-evade')).toBe('16');
    expect(root.text('class-select-current')).toBe('BEGIN AS ROGUE');
    expect(root.button('class-select-current').disabled).toBe(false);
    expect(root.button('class-select-current').getAttribute('aria-label')).toBe(
      classSelectAriaLabel(rogue),
    );
    overlay.dispose();
  });

  it('cycles with arrow controls, wraps, and reports the preview class', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    const changes: string[] = [];
    overlay.onChange((classId) => changes.push(classId));
    overlay.show(buildClassSelectionView());

    root.button('class-next').click();
    expect(root.text('class-current-name')).toBe('Ranger');
    expect(root.text('class-carousel-position')).toBe('2 / 6');
    expect(overlay.selectedClassId).toBe('ranger');

    root.button('class-previous').click();
    root.button('class-previous').click();
    expect(root.text('class-current-name')).toBe('Lorekeeper');
    expect(root.text('class-carousel-position')).toBe('6 / 6');
    expect(changes).toEqual(['rogue', 'ranger', 'rogue', 'lorekeeper']);
    overlay.dispose();
  });

  it('supports keyboard and swipe navigation, then selects the visible class', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    let selected = '';
    overlay.onSelect('mage', () => {
      selected = 'mage';
    });
    overlay.show(buildClassSelectionView());

    root.element('class-select').dispatchEvent({
      type: 'keydown',
      key: 'ArrowRight',
      preventDefault() {},
    } as KeyboardEvent);
    root.element('class-carousel').dispatchEvent({
      type: 'pointerdown',
      clientX: 260,
    } as PointerEvent);
    root.element('class-carousel').dispatchEvent({
      type: 'pointerup',
      clientX: 160,
    } as PointerEvent);

    expect(root.text('class-current-name')).toBe('Mage');
    root.button('class-select-current').click();
    expect(selected).toBe('mage');
    overlay.dispose();
  });

  it('locks browsing and labels the selected class while gameplay assets prepare', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    overlay.show(buildClassSelectionView());

    overlay.setPreparing(true);
    expect(root.text('class-select-current')).toBe('PREPARING ROGUE…');
    expect(root.button('class-select-current').disabled).toBe(true);
    expect(root.button('class-previous').disabled).toBe(true);
    expect(root.button('class-next').disabled).toBe(true);
    root.button('class-next').click();
    expect(overlay.selectedClassId).toBe('rogue');

    overlay.setPreparing(false);
    expect(root.text('class-select-current')).toBe('BEGIN AS ROGUE');
    expect(root.button('class-select-current').disabled).toBe(false);
    overlay.dispose();
  });

  it('blocks pointer input from falling through to the board', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    overlay.show(buildClassSelectionView());

    let stopped = false;
    root.element('class-select').dispatchEvent({
      type: 'pointerdown',
      stopPropagation() {
        stopped = true;
      },
    } as PointerEvent);

    expect(stopped).toBe(true);
    expect(root.element('class-select').hidden).toBe(false);
    overlay.dispose();
  });

  it('hides the overlay after a class is chosen', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    overlay.show(buildClassSelectionView());
    overlay.hide();
    expect(root.element('class-select').hidden).toBe(true);
    overlay.dispose();
  });
});

describe('HUD combat stats', () => {
  it('renders HP under the title and a side list of run stats', () => {
    const root = createHudRoot();
    const hud = new HudView(root);
    const ranger = getPlayerClassDefinition('ranger');
    hud.update({
      className: ranger.name,
      distance: 0,
      gold: 0,
      attack: ranger.startingStats.attack,
      defence: ranger.startingStats.defence,
      dex: ranger.startingStats.dex,
      level: 1,
      experience: 0,
      nextLevelExperience: 3,
      health: ranger.startingStats.health,
      maxHealth: ranger.startingStats.maxHealth,
      status: '',
    });

    expect(root.text('distance')).toBe('Distance: 0');
    expect(root.text('level')).toBe('LVL: 1');
    expect(root.text('experience')).toBe('XP: 0 / 3');
    expect(root.text('gold')).toBe('G: 0');
    expect(root.text('attack')).toBe(`ATK: ${ranger.startingStats.attack}`);
    expect(root.text('defence')).toBe(`ARM: ${ranger.startingStats.defence}`);
    expect(root.text('evade')).toBe(`FIN: ${ranger.startingStats.dex}`);
    expect(root.text('evade')).not.toContain('%');
    expect(root.text('health-text')).toBe(
      `HP ${ranger.startingStats.health} / ${ranger.startingStats.maxHealth}`,
    );
  });
});

describe('game-over restart', () => {
  it('returns control to the host without reloading the page', () => {
    const root = createGameOverRoot();
    const overlay = new GameOverView(root);
    let restarts = 0;
    overlay.onRestart(() => {
      restarts += 1;
    });

    overlay.show(4);
    root.button('restart-run').click();

    expect(restarts).toBe(1);
    expect(root.element('game-over').hidden).toBe(false);
    overlay.hide();
    expect(root.element('game-over').hidden).toBe(true);
    overlay.dispose();
  });
});

function createClassSelectRoot(): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  const ids = [
    'class-select',
    'class-carousel',
    'class-current-name',
    'class-current-desc',
    'class-carousel-position',
    'class-stat-health',
    'class-stat-attack',
    'class-stat-defence',
    'class-stat-evade',
    'class-previous',
    'class-next',
    'class-select-current',
  ];
  for (const id of ids) {
    nodes.set(id, new FakeElement());
  }
  return fakeRoot(nodes);
}

function createHudRoot(): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
  element(id: string): FakeElement;
} {
  const ids = [
    'distance',
    'gold',
    'attack',
    'defence',
    'evade',
    'level',
    'experience',
    'status',
    'health-text',
    'health-bar',
    'health-fill',
  ];
  const nodes = new Map<string, FakeElement>();
  for (const id of ids) {
    nodes.set(id, new FakeElement());
  }
  return fakeRoot(nodes);
}

function createGameOverRoot(): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
  element(id: string): FakeElement;
} {
  const nodes = new Map<string, FakeElement>();
  nodes.set('game-over', new FakeElement());
  nodes.set('game-over-distance', new FakeElement());
  nodes.set('restart-run', new FakeElement());
  return fakeRoot(nodes);
}

function fakeRoot(nodes: Map<string, FakeElement>): ParentNode & {
  button(id: string): HTMLButtonElement;
  text(id: string): string;
  element(id: string): FakeElement;
} {
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
  style: { transform: string } = { transform: '' };
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

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

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
}
