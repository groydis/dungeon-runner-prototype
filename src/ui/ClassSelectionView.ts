import {
  PLAYER_CLASS_IDS,
  classStatLine,
  type ClassOptionView,
  type ClassSelectionView as ClassSelectionSnapshot,
  type PlayerClassId,
} from '../game/definitions/classes';
import { requireElement } from './dom';

export function classHudText(className: string): string {
  return className ? `CLASS: ${className}` : 'CLASS: —';
}

export function classSelectAriaLabel(option: ClassOptionView): string {
  return `Select ${option.name}. ${option.description} ${classStatLine(option)}`;
}

export class ClassSelectionView {
  private readonly overlayEl: HTMLElement;
  private readonly buttons: Record<PlayerClassId, HTMLButtonElement>;
  private readonly names: Record<PlayerClassId, HTMLElement>;
  private readonly descs: Record<PlayerClassId, HTMLElement>;
  private readonly stats: Record<PlayerClassId, HTMLElement>;
  private readonly handlers: Partial<Record<PlayerClassId, () => void>> = {};

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#class-select');
    this.buttons = {
      rogue: requireElement(root, '#class-select-rogue') as HTMLButtonElement,
      ranger: requireElement(root, '#class-select-ranger') as HTMLButtonElement,
      mage: requireElement(root, '#class-select-mage') as HTMLButtonElement,
      knight: requireElement(root, '#class-select-knight') as HTMLButtonElement,
      barbarian: requireElement(root, '#class-select-barbarian') as HTMLButtonElement,
    };
    this.names = {
      rogue: requireElement(root, '#class-rogue-name'),
      ranger: requireElement(root, '#class-ranger-name'),
      mage: requireElement(root, '#class-mage-name'),
      knight: requireElement(root, '#class-knight-name'),
      barbarian: requireElement(root, '#class-barbarian-name'),
    };
    this.descs = {
      rogue: requireElement(root, '#class-rogue-desc'),
      ranger: requireElement(root, '#class-ranger-desc'),
      mage: requireElement(root, '#class-mage-desc'),
      knight: requireElement(root, '#class-knight-desc'),
      barbarian: requireElement(root, '#class-barbarian-desc'),
    };
    this.stats = {
      rogue: requireElement(root, '#class-rogue-stats'),
      ranger: requireElement(root, '#class-ranger-stats'),
      mage: requireElement(root, '#class-mage-stats'),
      knight: requireElement(root, '#class-knight-stats'),
      barbarian: requireElement(root, '#class-barbarian-stats'),
    };
    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
  }

  onSelect(classId: PlayerClassId, handler: () => void): void {
    this.detach(classId);
    this.handlers[classId] = handler;
    this.buttons[classId].addEventListener('click', handler);
  }

  show(view: ClassSelectionSnapshot): void {
    this.render(view);
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  get hidden(): boolean {
    return Boolean(this.overlayEl.hidden);
  }

  render(view: ClassSelectionSnapshot): void {
    for (const option of view.classes) {
      this.renderOption(option);
    }
  }

  dispose(): void {
    for (const id of PLAYER_CLASS_IDS) {
      this.detach(id);
    }
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
  }

  private renderOption(option: ClassOptionView): void {
    this.names[option.id].textContent = option.name;
    this.descs[option.id].textContent = option.description;
    this.stats[option.id].textContent = classStatLine(option);
    this.buttons[option.id].disabled = false;
    this.buttons[option.id].setAttribute('aria-label', classSelectAriaLabel(option));
  }

  private detach(classId: PlayerClassId): void {
    const handler = this.handlers[classId];
    if (!handler) {
      return;
    }
    this.buttons[classId].removeEventListener('click', handler);
    delete this.handlers[classId];
  }

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
