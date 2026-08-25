import { Box3, type Group, type Object3D, Vector3 } from 'three';
import { loadGltfScene } from './rigMediumAnimations';

export const POTION_MODEL_URLS = {
  small: '/models/items/kaykit/potion_small_red.glb',
  medium: '/models/items/kaykit/potion_medium_red.glb',
  large: '/models/items/kaykit/potion_large_red.glb',
  greater: '/models/items/kaykit/potion_huge_red.glb',
} as const;

export type PotionModelSize = keyof typeof POTION_MODEL_URLS;

/** iOS `PickupAssetRegistry` targetMaximumExtent values for floor potions. */
export const POTION_TARGET_EXTENT: Record<PotionModelSize, number> = {
  small: 0.5,
  medium: 0.62,
  large: 0.74,
  greater: 0.88,
};

export const FLOOR_POTION_MODEL_SIZES = Object.freeze([
  'small',
  'medium',
  'large',
  'greater',
] as const satisfies readonly PotionModelSize[]);

/** @deprecated Prefer FLOOR_POTION_MODEL_SIZES — all tiers load for the board. */
export const ACTIVE_POTION_MODEL_SIZE: PotionModelSize = 'small';
export const RESERVED_POTION_MODEL_SIZES = Object.freeze([
  'medium',
  'large',
  'greater',
] as const satisfies readonly PotionModelSize[]);

export const SHOP_POTION_MODEL_SIZES = FLOOR_POTION_MODEL_SIZES;

export function loadPotionTemplate(
  size: PotionModelSize = ACTIVE_POTION_MODEL_SIZE,
): Promise<Group> {
  return loadGltfScene(POTION_MODEL_URLS[size]);
}

/** Normalize authored potion sizes to the iOS per-tier readable world extent. */
export function fitPotionModel(
  root: Object3D,
  size: PotionModelSize = ACTIVE_POTION_MODEL_SIZE,
): void {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const extents = box.getSize(new Vector3());
  const largest = Math.max(extents.x, extents.y, extents.z, 0.001);
  root.scale.multiplyScalar(POTION_TARGET_EXTENT[size] / largest);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.sub(box.getCenter(new Vector3()));
}
