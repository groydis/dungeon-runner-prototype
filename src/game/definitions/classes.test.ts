import { describe, expect, it } from 'vitest';
import { Player } from '../Player';
import { isValidLevelUpAllocation } from '../levelUp';
import {
  PLAYER_CLASS_DEFINITIONS,
  PLAYER_CLASS_IDS,
  PLAYER_RENDER_KEYS,
  buildClassSelectionView,
  getPlayerClassDefinition,
  type PlayerClassId,
} from './classes';

const CLASS_PACKAGES: Record<
  PlayerClassId,
  {
    name: string;
    maxHealth: number;
    attack: number;
    defence: number;
    str: number;
    con: number;
    dex: number;
  }
> = {
  rogue: { name: 'Rogue', maxHealth: 18, attack: 8, defence: 1, str: 10, con: 10, dex: 16 },
  ranger: { name: 'Ranger', maxHealth: 20, attack: 8, defence: 1, str: 10, con: 12, dex: 15 },
  mage: { name: 'Mage', maxHealth: 16, attack: 9, defence: 0, str: 10, con: 10, dex: 12 },
  knight: { name: 'Knight', maxHealth: 26, attack: 9, defence: 3, str: 14, con: 16, dex: 8 },
  barbarian: {
    name: 'Barbarian',
    maxHealth: 28,
    attack: 11,
    defence: 0,
    str: 16,
    con: 14,
    dex: 10,
  },
  lorekeeper: {
    name: 'Lorekeeper',
    maxHealth: 22,
    attack: 8,
    defence: 2,
    str: 10,
    con: 14,
    dex: 10,
  },
};

describe('player class definitions', () => {
  it('lists all six playable classes', () => {
    expect(PLAYER_CLASS_IDS).toEqual([
      'rogue',
      'ranger',
      'mage',
      'knight',
      'barbarian',
      'lorekeeper',
    ]);
    expect(Object.keys(PLAYER_CLASS_DEFINITIONS)).toEqual([...PLAYER_CLASS_IDS]);
  });

  it('uses the agreed starting HP, ATK, DEF, and attributes for every class', () => {
    for (const id of PLAYER_CLASS_IDS) {
      const definition = getPlayerClassDefinition(id);
      const expected = CLASS_PACKAGES[id];
      expect(definition.name).toBe(expected.name);
      expect(definition.startingStats.maxHealth).toBe(expected.maxHealth);
      expect(definition.startingStats.health).toBe(expected.maxHealth);
      expect(definition.startingStats.attack).toBe(expected.attack);
      expect(definition.startingStats.defence).toBe(expected.defence);
      expect(definition.startingStats.str).toBe(expected.str);
      expect(definition.startingStats.con).toBe(expected.con);
      expect(definition.startingStats.dex).toBe(expected.dex);
    }
  });

  it('assigns every class a valid player render key', () => {
    expect(PLAYER_RENDER_KEYS).toEqual([...PLAYER_CLASS_IDS]);
    for (const id of PLAYER_CLASS_IDS) {
      const definition = getPlayerClassDefinition(id);
      expect(PLAYER_RENDER_KEYS).toContain(definition.renderKey);
      expect(definition.renderKey).toBe(id);
    }
  });

  it('does not let public definition access corrupt a fresh Player', () => {
    const definition = getPlayerClassDefinition('ranger');
    const player = new Player('ranger');
    expect(() => {
      (definition.startingStats as { attack: number }).attack = 99;
    }).toThrow(TypeError);
    expect(() => {
      (player.definition.startingStats as { maxHealth: number }).maxHealth = 1;
    }).toThrow(TypeError);

    const fresh = new Player('ranger');
    expect(fresh.stats).toEqual(getPlayerClassDefinition('ranger').startingStats);
    expect(fresh.stats.attack).toBe(CLASS_PACKAGES.ranger.attack);
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
      expect(option.dex).toBe(definition.startingStats.dex);
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
      expect(player.renderKey).toBe(definition.renderKey);
      expect(player.definition).toBe(definition);
      expect(player.stats).toEqual(definition.startingStats);
      
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
    player.increaseStr(3);
    player.increaseDef(2);
    player.increaseCon(2);
    player.increaseDex(10);
    player.takeDamage(6);
    player.reset();
    expect(player.classId).toBe('knight');
    expect(player.stats).toEqual(knight.startingStats);
    
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

  it('recomputes maxHealth and attack when attributes change', () => {
    const player = new Player('lorekeeper');
    expect(player.stats.maxHealth).toBe(22);
    expect(player.stats.attack).toBe(8);
    player.increaseStr(3);
    expect(player.stats.str).toBe(13);
    expect(player.stats.maxHealth).toBe(22);
    expect(player.stats.attack).toBe(8);
    expect(player.stats.health).toBe(22);
  });
});

describe('bounded player growth', () => {
  it('caps attributes, Armor, and derived health', () => {
    const knightDef = getPlayerClassDefinition('knight');
    const knight = new Player('knight');
    expect(knight.stats.defence).toBe(knightDef.startingStats.defence);
    expect(knight.increaseDef(20)).toBe(9);
    expect(knight.stats.defence).toBe(12);
    expect(knight.increaseDef(1)).toBe(0);
    expect(isValidLevelUpAllocation({ str: 0, con: 0, def: 2, dex: 0 })).toBe(true);

    const barbarianDef = getPlayerClassDefinition('barbarian');
    const barbarian = new Player('barbarian');
    expect(barbarian.stats.maxHealth).toBe(barbarianDef.startingStats.maxHealth);
    const healthBefore = barbarian.stats.health;
    expect(barbarian.increaseCon(10)).toBe(6);
    expect(barbarian.stats.maxHealth).toBe(barbarianDef.startingStats.maxHealth + 6);
    expect(barbarian.stats.health).toBe(healthBefore);
    expect(barbarian.increaseStr(1)).toBe(1);
    expect(isValidLevelUpAllocation({ str: 1, con: 1, def: 0, dex: 0 })).toBe(true);

    barbarian.increaseCon(10);
    barbarian.increaseDex(10);
    expect(barbarian.stats.dex).toBe(20);
    expect(isValidLevelUpAllocation({ str: 0, con: 0, def: 0, dex: 2 })).toBe(true);
    expect(isValidLevelUpAllocation({ str: 3, con: 0, def: 0, dex: 0 })).toBe(false);
  });
});
