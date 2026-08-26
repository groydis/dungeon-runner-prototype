import { describe, expect, it } from 'vitest';
import { createCombatStats, createPlayerStats } from './Combatant';
import { calculateDamage, calculateSurpriseDamage, resolveAutomaticCombat } from './combat';
import { createEnemyStats, enemyStatsFactoryFromSearch } from './definitions/enemies';

describe('combat', () => {
  it('uses smooth mitigation, pierce, and a 25% ambush bonus', () => {
    expect(calculateDamage(10, 0)).toBe(10);
    expect(calculateDamage(10, 6)).toBe(7);
    expect(calculateDamage(10, 6, 40)).toBe(8);
    expect(calculateSurpriseDamage(10, 0)).toBe(13);
  });

  it('resolves normal fights player-first and failed evades monster-first', () => {
    const player = createPlayerStats();
    const minion = createEnemyStats('skeletonMinion', 4);
    const normal = resolveAutomaticCombat(player, minion, 'frontOn', { id: 'normal', name: 'Skeleton Minion' });
    const ambush = resolveAutomaticCombat(player, minion, 'surprise', { id: 'ambush', name: 'Skeleton Minion' });
    expect(normal.log[0]?.attacker).toBe('player');
    expect(ambush.log[0]).toMatchObject({ attacker: 'monster', isSurpriseStrike: true });
  });

  it('uses Ward against arcane and Armor against physical attacks', () => {
    const defender = createCombatStats({ maxHealth: 30, health: 30, armor: 8, ward: 0 });
    const physical = createCombatStats({ maxHealth: 30, health: 30, attack: 10, damageChannel: 'physical' });
    const arcane = createCombatStats({ ...physical, damageChannel: 'arcane' });
    const physicalDamage = resolveAutomaticCombat(defender, physical, 'surprise', { id: 'p', name: 'P' }).log[0]!.damage;
    const arcaneDamage = resolveAutomaticCombat(defender, arcane, 'surprise', { id: 'a', name: 'A' }).log[0]!.damage;
    expect(arcaneDamage).toBeGreaterThan(physicalDamage);
  });

  it('applies first-hit reduction and reports weapon bonus contribution', () => {
    const knight = createCombatStats({ maxHealth: 30, health: 30, attack: 5, armor: 3, firstIncomingReduction: 30 });
    const enemy = createCombatStats({ maxHealth: 20, health: 20, attack: 9 });
    const result = resolveAutomaticCombat(knight, enemy, 'surprise', { id: 'guard', name: 'Guard' }, undefined, 2);
    expect(result.log[0]).toMatchObject({ attacker: 'monster', bonusDamage: 2 });
    expect(result.log[0]!.damage).toBeLessThan(calculateSurpriseDamage(9, 3));
  });

  it('keeps the fatal query override available for deterministic test scenarios', () => {
    expect(enemyStatsFactoryFromSearch('?fatal=1')('skeletonMinion', 4).attack).toBe(99);
  });
});
