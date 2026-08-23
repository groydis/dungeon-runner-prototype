import {
  AmbientLight,
  AnimationMixer,
  DirectionalLight,
  Group,
  LoopRepeat,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  fitMerchantModel,
  loadMerchantClips,
  loadMerchantTemplate,
} from './merchantAssets';
import { PreviewStage } from './PreviewStage';

const PREVIEW_MODEL_SCALE = 1.62;

/** Animated Hoarder portrait rendered only while the Merchant shop is open. */
export class MerchantShopPreview {
  private readonly stage: PreviewStage;
  private mixer: AnimationMixer | null = null;
  private model: Group | null = null;
  private loading: Promise<void> | null = null;
  private visible = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.stage = new PreviewStage(canvas, { fov: 32 });
    this.stage.camera.position.set(0, 1.05, 3.2);
    this.stage.camera.lookAt(0, 0.76, 0);

    this.stage.scene.add(new AmbientLight(0xffe7c2, 2.25));
    const keyLight = new DirectionalLight(0xffd18b, 3.2);
    keyLight.position.set(-2.4, 3.2, 3.5);
    this.stage.scene.add(keyLight);
    const rimLight = new DirectionalLight(0x8ea7d8, 1.65);
    rimLight.position.set(2.8, 2.2, -2.5);
    this.stage.scene.add(rimLight);
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
    this.stage.renderWhen(this.visible);
  }

  dispose(): void {
    if (this.model && this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.stage.dispose();
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
        if (this.stage.isDisposed) {
          return;
        }
        const model = cloneSkinned(template) as Group;
        model.name = 'kaykitMerchantShopPreview-Hoarder';
        fitMerchantModel(model);
        model.scale.multiplyScalar(PREVIEW_MODEL_SCALE);
        model.position.y = -0.08;
        this.stage.scene.add(model);
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
}
