import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Color,
  DirectionalLight,
  Group,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
  SkinnedMesh,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { type PlayerClassId } from '../game/definitions/classes';
import { loadPlayerTemplate } from './playerAssets';
import {
  PLAYER_WEAPON_MOUNT_NAME,
  loadPlayerEquipmentTemplate,
  playerEquipmentLoadout,
  playerEquipmentMountNames,
  type PlayerEquipmentVisual,
} from './playerEquipment';
import { loadRigMediumIdleClip } from './rigMediumAnimations';

const MAX_PIXEL_RATIO = 1.5;
const PREVIEW_MODEL_HEIGHT = 1.88;

/** Idle KayKit adventurer shown by the full-screen class carousel. */
export class ClassSelectionPreview {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(27, 1, 0.1, 20);
  private readonly renderer: WebGLRenderer;
  private readonly presentation = new Group();
  private model: Group | null = null;
  private mixer: AnimationMixer | null = null;
  private classId: PlayerClassId | null = null;
  private loadToken = 0;
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

    this.scene.add(this.presentation);
    this.camera.position.set(0, 0.08, 4.6);
    this.camera.lookAt(0, 0.02, 0);

    this.scene.add(new AmbientLight(0xffead0, 2.15));
    const keyLight = new DirectionalLight(0xffd3a0, 3.3);
    keyLight.position.set(-2.8, 3.8, 4.2);
    this.scene.add(keyLight);
    const fillLight = new DirectionalLight(0xaeb7c0, 2.1);
    fillLight.position.set(3.2, 2.4, 1.2);
    this.scene.add(fillLight);
    const rimLight = new DirectionalLight(0x8c99ad, 1.4);
    rimLight.position.set(1.4, 2.6, -3.4);
    this.scene.add(rimLight);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  setClassId(classId: PlayerClassId): void {
    if (classId === this.classId && this.model) {
      return;
    }
    this.classId = classId;
    this.loadToken += 1;
    this.clearModel();
    delete this.canvas.dataset.ready;
    delete this.canvas.dataset.failed;
    void this.loadClass(classId, this.loadToken);
  }

  update(dt: number): void {
    if (this.visible) {
      this.mixer?.update(dt);
    }
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
    this.loadToken += 1;
    this.clearModel();
    this.renderer.dispose();
  }

  private async loadClass(
    classId: PlayerClassId,
    token: number,
  ): Promise<void> {
    const loadout = playerEquipmentLoadout(classId);
    try {
      const [template, idleClip, equipmentTemplates] = await Promise.all([
        loadPlayerTemplate(classId),
        loadRigMediumIdleClip(),
        Promise.all(
          loadout.map((visual) =>
            loadPlayerEquipmentTemplate(visual.assetKey),
          ),
        ),
      ]);
      if (
        this.disposed ||
        token !== this.loadToken ||
        classId !== this.classId
      ) {
        return;
      }

      const model = cloneSkinned(template) as Group;
      model.name = `classSelectionPreview-${classId}`;
      this.fitModel(model);
      loadout.forEach((visual, index) => {
        this.attachEquipment(model, equipmentTemplates[index], visual);
      });
      this.presentation.add(model);
      this.model = model;

      const mixer = new AnimationMixer(model);
      if (idleClip) {
        const idle = mixer.clipAction(idleClip);
        idle.setLoop(LoopRepeat, Infinity);
        idle.play();
      }
      this.mixer = mixer;
      this.canvas.dataset.ready = 'true';
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }
      console.error(`Failed to load ${classId} class preview`, error);
      this.canvas.dataset.failed = 'true';
    }
  }

  private attachEquipment(
    model: Group,
    template: Group,
    visual: PlayerEquipmentVisual,
  ): void {
    const slot = findEquipmentMount(model, visual.mount);
    if (!slot) {
      console.error(
        `Failed to attach class preview equipment '${visual.assetKey}': missing mount '${visual.mount}'`,
      );
      return;
    }
    const mount = new Group();
    mount.name = `${PLAYER_WEAPON_MOUNT_NAME}-${visual.assetKey}`;
    mount.position.set(...visual.position);
    mount.rotation.set(...visual.rotation);
    mount.scale.setScalar(visual.scale);
    mount.add(template.clone(true));
    slot.add(mount);
  }

  private fitModel(model: Group): void {
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = PREVIEW_MODEL_HEIGHT / Math.max(size.y, 0.001);
    model.scale.multiplyScalar(scale);
    model.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );
  }

  private clearModel(): void {
    if (this.model && this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.mixer = null;
    this.model?.removeFromParent();
    this.model = null;
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

function findEquipmentMount(
  root: Object3D,
  mount: PlayerEquipmentVisual['mount'],
): Object3D | undefined {
  const names = playerEquipmentMountNames(mount);
  for (const name of names) {
    const node = root.getObjectByName(name);
    if (node) {
      return node;
    }
  }
  let found: Object3D | undefined;
  root.traverse((child) => {
    if (found) {
      return;
    }
    const skinned = child as SkinnedMesh;
    if (!skinned.isSkinnedMesh || !skinned.skeleton) {
      return;
    }
    found = skinned.skeleton.bones.find((bone) => names.includes(bone.name));
  });
  return found;
}
