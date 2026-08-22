import { PropertyBinding, type Group } from 'three';
import {
  PLAYER_RENDER_KEYS,
  type PlayerRenderKey,
} from '../game/definitions/classes';
import { loadGltfScene } from './rigMediumAnimations';

export type PlayerEquipmentAssetKey =
  | 'dagger'
  | 'bowWithString'
  | 'staff'
  | 'sword1H'
  | 'shieldBadge'
  | 'axe2H';

export const PLAYER_EQUIPMENT_URLS: Record<PlayerEquipmentAssetKey, string> = {
  dagger: '/models/players/kaykit/weapons/dagger.glb',
  bowWithString: '/models/players/kaykit/weapons/bow_withString.glb',
  staff: '/models/players/kaykit/weapons/staff.glb',
  sword1H: '/models/players/kaykit/weapons/sword_1handed.glb',
  shieldBadge: '/models/players/kaykit/weapons/shield_badge.glb',
  axe2H: '/models/players/kaykit/weapons/axe_2handed.glb',
};

export const PLAYER_WEAPON_MOUNT_NAME = 'weaponMount';

export type PlayerEquipmentMount = 'handslot.r' | 'handslot.l';

/** Rendering-only loadout. Position/rotation apply on the mount, not the character. */
export interface PlayerEquipmentVisual {
  readonly assetKey: PlayerEquipmentAssetKey;
  readonly mount: PlayerEquipmentMount;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly scale: number;
}

const RIGHT_HAND_DEFAULT = {
  mount: 'handslot.r',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
} as const;

/** Visual equipment only; these entries never alter combat stats or game rules. */
export const PLAYER_EQUIPMENT_LOADOUTS: Readonly<
  Record<PlayerRenderKey, readonly PlayerEquipmentVisual[]>
> = {
  rogue: [{ assetKey: 'dagger', ...RIGHT_HAND_DEFAULT }],
  ranger: [{ assetKey: 'bowWithString', ...RIGHT_HAND_DEFAULT }],
  mage: [{ assetKey: 'staff', ...RIGHT_HAND_DEFAULT }],
  knight: [
    { assetKey: 'sword1H', ...RIGHT_HAND_DEFAULT },
    {
      assetKey: 'shieldBadge',
      mount: 'handslot.l',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    },
  ],
  barbarian: [{ assetKey: 'axe2H', ...RIGHT_HAND_DEFAULT }],
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
): readonly PlayerEquipmentVisual[] {
  return key ? PLAYER_EQUIPMENT_LOADOUTS[key] : [];
}

export function loadPlayerEquipmentTemplate(
  assetKey: PlayerEquipmentAssetKey,
): Promise<Group> {
  return loadGltfScene(playerEquipmentUrl(assetKey));
}

/** GLTFLoader sanitizes `.` in node names; try the authored bone and runtime name. */
export function playerEquipmentMountNames(
  mount: PlayerEquipmentMount,
): readonly string[] {
  const sanitized = PropertyBinding.sanitizeNodeName(mount);
  return sanitized === mount ? [mount] : [mount, sanitized];
}

export function playerRenderKeysWithoutEquipment(): PlayerRenderKey[] {
  return PLAYER_RENDER_KEYS.filter(
    (key) => PLAYER_EQUIPMENT_LOADOUTS[key].length === 0,
  );
}
