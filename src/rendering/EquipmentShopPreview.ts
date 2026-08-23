import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Vector3,
} from 'three';
import { type PlayerClassId } from '../game/definitions/classes';
import {
  PLAYER_SPECIAL_EQUIPMENT_LOADOUTS,
  loadPlayerEquipmentTemplate,
} from './playerEquipment';
import { PreviewStage } from './PreviewStage';

const PREVIEW_EXTENT = 1.62;

/** Transparent, slowly turning product view for the current class shop item. */
export class EquipmentShopPreview {
  private readonly stage: PreviewStage;
  private readonly presentation = new Group();
  private readonly content = new Group();
  private classId: PlayerClassId | null = null;
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

  setClassId(classId: PlayerClassId | null): void {
    if (classId === this.classId) {
      return;
    }
    this.classId = classId;
    this.loadToken += 1;
    this.clearContent();
    delete this.canvas.dataset.ready;
    delete this.canvas.dataset.failed;
    if (classId) {
      void this.loadClassEquipment(classId, this.loadToken);
    }
  }

  update(dt: number): void {
    if (!this.classId) {
      return;
    }
    this.clock += dt;
    this.presentation.rotation.y = Math.sin(this.clock * 1.15) * 0.2;
  }

  render(): void {
    this.stage.renderWhen(this.classId !== null);
  }

  dispose(): void {
    this.loadToken += 1;
    this.clearContent();
    this.stage.dispose();
  }

  private async loadClassEquipment(
    classId: PlayerClassId,
    token: number,
  ): Promise<void> {
    const loadout = PLAYER_SPECIAL_EQUIPMENT_LOADOUTS[classId];
    try {
      const templates = await Promise.all(
        loadout.map((visual) => loadPlayerEquipmentTemplate(visual.assetKey)),
      );
      if (
        this.stage.isDisposed ||
        token !== this.loadToken ||
        classId !== this.classId
      ) {
        return;
      }
      templates.forEach((template, index) => {
        const model = template.clone(true);
        model.name = `shopEquipmentPreview-${loadout[index].assetKey}`;
        this.layoutModel(model, classId, index, templates.length);
        this.content.add(model);
      });
      this.fitContent();
      this.canvas.dataset.ready = 'true';
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }
      console.error(`Failed to load ${classId} shop equipment preview`, error);
      this.canvas.dataset.failed = 'true';
    }
  }

  private layoutModel(
    model: Group,
    classId: PlayerClassId,
    index: number,
    count: number,
  ): void {
    if (classId === 'ranger') {
      model.rotation.x = Math.PI / 2;
      return;
    }
    if (count === 2) {
      model.position.x = index === 0 ? -0.42 : 0.48;
      model.rotation.z = index === 0 ? -0.15 : 0.04;
      if (index === 1) {
        model.scale.setScalar(0.9);
      }
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
