import { requireElement } from './dom';

/** Title screen. Play starts the existing load → class-select flow. */
export class LandingView {
  private readonly overlayEl: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private playHandler: (() => void) | null = null;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#landing');
    this.playButton = requireElement(root, '#landing-play') as HTMLButtonElement;
  }

  onPlay(handler: () => void): void {
    this.detachPlay();
    this.playHandler = handler;
    this.playButton.addEventListener('click', handler);
  }

  setStarting(starting: boolean): void {
    this.playButton.disabled = starting;
    this.playButton.textContent = starting ? 'LOADING…' : 'PLAY';
  }

  hide(): void {
    this.overlayEl.hidden = true;
  }

  get hidden(): boolean {
    return Boolean(this.overlayEl.hidden);
  }

  dispose(): void {
    this.detachPlay();
  }

  private detachPlay(): void {
    if (!this.playHandler) {
      return;
    }
    this.playButton.removeEventListener('click', this.playHandler);
    this.playHandler = null;
  }
}
