import { emptyLevelUpAllocation, type LevelUpAllocation, type LevelUpChoiceId, type LevelUpView } from '../game/levelUp';
import { requireElement } from './dom';

export function levelHudText(level: number): string { return `LVL: ${level}`; }
export function experienceHudText(experience: number, next: number | null): string {
  return next === null ? `XP: ${experience} / MAX` : `XP: ${experience} / ${next}`;
}

export class LevelUpOverlayView {
  private readonly overlayEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly xpEl: HTMLElement;
  private readonly hintEl: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private readonly titleEls: HTMLElement[];
  private readonly descriptionEls: HTMLElement[];
  private readonly confirmButton: HTMLButtonElement;
  private selectedChoiceId: LevelUpChoiceId | null = null;
  private confirmHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#level-up');
    this.levelEl = requireElement(root, '#level-up-level');
    this.xpEl = requireElement(root, '#level-up-xp');
    this.hintEl = requireElement(root, '#level-up-points');
    requireElement(root, '#level-up-choices');
    this.buttons = [0, 1, 2].map((index) => requireElement(root, `#level-up-choice-${index}`) as HTMLButtonElement);
    this.titleEls = [0, 1, 2].map((index) => requireElement(root, `#level-up-choice-${index}-title`));
    this.descriptionEls = [0, 1, 2].map((index) => requireElement(root, `#level-up-choice-${index}-desc`));
    this.confirmButton = requireElement(root, '#level-up-confirm') as HTMLButtonElement;
    this.buttons.forEach((button, index) => button.addEventListener('click', () => this.selectIndex(index)));
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onConfirm(handler: () => void): void {
    if (this.confirmHandler) this.confirmButton.removeEventListener('click', this.confirmHandler);
    this.confirmHandler = handler;
    this.confirmButton.addEventListener('click', handler);
  }
  getChoiceId(): LevelUpChoiceId | null { return this.selectedChoiceId; }
  getAllocation(): LevelUpAllocation { return emptyLevelUpAllocation(); }
  show(view: LevelUpView): void { this.selectedChoiceId = null; this.render(view); this.overlayEl.hidden = false; }
  hide(): void { this.overlayEl.hidden = true; }
  render(view: LevelUpView): void {
    this.selectedChoiceId = null;
    this.levelEl.textContent = `Level ${view.level}`;
    this.xpEl.textContent = experienceHudText(view.experience, view.nextLevelExperience);
    this.hintEl.textContent = view.level === 5 ? 'Choose a specialization.' : view.level === 10 ? 'Choose your capstone.' : 'Choose one way to grow.';
    this.buttons.forEach((button, index) => {
      const choice = view.choices[index];
      button.hidden = !choice;
      button.disabled = !choice?.available;
      button.dataset.choiceId = choice?.id ?? '';
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
      this.titleEls[index]!.textContent = choice?.title ?? '';
      this.descriptionEls[index]!.textContent = choice?.description ?? '';
    });
    this.confirmButton.disabled = true;
  }
  dispose(): void {
    if (this.confirmHandler) this.confirmButton.removeEventListener('click', this.confirmHandler);
    this.confirmHandler = null;
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }
  private selectIndex(index: number): void {
    const choiceId = this.buttons[index]?.dataset.choiceId;
    if (!choiceId || this.buttons[index]?.disabled) return;
    this.selectedChoiceId = choiceId;
    this.buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this.confirmButton.disabled = false;
  }
  private readonly blockPointer = (event: PointerEvent): void => { event.stopPropagation(); };
}
