import { type PlayerClassId } from './classes';
import {
  SHIELD_CATALOG,
  WEAPON_CATALOG,
  type ShieldCatalogEntry,
  type WeaponCatalogEntry,
} from './weaponCatalog';

/** Ordered weapon catalog ids per class. Buying index N unlocks the next visit's N+1. */
export const PLAYER_WEAPON_PROGRESSION: Readonly<
  Record<PlayerClassId, readonly string[]>
> = Object.freeze({
  // Only one real melee-light tier exists in the catalog (all +1 common).
  rogue: Object.freeze(['dagger']),
  ranger: Object.freeze(['bowWithString', 'crossbow1H', 'crossbow2H']),
  // Every caster catalog entry is uncommon/+2 — single purchase, not a padded ladder.
  mage: Object.freeze(['staff']),
  knight: Object.freeze(['sword1H', 'sword2H']),
  barbarian: Object.freeze(['axe1H', 'axe2H', 'hammerD']),
  lorekeeper: Object.freeze(['staff']),
});

/** Knight-only shield ladder (defence +2 → +3 → +4 → +5). */
export const KNIGHT_SHIELD_PROGRESSION: readonly string[] = Object.freeze([
  'shieldRound',
  'shieldBadge',
  'fantasyShieldB',
  'fantasyShieldD',
]);

/** Gold cost by 0-based tier index; last entry reused if a ladder is longer. */
export const WEAPON_TIER_COSTS: readonly number[] = Object.freeze([
  15, 30, 50, 80,
]);

/**
 * Display names per progression slot. Top tiers reuse the retired special-
 * equipment flavour names (Venomfang / Moonpiercer / etc.).
 */
export const PLAYER_WEAPON_TIER_NAMES: Readonly<
  Record<PlayerClassId, readonly string[]>
> = Object.freeze({
  rogue: Object.freeze(['Venomfang Dagger']),
  ranger: Object.freeze([
    'Hunter Bow',
    'Crossbow',
    'Moonpiercer Bow',
  ]),
  mage: Object.freeze(['Shardcaller Staff']),
  knight: Object.freeze(['Arming Sword', 'Frostguard Arsenal']),
  barbarian: Object.freeze([
    'War Axe',
    'Greataxe',
    'Worldbreaker Hammer',
  ]),
  lorekeeper: Object.freeze(['Verdant Staff']),
});

export const KNIGHT_SHIELD_TIER_NAMES: readonly string[] = Object.freeze([
  'Round Shield',
  'Badge Shield',
  'Tower Shield',
  'Frostguard Aegis',
]);

export const PLAYER_WEAPON_TIER_FLAVOUR: Readonly<
  Record<PlayerClassId, readonly string[]>
> = Object.freeze({
  rogue: Object.freeze(['A quick blade with an alchemical edge.']),
  ranger: Object.freeze([
    'A reliable bow for the long road.',
    'A compact crossbow ready to fire.',
    'An ornate bow balanced for a sure release.',
  ]),
  mage: Object.freeze(['Arcane fragments orbit its crystal focus.']),
  knight: Object.freeze([
    'A well-balanced one-handed blade.',
    'An ice-forged sword for the deepest rows.',
  ]),
  barbarian: Object.freeze([
    'A brutal one-handed axe.',
    'A two-handed axe built for ruin.',
    'A brutal stone maul made for impossible blows.',
  ]),
  lorekeeper: Object.freeze(['Living crystal steadies both spell and scholar.']),
});

export const KNIGHT_SHIELD_TIER_FLAVOUR: readonly string[] = Object.freeze([
  'A light round shield for early scrapes.',
  'A sturdier badge shield.',
  'A heavy tower face for serious blows.',
  'An ice-warded aegis of the Frostguard.',
]);

export function weaponTierCost(tierIndex: number): number {
  if (tierIndex < 0) {
    return WEAPON_TIER_COSTS[0]!;
  }
  return WEAPON_TIER_COSTS[
    Math.min(tierIndex, WEAPON_TIER_COSTS.length - 1)
  ]!;
}

export function weaponCatalogEntry(id: string): WeaponCatalogEntry {
  const entry = WEAPON_CATALOG.find((weapon) => weapon.id === id);
  if (!entry) {
    throw new Error(`Unknown weapon catalog id '${id}'`);
  }
  return entry;
}

export function shieldCatalogEntry(id: string): ShieldCatalogEntry {
  const entry = SHIELD_CATALOG.find((shield) => shield.id === id);
  if (!entry) {
    throw new Error(`Unknown shield catalog id '${id}'`);
  }
  return entry;
}

export function nextWeaponTierIndex(currentIndex: number): number {
  return currentIndex + 1;
}

export function isWeaponLadderComplete(
  classId: PlayerClassId,
  currentIndex: number,
): boolean {
  return nextWeaponTierIndex(currentIndex) >= PLAYER_WEAPON_PROGRESSION[classId].length;
}

export function isShieldLadderComplete(currentIndex: number): boolean {
  return nextWeaponTierIndex(currentIndex) >= KNIGHT_SHIELD_PROGRESSION.length;
}
