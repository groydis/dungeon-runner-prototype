import { describe, expect, it } from 'vitest';
import { createMonster } from '../Monster';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
  getEnemyDefinition,
} from './enemies';

describe('enemy definitions', () => {
  it('defines Crypt Guard and Bone Brute with the specified data', () => {
    expect(ENEMY_DEFINITIONS.cryptGuard).toEqual({
      type: 'cryptGuard',
      name: 'Crypt Guard',
      startingStats: { maxHealth: 12, health: 12, attack: 4, defence: 1 },
      perception: 5,
      experience: 2,
      elite: false,
      renderKey: 'cryptGuard',
      dropTable: ENEMY_DEFINITIONS.caveRat.dropTable,
    });
    expect(ENEMY_DEFINITIONS.boneBrute).toEqual({
      type: 'boneBrute',
      name: 'Bone Brute',
      startingStats: { maxHealth: 20, health: 20, attack: 6, defence: 1 },
      perception: 10,
      experience: 4,
      elite: false,
      renderKey: 'boneBrute',
      dropTable: ENEMY_DEFINITIONS.caveRat.dropTable,
    });
  });

  it('defines Skeleton Mage as normal and Necromancer as an elite', () => {
    expect(ENEMY_DEFINITIONS.skeletonMage).toMatchObject({
      name: 'Skeleton Mage',
      elite: false,
      experience: 4,
      renderKey: 'skeletonMage',
    });
    expect(ENEMY_DEFINITIONS.necromancer).toMatchObject({
      name: 'Necromancer',
      elite: true,
      experience: 10,
      renderKey: 'necromancer',
    });
    expect(createMonster('elite', 'necromancer', 60, 1).elite).toBe(true);
    expect(ENEMY_DEFINITIONS.necromancer.dropTable).not.toBe(
      ENEMY_DEFINITIONS.caveRat.dropTable,
    );
  });

  it('awards 1 / 2 / 4 XP on Cave Rat, Crypt Guard, and Bone Brute', () => {
    expect(ENEMY_DEFINITIONS.caveRat.experience).toBe(1);
    expect(ENEMY_DEFINITIONS.cryptGuard.experience).toBe(2);
    expect(ENEMY_DEFINITIONS.boneBrute.experience).toBe(4);
    expect(createMonster('xp-rat', 'caveRat', 4, 1).experience).toBe(1);
    expect(createMonster('xp-guard', 'cryptGuard', 4, 1).experience).toBe(2);
    expect(createMonster('xp-brute', 'boneBrute', 4, 1).experience).toBe(4);
  });

  it('does not let public definition access corrupt a fresh Monster', () => {
    const definition = getEnemyDefinition('cryptGuard');
    const monster = createMonster('guard-mut', 'cryptGuard', 20, 0);
    expect(() => {
      (definition as { perception: number }).perception = 80;
    }).toThrow(TypeError);
    expect(() => {
      (definition.startingStats as { attack: number }).attack = 99;
    }).toThrow(TypeError);
    expect(() => {
      (definition.dropTable[0] as { weight: number }).weight = 1;
    }).toThrow(TypeError);
    expect(() => {
      (monster.definition.startingStats as { health: number }).health = 1;
    }).toThrow(TypeError);

    const fresh = createMonster('guard-fresh', 'cryptGuard', 20, 1);
    expect(fresh.stats).toEqual(ENEMY_DEFINITIONS.cryptGuard.startingStats);
    expect(fresh.perception).toBe(5);
    expect(fresh.experience).toBe(2);
    expect(fresh.definition.dropTable).toEqual(ENEMY_DEFINITIONS.caveRat.dropTable);
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
    expect(factory('skeletonMage')).toEqual(createEnemyStats('skeletonMage'));
    expect(factory('necromancer')).toEqual(createEnemyStats('necromancer'));
  });
});
