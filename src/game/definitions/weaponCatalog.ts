import { type PlayerEquipmentAssetKey } from '../../rendering/playerEquipment';

export type WeaponHandedness = '1h' | '2h';
export type WeaponCategory =
  | 'melee-light'
  | 'melee-medium'
  | 'melee-heavy'
  | 'caster'
  | 'ranged';
export type WeaponRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface WeaponCatalogEntry {
  readonly id: string;
  readonly assetKey: PlayerEquipmentAssetKey;
  readonly handedness: WeaponHandedness;
  readonly category: WeaponCategory;
  readonly rarity: WeaponRarity;
  readonly attackBonus: number;
}

export const WEAPON_CATALOG: readonly WeaponCatalogEntry[] = [
  {
    id: 'dagger',
    assetKey: 'dagger',
    handedness: '1h',
    category: 'melee-light',
    rarity: 'common',
    attackBonus: 1,
  },
  {
    id: 'daggerC',
    assetKey: 'fantasyDaggerC',
    handedness: '1h',
    category: 'melee-light',
    rarity: 'common',
    attackBonus: 1,
  },
  {
    id: 'daggerA',
    assetKey: 'fantasyDaggerA',
    handedness: '1h',
    category: 'melee-light',
    rarity: 'common',
    attackBonus: 1,
  },
  {
    id: 'daggerB',
    assetKey: 'fantasyDaggerB',
    handedness: '1h',
    category: 'melee-light',
    rarity: 'common',
    attackBonus: 1,
  },
  {
    id: 'sword1H',
    assetKey: 'sword1H',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordG',
    assetKey: 'fantasySwordG',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordA',
    assetKey: 'fantasySwordA',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordB',
    assetKey: 'fantasySwordB',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordC',
    assetKey: 'fantasySwordC',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordD',
    assetKey: 'fantasySwordD',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'swordF',
    assetKey: 'fantasySwordF',
    handedness: '1h',
    category: 'melee-medium',
    rarity: 'common',
    attackBonus: 2,
  },
  {
    id: 'axe1H',
    assetKey: 'axe1H',
    handedness: '1h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 3,
  },
  {
    id: 'axeA',
    assetKey: 'fantasyAxeA',
    handedness: '1h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 3,
  },
  {
    id: 'axeC',
    assetKey: 'fantasyAxeC',
    handedness: '1h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 3,
  },
  {
    id: 'sword2H',
    assetKey: 'sword2H',
    handedness: '2h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'sword2HColor',
    assetKey: 'sword2HColor',
    handedness: '2h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'swordE',
    assetKey: 'fantasySwordE',
    handedness: '2h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'axe2H',
    assetKey: 'axe2H',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'axeB',
    assetKey: 'fantasyAxeB',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'axeD',
    assetKey: 'fantasyAxeD',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'spearA',
    assetKey: 'fantasySpearA',
    handedness: '2h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'spearB',
    assetKey: 'fantasySpearB',
    handedness: '2h',
    category: 'melee-medium',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'hammerA',
    assetKey: 'fantasyHammerA',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'hammerB',
    assetKey: 'fantasyHammerB',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'hammerC',
    assetKey: 'fantasyHammerC',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'rare',
    attackBonus: 4,
  },
  {
    id: 'hammerD',
    assetKey: 'fantasyHammerD',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'legendary',
    attackBonus: 5,
  },
  {
    id: 'halberd',
    assetKey: 'fantasyHalberd',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'legendary',
    attackBonus: 5,
  },
  {
    id: 'scythe',
    assetKey: 'fantasyScythe',
    handedness: '2h',
    category: 'melee-heavy',
    rarity: 'legendary',
    attackBonus: 5,
  },
  {
    id: 'staff',
    assetKey: 'staff',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'druidStaff',
    assetKey: 'druidStaff',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'wand',
    assetKey: 'wand',
    handedness: '1h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'staffC',
    assetKey: 'fantasyStaffC',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'staffD',
    assetKey: 'fantasyStaffD',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'staffA',
    assetKey: 'fantasyStaffA',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'staffB',
    assetKey: 'fantasyStaffB',
    handedness: '2h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'wandA',
    assetKey: 'fantasyWandA',
    handedness: '1h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'wandB',
    assetKey: 'fantasyWandB',
    handedness: '1h',
    category: 'caster',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  // Registered but not yet used by any enemy pool below — no enemy has a ranged-
  // shoot animation clip today. Ready for a future ranged-animated enemy or the
  // player shop feature.
  {
    id: 'bow',
    assetKey: 'bow',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'bowWithString',
    assetKey: 'bowWithString',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'bowAWithString',
    assetKey: 'fantasyBowAWithString',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'bowBWithString',
    assetKey: 'fantasyBowBWithString',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'bowCWithString',
    assetKey: 'fantasyBowCWithString',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 2,
  },
  {
    id: 'crossbow1H',
    assetKey: 'crossbow1H',
    handedness: '1h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 3,
  },
  {
    id: 'crossbow2H',
    assetKey: 'crossbow2H',
    handedness: '2h',
    category: 'ranged',
    rarity: 'uncommon',
    attackBonus: 3,
  },
];

export interface ShieldCatalogEntry {
  readonly id: string;
  readonly assetKey: PlayerEquipmentAssetKey;
  readonly defenceBonus: number;
  readonly rarity: WeaponRarity;
}

export const SHIELD_CATALOG: readonly ShieldCatalogEntry[] = [
  {
    id: 'shieldRound',
    assetKey: 'shieldRound',
    defenceBonus: 2,
    rarity: 'common',
  },
  {
    id: 'shieldRoundColor',
    assetKey: 'shieldRoundColor',
    defenceBonus: 2,
    rarity: 'common',
  },
  {
    id: 'fantasyShieldA',
    assetKey: 'fantasyShieldA',
    defenceBonus: 2,
    rarity: 'common',
  },
  {
    id: 'shieldBadge',
    assetKey: 'shieldBadge',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'shieldBadgeColor',
    assetKey: 'shieldBadgeColor',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'shieldSpikes',
    assetKey: 'shieldSpikes',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'shieldSpikesColor',
    assetKey: 'shieldSpikesColor',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'shieldSquare',
    assetKey: 'shieldSquare',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'shieldSquareColor',
    assetKey: 'shieldSquareColor',
    defenceBonus: 3,
    rarity: 'uncommon',
  },
  {
    id: 'fantasyShieldB',
    assetKey: 'fantasyShieldB',
    defenceBonus: 4,
    rarity: 'rare',
  },
  {
    id: 'fantasyShieldC',
    assetKey: 'fantasyShieldC',
    defenceBonus: 4,
    rarity: 'rare',
  },
  {
    id: 'fantasyShieldD',
    assetKey: 'fantasyShieldD',
    defenceBonus: 5,
    rarity: 'legendary',
  },
];
