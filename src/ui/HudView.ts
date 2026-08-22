import { type HudSnapshot } from '../game/GameState';
import { requireElement } from './dom';
import { classHudText } from './ClassSelectionView';
import { experienceHudText, levelHudText } from './LevelUpOverlayView';

export type { HudSnapshot };

export function evadeHudText(evade: number): string {
  return `EVA: ${evade}`;
}

export class HudView {
  private readonly distanceEl: HTMLElement;
  private readonly classEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly attackEl: HTMLElement;
  private readonly evadeEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly experienceEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly healthTextEl: HTMLElement;
  private readonly healthBarEl: HTMLElement;
  private readonly healthFillEl: HTMLElement;

  constructor(root: ParentNode = document) {
    this.distanceEl = requireElement(root, '#distance');
    this.classEl = requireElement(root, '#class-name');
    this.goldEl = requireElement(root, '#gold');
    this.attackEl = requireElement(root, '#attack');
    this.evadeEl = requireElement(root, '#evade');
    this.levelEl = requireElement(root, '#level');
    this.experienceEl = requireElement(root, '#experience');
    this.statusEl = requireElement(root, '#status');
    this.healthTextEl = requireElement(root, '#health-text');
    this.healthBarEl = requireElement(root, '#health-bar');
    this.healthFillEl = requireElement(root, '#health-fill');
  }

  update(snapshot: HudSnapshot): void {
    const { health, maxHealth } = snapshot;
    const ratio = maxHealth <= 0 ? 0 : Math.max(0, Math.min(1, health / maxHealth));
    this.distanceEl.textContent = `Distance: ${snapshot.distance}`;
    this.classEl.textContent = classHudText(snapshot.className);
    this.goldEl.textContent = `Gold: ${snapshot.gold}`;
    this.attackEl.textContent = `ATK: ${snapshot.attack}`;
    this.evadeEl.textContent = evadeHudText(snapshot.evade);
    this.levelEl.textContent = levelHudText(snapshot.level);
    this.experienceEl.textContent = experienceHudText(
      snapshot.experience,
      snapshot.nextLevelExperience,
    );
    this.statusEl.textContent = snapshot.status;
    this.healthTextEl.textContent = `HP ${health} / ${maxHealth}`;
    this.healthBarEl.setAttribute('aria-valuemax', String(maxHealth));
    this.healthBarEl.setAttribute('aria-valuenow', String(health));
    this.healthFillEl.style.transform = `scaleX(${ratio})`;
  }
}
