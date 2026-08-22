import { type CombatStats, createCombatStats } from '../Combatant';

export type EnemyType = 'caveRat' | 'cryptGuard' | 'boneBrute';

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  startingStats: CombatStats;
  renderKey: string;
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
    renderKey: 'caveRat',
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
    renderKey: 'cryptGuard',
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
    renderKey: 'boneBrute',
  },
};

export function getEnemyDefinition(type: EnemyType): EnemyDefinition {
  return ENEMY_DEFINITIONS[type];
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
