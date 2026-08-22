import { requireElement } from './dom';

export interface HudSnapshot {
  distance: number;
  gold: number;
  attack: number;
  health: number;
  maxHealth: number;
  status: string;
}

export class HudView {
  private readonly distanceEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly attackEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly healthTextEl: HTMLElement;
  private readonly healthBarEl: HTMLElement;
  private readonly healthFillEl: HTMLElement;

  constructor(root: ParentNode = document) {
    this.distanceEl = requireElement(root, '#distance');
    this.goldEl = requireElement(root, '#gold');
    this.attackEl = requireElement(root, '#attack');
    this.statusEl = requireElement(root, '#status');
    this.healthTextEl = requireElement(root, '#health-text');
    this.healthBarEl = requireElement(root, '#health-bar');
    this.healthFillEl = requireElement(root, '#health-fill');
  }

  update(snapshot: HudSnapshot): void {
    const { health, maxHealth } = snapshot;
    const ratio = maxHealth <= 0 ? 0 : Math.max(0, Math.min(1, health / maxHealth));
    this.distanceEl.textContent = `Distance: ${snapshot.distance}`;
    this.goldEl.textContent = `Gold: ${snapshot.gold}`;
    this.attackEl.textContent = `ATK: ${snapshot.attack}`;
    this.statusEl.textContent = snapshot.status;
    this.healthTextEl.textContent = `HP ${health} / ${maxHealth}`;
    this.healthBarEl.setAttribute('aria-valuemax', String(maxHealth));
    this.healthBarEl.setAttribute('aria-valuenow', String(health));
    this.healthFillEl.style.transform = `scaleX(${ratio})`;
  }
}
