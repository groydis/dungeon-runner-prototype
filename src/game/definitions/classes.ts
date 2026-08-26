import {
  ARMOR_CAP,
  CRIT_CAP,
  PIERCE_CAP,
  WARD_CAP,
  attributeModifier,
  clamp,
  createCombatStats,
  type CombatStats,
  type CoreAttribute,
  type DamageChannel,
} from '../Combatant';
import { deepFreeze, type DeepReadonly } from '../freeze';

export type PlayerClassId = 'rogue' | 'ranger' | 'mage' | 'knight' | 'barbarian' | 'lorekeeper';
export type PlayerRenderKey = PlayerClassId;
export type ClassFeature = 'shadowStep' | 'piercingShot' | 'arcaneSurge' | 'guardedOpening' | 'bloodied' | 'wardedRecovery';

export interface CoreAttributes { might: number; finesse: number; vigor: number; will: number }
export interface WeaponProfile {
  category: 'dagger' | 'bow' | 'staff' | 'sword' | 'axe';
  basePower: number;
  scalingAttribute: CoreAttribute;
  channel: DamageChannel;
  critChance: number;
  pierce: number;
  ward: number;
}
export interface PlayerClassDefinition {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly description: string;
  readonly attributes: Readonly<CoreAttributes>;
  readonly baseHealth: number;
  readonly baseArmor: number;
  readonly baseWard: number;
  readonly feature: ClassFeature;
  readonly featureText: string;
  readonly weapon: Readonly<WeaponProfile>;
  readonly startingStats: Readonly<CombatStats>;
  readonly renderKey: PlayerRenderKey;
}
export interface ClassOptionView {
  id: PlayerClassId; name: string; description: string; featureText: string;
  maxHealth: number; attack: number; armor: number; ward: number; attributes: CoreAttributes;
  /** Compatibility aliases. */ defence: number; dex: number;
}
export interface ClassSelectionView { classes: ClassOptionView[] }
export interface ClassAttributePool { str: number; con: number; def: number; dex: number }

export const PLAYER_CLASS_IDS: readonly PlayerClassId[] = ['rogue', 'ranger', 'mage', 'knight', 'barbarian', 'lorekeeper'];
export const PLAYER_RENDER_KEYS: readonly PlayerRenderKey[] = [...PLAYER_CLASS_IDS];

export function proficiencyBonus(level: number): number {
  return level >= 9 ? 4 : level >= 5 ? 3 : 2;
}

export function computeMaxHealth(baseHealth: number, vigor: number, level = 1): number {
  return Math.max(1, baseHealth + 2 * attributeModifier(vigor) + 2 * (level - 1));
}

/** Retained for older callers; live damage now comes from a weapon profile and one scaling attribute. */
export function computeClassDamage(classId: PlayerClassId, pool: Readonly<ClassAttributePool>): number {
  const definition = PLAYER_CLASS_DEFINITIONS[classId];
  const score = definition.weapon.scalingAttribute === 'might' ? pool.str
    : definition.weapon.scalingAttribute === 'finesse' ? pool.dex
      : definition.weapon.scalingAttribute === 'vigor' ? pool.con
        : definition.attributes.will;
  return definition.weapon.basePower + proficiencyBonus(1) + attributeModifier(score);
}

const definitions = {
  rogue: packageClass('rogue', 'Rogue', 'Nimble opportunist who slips past danger and lands precise blows.',
    { might: 10, finesse: 16, vigor: 10, will: 12 }, 18, 1, 0, 'shadowStep', '+15% evade and +5% critical chance.',
    { category: 'dagger', basePower: 3, scalingAttribute: 'finesse', channel: 'physical', critChance: 5, pierce: 0, ward: 0 }),
  ranger: packageClass('ranger', 'Ranger', 'A sure-footed hunter whose opening arrow punches through armour.',
    { might: 10, finesse: 15, vigor: 12, will: 11 }, 18, 1, 0, 'piercingShot', 'Opening attacks ignore 20% Armor.',
    { category: 'bow', basePower: 4, scalingAttribute: 'finesse', channel: 'physical', critChance: 0, pierce: 10, ward: 0 }),
  mage: packageClass('mage', 'Mage', 'A fragile arcane striker with a devastating opening spell.',
    { might: 10, finesse: 12, vigor: 10, will: 16 }, 16, 0, 0, 'arcaneSurge', 'Opening attacks deal 20% more arcane damage.',
    { category: 'staff', basePower: 4, scalingAttribute: 'will', channel: 'arcane', critChance: 0, pierce: 0, ward: 0 }),
  knight: packageClass('knight', 'Knight', 'A disciplined bulwark who absorbs the first blow of every fight.',
    { might: 14, finesse: 8, vigor: 16, will: 10 }, 20, 0, 0, 'guardedOpening', 'The first incoming hit deals 30% less damage.',
    { category: 'sword', basePower: 5, scalingAttribute: 'might', channel: 'physical', critChance: 0, pierce: 0, ward: 0 }),
  barbarian: packageClass('barbarian', 'Barbarian', 'A relentless brawler who becomes more dangerous when bloodied.',
    { might: 16, finesse: 10, vigor: 14, will: 8 }, 24, 0, 0, 'bloodied', 'Deal 20% more damage below half health.',
    { category: 'axe', basePower: 6, scalingAttribute: 'might', channel: 'physical', critChance: 0, pierce: 0, ward: 0 }),
  lorekeeper: packageClass('lorekeeper', 'Lorekeeper', 'A warded scholar whose knowledge makes every potion go further.',
    { might: 10, finesse: 10, vigor: 14, will: 14 }, 18, 2, 0, 'wardedRecovery', 'Potions restore 25% more health.',
    { category: 'staff', basePower: 4, scalingAttribute: 'will', channel: 'arcane', critChance: 0, pierce: 0, ward: 0 }),
} satisfies Record<PlayerClassId, PlayerClassDefinition>;

export const PLAYER_CLASS_DEFINITIONS: DeepReadonly<Record<PlayerClassId, PlayerClassDefinition>> = deepFreeze(definitions);

function packageClass(
  id: PlayerClassId, name: string, description: string, attributes: CoreAttributes,
  baseHealth: number, baseArmor: number, baseWard: number, feature: ClassFeature,
  featureText: string, weapon: WeaponProfile,
): PlayerClassDefinition {
  const maxHealth = computeMaxHealth(baseHealth, attributes.vigor);
  const shieldArmor = feature === 'guardedOpening' ? 3 : 0;
  const startingStats = createCombatStats({
    maxHealth, health: maxHealth,
    attack: weapon.basePower + proficiencyBonus(1) + attributeModifier(attributes[weapon.scalingAttribute]),
    armor: clamp(baseArmor + shieldArmor, 0, ARMOR_CAP),
    ward: clamp(baseWard + Math.max(0, attributeModifier(attributes.will)) + weapon.ward, 0, WARD_CAP),
    ...attributes,
    damageChannel: weapon.channel,
    critChance: weapon.critChance + (feature === 'shadowStep' ? 5 : 0),
    pierce: weapon.pierce,
    openingDamageMultiplier: feature === 'arcaneSurge' ? 1.2 : 1,
    openingPierce: feature === 'piercingShot' ? 20 : 0,
    firstIncomingReduction: feature === 'guardedOpening' ? 30 : 0,
    bloodiedMultiplier: feature === 'bloodied' ? 1.2 : 1,
    evadeBonus: feature === 'shadowStep' ? 15 : 0,
  });
  return { id, name, description, attributes, baseHealth, baseArmor, baseWard, feature, featureText, weapon, startingStats, renderKey: id };
}

export function getPlayerClassDefinition(classId: PlayerClassId): DeepReadonly<PlayerClassDefinition> {
  return PLAYER_CLASS_DEFINITIONS[classId];
}

export function weaponProfileForClass(classId: PlayerClassId, tierIndex: number): WeaponProfile {
  const base = getPlayerClassDefinition(classId).weapon;
  const tier = Math.max(0, Math.floor(tierIndex));
  return {
    ...base,
    basePower: base.basePower + tier,
    critChance: classId === 'rogue' ? clamp(5 + 5 * tier, 0, CRIT_CAP) : base.critChance,
    pierce: classId === 'ranger' ? clamp(10 + 5 * tier, 0, PIERCE_CAP) : base.pierce,
    ward: classId === 'lorekeeper' ? clamp(tier, 0, WARD_CAP) : base.ward,
  };
}

export function shieldArmorForTier(tierIndex: number): number {
  return clamp(3 + Math.max(0, Math.floor(tierIndex)), 0, ARMOR_CAP);
}

export function buildClassSelectionView(): ClassSelectionView {
  return { classes: PLAYER_CLASS_IDS.map((id) => {
    const d = getPlayerClassDefinition(id);
    return { id, name: d.name, description: d.description, featureText: d.featureText,
      maxHealth: d.startingStats.maxHealth, attack: d.startingStats.attack,
      armor: d.startingStats.armor, ward: d.startingStats.ward,
      attributes: { ...d.attributes }, defence: d.startingStats.armor, dex: d.attributes.finesse };
  }) };
}

export function classStatLine(option: ClassOptionView): string {
  const a = option.attributes;
  return `HP ${option.maxHealth} · POW ${option.attack} · ARM ${option.armor} · WRD ${option.ward} · MIG ${a.might} · FIN ${a.finesse} · VIG ${a.vigor} · WIL ${a.will}`;
}
