import { Box3, type Group, type Object3D } from 'three';
import { TILE_SIZE } from '../game/config';
import { loadGltfScene } from './rigMediumAnimations';

export type DungeonFloorAssetKey = 'stone' | 'brokenA' | 'brokenB';

export const DUNGEON_FLOOR_URLS: Record<DungeonFloorAssetKey, string> = {
  stone: '/models/environment/kaykit/dungeon/floor_tile_small.glb',
  brokenA:
    '/models/environment/kaykit/dungeon/floor_tile_small_broken_A.glb',
  brokenB:
    '/models/environment/kaykit/dungeon/floor_tile_small_broken_B.glb',
};

export const DUNGEON_FLOOR_KEYS = Object.freeze(
  Object.keys(DUNGEON_FLOOR_URLS) as DungeonFloorAssetKey[],
);

export function loadDungeonFloorTemplate(
  key: DungeonFloorAssetKey,
): Promise<Group> {
  return loadGltfScene(DUNGEON_FLOOR_URLS[key]);
}

/** Stable rendering-only variation; game generation and saved state are unaffected. */
export function dungeonFloorVariant(
  row: number,
  col: number,
): DungeonFloorAssetKey {
  const value = Math.abs(row * 17 + col * 13) % 10;
  if (value === 0) {
    return 'brokenA';
  }
  if (value === 1) {
    return 'brokenB';
  }
  return 'stone';
}

/** Fit the authored 2×2 KayKit tile over the existing pooled box fallback. */
export function fitDungeonFloorModel(root: Object3D): void {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const width = Math.max(box.max.x - box.min.x, 0.001);
  const depth = Math.max(box.max.z - box.min.z, 0.001);
  root.scale.multiplyScalar(TILE_SIZE / Math.max(width, depth));
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y += 0.071 - box.max.y;
}
