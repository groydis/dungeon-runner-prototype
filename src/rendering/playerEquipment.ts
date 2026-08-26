import { PropertyBinding, type Group } from 'three';
import {
  PLAYER_RENDER_KEYS,
  type PlayerRenderKey,
} from '../game/definitions/classes';
import {
  KNIGHT_SHIELD_PROGRESSION,
  PLAYER_WEAPON_PROGRESSION,
  shieldCatalogEntry,
  weaponCatalogEntry,
} from '../game/definitions/playerWeaponProgression';
import { loadGltfScene } from './rigMediumAnimations';

export type PlayerEquipmentAssetKey =
  | 'dagger'
  | 'bow'
  | 'bowWithString'
  | 'staff'
  | 'druidStaff'
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
  | 'shieldSquareColor'
  | 'fantasyDaggerC'
  | 'fantasyDaggerA'
  | 'fantasyDaggerB'
  | 'fantasyBowAWithString'
  | 'fantasyBowBWithString'
  | 'fantasyBowCWithString'
  | 'fantasyStaffD'
  | 'fantasyStaffA'
  | 'fantasyStaffB'
  | 'fantasySwordG'
  | 'fantasySwordA'
  | 'fantasySwordB'
  | 'fantasySwordC'
  | 'fantasySwordD'
  | 'fantasySwordE'
  | 'fantasySwordF'
  | 'fantasyShieldA'
  | 'fantasyShieldB'
  | 'fantasyShieldC'
  | 'fantasyShieldD'
  | 'fantasyHammerD'
  | 'fantasyHammerA'
  | 'fantasyHammerB'
  | 'fantasyHammerC'
  | 'fantasyStaffC'
  | 'fantasyAxeA'
  | 'fantasyAxeB'
  | 'fantasyAxeC'
  | 'fantasyAxeD'
  | 'fantasyFistweaponA'
  | 'fantasyFistweaponB'
  | 'fantasyFistweaponCLeft'
  | 'fantasyFistweaponCRight'
  | 'fantasyHalberd'
  | 'fantasyScythe'
  | 'fantasySpearA'
  | 'fantasySpearB'
  | 'fantasyWandA'
  | 'fantasyWandB';

export const PLAYER_EQUIPMENT_URLS: Record<PlayerEquipmentAssetKey, string> = {
  dagger: '/models/players/kaykit/weapons/dagger.glb',
  bow: '/models/players/kaykit/weapons/bow.glb',
  bowWithString: '/models/players/kaykit/weapons/bow_withString.glb',
  staff: '/models/players/kaykit/weapons/staff.glb',
  druidStaff: '/models/players/kaykit/weapons/druid_staff.glb',
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
  fantasyDaggerC:
    '/models/players/kaykit/weapons/fantasy_bits/dagger_C.glb',
  fantasyDaggerA:
    '/models/players/kaykit/weapons/fantasy_bits/dagger_A.glb',
  fantasyDaggerB:
    '/models/players/kaykit/weapons/fantasy_bits/dagger_B.glb',
  fantasyBowAWithString:
    '/models/players/kaykit/weapons/fantasy_bits/bow_A_withString.glb',
  fantasyBowBWithString:
    '/models/players/kaykit/weapons/fantasy_bits/bow_B_withString.glb',
  fantasyBowCWithString:
    '/models/players/kaykit/weapons/fantasy_bits/bow_C_withString.glb',
  fantasyStaffD: '/models/players/kaykit/weapons/fantasy_bits/staff_D.glb',
  fantasyStaffA: '/models/players/kaykit/weapons/fantasy_bits/staff_A.glb',
  fantasyStaffB: '/models/players/kaykit/weapons/fantasy_bits/staff_B.glb',
  fantasySwordG: '/models/players/kaykit/weapons/fantasy_bits/sword_G.glb',
  fantasySwordA: '/models/players/kaykit/weapons/fantasy_bits/sword_A.glb',
  fantasySwordB: '/models/players/kaykit/weapons/fantasy_bits/sword_B.glb',
  fantasySwordC: '/models/players/kaykit/weapons/fantasy_bits/sword_C.glb',
  fantasySwordD: '/models/players/kaykit/weapons/fantasy_bits/sword_D.glb',
  fantasySwordE: '/models/players/kaykit/weapons/fantasy_bits/sword_E.glb',
  fantasySwordF: '/models/players/kaykit/weapons/fantasy_bits/sword_F.glb',
  fantasyShieldA: '/models/players/kaykit/weapons/fantasy_bits/shield_A.glb',
  fantasyShieldB: '/models/players/kaykit/weapons/fantasy_bits/shield_B.glb',
  fantasyShieldC: '/models/players/kaykit/weapons/fantasy_bits/shield_C.glb',
  fantasyShieldD: '/models/players/kaykit/weapons/fantasy_bits/shield_D.glb',
  fantasyHammerD: '/models/players/kaykit/weapons/fantasy_bits/hammer_D.glb',
  fantasyHammerA: '/models/players/kaykit/weapons/fantasy_bits/hammer_A.glb',
  fantasyHammerB: '/models/players/kaykit/weapons/fantasy_bits/hammer_B.glb',
  fantasyHammerC: '/models/players/kaykit/weapons/fantasy_bits/hammer_C.glb',
  fantasyStaffC: '/models/players/kaykit/weapons/fantasy_bits/staff_C.glb',
  fantasyAxeA: '/models/players/kaykit/weapons/fantasy_bits/axe_A.glb',
  fantasyAxeB: '/models/players/kaykit/weapons/fantasy_bits/axe_B.glb',
  fantasyAxeC: '/models/players/kaykit/weapons/fantasy_bits/axe_C.glb',
  fantasyAxeD: '/models/players/kaykit/weapons/fantasy_bits/axe_D.glb',
  fantasyFistweaponA:
    '/models/players/kaykit/weapons/fantasy_bits/fistweapon_A.glb',
  fantasyFistweaponB:
    '/models/players/kaykit/weapons/fantasy_bits/fistweapon_B.glb',
  fantasyFistweaponCLeft:
    '/models/players/kaykit/weapons/fantasy_bits/fistweapon_C_left.glb',
  fantasyFistweaponCRight:
    '/models/players/kaykit/weapons/fantasy_bits/fistweapon_C_right.glb',
  fantasyHalberd: '/models/players/kaykit/weapons/fantasy_bits/halberd.glb',
  fantasyScythe: '/models/players/kaykit/weapons/fantasy_bits/scythe.glb',
  fantasySpearA: '/models/players/kaykit/weapons/fantasy_bits/spear_A.glb',
  fantasySpearB: '/models/players/kaykit/weapons/fantasy_bits/spear_B.glb',
  fantasyWandA: '/models/players/kaykit/weapons/fantasy_bits/wand_A.glb',
  fantasyWandB: '/models/players/kaykit/weapons/fantasy_bits/wand_B.glb',
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

export function isPlayerEquipmentAssetKey(
  value: string,
): value is PlayerEquipmentAssetKey {
  return value in PLAYER_EQUIPMENT_URLS;
}

export function playerEquipmentUrl(assetKey: PlayerEquipmentAssetKey): string {
  return PLAYER_EQUIPMENT_URLS[assetKey];
}

function weaponVisual(
  key: PlayerRenderKey,
  weaponTierIndex: number,
): PlayerEquipmentVisual {
  const ladder = PLAYER_WEAPON_PROGRESSION[key];
  const index = Math.max(0, Math.min(weaponTierIndex, ladder.length - 1));
  const assetKey = weaponCatalogEntry(ladder[index]!).assetKey;
  if (key === 'ranger' && assetKey === 'bowWithString') {
    return {
      assetKey,
      mount: 'handslot.r',
      position: [0, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      scale: 1,
    };
  }
  return { assetKey, ...RIGHT_HAND_DEFAULT };
}

function shieldVisual(shieldTierIndex: number): PlayerEquipmentVisual {
  const index = Math.max(
    0,
    Math.min(shieldTierIndex, KNIGHT_SHIELD_PROGRESSION.length - 1),
  );
  return {
    assetKey: shieldCatalogEntry(KNIGHT_SHIELD_PROGRESSION[index]!).assetKey,
    ...LEFT_HAND_DEFAULT,
  };
}

/**
 * Visual equipment from the in-run weapon/shield ladder.
 * Index 0 is the free starter for each class.
 */
export function playerEquipmentLoadout(
  key: PlayerRenderKey | null | undefined,
  weaponTierIndex = 0,
  shieldTierIndex = 0,
): readonly PlayerEquipmentVisual[] {
  if (!key) {
    return [];
  }
  const loadout: PlayerEquipmentVisual[] = [
    weaponVisual(key, weaponTierIndex),
  ];
  if (key === 'knight') {
    loadout.push(shieldVisual(shieldTierIndex));
  }
  return loadout;
}

/** Starter loadouts = progression index 0 (and knight shield index 0). */
export const PLAYER_EQUIPMENT_LOADOUTS: Readonly<
  Record<PlayerRenderKey, readonly PlayerEquipmentVisual[]>
> = Object.freeze(
  Object.fromEntries(
    PLAYER_RENDER_KEYS.map((key) => [key, playerEquipmentLoadout(key, 0, 0)]),
  ) as Record<PlayerRenderKey, readonly PlayerEquipmentVisual[]>,
);

export function playerProjectileKind(
  key: PlayerRenderKey | null | undefined,
  weaponTierIndex = 0,
): 'bow' | 'crossbow' | undefined {
  if (key !== 'ranger') {
    return undefined;
  }
  const ladder = PLAYER_WEAPON_PROGRESSION.ranger;
  const index = Math.max(0, Math.min(weaponTierIndex, ladder.length - 1));
  const weaponId = ladder[index]!;
  return weaponId === 'crossbow1H' || weaponId === 'crossbow2H'
    ? 'crossbow'
    : 'bow';
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
    (key) => playerEquipmentLoadout(key).length === 0,
  );
}
