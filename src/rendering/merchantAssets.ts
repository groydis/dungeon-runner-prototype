import { Box3, type Group, type Object3D } from 'three';
import {
  loadGltfScene,
  loadRigMediumClips,
  type RigMediumClipMap,
} from './rigMediumAnimations';

export const MERCHANT_MODEL_URL =
  '/models/merchants/kaykit/Hoarder.glb';
export const MERCHANT_MODEL_HEIGHT = 1.04;
export const MERCHANT_MODEL_YAW = 0;
export const MERCHANT_REQUIRED_MESH_NAMES = Object.freeze([
  'Hoarder_Backpack',
  'Hoarder_FaceMask',
  'Hoarder_FrontPouch_Sword',
]);

export function loadMerchantTemplate(): Promise<Group> {
  return loadGltfScene(MERCHANT_MODEL_URL);
}

export function loadMerchantClips(): Promise<RigMediumClipMap> {
  return loadRigMediumClips();
}

/** Fit the fully equipped Rig_Medium Hoarder to one tile and face the player. */
export function fitMerchantModel(root: Object3D): void {
  for (const name of MERCHANT_REQUIRED_MESH_NAMES) {
    const mesh = root.getObjectByName(name);
    if (!mesh) {
      throw new Error(`KayKit Hoarder is missing required mesh: ${name}`);
    }
    mesh.visible = true;
  }
  root.rotation.y = MERCHANT_MODEL_YAW;
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const height = Math.max(box.max.y - box.min.y, 0.001);
  root.scale.multiplyScalar(MERCHANT_MODEL_HEIGHT / height);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y;
}
