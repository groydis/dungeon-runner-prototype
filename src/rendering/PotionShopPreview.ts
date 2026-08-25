import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Vector3,
} from 'three';
import { type PotionOfferId } from '../game/merchantPotions';
import { loadPotionTemplate, type PotionModelSize } from './potionAssets';
import { PreviewStage } from './PreviewStage';

/** Fit each mesh into a similar frame; authored sizes already tier visually. */
const PREVIEW_EXTENT: Record<PotionModelSize, number> = {
  small: 1.2,
  medium: 1.35,
  large: 1.5,
  greater: 1.65,
};

/** Transparent, slowly turning product views for Merchant potion offers. */
export class PotionShopPreview {
  private readonly stages = new Map<PotionOfferId, PreviewStage>();
  private readonly presentations = new Map<PotionOfferId, Group>();
  private readonly contents = new Map<PotionOfferId, Group>();
  private readonly canvases = new Map<PotionOfferId, HTMLCanvasElement>();
  private readonly loadTokens = new Map<PotionOfferId, number>();
  private active = new Set<PotionOfferId>();
  private clock = 0;

  constructor(canvases: Record<PotionOfferId, HTMLCanvasElement>) {
    for (const [offerId, canvas] of Object.entries(canvases) as [
      PotionOfferId,
      HTMLCanvasElement,
    ][]) {
      const stage = new PreviewStage(canvas, { fov: 31 });
      const presentation = new Group();
      const content = new Group();
      presentation.add(content);
      stage.scene.add(presentation);
      stage.camera.position.set(0, 0, 3.2);
      stage.camera.lookAt(0, 0, 0);
      stage.scene.add(new AmbientLight(0xffead0, 2.4));
      const keyLight = new DirectionalLight(0xffd19b, 3.5);
      keyLight.position.set(-2.5, 3.4, 4);
      stage.scene.add(keyLight);
      const rimLight = new DirectionalLight(0xb7ada1, 1.8);
      rimLight.position.set(3, 1.7, -2.4);
      stage.scene.add(rimLight);

      this.canvases.set(offerId, canvas);
      this.stages.set(offerId, stage);
      this.presentations.set(offerId, presentation);
      this.contents.set(offerId, content);
      this.loadTokens.set(offerId, 0);
    }
  }

  setActiveOffers(offerIds: readonly PotionOfferId[]): void {
    const next = new Set(offerIds);
    for (const offerId of this.stages.keys()) {
      if (next.has(offerId) && !this.active.has(offerId)) {
        void this.loadOffer(offerId);
      }
      if (!next.has(offerId) && this.active.has(offerId)) {
        this.clearOffer(offerId);
      }
    }
    this.active = next;
  }

  update(dt: number): void {
    if (this.active.size === 0) {
      return;
    }
    this.clock += dt;
    const sway = Math.sin(this.clock * 1.15) * 0.22;
    for (const offerId of this.active) {
      const presentation = this.presentations.get(offerId);
      if (presentation) {
        presentation.rotation.y = sway;
      }
    }
  }

  render(): void {
    for (const [offerId, stage] of this.stages) {
      stage.renderWhen(this.active.has(offerId));
    }
  }

  dispose(): void {
    for (const offerId of this.stages.keys()) {
      this.clearOffer(offerId);
      this.stages.get(offerId)?.dispose();
    }
    this.active.clear();
  }

  private async loadOffer(offerId: PotionOfferId): Promise<void> {
    const token = (this.loadTokens.get(offerId) ?? 0) + 1;
    this.loadTokens.set(offerId, token);
    const canvas = this.canvases.get(offerId);
    const content = this.contents.get(offerId);
    const stage = this.stages.get(offerId);
    if (!canvas || !content || !stage) {
      return;
    }
    delete canvas.dataset.ready;
    delete canvas.dataset.failed;
    try {
      const template = await loadPotionTemplate(offerId);
      if (
        stage.isDisposed ||
        token !== this.loadTokens.get(offerId) ||
        !this.active.has(offerId)
      ) {
        return;
      }
      const model = template.clone(true);
      model.name = `shopPotionPreview-${offerId}`;
      model.rotation.z = -0.12;
      content.add(model);
      this.fitContent(offerId);
      canvas.dataset.ready = 'true';
    } catch (error) {
      if (token !== this.loadTokens.get(offerId)) {
        return;
      }
      console.error(`Failed to load ${offerId} shop potion preview`, error);
      canvas.dataset.failed = 'true';
    }
  }

  private fitContent(offerId: PotionOfferId): void {
    const content = this.contents.get(offerId);
    if (!content) {
      return;
    }
    content.updateMatrixWorld(true);
    const box = new Box3().setFromObject(content);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const largestExtent = Math.max(size.x, size.y, size.z, 0.001);
    const scale = PREVIEW_EXTENT[offerId] / largestExtent;
    content.scale.setScalar(scale);
    content.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );
  }

  private clearOffer(offerId: PotionOfferId): void {
    const token = (this.loadTokens.get(offerId) ?? 0) + 1;
    this.loadTokens.set(offerId, token);
    const content = this.contents.get(offerId);
    const presentation = this.presentations.get(offerId);
    const canvas = this.canvases.get(offerId);
    if (content) {
      for (const child of [...content.children]) {
        child.removeFromParent();
      }
      content.position.set(0, 0, 0);
      content.scale.setScalar(1);
    }
    presentation?.rotation.set(0, 0, 0);
    if (canvas) {
      delete canvas.dataset.ready;
      delete canvas.dataset.failed;
    }
  }
}
