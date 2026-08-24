import { requireElement } from './dom';

/** One looping portrait at a time; the rest stay still. */
export class ClassesGallery {
  private readonly featuredImage: HTMLImageElement;
  private readonly featuredName: HTMLElement;
  private readonly featuredLore: HTMLElement;
  private readonly picks: HTMLButtonElement[];
  private readonly onPick = (event: Event): void => {
    const pick = event.currentTarget as HTMLButtonElement | null;
    if (!pick) {
      return;
    }
    this.showPick(pick, true);
  };
  private readonly onPickKey = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;
    const pick = keyEvent.currentTarget as HTMLButtonElement | null;
    if (!pick) {
      return;
    }
    const index = this.picks.indexOf(pick);
    if (keyEvent.key === 'ArrowRight' || keyEvent.key === 'ArrowDown') {
      keyEvent.preventDefault();
      this.showPick(this.picks[(index + 1) % this.picks.length], true);
      return;
    }
    if (keyEvent.key === 'ArrowLeft' || keyEvent.key === 'ArrowUp') {
      keyEvent.preventDefault();
      this.showPick(this.picks[(index - 1 + this.picks.length) % this.picks.length], true);
    }
  };

  constructor(
    root: ParentNode = document,
    private readonly prefersReducedMotion: () => boolean = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {
    this.featuredImage = requireElement(root, '#class-featured-image') as HTMLImageElement;
    this.featuredName = requireElement(root, '#class-featured-name');
    this.featuredLore = requireElement(root, '#class-featured-lore');
    this.picks = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-class-pick]'));
    for (const pick of this.picks) {
      pick.addEventListener('click', this.onPick);
      pick.addEventListener('keydown', this.onPickKey);
    }
  }

  activate(): void {
    const selected = this.picks.find((pick) => pick.getAttribute('aria-pressed') === 'true') ?? this.picks[0];
    if (selected) {
      this.showPick(selected, false);
    }
  }

  rest(): void {
    const selected = this.picks.find((pick) => pick.getAttribute('aria-pressed') === 'true');
    const still = selected?.getAttribute('data-still');
    if (still) {
      this.featuredImage.src = still;
    }
  }

  dispose(): void {
    for (const pick of this.picks) {
      pick.removeEventListener('click', this.onPick);
      pick.removeEventListener('keydown', this.onPickKey);
    }
  }

  private showPick(pick: HTMLButtonElement, moveFocus: boolean): void {
    const name = pick.getAttribute('data-name') ?? '';
    const lore = pick.getAttribute('data-lore') ?? '';
    const alt = pick.getAttribute('data-alt') ?? '';
    const still = pick.getAttribute('data-still') ?? '';
    const motion = pick.getAttribute('data-motion') ?? still;
    this.featuredName.textContent = name;
    this.featuredLore.textContent = lore;
    this.featuredImage.alt = alt;
    this.featuredImage.src = this.prefersReducedMotion() ? still : motion;
    for (const other of this.picks) {
      other.setAttribute('aria-pressed', other === pick ? 'true' : 'false');
    }
    if (moveFocus) {
      pick.focus();
    }
  }
}
