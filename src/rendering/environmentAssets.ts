import { Box3, Mesh, type Group, type Object3D } from 'three';
import {
  LANE_COUNT,
  TILE_PITCH,
  TILE_SIZE,
  laneWorldX,
} from '../game/config';
import { loadGltfScene } from './rigMediumAnimations';

export type DungeonFloorAssetKey = 'stone' | 'wood';
export type DungeonWallSide = 'left' | 'right';
export type DungeonWallAssetKey =
  | 'stone'
  | 'cracked'
  | 'closedWindow'
  | 'gated'
  | 'archedGated'
  | 'shelves'
  | 'inset'
  | 'scaffold'
  | 'scaffoldWindow';

export const DUNGEON_FLOOR_URLS: Record<DungeonFloorAssetKey, string> = {
  stone: '/models/environment/kaykit/dungeon/floor_tile_large.glb',
  wood: '/models/environment/kaykit/dungeon/floor_wood_large.glb',
};

export const DUNGEON_TRAP_URL =
  '/models/environment/kaykit/dungeon/floor_tile_big_spikes.glb';
export const DUNGEON_TRAP_SPIKE_NODE_NAME = 'spikes';
export const DUNGEON_WALL_URLS: Record<DungeonWallAssetKey, string> = {
  stone: '/models/environment/kaykit/dungeon/walls/wall.glb',
  cracked: '/models/environment/kaykit/dungeon/walls/wall_cracked.glb',
  closedWindow:
    '/models/environment/kaykit/dungeon/walls/wall_window_closed.glb',
  gated: '/models/environment/kaykit/dungeon/walls/wall_gated.glb',
  archedGated:
    '/models/environment/kaykit/dungeon/walls/wall_archedwindow_gated.glb',
  shelves: '/models/environment/kaykit/dungeon/walls/wall_shelves.glb',
  inset: '/models/environment/kaykit/dungeon/walls/wall_inset.glb',
  scaffold: '/models/environment/kaykit/dungeon/walls/wall_scaffold.glb',
  scaffoldWindow:
    '/models/environment/kaykit/dungeon/walls/wall_window_closed_scaffold.glb',
};
export const DUNGEON_WALL_TORCH_URL =
  '/models/environment/kaykit/dungeon/props/torch_mounted.glb';

export const DUNGEON_FLOOR_KEYS = Object.freeze(
  Object.keys(DUNGEON_FLOOR_URLS) as DungeonFloorAssetKey[],
);
export const DUNGEON_WALL_KEYS = Object.freeze(
  Object.keys(DUNGEON_WALL_URLS) as DungeonWallAssetKey[],
);
export const DUNGEON_WALL_LIGHT_KEYS = Object.freeze([
  'gated',
  'archedGated',
] as const satisfies readonly DungeonWallAssetKey[]);

const DUNGEON_WALL_VARIANTS: readonly DungeonWallAssetKey[] = Object.freeze([
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'stone',
  'cracked',
  'cracked',
  'closedWindow',
  'closedWindow',
  'gated',
  'archedGated',
  'shelves',
  'inset',
  'scaffold',
  'scaffoldWindow',
]);

const FLOOR_TOP_Y = 0.071;
const WALL_SOURCE_WIDTH = 4;
const WALL_MOUNT_HEIGHT = FLOOR_TOP_Y + TILE_PITCH * 0.58;

export function loadDungeonFloorTemplate(
  key: DungeonFloorAssetKey,
): Promise<Group> {
  return loadGltfScene(DUNGEON_FLOOR_URLS[key]);
}

export function loadDungeonTrapTemplate(): Promise<Group> {
  return loadGltfScene(DUNGEON_TRAP_URL);
}

export function loadDungeonWallTemplate(
  key: DungeonWallAssetKey,
): Promise<Group> {
  return loadGltfScene(DUNGEON_WALL_URLS[key]);
}

export function loadDungeonWallTorchTemplate(): Promise<Group> {
  return loadGltfScene(DUNGEON_WALL_TORCH_URL);
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

/** Stable visual-only wall choice; it never consumes gameplay RNG. */
export function dungeonWallVariant(
  row: number,
  side: DungeonWallSide,
): DungeonWallAssetKey {
  if (row >= 0 && row <= 2) {
    return 'stone';
  }
  const hash = presentationHash(row, side === 'left' ? 0x51ed270b : 0x7f4a7c15);
  return DUNGEON_WALL_VARIANTS[hash % DUNGEON_WALL_VARIANTS.length]!;
}

/** One alternating mounted torch every seven rows keeps the corridor readable. */
export function dungeonWallTorchSide(row: number): DungeonWallSide | null {
  if (row < 4 || (row - 4) % 7 !== 0) {
    return null;
  }
  return Math.floor((row - 4) / 7) % 2 === 0 ? 'left' : 'right';
}

/** Windowed and gated modules receive a rendering-only exterior light beam. */
export function dungeonWallTransmitsLight(key: DungeonWallAssetKey): boolean {
  return DUNGEON_WALL_LIGHT_KEYS.includes(
    key as (typeof DUNGEON_WALL_LIGHT_KEYS)[number],
  );
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

/** Fit one modular wall to a pooled row and align its inner face to the road. */
export function fitDungeonWallModel(
  root: Object3D,
  side: DungeonWallSide,
): void {
  root.updateMatrixWorld(true);
  let box = new Box3().setFromObject(root);
  const width = Math.max(box.max.x - box.min.x, 0.001);
  root.scale.multiplyScalar(TILE_PITCH / width);
  root.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  root.updateMatrixWorld(true);
  box = new Box3().setFromObject(root);

  const roadEdge = Math.abs(laneWorldX(LANE_COUNT - 1)) + TILE_SIZE / 2;
  root.position.x +=
    side === 'left' ? -roadEdge - box.max.x : roadEdge - box.min.x;
  root.position.y += FLOOR_TOP_Y - box.min.y;
  root.position.z -= (box.min.z + box.max.z) / 2;
}

/** Mount a small static KayKit torch against the wall's corridor-facing side. */
export function fitDungeonWallTorch(
  root: Object3D,
  side: DungeonWallSide,
): void {
  root.scale.multiplyScalar(TILE_PITCH / WALL_SOURCE_WIDTH);
  root.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const roadEdge = Math.abs(laneWorldX(LANE_COUNT - 1)) + TILE_SIZE / 2;
  root.position.x +=
    side === 'left' ? -roadEdge - box.min.x : roadEdge - box.max.x;
  root.position.y += WALL_MOUNT_HEIGHT - (box.min.y + box.max.y) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
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

function presentationHash(row: number, salt: number): number {
  let value = Math.imul(row + 1, 0x45d9f3b) ^ salt;
  value ^= value >>> 16;
  return value >>> 0;
}
