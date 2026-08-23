import {
  AmbientLight,
  AnimationMixer,
  Color,
  DirectionalLight,
  Group,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  fitMerchantModel,
  loadMerchantClips,
  loadMerchantTemplate,
} from './merchantAssets';

const PREVIEW_MODEL_SCALE = 1.62;
const MAX_PIXEL_RATIO = 1.5;

/** Animated Hoarder portrait rendered only while the Merchant shop is open. */
export class MerchantShopPreview {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 20);
  private readonly renderer: WebGLRenderer;
  private mixer: AnimationMixer | null = null;
  private model: Group | null = null;
  private loading: Promise<void> | null = null;
  private visible = false;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    this.camera.position.set(0, 1.05, 3.2);
    this.camera.lookAt(0, 0.76, 0);

    this.scene.add(new AmbientLight(0xffe7c2, 2.25));
    const keyLight = new DirectionalLight(0xffd18b, 3.2);
    keyLight.position.set(-2.4, 3.2, 3.5);
    this.scene.add(keyLight);
    const rimLight = new DirectionalLight(0x8ea7d8, 1.65);
    rimLight.position.set(2.8, 2.2, -2.5);
    this.scene.add(rimLight);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      void this.ensureModel();
    }
  }

  update(dt: number): void {
    if (!this.visible) {
      return;
    }
    this.mixer?.update(dt);
  }

  render(): void {
    if (!this.visible || this.disposed) {
      return;
    }
    this.resizeToCanvas();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    if (this.model && this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.renderer.dispose();
  }

  private ensureModel(): Promise<void> {
    if (this.model) {
      return Promise.resolve();
    }
    if (this.loading) {
      return this.loading;
    }

    this.loading = Promise.all([loadMerchantTemplate(), loadMerchantClips()])
      .then(([template, clips]) => {
        if (this.disposed) {
          return;
        }
        const model = cloneSkinned(template) as Group;
        model.name = 'kaykitMerchantShopPreview-Hoarder';
        fitMerchantModel(model);
        model.scale.multiplyScalar(PREVIEW_MODEL_SCALE);
        model.position.y = -0.08;
        this.scene.add(model);
        this.model = model;

        const mixer = new AnimationMixer(model);
        if (clips.idle) {
          const idle = mixer.clipAction(clips.idle);
          idle.setLoop(LoopRepeat, Infinity);
          idle.play();
        }
        this.mixer = mixer;
        this.canvas.dataset.ready = 'true';
      })
      .catch((error: unknown) => {
        console.error('Failed to load Hoarder shop preview', error);
        this.canvas.dataset.failed = 'true';
      });
    return this.loading;
  }

  private resizeToCanvas(): void {
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
}
