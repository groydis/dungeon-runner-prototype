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
    expect(ENEMY_DEFINITIONS.cryptGuard).toMatchObject({ type: 'cryptGuard', name: 'Crypt Guard', attributes: { might: 12, finesse: 10, vigor: 12, will: 8 }, startingStats: { maxHealth: 14, attack: 4, armor: 2 }, experience: 2 });
    expect(ENEMY_DEFINITIONS.skeletonWarrior).toMatchObject({ type: 'skeletonWarrior', attributes: { might: 14, finesse: 12, vigor: 14, will: 10 }, startingStats: { maxHealth: 20, attack: 6, armor: 2 }, experience: 4 });
    expect(ENEMY_DEFINITIONS.boneBrute).toMatchObject({ type: 'boneBrute', attributes: { might: 18, finesse: 8, vigor: 16, will: 8 }, startingStats: { maxHealth: 24, attack: 8, armor: 0 }, experience: 5 });
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

  it('awards 1 / 2 / 5 XP on Skeleton Minion, Crypt Guard, and Bone Brute', () => {
    expect(ENEMY_DEFINITIONS.skeletonMinion.experience).toBe(1);
    expect(ENEMY_DEFINITIONS.cryptGuard.experience).toBe(2);
    expect(ENEMY_DEFINITIONS.boneBrute.experience).toBe(5);
    expect(createMonster('xp-minion', 'skeletonMinion', 4, 1).experience).toBe(1);
    expect(createMonster('xp-guard', 'cryptGuard', 4, 1).experience).toBe(2);
    expect(createMonster('xp-brute', 'boneBrute', 4, 1).experience).toBe(5);
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
    expect(first.stats.health).toBe(9);
    expect(second.stats.health).toBe(14);
    expect(second.stats).toEqual(ENEMY_DEFINITIONS.cryptGuard.startingStats);
  });

  it('applies ?fatal=1 only to Skeleton Minion', () => {
    const factory = enemyStatsFactoryFromSearch('?fatal=1');
    expect(factory('skeletonMinion', 60).attack).toBe(99);
    expect(factory('skeletonMinion', 60).maxHealth).toBe(
      createEnemyStats('skeletonMinion', 60).maxHealth,
    );
    expect(factory('cryptGuard', 60)).toEqual(createEnemyStats('cryptGuard', 60));
    expect(factory('skeletonWarrior', 60)).toEqual(createEnemyStats('skeletonWarrior', 60));
    expect(factory('boneBrute', 60)).toEqual(createEnemyStats('boneBrute', 60));
    expect(factory('skeletonMage', 60)).toEqual(createEnemyStats('skeletonMage', 60));
    expect(factory('necromancer', 60)).toEqual(createEnemyStats('necromancer', 60));
  });

  it('scales enemy stats by row after ENEMY_SCALING_START_ROW', () => {
    const baseline = createEnemyStats('necromancer', 60);
    expect(baseline).toEqual(ENEMY_DEFINITIONS.necromancer.startingStats);
    expect(baseline.maxHealth).toBe(36);
    expect(baseline.attack).toBe(10);
    expect(baseline.defence).toBe(2);
    expect(baseline.str).toBe(10);
    expect(baseline.con).toBe(18);
    expect(baseline.dex).toBe(14);

    expect(createEnemyStats('necromancer', 74)).toEqual(baseline);

    const scaled = createEnemyStats('necromancer', 100);
    expect(scaled.str).toBe(10);
    expect(scaled.con).toBe(18);
    expect(scaled.defence).toBe(2);
    expect(scaled.ward).toBe(6);
    expect(scaled.dex).toBe(14);
    expect(scaled.attack).toBe(12);
    expect(scaled.maxHealth).toBe(40);
  });
});
