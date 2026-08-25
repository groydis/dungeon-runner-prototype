import { Box3, type Group, type Object3D, Vector3 } from 'three';
import { loadGltfScene } from './rigMediumAnimations';

export const COIN_MODEL_URLS = {
  coin: '/models/items/kaykit/coin.glb',
  coinStackSmall: '/models/items/kaykit/coin_stack_small.glb',
  coinStackLarge: '/models/items/kaykit/coin_stack_large.glb',
} as const;

export type CoinModelSize = keyof typeof COIN_MODEL_URLS;

/** iOS `PickupAssetRegistry` targetMaximumExtent values for floor gold. */
export const COIN_TARGET_EXTENT: Record<CoinModelSize, number> = {
  coin: 0.34,
  coinStackSmall: 0.5,
  coinStackLarge: 0.66,
};

export const FLOOR_COIN_MODEL_SIZES = Object.freeze([
  'coin',
  'coinStackSmall',
  'coinStackLarge',
] as const satisfies readonly CoinModelSize[]);

export function loadCoinTemplate(size: CoinModelSize): Promise<Group> {
  return loadGltfScene(COIN_MODEL_URLS[size]);
}

/** Normalize authored coin sizes to the iOS per-tier readable world extent. */
export function fitCoinModel(root: Object3D, size: CoinModelSize): void {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const extents = box.getSize(new Vector3());
  const largest = Math.max(extents.x, extents.y, extents.z, 0.001);
  root.scale.multiplyScalar(COIN_TARGET_EXTENT[size] / largest);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.sub(box.getCenter(new Vector3()));
}
