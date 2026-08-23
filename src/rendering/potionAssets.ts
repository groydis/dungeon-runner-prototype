import { Box3, type Group, type Object3D, Vector3 } from 'three';
import { loadGltfScene } from './rigMediumAnimations';

export const POTION_MODEL_URLS = {
  small: '/models/items/kaykit/potion_small_red.glb',
  medium: '/models/items/kaykit/potion_medium_red.glb',
  large: '/models/items/kaykit/potion_large_red.glb',
} as const;

export type PotionModelSize = keyof typeof POTION_MODEL_URLS;

export const ACTIVE_POTION_MODEL_SIZE: PotionModelSize = 'small';
export const RESERVED_POTION_MODEL_SIZES = Object.freeze([
  'medium',
  'large',
] as const satisfies readonly PotionModelSize[]);

export function loadPotionTemplate(
  size: PotionModelSize = ACTIVE_POTION_MODEL_SIZE,
): Promise<Group> {
  return loadGltfScene(POTION_MODEL_URLS[size]);
}

/** Normalize authored potion sizes to the current pickup's readable world height. */
export function fitPotionModel(root: Object3D): void {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  root.scale.multiplyScalar(0.34 / Math.max(size.y, 0.001));
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.sub(box.getCenter(new Vector3()));
}
