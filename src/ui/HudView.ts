import { type HudSnapshot } from '../game/GameState';
import { type MoveThreatPreview } from '../game/BoardSnapshot';
import { LEVEL_XP_THRESHOLDS } from '../game/progression';
import { requireElement } from './dom';

export type { HudSnapshot };

const PORTRAIT_FALLBACK = '/images/classes/rogue.png';

/** Matches iOS `HUDProgress.experience`. */
export function experienceProgress(
  level: number,
  totalExperience: number,
  nextThreshold: number | null,
): number {
  if (level <= 0) return 0;
  if (nextThreshold === null) return 1;
  let previous = 0;
  for (const entry of LEVEL_XP_THRESHOLDS) {
    if (entry.level <= level) {
      previous = entry.experience;
    }
  }
  const span = nextThreshold - previous;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (totalExperience - previous) / span));
}

export function portraitSrcForClass(classId: string): string {
  if (!classId) return PORTRAIT_FALLBACK;
  return `/images/classes/${classId}.png`;
}

export function evadeHudText(finesse: number, evadeBonus = 0): string {
  return `FIN: ${finesse}${evadeBonus > 0 ? ` · EVA +${evadeBonus}%` : ''}`;
}

export function goldHudText(gold: number): string {
  return String(gold);
}

export function attackHudText(attack: number): string {
  return String(attack);
}

export function armourHudText(defence: number): string {
  return String(defence);
}

export class HudView {
  private readonly rootEl: HTMLElement;
  private readonly frameEl: HTMLElement;
  private readonly portraitImg: HTMLImageElement;
  private readonly portraitButton: HTMLButtonElement;
  private readonly xpRingEl: SVGCircleElement;
  private readonly levelEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly distanceEl: HTMLElement;
  private readonly returnButton: HTMLButtonElement;
  private readonly mightEl: HTMLElement;
  private readonly finesseEl: HTMLElement;
  private readonly vigorEl: HTMLElement;
  private readonly willEl: HTMLElement;
  private readonly threatEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly healthTextEl: HTMLElement;
  private readonly healthBarEl: HTMLElement;
  private readonly healthFillEl: HTMLElement;
  private returnHandler: (() => void) | null = null;
  private characterSheetHandler: (() => void) | null = null;
  private lastStatusKey = '';
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onReturnClick = (): void => {
    this.returnHandler?.();
  };
  private readonly onPortraitClick = (): void => { this.characterSheetHandler?.(); };

  constructor(root: ParentNode = document) {
    this.rootEl = requireElement(root, '#hud');
    this.frameEl = requireElement(root, '#hud-frame');
    this.portraitImg = requireElement(root, '#hud-portrait-img') as HTMLImageElement;
    this.portraitButton = requireElement(root, '#hud-character') as HTMLButtonElement;
    this.xpRingEl = requireElement(root, '#hud-xp-ring') as unknown as SVGCircleElement;
    this.levelEl = requireElement(root, '#level');
    this.goldEl = requireElement(root, '#gold');
    this.distanceEl = requireElement(root, '#distance');
    this.returnButton = requireElement(root, '#hud-return') as HTMLButtonElement;
    this.mightEl = requireElement(root, '#hud-might');
    this.finesseEl = requireElement(root, '#hud-finesse');
    this.vigorEl = requireElement(root, '#hud-vigor');
    this.willEl = requireElement(root, '#hud-will');
    this.threatEl = requireElement(root, '#threat-preview');
    this.statusEl = requireElement(root, '#status');
    this.healthTextEl = requireElement(root, '#health-text');
    this.healthBarEl = requireElement(root, '#health-bar');
    this.healthFillEl = requireElement(root, '#health-fill');

    // pathLength="100" on the circle → dash units are percent of the ring.
    this.xpRingEl.style.strokeDasharray = '100';
    this.xpRingEl.style.strokeDashoffset = '100';

    this.returnButton.addEventListener('click', this.onReturnClick);
    this.portraitButton.addEventListener('click', this.onPortraitClick);
  }

  onReturn(handler: () => void): void {
    this.returnHandler = handler;
  }

  onCharacterSheet(handler: () => void): void { this.characterSheetHandler = handler; }

  dispose(): void {
    this.returnButton.removeEventListener('click', this.onReturnClick);
    this.portraitButton.removeEventListener('click', this.onPortraitClick);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.returnHandler = null;
    this.characterSheetHandler = null;
  }

  update(snapshot: HudSnapshot): void {
    const { health, maxHealth } = snapshot;
    const ratio = maxHealth <= 0 ? 0 : Math.max(0, Math.min(1, health / maxHealth));
    const hasRun = Boolean(snapshot.classId);
    this.frameEl.hidden = !hasRun;
    this.rootEl.dataset.hasRun = hasRun ? 'true' : 'false';

    if (hasRun) {
      const src = portraitSrcForClass(snapshot.classId);
      if (this.portraitImg.src !== src && !this.portraitImg.src.endsWith(src)) {
        this.portraitImg.src = src;
        this.portraitImg.alt = snapshot.className
          ? `${snapshot.className} portrait`
          : 'Character portrait';
      }
    }

    this.distanceEl.textContent = String(snapshot.distance);
    this.goldEl.textContent = goldHudText(snapshot.gold);
    this.levelEl.textContent = `LV ${snapshot.level}`;
    this.mightEl.textContent = String(snapshot.might);
    this.finesseEl.textContent = String(snapshot.finesse);
    this.vigorEl.textContent = String(snapshot.vigor);
    this.willEl.textContent = String(snapshot.will);
    this.updateStatus(snapshot.status, snapshot.statusVersion);
    this.healthTextEl.textContent = `${health}/${maxHealth}`;
    this.healthBarEl.setAttribute('aria-valuemax', String(maxHealth));
    this.healthBarEl.setAttribute('aria-valuenow', String(health));
    this.healthFillEl.style.transform = `scaleX(${ratio})`;

    const xp = experienceProgress(
      snapshot.level,
      snapshot.experience,
      snapshot.nextLevelExperience,
    );
    this.xpRingEl.style.strokeDashoffset = String(100 * (1 - xp));
    this.xpRingEl.setAttribute('aria-valuenow', String(Math.round(xp * 100)));
  }

  updateThreats(previews: readonly MoveThreatPreview[]): void {
    const laneNames = ['LEFT', 'CENTRE', 'RIGHT'];
    const lines = previews.flatMap((preview) => preview.threats.map((threat) => {
      const outcome = threat.evadeChance === null ? 'FIGHT' : `EVA ${threat.evadeChance}%`;
      return `${laneNames[preview.col] ?? `LANE ${preview.col + 1}`} · ${threat.elite ? 'ELITE ' : ''}${threat.monsterName} · ${threat.channel.toUpperCase()} · ${outcome}`;
    }));
    this.threatEl.replaceChildren(...lines.map((line) => {
      const item = document.createElement('span');
      item.className = 'threat-preview-item';
      item.textContent = line;
      return item;
    }));
    this.threatEl.hidden = lines.length === 0;
  }

  private updateStatus(status: string, version?: number): void {
    const key = version === undefined ? status : `${version}:${status}`;
    if (key === this.lastStatusKey) return;
    this.lastStatusKey = key;
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    this.statusEl.textContent = status;
    this.statusEl.dataset.visible = status ? 'true' : 'false';
    if (status) {
      this.statusTimer = setTimeout(() => {
        this.statusEl.dataset.visible = 'false';
        this.statusEl.textContent = '';
        this.statusTimer = null;
      }, 3200);
    }
  }
}
