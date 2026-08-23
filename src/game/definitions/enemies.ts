import { type CombatStats, createCombatStats } from '../Combatant';
import { deepFreeze, type DeepReadonly } from '../freeze';
import { pickWeighted, type Rng } from '../random';

export type EnemyType =
  | 'skeletonMinion'
  | 'cryptGuard'
  | 'boneBrute'
  | 'skeletonMage'
  | 'necromancer';

/** One distinct render key per enemy type. Rendering maps these to GLBs. */
export type EnemyRenderKey = EnemyType;

export type EnemyDropKind = 'none' | 'gold' | 'potion';

export interface EnemyDropTableEntry {
  readonly item: EnemyDropKind;
  readonly weight: number;
}

/** Shared first-version table. Swap per enemy later without changing GameState. */
export const DEFAULT_ENEMY_DROP_TABLE: DeepReadonly<EnemyDropTableEntry[]> =
  deepFreeze([
    { item: 'none', weight: 60 },
    { item: 'gold', weight: 25 },
    { item: 'potion', weight: 15 },
  ]);

export const ELITE_ENEMY_DROP_TABLE: DeepReadonly<EnemyDropTableEntry[]> =
  deepFreeze([
    { item: 'none', weight: 20 },
    { item: 'gold', weight: 50 },
    { item: 'potion', weight: 30 },
  ]);

export interface EnemyDropResult {
  enemyId: string;
  enemyType: EnemyType;
  kind: Exclude<EnemyDropKind, 'none'>;
  collectibleId: string;
  row: number;
  col: number;
}

export interface EnemyDefinition {
  readonly type: EnemyType;
  readonly name: string;
  readonly startingStats: Readonly<CombatStats>;
  /** Percent subtracted from player Evade on a side pass. */
  readonly perception: number;
  readonly experience: number;
  readonly elite: boolean;
  readonly renderKey: EnemyRenderKey;
  readonly dropTable: ReadonlyArray<Readonly<EnemyDropTableEntry>>;
}

export type EnemyStatsFactory = (type: EnemyType) => CombatStats;

/** Testing-only Skeleton Minion attack used by `?fatal=1`. */
export const FATAL_SKELETON_MINION_ATTACK = 99;

export const ENEMY_DEFINITIONS: DeepReadonly<Record<EnemyType, EnemyDefinition>> =
  deepFreeze({
    skeletonMinion: {
      type: 'skeletonMinion',
      name: 'Skeleton Minion',
      startingStats: {
        maxHealth: 8,
        health: 8,
        attack: 3,
        defence: 0,
      },
      perception: 0,
      experience: 1,
      elite: false,
      renderKey: 'skeletonMinion',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    cryptGuard: {
      type: 'cryptGuard',
      name: 'Crypt Guard',
      startingStats: {
        maxHealth: 12,
        health: 12,
        attack: 4,
        defence: 1,
      },
      perception: 5,
      experience: 2,
      elite: false,
      renderKey: 'cryptGuard',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    boneBrute: {
      type: 'boneBrute',
      name: 'Bone Brute',
      startingStats: {
        maxHealth: 20,
        health: 20,
        attack: 6,
        defence: 1,
      },
      perception: 10,
      experience: 4,
      elite: false,
      renderKey: 'boneBrute',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    skeletonMage: {
      type: 'skeletonMage',
      name: 'Skeleton Mage',
      startingStats: {
        maxHealth: 15,
        health: 15,
        attack: 7,
        defence: 0,
      },
      perception: 8,
      experience: 4,
      elite: false,
      renderKey: 'skeletonMage',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    necromancer: {
      type: 'necromancer',
      name: 'Necromancer',
      startingStats: {
        maxHealth: 34,
        health: 34,
        attack: 9,
        defence: 2,
      },
      perception: 15,
      experience: 10,
      elite: true,
      renderKey: 'necromancer',
      dropTable: ELITE_ENEMY_DROP_TABLE,
    },
  });

export function getEnemyDefinition(type: EnemyType): DeepReadonly<EnemyDefinition> {
  return ENEMY_DEFINITIONS[type];
}

export function rollEnemyDrop(
  table: readonly EnemyDropTableEntry[],
  rng: Rng,
): EnemyDropKind {
  return pickWeighted(table, rng);
}

export function enemyDropCollectibleId(
  kind: Exclude<EnemyDropKind, 'none'>,
  enemyId: string,
): string {
  return `drop-${kind}-${enemyId}`;
}

/** Default spawn stats: a clone of the definition, with no overrides. */
export function createEnemyStats(type: EnemyType): CombatStats {
  return createCombatStats(getEnemyDefinition(type).startingStats);
}

/**
 * Query-string testing helper. `?fatal=1` overrides Skeleton Minion attack only;
 * every other value still comes from the enemy definition.
 */
export function enemyStatsFactoryFromSearch(search: string): EnemyStatsFactory {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  const fatal = params.get('fatal') === '1';

  return (type) => {
    const stats = createEnemyStats(type);
    if (fatal && type === 'skeletonMinion') {
      return createCombatStats({
        ...stats,
        attack: FATAL_SKELETON_MINION_ATTACK,
      });
    }
    return stats;
  };
}
