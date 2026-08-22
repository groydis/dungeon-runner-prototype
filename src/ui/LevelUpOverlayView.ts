import {
  type LevelUpChoice,
  type LevelUpChoiceView,
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

export function levelUpChoiceAriaLabel(choice: LevelUpChoiceView): string {
  if (choice.available) {
    return `${choice.title}. ${choice.description}`;
  }
  return `${choice.title}. Unavailable. ${choice.disabledReason ?? 'Unavailable'}`;
}

export class LevelUpOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly xpEl: HTMLElement;
  private readonly buttons: Record<LevelUpChoice, HTMLButtonElement>;
  private readonly titles: Record<LevelUpChoice, HTMLElement>;
  private readonly descs: Record<LevelUpChoice, HTMLElement>;
  private readonly reasons: Record<LevelUpChoice, HTMLElement>;
  private readonly handlers: Partial<Record<LevelUpChoice, () => void>> = {};

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#level-up');
    this.levelEl = requireElement(root, '#level-up-level');
    this.xpEl = requireElement(root, '#level-up-xp');
    this.buttons = {
      vitality: requireElement(root, '#level-up-vitality') as HTMLButtonElement,
      sharpened: requireElement(root, '#level-up-sharpened') as HTMLButtonElement,
      armoured: requireElement(root, '#level-up-armoured') as HTMLButtonElement,
      evasive: requireElement(root, '#level-up-evasive') as HTMLButtonElement,
    };
    this.titles = {
      vitality: requireElement(root, '#level-up-vitality-title'),
      sharpened: requireElement(root, '#level-up-sharpened-title'),
      armoured: requireElement(root, '#level-up-armoured-title'),
      evasive: requireElement(root, '#level-up-evasive-title'),
    };
    this.descs = {
      vitality: requireElement(root, '#level-up-vitality-desc'),
      sharpened: requireElement(root, '#level-up-sharpened-desc'),
      armoured: requireElement(root, '#level-up-armoured-desc'),
      evasive: requireElement(root, '#level-up-evasive-desc'),
    };
    this.reasons = {
      vitality: requireElement(root, '#level-up-vitality-reason'),
      sharpened: requireElement(root, '#level-up-sharpened-reason'),
      armoured: requireElement(root, '#level-up-armoured-reason'),
      evasive: requireElement(root, '#level-up-evasive-reason'),
    };
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onChoice(choice: LevelUpChoice, handler: () => void): void {
    this.detach(choice);
    this.handlers[choice] = handler;
    this.buttons[choice].addEventListener('click', handler);
  }

  show(view: LevelUpView): void {
    this.render(view);
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  render(view: LevelUpView): void {
    this.levelEl.textContent = `Level ${view.level}`;
    this.xpEl.textContent = experienceHudText(
      view.experience,
      view.nextLevelExperience,
    );
    for (const choice of view.choices) {
      this.renderChoice(choice);
    }
  }

  dispose(): void {
    (Object.keys(this.buttons) as LevelUpChoice[]).forEach((choice) => {
      this.detach(choice);
    });
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private renderChoice(choice: LevelUpChoiceView): void {
    this.titles[choice.id].textContent = choice.title;
    this.descs[choice.id].textContent = choice.description;
    this.reasons[choice.id].textContent = choice.available
      ? ''
      : (choice.disabledReason ?? '');
    this.buttons[choice.id].disabled = !choice.available;
    this.buttons[choice.id].setAttribute('aria-label', levelUpChoiceAriaLabel(choice));
  }

  private detach(choice: LevelUpChoice): void {
    const handler = this.handlers[choice];
    if (!handler) {
      return;
    }
    this.buttons[choice].removeEventListener('click', handler);
    delete this.handlers[choice];
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
