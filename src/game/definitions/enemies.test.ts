import { describe, expect, it } from 'vitest';
import { createMonster } from '../Monster';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
} from './enemies';

describe('enemy definitions', () => {
  it('defines Crypt Guard and Bone Brute with the specified data', () => {
    expect(ENEMY_DEFINITIONS.cryptGuard).toEqual({
      type: 'cryptGuard',
      name: 'Crypt Guard',
      startingStats: { maxHealth: 12, health: 12, attack: 4, defence: 1 },
      renderKey: 'cryptGuard',
      dropTable: ENEMY_DEFINITIONS.caveRat.dropTable,
    });
    expect(ENEMY_DEFINITIONS.boneBrute).toEqual({
      type: 'boneBrute',
      name: 'Bone Brute',
      startingStats: { maxHealth: 20, health: 20, attack: 6, defence: 1 },
      renderKey: 'boneBrute',
      dropTable: ENEMY_DEFINITIONS.caveRat.dropTable,
    });
  });

  it('gives each monster an independent mutable stats clone', () => {
    const first = createMonster('guard-a', 'cryptGuard', 20, 0);
    const second = createMonster('guard-b', 'cryptGuard', 20, 1);

    first.takeDamage(5);
    expect(first.stats.health).toBe(7);
    expect(second.stats.health).toBe(12);
    expect(second.stats).toEqual(ENEMY_DEFINITIONS.cryptGuard.startingStats);
  });

  it('applies ?fatal=1 only to Cave Rat', () => {
    const factory = enemyStatsFactoryFromSearch('?fatal=1');
    expect(factory('caveRat').attack).toBe(99);
    expect(factory('caveRat').maxHealth).toBe(
      ENEMY_DEFINITIONS.caveRat.startingStats.maxHealth,
    );
    expect(factory('cryptGuard')).toEqual(createEnemyStats('cryptGuard'));
    expect(factory('boneBrute')).toEqual(createEnemyStats('boneBrute'));
  });
});
