import {
  classStatLine,
  type ClassOptionView,
  type ClassSelectionView as ClassSelectionSnapshot,
  type PlayerClassId,
} from '../game/definitions/classes';
import { requireElement } from './dom';

const SWIPE_THRESHOLD_PX = 42;

export function classHudText(className: string): string {
  return className ? `CLASS: ${className}` : 'CLASS: —';
}

export function classSelectAriaLabel(option: ClassOptionView): string {
  return `Select ${option.name}. ${option.description} ${classStatLine(option)}`;
}

/** Full-screen, one-class-at-a-time carousel. Three.js preview remains rendering-owned. */
export class ClassSelectionView {
  private readonly overlayEl: HTMLElement;
  private readonly carouselEl: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly descriptionEl: HTMLElement;
  private readonly positionEl: HTMLElement;
  private readonly healthEl: HTMLElement;
  private readonly attackEl: HTMLElement;
  private readonly defenceEl: HTMLElement;
  private readonly wardEl: HTMLElement | null;
  private readonly evadeEl: HTMLElement;
  private readonly mightEl: HTMLElement | null;
  private readonly vigorEl: HTMLElement | null;
  private readonly willEl: HTMLElement | null;
  private readonly featureEl: HTMLElement | null;
  private readonly previousButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly selectButton: HTMLButtonElement;
  private readonly handlers: Partial<Record<PlayerClassId, () => void>> = {};
  private classes: ClassOptionView[] = [];
  private currentIndex = 0;
  private preparing = false;
  private pointerStartX: number | null = null;
  private changeHandler: ((classId: PlayerClassId) => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#class-select');
    this.carouselEl = requireElement(root, '#class-carousel');
    this.nameEl = requireElement(root, '#class-current-name');
    this.descriptionEl = requireElement(root, '#class-current-desc');
    this.positionEl = requireElement(root, '#class-carousel-position');
    this.healthEl = requireElement(root, '#class-stat-health');
    this.attackEl = requireElement(root, '#class-stat-attack');
    this.defenceEl = requireElement(root, '#class-stat-defence');
    this.wardEl = root.querySelector('#class-stat-ward');
    this.evadeEl = requireElement(root, '#class-stat-evade');
    this.mightEl = root.querySelector('#class-stat-might');
    this.vigorEl = root.querySelector('#class-stat-vigor');
    this.willEl = root.querySelector('#class-stat-will');
    this.featureEl = root.querySelector('#class-current-feature');
    this.previousButton = requireElement(
      root,
      '#class-previous',
    ) as HTMLButtonElement;
    this.nextButton = requireElement(root, '#class-next') as HTMLButtonElement;
    this.selectButton = requireElement(
      root,
      '#class-select-current',
    ) as HTMLButtonElement;

    this.overlayEl.addEventListener('pointerdown', this.blockPointer);
    this.overlayEl.addEventListener('keydown', this.handleKeyDown);
    this.carouselEl.addEventListener('pointerdown', this.handleSwipeStart);
    this.carouselEl.addEventListener('pointerup', this.handleSwipeEnd);
    this.carouselEl.addEventListener('pointercancel', this.cancelSwipe);
    this.previousButton.addEventListener('click', this.showPrevious);
    this.nextButton.addEventListener('click', this.showNext);
    this.selectButton.addEventListener('click', this.selectCurrent);
  }

  onSelect(classId: PlayerClassId, handler: () => void): void {
    this.handlers[classId] = handler;
  }

  onChange(handler: (classId: PlayerClassId) => void): void {
    this.changeHandler = handler;
    const current = this.currentOption;
    if (current) {
      handler(current.id);
    }
  }

  show(view: ClassSelectionSnapshot): void {
    this.classes = [...view.classes];
    this.currentIndex = 0;
    this.preparing = false;
    this.renderCurrent();
    this.overlayEl.hidden = false;
    this.notifyChange();
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  get hidden(): boolean {
    return Boolean(this.overlayEl.hidden);
  }

  get selectedClassId(): PlayerClassId | null {
    return this.currentOption?.id ?? null;
  }

  setPreparing(preparing: boolean): void {
    this.preparing = preparing;
    this.renderCurrent();
  }

  render(view: ClassSelectionSnapshot): void {
    const selectedId = this.currentOption?.id;
    this.classes = [...view.classes];
    const selectedIndex = selectedId
      ? this.classes.findIndex((option) => option.id === selectedId)
      : -1;
    this.currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    this.renderCurrent();
  }

  dispose(): void {
    this.overlayEl.removeEventListener('pointerdown', this.blockPointer);
    this.overlayEl.removeEventListener('keydown', this.handleKeyDown);
    this.carouselEl.removeEventListener('pointerdown', this.handleSwipeStart);
    this.carouselEl.removeEventListener('pointerup', this.handleSwipeEnd);
    this.carouselEl.removeEventListener('pointercancel', this.cancelSwipe);
    this.previousButton.removeEventListener('click', this.showPrevious);
    this.nextButton.removeEventListener('click', this.showNext);
    this.selectButton.removeEventListener('click', this.selectCurrent);
    this.changeHandler = null;
  }

  private get currentOption(): ClassOptionView | undefined {
    return this.classes[this.currentIndex];
  }

  private renderCurrent(): void {
    const option = this.currentOption;
    if (!option) {
      return;
    }
    this.nameEl.textContent = option.name;
    this.descriptionEl.textContent = option.description;
    if (this.featureEl) this.featureEl.textContent = option.featureText;
    this.positionEl.textContent = `${this.currentIndex + 1} / ${this.classes.length}`;
    this.healthEl.textContent = String(option.maxHealth);
    this.attackEl.textContent = String(option.attack);
    this.defenceEl.textContent = String(option.armor);
    if (this.wardEl) this.wardEl.textContent = String(option.ward);
    if (this.mightEl) this.mightEl.textContent = String(option.attributes.might);
    this.evadeEl.textContent = String(option.attributes.finesse);
    if (this.vigorEl) this.vigorEl.textContent = String(option.attributes.vigor);
    if (this.willEl) this.willEl.textContent = String(option.attributes.will);
    this.selectButton.textContent = this.preparing
      ? `PREPARING ${option.name.toUpperCase()}…`
      : `BEGIN AS ${option.name.toUpperCase()}`;
    this.selectButton.disabled = this.preparing;
    this.previousButton.disabled = this.preparing;
    this.nextButton.disabled = this.preparing;
    this.selectButton.setAttribute('aria-label', classSelectAriaLabel(option));
  }

  private step(delta: number): void {
    if (this.classes.length === 0 || this.preparing) {
      return;
    }
    this.currentIndex =
      (this.currentIndex + delta + this.classes.length) % this.classes.length;
    this.renderCurrent();
    this.notifyChange();
  }

  private notifyChange(): void {
    const current = this.currentOption;
    if (current) {
      this.changeHandler?.(current.id);
    }
  }

  private readonly showPrevious = (): void => {
    this.step(-1);
  };

  private readonly showNext = (): void => {
    this.step(1);
  };

  private readonly selectCurrent = (): void => {
    const current = this.currentOption;
    if (current) {
      this.handlers[current.id]?.();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.step(1);
    }
  };

  private readonly handleSwipeStart = (event: PointerEvent): void => {
    this.pointerStartX = event.clientX;
  };

  private readonly handleSwipeEnd = (event: PointerEvent): void => {
    if (this.pointerStartX === null) {
      return;
    }
    const delta = event.clientX - this.pointerStartX;
    this.pointerStartX = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) {
      return;
    }
    this.step(delta < 0 ? 1 : -1);
  };

  private readonly cancelSwipe = (): void => {
    this.pointerStartX = null;
  };

  private readonly blockPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };
}
