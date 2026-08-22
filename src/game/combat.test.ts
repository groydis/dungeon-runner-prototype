import { describe, expect, it } from 'vitest';
import { createPlayerStats } from './Combatant';
import { calculateDamage, calculateSurpriseDamage, resolveAutomaticCombat } from './combat';
import {
  ENEMY_DEFINITIONS,
  createEnemyStats,
  enemyStatsFactoryFromSearch,
} from './definitions/enemies';

const player = createPlayerStats();
const caveRat = createEnemyStats('caveRat');

describe('combat', () => {
  it('deals existing Cave Rat damage values', () => {
    expect(calculateDamage(player.attack, caveRat.defence)).toBe(5);
    expect(calculateDamage(caveRat.attack, player.defence)).toBe(2);
    expect(calculateSurpriseDamage(player.attack, caveRat.defence)).toBe(8);
  });

  it('resolves front-on Cave Rat combat with the existing hit sequence', () => {
    const result = resolveAutomaticCombat(player, caveRat, 'frontOn', {
      id: 'rat-1',
      name: 'Cave Rat',
    });

    expect(result.winner).toBe('player');
    expect(result.playerHealthAfter).toBe(18);
    expect(result.log.map((entry) => ({
      attacker: entry.attacker,
      damage: entry.damage,
      targetHealthAfter: entry.targetHealthAfter,
      isSurpriseStrike: entry.isSurpriseStrike,
    }))).toEqual([
      { attacker: 'player', damage: 5, targetHealthAfter: 3, isSurpriseStrike: false },
      { attacker: 'monster', damage: 2, targetHealthAfter: 18, isSurpriseStrike: false },
      { attacker: 'player', damage: 5, targetHealthAfter: 0, isSurpriseStrike: false },
    ]);
  });

  it('gives Surprise Attack the existing 150% rounded opening hit', () => {
    const result = resolveAutomaticCombat(player, caveRat, 'surprise', {
      id: 'rat-1',
      name: 'Cave Rat',
    });

    expect(result.winner).toBe('player');
    expect(result.playerHealthAfter).toBe(20);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]).toMatchObject({
      attacker: 'player',
      damage: 8,
      isSurpriseStrike: true,
      targetHealthAfter: 0,
    });
  });

  it('uses definition stats for the default Cave Rat', () => {
    expect(caveRat).toEqual(ENEMY_DEFINITIONS.caveRat.startingStats);
  });

  it('resolves Crypt Guard and Bone Brute with the existing damage formula', () => {
    const guard = createEnemyStats('cryptGuard');
    const brute = createEnemyStats('boneBrute');

    expect(calculateDamage(player.attack, guard.defence)).toBe(4);
    expect(calculateDamage(guard.attack, player.defence)).toBe(3);
    expect(calculateDamage(player.attack, brute.defence)).toBe(4);
    expect(calculateDamage(brute.attack, player.defence)).toBe(5);

    const guardFight = resolveAutomaticCombat(player, guard, 'frontOn', {
      id: 'guard-1',
      name: 'Crypt Guard',
    });
    expect(guardFight.winner).toBe('player');
    expect(guardFight.monsterName).toBe('Crypt Guard');
    expect(guardFight.playerHealthAfter).toBe(14);

    const bruteFight = resolveAutomaticCombat(player, brute, 'frontOn', {
      id: 'brute-1',
      name: 'Bone Brute',
    });
    expect(bruteFight.winner).toBe('monster');
    expect(bruteFight.monsterName).toBe('Bone Brute');
    expect(bruteFight.playerHealthAfter).toBe(0);
  });

  it('lets injected fatal rat stats kill the player', () => {
    const fatalRat = enemyStatsFactoryFromSearch('?fatal=1')('caveRat');
    expect(fatalRat.attack).not.toBe(ENEMY_DEFINITIONS.caveRat.startingStats.attack);
    expect(fatalRat.maxHealth).toBe(ENEMY_DEFINITIONS.caveRat.startingStats.maxHealth);
    const result = resolveAutomaticCombat(player, fatalRat, 'frontOn', {
      id: 'fatal-rat',
      name: 'Cave Rat',
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
