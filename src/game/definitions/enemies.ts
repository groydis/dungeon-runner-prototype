import { type CombatStats, createCombatStats } from '../Combatant';
import { deepFreeze, type DeepReadonly } from '../freeze';
import { type PickupId } from './pickupCatalog';
import { pickWeighted, type Rng } from '../random';

export type EnemyType =
  | 'skeletonMinion'
  | 'cryptGuard'
  | 'skeletonWarrior'
  | 'boneBrute'
  | 'skeletonMage'
  | 'necromancer';

/**
 * Render keys map to loaded models. `skeletonWarrior` temporarily reuses the
 * boneBrute key until it has its own art.
 */
export type EnemyRenderKey =
  | 'skeletonMinion'
  | 'cryptGuard'
  | 'boneBrute'
  | 'skeletonMage'
  | 'necromancer';

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
  pickupId: PickupId;
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

function enemyStats(
  hp: number,
  str: number,
  con: number,
  def: number,
  dex: number,
): CombatStats {
  return createCombatStats({
    maxHealth: hp,
    health: hp,
    attack: str,
    defence: def,
    str,
    con,
    dex,
  });
}

export const ENEMY_DEFINITIONS: DeepReadonly<Record<EnemyType, EnemyDefinition>> =
  deepFreeze({
    skeletonMinion: {
      type: 'skeletonMinion',
      name: 'Skeleton Minion',
      startingStats: enemyStats(15, 5, 5, 1, 9),
      perception: 0,
      experience: 1,
      elite: false,
      renderKey: 'skeletonMinion',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    cryptGuard: {
      type: 'cryptGuard',
      name: 'Crypt Guard',
      startingStats: enemyStats(18, 6, 6, 2, 6),
      perception: 5,
      experience: 2,
      elite: false,
      renderKey: 'cryptGuard',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    skeletonWarrior: {
      type: 'skeletonWarrior',
      name: 'Skeleton Warrior',
      startingStats: enemyStats(21, 7, 7, 3, 3),
      perception: 10,
      experience: 4,
      elite: false,
      // TODO: skeletonWarrior needs its own render key + model once art exists
      renderKey: 'boneBrute',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    boneBrute: {
      type: 'boneBrute',
      name: 'Bone Brute',
      startingStats: enemyStats(24, 8, 8, 3, 1),
      perception: 10,
      experience: 4,
      elite: false,
      renderKey: 'boneBrute',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    skeletonMage: {
      type: 'skeletonMage',
      name: 'Skeleton Mage',
      startingStats: enemyStats(27, 9, 9, 1, 1),
      perception: 8,
      experience: 4,
      elite: false,
      renderKey: 'skeletonMage',
      dropTable: DEFAULT_ENEMY_DROP_TABLE,
    },
    necromancer: {
      type: 'necromancer',
      name: 'Necromancer',
      startingStats: enemyStats(30, 10, 10, 5, 5),
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
