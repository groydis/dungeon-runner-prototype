import { describe, expect, it } from 'vitest';
import {
  buildClassSelectionView,
  classStatLine,
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
  it('renders all six classes with flavour, stats, and accessible Select labels', () => {
    const root = createClassSelectRoot();
    const overlay = new ClassSelectionView(root);
    const view = buildClassSelectionView();
    overlay.show(view);

    expect(root.element('class-select').hidden).toBe(false);
    expect(view.classes.map((option) => option.id)).toEqual([...PLAYER_CLASS_IDS]);

    for (const option of view.classes) {
      const definition = getPlayerClassDefinition(option.id);
      expect(root.text(`class-${option.id}-name`)).toBe(definition.name);
      expect(root.text(`class-${option.id}-desc`)).toBe(definition.description);
      expect(root.text(`class-${option.id}-stats`)).toBe(classStatLine(option));
      expect(root.text(`class-${option.id}-stats`)).toBe(
        `HP ${definition.startingStats.maxHealth} · ATK ${definition.startingStats.attack} · DEF ${definition.startingStats.defence} · EVA ${definition.startingEvade}`,
      );
      expect(root.button(`class-select-${option.id}`).disabled).toBe(false);
      expect(root.button(`class-select-${option.id}`).getAttribute('aria-label')).toBe(
        classSelectAriaLabel(option),
      );
      expect(root.button(`class-select-${option.id}`).getAttribute('aria-label')).toContain(
        `Select ${definition.name}`,
      );
    }
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

describe('HUD class line', () => {
  it('renders the selected class name and starting combat stats', () => {
    const root = createHudRoot();
    const hud = new HudView(root);
    const ranger = getPlayerClassDefinition('ranger');
    hud.update({
      className: ranger.name,
      distance: 0,
      gold: 0,
      attack: ranger.startingStats.attack,
      evade: ranger.startingEvade,
      level: 1,
      experience: 0,
      nextLevelExperience: 3,
      health: ranger.startingStats.health,
      maxHealth: ranger.startingStats.maxHealth,
      status: '',
    });

    expect(root.text('class-name')).toBe('CLASS: Ranger');
    expect(root.text('attack')).toBe(`ATK: ${ranger.startingStats.attack}`);
    expect(root.text('evade')).toBe(`EVA: ${ranger.startingEvade}`);
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
  nodes.set('class-select', new FakeElement());
  for (const id of PLAYER_CLASS_IDS) {
    nodes.set(`class-select-${id}`, new FakeElement());
    nodes.set(`class-${id}-name`, new FakeElement());
    nodes.set(`class-${id}-desc`, new FakeElement());
    nodes.set(`class-${id}-stats`, new FakeElement());
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
    'class-name',
    'gold',
    'attack',
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
