import { type AssetPreloadProgress } from '../rendering/preloadAssets';
import { requireElement } from './dom';

const EXIT_DURATION_MS = 220;

export class LoadingView {
  private readonly overlayEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly progressEl: HTMLElement;
  private readonly fillEl: HTMLElement;
  private readonly percentEl: HTMLElement;

  constructor(root: ParentNode = document) {
    this.overlayEl = requireElement(root, '#loading-screen');
    this.statusEl = requireElement(root, '#loading-status');
    this.progressEl = requireElement(root, '#loading-progress');
    this.fillEl = requireElement(root, '#loading-progress-fill');
    this.percentEl = requireElement(root, '#loading-percent');
  }

  show(): void {
    delete this.overlayEl.dataset.state;
    this.overlayEl.hidden = false;
  }

  update(progress: AssetPreloadProgress): void {
    const percent = Math.max(0, Math.min(100, progress.percent));
    this.statusEl.textContent = progress.label;
    this.percentEl.textContent = `${percent}%`;
    this.fillEl.style.transform = `scaleX(${percent / 100})`;
    this.progressEl.setAttribute('aria-valuenow', String(percent));
  }

  finish(): Promise<void> {
    this.statusEl.textContent = 'The road is ready';
    this.percentEl.textContent = '100%';
    this.fillEl.style.transform = 'scaleX(1)';
    this.progressEl.setAttribute('aria-valuenow', '100');
    this.overlayEl.dataset.state = 'leaving';
    return new Promise((resolve) => {
      window.setTimeout(() => {
        this.overlayEl.hidden = true;
        resolve();
      }, EXIT_DURATION_MS);
    });
  }
}
