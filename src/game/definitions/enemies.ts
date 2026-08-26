import { attributeModifier, clamp, createCombatStats, type CombatStats, type CoreAttribute, type DamageChannel } from '../Combatant';
import { deepFreeze, type DeepReadonly } from '../freeze';
import { pickWeighted, type Rng } from '../random';
import { type PickupId } from './pickupCatalog';

export type EnemyType = 'skeletonMinion' | 'cryptGuard' | 'skeletonWarrior' | 'boneBrute' | 'skeletonMage' | 'necromancer';
export type EnemyRenderKey = EnemyType;
export type EnemyDropKind = 'none' | 'gold' | 'potion';
export type EnemyGrowthProfile = 'skirmisher' | 'guardian' | 'warrior' | 'brute' | 'caster' | 'eliteCaster';
export interface EnemyDropTableEntry { readonly item: EnemyDropKind; readonly weight: number }
export const DEFAULT_ENEMY_DROP_TABLE: DeepReadonly<EnemyDropTableEntry[]> = deepFreeze([
  { item: 'none', weight: 60 }, { item: 'gold', weight: 25 }, { item: 'potion', weight: 15 },
]);
export const ELITE_ENEMY_DROP_TABLE: DeepReadonly<EnemyDropTableEntry[]> = deepFreeze([
  { item: 'none', weight: 20 }, { item: 'gold', weight: 50 }, { item: 'potion', weight: 30 },
]);
export interface EnemyDropResult { enemyId: string; enemyType: EnemyType; kind: Exclude<EnemyDropKind, 'none'>; pickupId: PickupId; collectibleId: string; row: number; col: number }
export interface EnemyDefinition {
  readonly type: EnemyType; readonly name: string;
  readonly attributes: { might: number; finesse: number; vigor: number; will: number };
  readonly baseHealth: number; readonly attackBase: number; readonly attackAttribute: CoreAttribute;
  readonly baseArmor: number; readonly baseWard: number; readonly damageChannel: DamageChannel;
  readonly baseAwareness: number; readonly introRow: number; readonly growth: EnemyGrowthProfile;
  readonly startingStats: Readonly<CombatStats>; readonly experience: number; readonly elite: boolean;
  readonly renderKey: EnemyRenderKey; readonly dropTable: ReadonlyArray<Readonly<EnemyDropTableEntry>>;
}
export type EnemyStatsFactory = (type: EnemyType, row: number) => CombatStats;
export const FATAL_SKELETON_MINION_ATTACK = 99;
export const ENEMY_SCALING_START_ROW = 4;
export const ENEMY_SCALING_ROW_INTERVAL = 20;

const packages = {
  skeletonMinion: enemy('skeletonMinion', 'Skeleton Minion', { might: 10, finesse: 10, vigor: 8, will: 8 }, 10, 3, 'finesse', 0, 0, 'physical', 0, 4, 'skirmisher', 1, false),
  cryptGuard: enemy('cryptGuard', 'Crypt Guard', { might: 12, finesse: 10, vigor: 12, will: 8 }, 12, 3, 'might', 2, 0, 'physical', 2, 20, 'guardian', 2, false),
  skeletonWarrior: enemy('skeletonWarrior', 'Skeleton Warrior', { might: 14, finesse: 12, vigor: 14, will: 10 }, 16, 4, 'might', 2, 0, 'physical', 2, 40, 'warrior', 4, false),
  boneBrute: enemy('boneBrute', 'Bone Brute', { might: 18, finesse: 8, vigor: 16, will: 8 }, 18, 4, 'might', 0, 0, 'physical', -1, 40, 'brute', 5, false),
  skeletonMage: enemy('skeletonMage', 'Skeleton Mage', { might: 8, finesse: 12, vigor: 12, will: 16 }, 12, 5, 'will', 0, 0, 'arcane', 3, 20, 'caster', 4, false),
  necromancer: enemy('necromancer', 'Necromancer', { might: 10, finesse: 14, vigor: 18, will: 18 }, 28, 6, 'will', 2, 0, 'arcane', 4, 60, 'eliteCaster', 10, true),
} satisfies Record<EnemyType, EnemyDefinition>;

export const ENEMY_DEFINITIONS: DeepReadonly<Record<EnemyType, EnemyDefinition>> = deepFreeze(packages);

function enemy(
  type: EnemyType, name: string, attributes: EnemyDefinition['attributes'], baseHealth: number,
  attackBase: number, attackAttribute: CoreAttribute, baseArmor: number, baseWard: number,
  damageChannel: DamageChannel, baseAwareness: number, introRow: number, growth: EnemyGrowthProfile,
  experience: number, elite: boolean,
): EnemyDefinition {
  const definition = { type, name, attributes, baseHealth, attackBase, attackAttribute, baseArmor, baseWard,
    damageChannel, baseAwareness, introRow, growth, experience, elite, renderKey: type,
    dropTable: elite ? ELITE_ENEMY_DROP_TABLE : DEFAULT_ENEMY_DROP_TABLE };
  return { ...definition, startingStats: statsAtRank(definition as EnemyDefinition, 0) };
}

function statsAtRank(d: EnemyDefinition, rank: number): CombatStats {
  const maxHealth = d.baseHealth + 2 * attributeModifier(d.attributes.vigor) + 2 * rank;
  const armorGrowth = d.growth === 'guardian' || d.growth === 'warrior' ? Math.floor(rank / 2) : 0;
  const wardGrowth = d.growth === 'caster' || d.growth === 'eliteCaster' ? rank : 0;
  return createCombatStats({
    maxHealth, health: maxHealth,
    attack: d.attackBase + attributeModifier(d.attributes[d.attackAttribute]) + rank,
    armor: d.baseArmor + armorGrowth,
    ward: d.baseWard + Math.max(0, attributeModifier(d.attributes.will)) + wardGrowth,
    ...d.attributes, damageChannel: d.damageChannel,
    awareness: clamp(d.baseAwareness + rank, -6, 6),
  });
}

export function getEnemyDefinition(type: EnemyType): DeepReadonly<EnemyDefinition> { return ENEMY_DEFINITIONS[type]; }
export function enemyRank(type: EnemyType, row: number): number {
  const d = getEnemyDefinition(type);
  return Math.floor(Math.max(0, row - d.introRow) / ENEMY_SCALING_ROW_INTERVAL);
}
export function createEnemyStats(type: EnemyType, row?: number): CombatStats {
  const d = getEnemyDefinition(type);
  return statsAtRank(d as EnemyDefinition, row === undefined ? 0 : enemyRank(type, row));
}
export function enemyExperienceAtRow(type: EnemyType, row: number): number {
  const d = getEnemyDefinition(type);
  return d.experience + Math.floor(enemyRank(type, row) / 2);
}
export function rollEnemyDrop(table: readonly EnemyDropTableEntry[], rng: Rng): EnemyDropKind { return pickWeighted(table, rng); }
export function enemyDropCollectibleId(kind: Exclude<EnemyDropKind, 'none'>, enemyId: string): string { return `drop-${kind}-${enemyId}`; }
export function enemyStatsFactoryFromSearch(search: string): EnemyStatsFactory {
  const fatal = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('fatal') === '1';
  return (type, row) => {
    const stats = createEnemyStats(type, row);
    return fatal && type === 'skeletonMinion' ? createCombatStats({ ...stats, attack: FATAL_SKELETON_MINION_ATTACK }) : stats;
  };
}
