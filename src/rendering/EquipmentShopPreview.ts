import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Vector3,
} from 'three';
import {
  PLAYER_WEAPON_PROGRESSION,
  weaponCatalogEntry,
} from '../game/definitions/playerWeaponProgression';
import { type ShopWeaponOfferView } from '../game/shop';
import {
  loadPlayerEquipmentTemplate,
  type PlayerEquipmentAssetKey,
} from './playerEquipment';
import { PreviewStage } from './PreviewStage';

const PREVIEW_EXTENT = 1.62;

/** Transparent, slowly turning product view for the next purchasable weapon tier. */
export class EquipmentShopPreview {
  private readonly stage: PreviewStage;
  private readonly presentation = new Group();
  private readonly content = new Group();
  private assetKey: PlayerEquipmentAssetKey | null = null;
  private classId: ShopWeaponOfferView['classId'] | null = null;
  private loadToken = 0;
  private clock = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.stage = new PreviewStage(canvas, { fov: 31 });
    this.presentation.add(this.content);
    this.stage.scene.add(this.presentation);
    this.stage.camera.position.set(0, 0, 3.65);
    this.stage.camera.lookAt(0, 0, 0);

    this.stage.scene.add(new AmbientLight(0xffead0, 2.4));
    const keyLight = new DirectionalLight(0xffd19b, 3.5);
    keyLight.position.set(-2.5, 3.4, 4);
    this.stage.scene.add(keyLight);
    const rimLight = new DirectionalLight(0xb7ada1, 1.8);
    rimLight.position.set(3, 1.7, -2.4);
    this.stage.scene.add(rimLight);
  }

  setWeaponOffer(offer: ShopWeaponOfferView | null): void {
    if (!offer) {
      this.clearOffer();
      return;
    }
    const weaponId =
      PLAYER_WEAPON_PROGRESSION[offer.classId][offer.tierIndex] ?? offer.weaponId;
    const assetKey = weaponCatalogEntry(weaponId).assetKey;
    if (assetKey === this.assetKey && offer.classId === this.classId) {
      return;
    }
    this.assetKey = assetKey;
    this.classId = offer.classId;
    this.loadToken += 1;
    this.clearContent();
    delete this.canvas.dataset.ready;
    delete this.canvas.dataset.failed;
    void this.loadAsset(assetKey, offer.classId, this.loadToken);
  }

  update(dt: number): void {
    if (!this.assetKey) {
      return;
    }
    this.clock += dt;
    this.presentation.rotation.y = Math.sin(this.clock * 1.15) * 0.2;
  }

  render(): void {
    this.stage.renderWhen(this.assetKey !== null);
  }

  dispose(): void {
    this.loadToken += 1;
    this.clearContent();
    this.stage.dispose();
  }

  private clearOffer(): void {
    if (this.assetKey === null && this.classId === null) {
      return;
    }
    this.assetKey = null;
    this.classId = null;
    this.loadToken += 1;
    this.clearContent();
    delete this.canvas.dataset.ready;
    delete this.canvas.dataset.failed;
  }

  private async loadAsset(
    assetKey: PlayerEquipmentAssetKey,
    classId: ShopWeaponOfferView['classId'],
    token: number,
  ): Promise<void> {
    try {
      const template = await loadPlayerEquipmentTemplate(assetKey);
      if (
        this.stage.isDisposed ||
        token !== this.loadToken ||
        assetKey !== this.assetKey
      ) {
        return;
      }
      const model = template.clone(true);
      model.name = `shopEquipmentPreview-${assetKey}`;
      this.layoutModel(model, classId);
      this.content.add(model);
      this.fitContent();
      this.canvas.dataset.ready = 'true';
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }
      console.error(`Failed to load shop weapon preview '${assetKey}'`, error);
      this.canvas.dataset.failed = 'true';
    }
  }

  private layoutModel(
    model: Group,
    classId: ShopWeaponOfferView['classId'],
  ): void {
    if (classId === 'ranger') {
      model.rotation.x = Math.PI / 2;
      return;
    }
    model.rotation.z = -0.14;
  }

  private fitContent(): void {
    this.content.updateMatrixWorld(true);
    const box = new Box3().setFromObject(this.content);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const largestExtent = Math.max(size.x, size.y, size.z, 0.001);
    const scale = PREVIEW_EXTENT / largestExtent;
    this.content.scale.setScalar(scale);
    this.content.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );
  }

  private clearContent(): void {
    for (const child of [...this.content.children]) {
      child.removeFromParent();
    }
    this.content.position.set(0, 0, 0);
    this.content.scale.setScalar(1);
    this.presentation.rotation.set(0, 0, 0);
  }
}
