import { PropertyBinding, type Group } from 'three';
import { PLAYER_RENDER_KEYS, type PlayerRenderKey } from '../game/definitions/classes';
import { loadGltfScene } from './rigMediumAnimations';

export type PlayerEquipmentAssetKey = 'dagger';

export const PLAYER_EQUIPMENT_URLS: Record<PlayerEquipmentAssetKey, string> = {
  dagger: '/models/players/kaykit/weapons/dagger.gltf',
};

export const PLAYER_WEAPON_MOUNT_NAME = 'weaponMount';

/** Rendering-only loadout. Position/rotation apply on the mount, not the character. */
export interface PlayerEquipmentVisual {
  readonly assetKey: 'dagger';
  readonly mount: 'handslot.r';
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: number;
}

/**
 * Per-class visual equipment. Only Ranger is armed in this pass.
 * `handslot.r` is authored with a 90° Z rotation, so identity on the mount
 * seats the grip in the fist and lets the blade hang outward/down in Idle_A.
 */
export const PLAYER_EQUIPMENT_LOADOUTS: {
  readonly [K in PlayerRenderKey]?: PlayerEquipmentVisual;
} = {
  ranger: {
    assetKey: 'dagger',
    mount: 'handslot.r',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
};

export function isPlayerEquipmentAssetKey(
  value: string,
): value is PlayerEquipmentAssetKey {
  return value in PLAYER_EQUIPMENT_URLS;
}

export function playerEquipmentUrl(assetKey: PlayerEquipmentAssetKey): string {
  return PLAYER_EQUIPMENT_URLS[assetKey];
}

export function playerEquipmentLoadout(
  key: PlayerRenderKey | null | undefined,
): PlayerEquipmentVisual | undefined {
  if (!key) {
    return undefined;
  }
  return PLAYER_EQUIPMENT_LOADOUTS[key];
}

export function loadPlayerEquipmentTemplate(
  assetKey: PlayerEquipmentAssetKey,
): Promise<Group> {
  return loadGltfScene(playerEquipmentUrl(assetKey));
}

/** GLTFLoader sanitizes `.` in node names; try the authored bone and the runtime name. */
export function playerEquipmentMountNames(
  mount: PlayerEquipmentVisual['mount'],
): readonly string[] {
  const sanitized = PropertyBinding.sanitizeNodeName(mount);
  return sanitized === mount ? [mount] : [mount, sanitized];
}

export function playerRenderKeysWithoutEquipment(): PlayerRenderKey[] {
  return PLAYER_RENDER_KEYS.filter((key) => !PLAYER_EQUIPMENT_LOADOUTS[key]);
}
