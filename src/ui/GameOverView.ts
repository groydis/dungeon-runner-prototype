import { requireElement } from './dom';

export class GameOverView {
  private readonly overlayEl: HTMLElement;
  private readonly distanceEl: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private restartHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#game-over');
    this.distanceEl = requireElement(root, '#game-over-distance');
    this.restartButton = requireElement(root, '#restart-run') as HTMLButtonElement;
  }

  onRestart(handler: () => void): void {
    this.detachRestart();
    this.restartHandler = handler;
    this.restartButton.addEventListener('click', handler);
  }

  show(distance: number): void {
    this.distanceEl.textContent = `Distance: ${distance}`;
    this.overlayEl.hidden = false;
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  dispose(): void {
    this.detachRestart();
  }

  private detachRestart(): void {
    if (!this.restartHandler) {
      return;
    }
    this.restartButton.removeEventListener('click', this.restartHandler);
    this.restartHandler = null;
  }
}
