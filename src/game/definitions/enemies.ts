import { type CombatStats, createCombatStats } from '../Combatant';
import { pickWeighted, type Rng } from '../random';

export type EnemyType = 'caveRat' | 'cryptGuard' | 'boneBrute';

export type EnemyDropKind = 'none' | 'gold' | 'potion';

export interface EnemyDropTableEntry {
  item: EnemyDropKind;
  weight: number;
}

/** Shared first-version table. Swap per enemy later without changing GameState. */
export const DEFAULT_ENEMY_DROP_TABLE: readonly EnemyDropTableEntry[] = [
  { item: 'none', weight: 60 },
  { item: 'gold', weight: 25 },
  { item: 'potion', weight: 15 },
];

export interface EnemyDropResult {
  enemyId: string;
  enemyType: EnemyType;
  kind: Exclude<EnemyDropKind, 'none'>;
  collectibleId: string;
  row: number;
  col: number;
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  startingStats: CombatStats;
  /** Percent subtracted from player Evade on a side pass. */
  perception: number;
  experience: number;
  renderKey: string;
  dropTable: readonly EnemyDropTableEntry[];
}

export type EnemyStatsFactory = (type: EnemyType) => CombatStats;

/** Testing-only Cave Rat attack used by `?fatal=1`. */
export const FATAL_CAVE_RAT_ATTACK = 99;

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  caveRat: {
    type: 'caveRat',
    name: 'Cave Rat',
    startingStats: {
      maxHealth: 8,
      health: 8,
      attack: 3,
      defence: 0,
    },
    perception: 0,
    experience: 1,
    renderKey: 'caveRat',
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
    renderKey: 'boneBrute',
    dropTable: DEFAULT_ENEMY_DROP_TABLE,
  },
};

export function getEnemyDefinition(type: EnemyType): EnemyDefinition {
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
 * Query-string testing helper. `?fatal=1` overrides Cave Rat attack only;
 * every other value still comes from the enemy definition.
 */
export function enemyStatsFactoryFromSearch(search: string): EnemyStatsFactory {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  const fatal = params.get('fatal') === '1';

  return (type) => {
    const stats = createEnemyStats(type);
    if (fatal && type === 'caveRat') {
      return createCombatStats({
        ...stats,
        attack: FATAL_CAVE_RAT_ATTACK,
      });
    }
    return stats;
  };
}
