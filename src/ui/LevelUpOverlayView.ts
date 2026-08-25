import {
  LEVEL_UP_ATTRIBUTES,
  LEVEL_UP_FREE_POINTS,
  allocationSum,
  emptyLevelUpAllocation,
  type LevelUpAllocation,
  type LevelUpAttributeId,
  type LevelUpView,
} from '../game/levelUp';
import { requireElement } from './dom';

export function levelHudText(level: number): string {
  return `LVL: ${level}`;
}

export function experienceHudText(
  experience: number,
  nextLevelExperience: number | null,
): string {
  if (nextLevelExperience === null) {
    return `XP: ${experience}`;
  }
  return `XP: ${experience} / ${nextLevelExperience}`;
}

export class LevelUpOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly xpEl: HTMLElement;
  private readonly pointsEl: HTMLElement;
  private readonly confirmButton: HTMLButtonElement;
  private readonly valueEls: Record<LevelUpAttributeId, HTMLElement>;
  private readonly minusButtons: Record<LevelUpAttributeId, HTMLButtonElement>;
  private readonly plusButtons: Record<LevelUpAttributeId, HTMLButtonElement>;
  private allocation: LevelUpAllocation = emptyLevelUpAllocation();
  private baseAttributes: LevelUpAllocation = emptyLevelUpAllocation();
  private confirmHandler: (() => void) | null = null;
  private readonly plusHandlers: Partial<Record<LevelUpAttributeId, () => void>> =
    {};
  private readonly minusHandlers: Partial<Record<LevelUpAttributeId, () => void>> =
    {};

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#level-up');
    this.levelEl = requireElement(root, '#level-up-level');
    this.xpEl = requireElement(root, '#level-up-xp');
    this.pointsEl = requireElement(root, '#level-up-points');
    this.confirmButton = requireElement(
      root,
      '#level-up-confirm',
    ) as HTMLButtonElement;
    this.valueEls = {
      str: requireElement(root, '#level-up-str-value'),
      con: requireElement(root, '#level-up-con-value'),
      def: requireElement(root, '#level-up-def-value'),
      dex: requireElement(root, '#level-up-dex-value'),
    };
    this.minusButtons = {
      str: requireElement(root, '#level-up-str-minus') as HTMLButtonElement,
      con: requireElement(root, '#level-up-con-minus') as HTMLButtonElement,
      def: requireElement(root, '#level-up-def-minus') as HTMLButtonElement,
      dex: requireElement(root, '#level-up-dex-minus') as HTMLButtonElement,
    };
    this.plusButtons = {
      str: requireElement(root, '#level-up-str-plus') as HTMLButtonElement,
      con: requireElement(root, '#level-up-con-plus') as HTMLButtonElement,
      def: requireElement(root, '#level-up-def-plus') as HTMLButtonElement,
      dex: requireElement(root, '#level-up-dex-plus') as HTMLButtonElement,
    };

    for (const attr of LEVEL_UP_ATTRIBUTES) {
      const plus = () => this.adjust(attr, 1);
      const minus = () => this.adjust(attr, -1);
      this.plusHandlers[attr] = plus;
      this.minusHandlers[attr] = minus;
      this.plusButtons[attr].addEventListener('click', plus);
      this.minusButtons[attr].addEventListener('click', minus);
    }
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onConfirm(handler: () => void): void {
    if (this.confirmHandler) {
      this.confirmButton.removeEventListener('click', this.confirmHandler);
    }
    this.confirmHandler = handler;
    this.confirmButton.addEventListener('click', handler);
  }

  getAllocation(): LevelUpAllocation {
    return { ...this.allocation };
  }

  show(view: LevelUpView): void {
    this.allocation = emptyLevelUpAllocation();
    this.baseAttributes = { ...view.attributes };
    this.render(view);
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  render(view: LevelUpView): void {
    this.baseAttributes = { ...view.attributes };
    this.levelEl.textContent = `Level ${view.level}`;
    this.xpEl.textContent = experienceHudText(
      view.experience,
      view.nextLevelExperience,
    );
    this.syncControls();
  }

  dispose(): void {
    for (const attr of LEVEL_UP_ATTRIBUTES) {
      const plus = this.plusHandlers[attr];
      const minus = this.minusHandlers[attr];
      if (plus) {
        this.plusButtons[attr].removeEventListener('click', plus);
      }
      if (minus) {
        this.minusButtons[attr].removeEventListener('click', minus);
      }
    }
    if (this.confirmHandler) {
      this.confirmButton.removeEventListener('click', this.confirmHandler);
      this.confirmHandler = null;
    }
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private adjust(attr: LevelUpAttributeId, delta: number): void {
    const next = this.allocation[attr] + delta;
    if (next < 0) {
      return;
    }
    const spent = allocationSum(this.allocation) - this.allocation[attr] + next;
    if (spent > LEVEL_UP_FREE_POINTS) {
      return;
    }
    this.allocation[attr] = next;
    this.syncControls();
  }

  private syncControls(): void {
    const spent = allocationSum(this.allocation);
    const remaining = LEVEL_UP_FREE_POINTS - spent;
    this.pointsEl.textContent =
      remaining === 0
        ? 'All 2 free points assigned (+1 to every stat is automatic).'
        : `Free points remaining: ${remaining} / ${LEVEL_UP_FREE_POINTS}`;

    for (const attr of LEVEL_UP_ATTRIBUTES) {
      const base = this.baseAttributes[attr];
      const assigned = this.allocation[attr];
      this.valueEls[attr].textContent = `${base} → +${1 + assigned}`;
      this.minusButtons[attr].disabled = assigned <= 0;
      this.plusButtons[attr].disabled = remaining <= 0;
    }
    this.confirmButton.disabled = spent !== LEVEL_UP_FREE_POINTS;
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
