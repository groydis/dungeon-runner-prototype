import { Box3, Mesh, type Group, type Object3D } from 'three';
import { TILE_SIZE } from '../game/config';
import { loadGltfScene } from './rigMediumAnimations';

export type DungeonFloorAssetKey = 'stone' | 'wood';

export const DUNGEON_FLOOR_URLS: Record<DungeonFloorAssetKey, string> = {
  stone: '/models/environment/kaykit/dungeon/floor_tile_large.glb',
  wood: '/models/environment/kaykit/dungeon/floor_wood_large.glb',
};

export const DUNGEON_TRAP_URL =
  '/models/environment/kaykit/dungeon/floor_tile_big_spikes.glb';
export const DUNGEON_TRAP_SPIKE_NODE_NAME = 'spikes';

export const DUNGEON_FLOOR_KEYS = Object.freeze(
  Object.keys(DUNGEON_FLOOR_URLS) as DungeonFloorAssetKey[],
);

export function loadDungeonFloorTemplate(
  key: DungeonFloorAssetKey,
): Promise<Group> {
  return loadGltfScene(DUNGEON_FLOOR_URLS[key]);
}

export function loadDungeonTrapTemplate(): Promise<Group> {
  return loadGltfScene(DUNGEON_TRAP_URL);
}

/** Stable rendering-only variation; game generation and saved state are unaffected. */
export function dungeonFloorVariant(
  _row: number,
  _col: number,
): DungeonFloorAssetKey {
  return 'stone';
}

/** Break up repetition without cloning more floor assets into the row pool. */
export function dungeonFloorRotation(row: number, col: number): number {
  return (Math.abs(row * 17 + col * 13) % 4) * (Math.PI / 2);
}

/** Fit a KayKit tile over one logical cell and align its top with the fallback. */
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

/** Fit the spike assembly while aligning its floor rather than its raised tips. */
export function fitDungeonTrapModel(root: Object3D): Object3D {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const width = Math.max(box.max.x - box.min.x, 0.001);
  const depth = Math.max(box.max.z - box.min.z, 0.001);
  root.scale.multiplyScalar(TILE_SIZE / Math.max(width, depth));
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.updateMatrixWorld(true);

  const floor = root.getObjectByName('floor_tile_big_spikes');
  if (!(floor instanceof Mesh)) {
    throw new Error('KayKit spike trap floor mesh is missing');
  }
  floor.geometry.computeBoundingBox();
  const floorBounds = floor.geometry.boundingBox;
  if (!floorBounds) {
    throw new Error('KayKit spike trap floor bounds are missing');
  }
  const worldFloorBounds = floorBounds.clone().applyMatrix4(floor.matrixWorld);
  root.position.y += 0.071 - worldFloorBounds.max.y;

  const spikes = root.getObjectByName(DUNGEON_TRAP_SPIKE_NODE_NAME);
  if (!spikes) {
    throw new Error('KayKit spike trap spike node is missing');
  }
  return spikes;
}
