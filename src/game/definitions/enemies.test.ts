import { describe, expect, it } from 'vitest';
import { createMonster } from '../Monster';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
  getEnemyDefinition,
} from './enemies';

describe('enemy definitions', () => {
  it('gives every enemy definition a typed render key', () => {
    for (const type of Object.keys(ENEMY_DEFINITIONS) as Array<
      keyof typeof ENEMY_DEFINITIONS
    >) {
      expect(getEnemyDefinition(type).renderKey).toBe(
        type === 'skeletonWarrior' ? 'skeletonWarrior' : type,
      );
    }
  });

  it('defines Crypt Guard, Skeleton Warrior, and Bone Brute with the specified data', () => {
    expect(ENEMY_DEFINITIONS.cryptGuard).toEqual({
      type: 'cryptGuard',
      name: 'Crypt Guard',
      startingStats: {
        maxHealth: 18,
        health: 18,
        attack: 6,
        defence: 2,
        str: 6,
        con: 6,
        dex: 6,
      },
      experience: 2,
      elite: false,
      renderKey: 'cryptGuard',
      dropTable: ENEMY_DEFINITIONS.skeletonMinion.dropTable,
    });
    expect(ENEMY_DEFINITIONS.skeletonWarrior).toEqual({
      type: 'skeletonWarrior',
      name: 'Skeleton Warrior',
      startingStats: {
        maxHealth: 21,
        health: 21,
        attack: 7,
        defence: 3,
        str: 7,
        con: 7,
        dex: 3,
      },
      experience: 4,
      elite: false,
      renderKey: 'skeletonWarrior',
      dropTable: ENEMY_DEFINITIONS.skeletonMinion.dropTable,
    });
    expect(ENEMY_DEFINITIONS.boneBrute).toEqual({
      type: 'boneBrute',
      name: 'Bone Brute',
      startingStats: {
        maxHealth: 24,
        health: 24,
        attack: 8,
        defence: 3,
        str: 8,
        con: 8,
        dex: 1,
      },
      experience: 4,
      elite: false,
      renderKey: 'boneBrute',
      dropTable: ENEMY_DEFINITIONS.skeletonMinion.dropTable,
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
      ENEMY_DEFINITIONS.skeletonMinion.dropTable,
    );
  });

  it('awards 1 / 2 / 4 XP on Skeleton Minion, Crypt Guard, and Bone Brute', () => {
    expect(ENEMY_DEFINITIONS.skeletonMinion.experience).toBe(1);
    expect(ENEMY_DEFINITIONS.cryptGuard.experience).toBe(2);
    expect(ENEMY_DEFINITIONS.boneBrute.experience).toBe(4);
    expect(createMonster('xp-minion', 'skeletonMinion', 4, 1).experience).toBe(1);
    expect(createMonster('xp-guard', 'cryptGuard', 4, 1).experience).toBe(2);
    expect(createMonster('xp-brute', 'boneBrute', 4, 1).experience).toBe(4);
  });

  it('does not let public definition access corrupt a fresh Monster', () => {
    const definition = getEnemyDefinition('cryptGuard');
    const monster = createMonster('guard-mut', 'cryptGuard', 20, 0);
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
    expect(fresh.experience).toBe(2);
    expect(fresh.definition.dropTable).toEqual(ENEMY_DEFINITIONS.skeletonMinion.dropTable);
  });

  it('gives each monster an independent mutable stats clone', () => {
    const first = createMonster('guard-a', 'cryptGuard', 20, 0);
    const second = createMonster('guard-b', 'cryptGuard', 20, 1);

    first.takeDamage(5);
    expect(first.stats.health).toBe(13);
    expect(second.stats.health).toBe(18);
    expect(second.stats).toEqual(ENEMY_DEFINITIONS.cryptGuard.startingStats);
  });

  it('applies ?fatal=1 only to Skeleton Minion', () => {
    const factory = enemyStatsFactoryFromSearch('?fatal=1');
    expect(factory('skeletonMinion').attack).toBe(99);
    expect(factory('skeletonMinion').maxHealth).toBe(
      ENEMY_DEFINITIONS.skeletonMinion.startingStats.maxHealth,
    );
    expect(factory('cryptGuard')).toEqual(createEnemyStats('cryptGuard'));
    expect(factory('skeletonWarrior')).toEqual(createEnemyStats('skeletonWarrior'));
    expect(factory('boneBrute')).toEqual(createEnemyStats('boneBrute'));
    expect(factory('skeletonMage')).toEqual(createEnemyStats('skeletonMage'));
    expect(factory('necromancer')).toEqual(createEnemyStats('necromancer'));
  });
});
