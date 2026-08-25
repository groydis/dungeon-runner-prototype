import { describe, expect, it } from 'vitest';
import { createPlayerStats } from './Combatant';
import { calculateDamage, calculateSurpriseDamage, resolveAutomaticCombat } from './combat';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
} from './definitions/enemies';

const player = createPlayerStats();
const skeletonMinion = createEnemyStats('skeletonMinion');

describe('combat', () => {
  it('deals existing Skeleton Minion damage values', () => {
    expect(calculateDamage(player.attack, skeletonMinion.defence)).toBe(4);
    expect(calculateDamage(skeletonMinion.attack, player.defence)).toBe(4);
    expect(calculateSurpriseDamage(player.attack, skeletonMinion.defence)).toBe(6);
  });

  it('resolves front-on Skeleton Minion combat with the existing hit sequence', () => {
    const result = resolveAutomaticCombat(player, skeletonMinion, 'frontOn', {
      id: 'minion-1',
      name: 'Skeleton Minion',
    });

    expect(result.winner).toBe('player');
    expect(result.playerHealthAfter).toBe(8);
    expect(result.log.map((entry) => ({
      attacker: entry.attacker,
      damage: entry.damage,
      targetHealthAfter: entry.targetHealthAfter,
      isSurpriseStrike: entry.isSurpriseStrike,
    }))).toEqual([
      { attacker: 'player', damage: 4, targetHealthAfter: 11, isSurpriseStrike: false },
      { attacker: 'monster', damage: 4, targetHealthAfter: 16, isSurpriseStrike: false },
      { attacker: 'player', damage: 4, targetHealthAfter: 7, isSurpriseStrike: false },
      { attacker: 'monster', damage: 4, targetHealthAfter: 12, isSurpriseStrike: false },
      { attacker: 'player', damage: 4, targetHealthAfter: 3, isSurpriseStrike: false },
      { attacker: 'monster', damage: 4, targetHealthAfter: 8, isSurpriseStrike: false },
      { attacker: 'player', damage: 4, targetHealthAfter: 0, isSurpriseStrike: false },
    ]);
  });

  it('gives Surprise Attack the existing 150% rounded opening hit', () => {
    const result = resolveAutomaticCombat(player, skeletonMinion, 'surprise', {
      id: 'minion-1',
      name: 'Skeleton Minion',
    });

    expect(result.winner).toBe('player');
    expect(result.playerHealthAfter).toBe(8);
    expect(result.log[0]).toMatchObject({
      attacker: 'player',
      damage: 6,
      isSurpriseStrike: true,
      targetHealthAfter: 9,
    });
    expect(result.log.length).toBeGreaterThan(1);
  });

  it('uses definition stats for the default Skeleton Minion', () => {
    expect(skeletonMinion).toEqual(ENEMY_DEFINITIONS.skeletonMinion.startingStats);
  });

  it('resolves Crypt Guard and Bone Brute with the existing damage formula', () => {
    const guard = createEnemyStats('cryptGuard');
    const brute = createEnemyStats('boneBrute');

    expect(calculateDamage(player.attack, guard.defence)).toBe(3);
    expect(calculateDamage(guard.attack, player.defence)).toBe(5);
    expect(calculateDamage(player.attack, brute.defence)).toBe(2);
    expect(calculateDamage(brute.attack, player.defence)).toBe(7);

    const guardFight = resolveAutomaticCombat(player, guard, 'frontOn', {
      id: 'guard-1',
      name: 'Crypt Guard',
    });
    expect(guardFight.winner).toBe('monster');
    expect(guardFight.monsterName).toBe('Crypt Guard');
    expect(guardFight.playerHealthAfter).toBe(0);

    const bruteFight = resolveAutomaticCombat(player, brute, 'frontOn', {
      id: 'brute-1',
      name: 'Bone Brute',
    });
    expect(bruteFight.winner).toBe('monster');
    expect(bruteFight.monsterName).toBe('Bone Brute');
    expect(bruteFight.playerHealthAfter).toBe(0);
  });

  it('lets injected fatal minion stats kill the player', () => {
    const fatalMinion = enemyStatsFactoryFromSearch('?fatal=1')('skeletonMinion');
    expect(fatalMinion.attack).not.toBe(ENEMY_DEFINITIONS.skeletonMinion.startingStats.attack);
    expect(fatalMinion.maxHealth).toBe(ENEMY_DEFINITIONS.skeletonMinion.startingStats.maxHealth);
    const result = resolveAutomaticCombat(player, fatalMinion, 'frontOn', {
      id: 'fatal-minion',
      name: 'Skeleton Minion',
    });

    expect(result.winner).toBe('monster');
    expect(result.playerHealthAfter).toBe(0);
    expect(result.log[0]?.attacker).toBe('player');
    expect(result.log[1]).toMatchObject({
      attacker: 'monster',
      damage: 98,
      targetHealthAfter: 0,
    });
  });
});
