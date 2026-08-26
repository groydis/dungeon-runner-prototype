import { type PlayerClassId } from './classes';
import {
  SHIELD_CATALOG,
  WEAPON_CATALOG,
  type ShieldCatalogEntry,
  type WeaponCatalogEntry,
} from './weaponCatalog';

/**
 * Ordered weapon catalog ids per class.
 * Index 0 is the free starter (already equipped, never purchasable, 0 stat bonus).
 * Buying the offer at index N unlocks index N+1 on the next merchant visit.
 *
 * Catalog ids are `daggerA` / `bowAWithString` (not the `fantasyDaggerA` /
 * `fantasyBowAWithString` asset-key spellings). Asset keys are resolved from
 * WEAPON_CATALOG at render/purchase time.
 */
export const PLAYER_WEAPON_PROGRESSION: Readonly<
  Record<PlayerClassId, readonly string[]>
> = Object.freeze({
  rogue: Object.freeze([
    'dagger',
    'daggerA',
    'daggerB',
    'daggerC',
  ]),
  ranger: Object.freeze([
    'bowWithString',
    'bowAWithString',
    'bowBWithString',
    'bowCWithString',
    'crossbow1H',
    'crossbow2H',
  ]),
  knight: Object.freeze([
    'sword1H',
    'swordA',
    'swordB',
    'swordC',
    'swordD',
    'swordF',
    'swordG',
    'sword2H',
    'sword2HColor',
    'swordE',
    'spearA',
    'spearB',
  ]),
  barbarian: Object.freeze([
    'axe2H',
    'axeB',
    'axeD',
    'hammerA',
    'hammerB',
    'hammerC',
    'hammerD',
  ]),
  mage: Object.freeze([
    'staff',
    'druidStaff',
    'wand',
    'staffC',
    'staffD',
    'staffA',
    'staffB',
    'wandA',
    'wandB',
  ]),
  lorekeeper: Object.freeze([
    'staff',
    'druidStaff',
    'wand',
    'staffC',
    'staffD',
    'staffA',
    'staffB',
    'wandA',
    'wandB',
  ]),
});

/** Knight-only shield ladder. Index 0 is the free starter. */
export const KNIGHT_SHIELD_PROGRESSION: readonly string[] = Object.freeze([
  'shieldBadge',
  'shieldBadgeColor',
  'shieldSpikes',
  'shieldSpikesColor',
  'shieldSquare',
  'shieldSquareColor',
  'fantasyShieldB',
  'fantasyShieldC',
  'fantasyShieldD',
]);

/**
 * Player-ladder stat bonus is purely tier-index-driven (flat +1 per purchase),
 * NOT the catalog entry's own attackBonus/defenceBonus — those numbers were
 * authored for enemy variety and are flat or even decreasing across some of
 * these lists. The catalog is used ONLY to resolve which model renders at
 * each tier; the stat always comes from this formula.
 */
export function weaponTierBonus(tierIndex: number): number {
  return Math.max(0, tierIndex);
}

export const shieldTierBonus = weaponTierBonus;

/**
 * Gold cost to purchase the step landing on this tier index
 * (1-based; index 0 is never purchased).
 */
const TIER_COST = [0, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 85] as const;

export function weaponTierCost(tierIndex: number): number {
  const index = Math.max(0, Math.min(tierIndex, TIER_COST.length - 1));
  return TIER_COST[index]!;
}

export const shieldTierCost = weaponTierCost;

/** Final-tier flavour names reused from the retired special-equipment pack. */
export const PLAYER_WEAPON_FINAL_NAMES: Readonly<
  Record<PlayerClassId, string>
> = Object.freeze({
  rogue: 'Venomfang Dagger',
  ranger: 'Moonpiercer Bow',
  mage: 'Shardcaller Staff',
  knight: 'Frostguard Arsenal',
  barbarian: 'Worldbreaker Hammer',
  lorekeeper: 'Verdant Staff',
});

export const KNIGHT_SHIELD_FINAL_NAME = 'Frostguard Aegis';

export const PLAYER_WEAPON_FINAL_FLAVOUR: Readonly<
  Record<PlayerClassId, string>
> = Object.freeze({
  rogue: 'A quick blade with an alchemical edge.',
  ranger: 'An ornate bow balanced for a sure release.',
  mage: 'Arcane fragments orbit its crystal focus.',
  knight: 'An ice-forged blade for the deepest rows.',
  barbarian: 'A brutal stone maul made for impossible blows.',
  lorekeeper: 'Living crystal steadies both spell and scholar.',
});

export const KNIGHT_SHIELD_FINAL_FLAVOUR =
  'An ice-warded aegis of the Frostguard.';

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
  return (
    nextWeaponTierIndex(currentIndex) >=
    PLAYER_WEAPON_PROGRESSION[classId].length
  );
}

export function isShieldLadderComplete(currentIndex: number): boolean {
  return (
    nextWeaponTierIndex(currentIndex) >= KNIGHT_SHIELD_PROGRESSION.length
  );
}

export function weaponTierDisplayName(
  classId: PlayerClassId,
  tierIndex: number,
): string {
  const ladder = PLAYER_WEAPON_PROGRESSION[classId];
  if (tierIndex < 0 || tierIndex >= ladder.length) {
    return 'Unknown';
  }
  if (tierIndex === ladder.length - 1) {
    return PLAYER_WEAPON_FINAL_NAMES[classId];
  }
  return humanizeCatalogId(ladder[tierIndex]!);
}

export function shieldTierDisplayName(tierIndex: number): string {
  if (tierIndex < 0 || tierIndex >= KNIGHT_SHIELD_PROGRESSION.length) {
    return 'Unknown';
  }
  if (tierIndex === KNIGHT_SHIELD_PROGRESSION.length - 1) {
    return KNIGHT_SHIELD_FINAL_NAME;
  }
  return humanizeCatalogId(KNIGHT_SHIELD_PROGRESSION[tierIndex]!);
}

export function weaponTierFlavour(
  classId: PlayerClassId,
  tierIndex: number,
): string {
  const ladder = PLAYER_WEAPON_PROGRESSION[classId];
  if (tierIndex === ladder.length - 1) {
    return PLAYER_WEAPON_FINAL_FLAVOUR[classId];
  }
  return 'A hard-won upgrade.';
}

export function shieldTierFlavour(tierIndex: number): string {
  if (tierIndex === KNIGHT_SHIELD_PROGRESSION.length - 1) {
    return KNIGHT_SHIELD_FINAL_FLAVOUR;
  }
  return 'A hard-won upgrade.';
}

function humanizeCatalogId(id: string): string {
  return id
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/\bWith String\b/i, '')
    .replace(/\b1 H\b/i, '')
    .replace(/\b2 H\b/i, 'II')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (ch) => ch.toUpperCase());
}
