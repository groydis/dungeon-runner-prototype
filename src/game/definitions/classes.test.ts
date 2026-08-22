import { describe, expect, it } from 'vitest';
import {
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from '../config';
import { Merchant } from '../Merchant';
import { Player } from '../Player';
import {
  LEVEL_UP_CAPPED_REASONS,
  evaluateLevelUpChoice,
} from '../levelUp';
import {
  createShopProgress,
  evaluateShopOffer,
  shopStatSnapshot,
} from '../shop';
import {
  PLAYER_CLASS_DEFINITIONS,
  PLAYER_CLASS_IDS,
  buildClassSelectionView,
  getPlayerClassDefinition,
  type PlayerClassId,
} from './classes';

const CLASS_PACKAGES: Record<
  PlayerClassId,
  { name: string; maxHealth: number; attack: number; defence: number; evade: number }
> = {
  rogue: { name: 'Rogue', maxHealth: 18, attack: 5, defence: 1, evade: 6 },
  ranger: { name: 'Ranger', maxHealth: 20, attack: 6, defence: 1, evade: 3 },
  mage: { name: 'Mage', maxHealth: 16, attack: 8, defence: 0, evade: 2 },
  knight: { name: 'Knight', maxHealth: 26, attack: 4, defence: 3, evade: 0 },
  barbarian: { name: 'Barbarian', maxHealth: 28, attack: 7, defence: 0, evade: 0 },
};

describe('player class definitions', () => {
  it('lists exactly the five agreed classes', () => {
    expect(PLAYER_CLASS_IDS).toEqual([
      'rogue',
      'ranger',
      'mage',
      'knight',
      'barbarian',
    ]);
    expect(Object.keys(PLAYER_CLASS_DEFINITIONS)).toEqual([...PLAYER_CLASS_IDS]);
  });

  it('uses the agreed starting HP, ATK, DEF, and EVA for every class', () => {
    for (const id of PLAYER_CLASS_IDS) {
      const definition = getPlayerClassDefinition(id);
      const expected = CLASS_PACKAGES[id];
      expect(definition.name).toBe(expected.name);
      expect(definition.startingStats.maxHealth).toBe(expected.maxHealth);
      expect(definition.startingStats.health).toBe(expected.maxHealth);
      expect(definition.startingStats.attack).toBe(expected.attack);
      expect(definition.startingStats.defence).toBe(expected.defence);
      expect(definition.startingEvade).toBe(expected.evade);
    }
  });

  it('is the only source of class options shown to the view layer', () => {
    const view = buildClassSelectionView();
    expect(view.classes.map((option) => option.id)).toEqual([...PLAYER_CLASS_IDS]);
    for (const option of view.classes) {
      const definition = getPlayerClassDefinition(option.id);
      expect(option.name).toBe(definition.name);
      expect(option.description).toBe(definition.description);
      expect(option.maxHealth).toBe(definition.startingStats.maxHealth);
      expect(option.attack).toBe(definition.startingStats.attack);
      expect(option.defence).toBe(definition.startingStats.defence);
      expect(option.evade).toBe(definition.startingEvade);
    }
  });
});

describe('Player class construction', () => {
  it('starts each class with exactly its definition stats', () => {
    for (const id of PLAYER_CLASS_IDS) {
      const definition = getPlayerClassDefinition(id);
      const player = new Player(id);
      expect(player.classId).toBe(id);
      expect(player.className).toBe(definition.name);
      expect(player.definition).toBe(definition);
      expect(player.stats).toEqual(definition.startingStats);
      expect(player.evade).toBe(definition.startingEvade);
      expect(player.level).toBe(1);
      expect(player.experience).toBe(0);
      expect(player.gold).toBe(0);
    }
  });

  it('resets a run back to the selected class’s original base stats', () => {
    const knight = getPlayerClassDefinition('knight');
    const player = new Player('knight');
    player.addGold(8);
    player.addExperience(12);
    player.increaseAttack(3);
    player.increaseDefence(2);
    player.increaseMaxHealth(4);
    player.increaseEvade(10);
    player.takeDamage(6);
    player.reset();
    expect(player.classId).toBe('knight');
    expect(player.stats).toEqual(knight.startingStats);
    expect(player.evade).toBe(knight.startingEvade);
    expect(player.gold).toBe(0);
    expect(player.experience).toBe(0);
    expect(player.level).toBe(1);
  });

  it('does not let callers mutate live combat stats', () => {
    const player = new Player('ranger');
    const snapshot = player.stats;
    snapshot.attack = 99;
    snapshot.health = 1;
    expect(player.stats).toEqual(getPlayerClassDefinition('ranger').startingStats);
  });
});

describe('universal caps across classes', () => {
  it('stops Knight and Barbarian Merchant/level-up gains at the shared hard caps', () => {
    const knightDef = getPlayerClassDefinition('knight');
    const knight = new Player('knight');
    expect(knight.stats.defence).toBe(knightDef.startingStats.defence);
    expect(
      knight.increaseDefence(PLAYER_DEFENCE_CAP - knightDef.startingStats.defence),
    ).toBe(PLAYER_DEFENCE_CAP - knightDef.startingStats.defence);
    expect(knight.stats.defence).toBe(PLAYER_DEFENCE_CAP);
    expect(knight.increaseDefence(1)).toBe(0);

    const merchant = new Merchant('merchant-cap', 14, 1);
    const progress = createShopProgress();
    expect(
      evaluateShopOffer(
        merchant,
        'armoured',
        99,
        shopStatSnapshot(knight),
        progress,
      ).reason,
    ).toBe('capped');
    expect(evaluateLevelUpChoice('armoured', shopStatSnapshot(knight))).toMatchObject({
      available: false,
      reason: 'capped',
      disabledReason: LEVEL_UP_CAPPED_REASONS.armoured,
    });

    const barbarianDef = getPlayerClassDefinition('barbarian');
    const barbarian = new Player('barbarian');
    expect(barbarian.stats.maxHealth).toBe(barbarianDef.startingStats.maxHealth);
    expect(
      barbarian.increaseMaxHealth(PLAYER_MAX_HEALTH_CAP - barbarianDef.startingStats.maxHealth),
    ).toBe(PLAYER_MAX_HEALTH_CAP - barbarianDef.startingStats.maxHealth);
    expect(barbarian.stats.maxHealth).toBe(PLAYER_MAX_HEALTH_CAP);
    expect(barbarian.stats.health).toBe(barbarianDef.startingStats.health);
    expect(barbarian.increaseMaxHealth(1)).toBe(0);
    expect(
      evaluateShopOffer(
        merchant,
        'vitality',
        99,
        shopStatSnapshot(barbarian),
        progress,
      ).reason,
    ).toBe('capped');
    expect(evaluateLevelUpChoice('vitality', shopStatSnapshot(barbarian))).toMatchObject({
      available: false,
      reason: 'capped',
      disabledReason: LEVEL_UP_CAPPED_REASONS.vitality,
    });

    barbarian.increaseAttack(PLAYER_ATTACK_CAP);
    barbarian.increaseEvade(PLAYER_EVADE_MAX);
    expect(barbarian.stats.attack).toBe(PLAYER_ATTACK_CAP);
    expect(barbarian.evade).toBe(PLAYER_EVADE_MAX);
    expect(evaluateLevelUpChoice('sharpened', shopStatSnapshot(barbarian)).available).toBe(
      false,
    );
    expect(evaluateLevelUpChoice('evasive', shopStatSnapshot(barbarian)).available).toBe(
      false,
    );
  });
});
