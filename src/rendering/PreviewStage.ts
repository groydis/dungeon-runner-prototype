import {
  Color,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export const PREVIEW_MAX_PIXEL_RATIO = 1.5;

export interface PreviewStageOptions {
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
}

/**
 * Shared WebGL lifecycle for overlay previews. Feature previews own lighting,
 * models, load tokens, and animation.
 */
export class PreviewStage {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: PreviewStageOptions = {},
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, PREVIEW_MAX_PIXEL_RATIO),
    );
    this.camera = new PerspectiveCamera(
      options.fov ?? 30,
      1,
      options.near ?? 0.1,
      options.far ?? 20,
    );
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  resizeToCanvas(): void {
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    const pixelRatio = this.renderer.getPixelRatio();
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);
    if (
      this.canvas.width === targetWidth &&
      this.canvas.height === targetHeight
    ) {
      return;
    }
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  renderWhen(visible: boolean): void {
    if (!visible || this.disposed) {
      return;
    }
    this.resizeToCanvas();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.renderer.dispose();
  }
}
