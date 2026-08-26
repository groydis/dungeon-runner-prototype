import { describe, expect, it } from 'vitest';
import { attributeModifier, createCombatStats } from './Combatant';
import { Player } from './Player';
import { calculateDamage, resolveAutomaticCombat } from './combat';
import { PLAYER_CLASS_IDS, getPlayerClassDefinition, weaponProfileForClass } from './definitions/classes';
import { createEnemyStats, enemyExperienceAtRow, enemyRank } from './definitions/enemies';
import { calculateEvadeChance } from './encounters';
import { applyLevelUpChoice, buildLevelUpView } from './levelUp';
import { LEVEL_XP_THRESHOLDS } from './progression';

describe('D&D-style stat overhaul', () => {
  it('uses bounded D&D modifiers and 48-point class packages', () => {
    expect([8, 10, 12, 14, 16, 18, 20].map(attributeModifier)).toEqual([-1, 0, 1, 2, 3, 4, 5]);
    for (const id of PLAYER_CLASS_IDS) {
      const attributes = getPlayerClassDefinition(id).attributes;
      expect(attributes.might + attributes.finesse + attributes.vigor + attributes.will).toBe(48);
    }
  });

  it('keeps each class weapon identity while its tiers add typed bonuses', () => {
    expect(weaponProfileForClass('rogue', 2)).toMatchObject({ category: 'dagger', basePower: 5, critChance: 15 });
    expect(weaponProfileForClass('ranger', 2)).toMatchObject({ category: 'bow', basePower: 6, pierce: 20 });
    expect(weaponProfileForClass('mage', 2)).toMatchObject({ category: 'staff', channel: 'arcane' });
    expect(weaponProfileForClass('knight', 2).category).toBe('sword');
    expect(weaponProfileForClass('barbarian', 2).category).toBe('axe');
    expect(weaponProfileForClass('lorekeeper', 2)).toMatchObject({ category: 'staff', ward: 2 });
  });

  it('mitigates physical and arcane damage with Armor and Ward respectively', () => {
    expect(calculateDamage(10, 0)).toBe(10);
    expect(calculateDamage(10, 6)).toBe(7);
    expect(calculateDamage(10, 6, 40)).toBeGreaterThan(calculateDamage(10, 6));
    const defender = createCombatStats({ maxHealth: 30, health: 30, armor: 8, ward: 0 });
    const physical = createCombatStats({ maxHealth: 10, health: 10, attack: 10, damageChannel: 'physical' });
    const arcane = createCombatStats({ ...physical, damageChannel: 'arcane' });
    const physicalHit = resolveAutomaticCombat(defender, physical, 'surprise', { id: 'physical', name: 'Physical' }).log[0]!;
    const arcaneHit = resolveAutomaticCombat(defender, arcane, 'surprise', { id: 'arcane', name: 'Arcane' }).log[0]!;
    expect(arcaneHit.damage).toBeGreaterThan(physicalHit.damage);
  });

  it('gives a failed evade to the enemy as an opening strike', () => {
    const player = getPlayerClassDefinition('ranger').startingStats;
    const monster = createEnemyStats('cryptGuard', 20);
    const result = resolveAutomaticCombat(player, monster, 'surprise', { id: 'ambush', name: 'Crypt Guard' });
    expect(result.log[0]).toMatchObject({ attacker: 'monster', isSurpriseStrike: true });
  });

  it('scales enemy threat linearly by row without removing early wins', () => {
    expect(createEnemyStats('skeletonMinion', 4).maxHealth).toBe(8);
    expect(enemyRank('skeletonMinion', 44)).toBe(2);
    expect(createEnemyStats('skeletonMinion', 44).attack).toBe(5);
    expect(enemyExperienceAtRow('skeletonMinion', 44)).toBe(2);
  });

  it('bounds evade chance and exposes class-authored growth choices', () => {
    expect(calculateEvadeChance(8, 6)).toBe(20);
    expect(calculateEvadeChance(20, -6, 30)).toBe(80);
    const rogue = new Player('rogue');
    const view = buildLevelUpView(2, 3, rogue);
    expect(view.choices.map((choice) => choice.title)).toEqual(['Quick Hands', 'Hard to Kill', 'Shadowcraft']);
    expect(applyLevelUpChoice(rogue, 2, 'rogue-finesse')?.dexGained).toBe(2);
    expect(rogue.stats.finesse).toBe(18);
  });

  it('extends the authored curve through level 10', () => {
    expect(LEVEL_XP_THRESHOLDS).toEqual([
      { level: 2, experience: 3 }, { level: 3, experience: 7 }, { level: 4, experience: 12 },
      { level: 5, experience: 18 }, { level: 6, experience: 25 }, { level: 7, experience: 35 },
      { level: 8, experience: 48 }, { level: 9, experience: 64 }, { level: 10, experience: 84 },
    ]);
  });
});
