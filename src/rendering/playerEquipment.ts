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
  | 'axe2H'
  | 'axe1H'
  | 'crossbow1H'
  | 'crossbow2H'
  | 'wand'
  | 'spellbookClosed'
  | 'spellbookOpen'
  | 'sword2H'
  | 'sword2HColor'
  | 'shieldBadgeColor'
  | 'shieldRound'
  | 'shieldRoundBarbarian'
  | 'shieldRoundColor'
  | 'shieldSpikes'
  | 'shieldSpikesColor'
  | 'shieldSquare'
  | 'shieldSquareColor';

export const PLAYER_EQUIPMENT_URLS: Record<PlayerEquipmentAssetKey, string> = {
  dagger: '/models/players/kaykit/weapons/dagger.glb',
  bowWithString: '/models/players/kaykit/weapons/bow_withString.glb',
  staff: '/models/players/kaykit/weapons/staff.glb',
  sword1H: '/models/players/kaykit/weapons/sword_1handed.glb',
  shieldBadge: '/models/players/kaykit/weapons/shield_badge.glb',
  axe2H: '/models/players/kaykit/weapons/axe_2handed.glb',
  axe1H: '/models/players/kaykit/weapons/axe_1handed.glb',
  crossbow1H: '/models/players/kaykit/weapons/crossbow_1handed.glb',
  crossbow2H: '/models/players/kaykit/weapons/crossbow_2handed.glb',
  wand: '/models/players/kaykit/weapons/wand.glb',
  spellbookClosed: '/models/players/kaykit/weapons/spellbook_closed.glb',
  spellbookOpen: '/models/players/kaykit/weapons/spellbook_open.glb',
  sword2H: '/models/players/kaykit/weapons/sword_2handed.glb',
  sword2HColor: '/models/players/kaykit/weapons/sword_2handed_color.glb',
  shieldBadgeColor: '/models/players/kaykit/weapons/shield_badge_color.glb',
  shieldRound: '/models/players/kaykit/weapons/shield_round.glb',
  shieldRoundBarbarian:
    '/models/players/kaykit/weapons/shield_round_barbarian.glb',
  shieldRoundColor: '/models/players/kaykit/weapons/shield_round_color.glb',
  shieldSpikes: '/models/players/kaykit/weapons/shield_spikes.glb',
  shieldSpikesColor: '/models/players/kaykit/weapons/shield_spikes_color.glb',
  shieldSquare: '/models/players/kaykit/weapons/shield_square.glb',
  shieldSquareColor: '/models/players/kaykit/weapons/shield_square_color.glb',
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

const LEFT_HAND_DEFAULT = {
  mount: 'handslot.l',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
} as const;

export interface PlayerEquipmentUpgradeLevels {
  readonly sharpened: number;
  readonly armoured: number;
}

export const NO_EQUIPMENT_UPGRADES: PlayerEquipmentUpgradeLevels = {
  sharpened: 0,
  armoured: 0,
};

const KNIGHT_SHIELD_TIERS: readonly PlayerEquipmentAssetKey[] = [
  'shieldBadge',
  'shieldBadgeColor',
  'shieldRound',
  'shieldRoundBarbarian',
  'shieldRoundColor',
  'shieldSquare',
  'shieldSquareColor',
  'shieldSpikes',
  'shieldSpikesColor',
];

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
  upgrades: PlayerEquipmentUpgradeLevels = NO_EQUIPMENT_UPGRADES,
): readonly PlayerEquipmentVisual[] {
  if (!key) {
    return [];
  }
  const sharpened = Math.max(0, upgrades.sharpened);
  const armoured = Math.max(0, upgrades.armoured);
  if (key === 'rogue') {
    return [
      {
        assetKey: sharpened > 0 ? 'axe1H' : 'dagger',
        ...RIGHT_HAND_DEFAULT,
      },
    ];
  }
  if (key === 'ranger') {
    const assetKey =
      sharpened === 0
        ? 'bowWithString'
        : sharpened === 1
          ? 'crossbow1H'
          : 'crossbow2H';
    return [{ assetKey, ...RIGHT_HAND_DEFAULT }];
  }
  if (key === 'mage') {
    const loadout: PlayerEquipmentVisual[] = [
      {
        assetKey: sharpened > 0 ? 'wand' : 'staff',
        ...RIGHT_HAND_DEFAULT,
      },
    ];
    if (sharpened > 0) {
      loadout.push({
        assetKey: sharpened > 1 ? 'spellbookOpen' : 'spellbookClosed',
        ...LEFT_HAND_DEFAULT,
      });
    }
    return loadout;
  }
  if (key === 'knight') {
    return [
      { assetKey: 'sword1H', ...RIGHT_HAND_DEFAULT },
      {
        assetKey: KNIGHT_SHIELD_TIERS[
          Math.min(armoured, KNIGHT_SHIELD_TIERS.length - 1)
        ],
        ...LEFT_HAND_DEFAULT,
      },
    ];
  }
  const assetKey =
    sharpened === 0
      ? 'axe2H'
      : sharpened === 1
        ? 'sword2H'
        : 'sword2HColor';
  return [{ assetKey, ...RIGHT_HAND_DEFAULT }];
}

export function playerProjectileKind(
  key: PlayerRenderKey | null | undefined,
  upgrades: PlayerEquipmentUpgradeLevels = NO_EQUIPMENT_UPGRADES,
): 'bow' | 'crossbow' | undefined {
  if (key !== 'ranger') {
    return undefined;
  }
  return upgrades.sharpened > 0 ? 'crossbow' : 'bow';
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
