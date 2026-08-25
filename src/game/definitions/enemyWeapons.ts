import { type PlayerEquipmentAssetKey } from '../../rendering/playerEquipment';
import { pickWeighted, type Rng } from '../random';
import { type EnemyType } from './enemies';
import {
  SHIELD_CATALOG,
  WEAPON_CATALOG,
  type ShieldCatalogEntry,
  type WeaponCatalogEntry,
} from './weaponCatalog';

export interface EnemyWeaponVariant {
  readonly weaponAssetKey: PlayerEquipmentAssetKey;
  readonly weaponMount: 'handslot.r';
  readonly shieldAssetKey?: PlayerEquipmentAssetKey;
  readonly shieldMount?: 'handslot.l';
  readonly offhandWeaponAssetKey?: PlayerEquipmentAssetKey;
  readonly offhandWeaponMount?: 'handslot.l';
  readonly attackBonus: number;
  readonly defenceBonus: number;
}

const CRYPT_GUARD_POOL: readonly { item: string | null; weight: number }[] = [
  { item: null, weight: 60 },
  { item: 'dagger', weight: 5 },
  { item: 'daggerC', weight: 5 },
  { item: 'daggerA', weight: 5 },
  { item: 'daggerB', weight: 5 },
  { item: 'swordF', weight: 5 },
  { item: 'sword1H', weight: 3 },
  { item: 'swordG', weight: 3 },
  { item: 'swordA', weight: 3 },
  { item: 'swordB', weight: 3 },
  { item: 'swordC', weight: 3 },
  { item: 'swordD', weight: 3 },
  { item: 'axe1H', weight: 2 },
  { item: 'axeA', weight: 2 },
  { item: 'axeC', weight: 2 },
];
const CRYPT_GUARD_SHIELD_CHANCE = 0.2;

const SKELETON_WARRIOR_POOL: readonly { item: string | null; weight: number }[] =
  [
    { item: null, weight: 60 },
    { item: 'sword2H', weight: 3 },
    { item: 'sword2HColor', weight: 3 },
    { item: 'swordE', weight: 3 },
    { item: 'axe2H', weight: 2 },
    { item: 'axeB', weight: 2 },
    { item: 'axeD', weight: 2 },
    { item: 'hammerA', weight: 2 },
    { item: 'hammerB', weight: 2 },
    { item: 'hammerC', weight: 2 },
    { item: 'spearA', weight: 2 },
    { item: 'spearB', weight: 2 },
    { item: 'hammerD', weight: 1 },
    { item: 'halberd', weight: 1 },
    { item: 'scythe', weight: 1 },
  ];

const CASTER_POOL: readonly { item: string | null; weight: number }[] = [
  { item: null, weight: 70 },
  { item: 'staff', weight: 3 },
  { item: 'druidStaff', weight: 3 },
  { item: 'wand', weight: 3 },
  { item: 'staffC', weight: 3 },
  { item: 'staffD', weight: 3 },
  { item: 'staffA', weight: 3 },
  { item: 'staffB', weight: 3 },
  { item: 'wandA', weight: 3 },
  { item: 'wandB', weight: 3 },
];

const MINION_POOL: readonly { item: string | null; weight: number }[] = [
  { item: null, weight: 70 },
  { item: 'fistweaponA', weight: 5 },
  { item: 'fistweaponB', weight: 3 },
  { item: 'fistweaponC', weight: 3 },
];

const BRUTE_POOL: readonly { item: string | null; weight: number }[] = [
  { item: null, weight: 55 },
  { item: 'fistweaponA', weight: 5 },
  { item: 'fistweaponB', weight: 5 },
  { item: 'fistweaponC', weight: 5 },
];

const MINION_FIST_ATTACK: Readonly<Record<string, number>> = {
  fistweaponA: 1,
  fistweaponB: 2,
  fistweaponC: 2,
};

const BRUTE_FIST_ATTACK: Readonly<Record<string, number>> = {
  fistweaponA: 2,
  fistweaponB: 3,
  fistweaponC: 3,
};

const SHIELD_RARITY_WEIGHT: Record<ShieldCatalogEntry['rarity'], number> = {
  common: 5,
  uncommon: 3,
  rare: 2,
  legendary: 1,
};

const SHIELD_POOL: readonly { item: ShieldCatalogEntry; weight: number }[] =
  SHIELD_CATALOG.map((shield) => ({
    item: shield,
    weight: SHIELD_RARITY_WEIGHT[shield.rarity],
  }));

function catalogEntry(id: string): WeaponCatalogEntry {
  const entry = WEAPON_CATALOG.find((weapon) => weapon.id === id);
  if (!entry) {
    throw new Error(`Unknown weapon id '${id}'`);
  }
  return entry;
}

function buildFistVariant(
  weaponId: string,
  attackBonus: number,
): EnemyWeaponVariant {
  if (weaponId === 'fistweaponC') {
    return {
      weaponAssetKey: 'fantasyFistweaponCRight',
      weaponMount: 'handslot.r',
      offhandWeaponAssetKey: 'fantasyFistweaponCLeft',
      offhandWeaponMount: 'handslot.l',
      attackBonus,
      defenceBonus: 0,
    };
  }

  const assetKey: PlayerEquipmentAssetKey =
    weaponId === 'fistweaponA' ? 'fantasyFistweaponA' : 'fantasyFistweaponB';
  return {
    weaponAssetKey: assetKey,
    weaponMount: 'handslot.r',
    offhandWeaponAssetKey: assetKey,
    offhandWeaponMount: 'handslot.l',
    attackBonus,
    defenceBonus: 0,
  };
}

/** Rolls a weapon variant for eligible enemy types; null on an unarmed roll. */
export function rollEnemyWeapon(
  type: EnemyType,
  rng: Rng,
): EnemyWeaponVariant | null {
  const pool =
    type === 'cryptGuard'
      ? CRYPT_GUARD_POOL
      : type === 'skeletonWarrior'
        ? SKELETON_WARRIOR_POOL
        : type === 'skeletonMage' || type === 'necromancer'
          ? CASTER_POOL
          : type === 'skeletonMinion'
            ? MINION_POOL
            : type === 'boneBrute'
              ? BRUTE_POOL
              : null;
  if (!pool) {
    return null;
  }

  const weaponId = pickWeighted(pool, rng);
  if (!weaponId) {
    return null;
  }

  if (type === 'skeletonMinion' || type === 'boneBrute') {
    const attackBonus =
      type === 'skeletonMinion'
        ? MINION_FIST_ATTACK[weaponId]
        : BRUTE_FIST_ATTACK[weaponId];
    if (attackBonus === undefined) {
      throw new Error(`Unknown fist weapon id '${weaponId}'`);
    }
    return buildFistVariant(weaponId, attackBonus);
  }

  const weapon = catalogEntry(weaponId);
  let shieldEntry: ShieldCatalogEntry | undefined;
  if (type === 'cryptGuard' && rng() < CRYPT_GUARD_SHIELD_CHANCE) {
    shieldEntry = pickWeighted(SHIELD_POOL, rng);
  }

  return {
    weaponAssetKey: weapon.assetKey,
    weaponMount: 'handslot.r',
    shieldAssetKey: shieldEntry?.assetKey,
    shieldMount: shieldEntry ? 'handslot.l' : undefined,
    attackBonus: weapon.attackBonus,
    defenceBonus: shieldEntry?.defenceBonus ?? 0,
  };
}
