import { type CombatStats, createCombatStats } from '../Combatant';

export type PlayerClassId =
  | 'rogue'
  | 'ranger'
  | 'mage'
  | 'knight'
  | 'barbarian';

export const PLAYER_CLASS_IDS: readonly PlayerClassId[] = [
  'rogue',
  'ranger',
  'mage',
  'knight',
  'barbarian',
];

export interface PlayerClassDefinition {
  id: PlayerClassId;
  name: string;
  description: string;
  startingStats: CombatStats;
  startingEvade: number;
}

export interface ClassOptionView {
  id: PlayerClassId;
  name: string;
  description: string;
  maxHealth: number;
  attack: number;
  defence: number;
  evade: number;
}

export interface ClassSelectionView {
  classes: ClassOptionView[];
}

function classStats(
  maxHealth: number,
  attack: number,
  defence: number,
): CombatStats {
  return createCombatStats({
    maxHealth,
    health: maxHealth,
    attack,
    defence,
  });
}

export const PLAYER_CLASS_DEFINITIONS: Record<
  PlayerClassId,
  PlayerClassDefinition
> = {
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    description: 'Nimble survivor with the best chance to slip past threats.',
    startingStats: classStats(18, 5, 1),
    startingEvade: 6,
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    description: 'Flexible fighter with reliable early damage.',
    startingStats: classStats(20, 6, 1),
    startingEvade: 3,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Fragile but devastating without needing magic abilities yet.',
    startingStats: classStats(16, 8, 0),
    startingEvade: 2,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    description: 'Armoured and dependable under sustained damage.',
    startingStats: classStats(26, 4, 3),
    startingEvade: 0,
  },
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'Huge health and damage, with no defensive tricks.',
    startingStats: classStats(28, 7, 0),
    startingEvade: 0,
  },
};

export function getPlayerClassDefinition(
  classId: PlayerClassId,
): PlayerClassDefinition {
  return PLAYER_CLASS_DEFINITIONS[classId];
}

export function buildClassSelectionView(): ClassSelectionView {
  return {
    classes: PLAYER_CLASS_IDS.map((id) => {
      const definition = getPlayerClassDefinition(id);
      return {
        id,
        name: definition.name,
        description: definition.description,
        maxHealth: definition.startingStats.maxHealth,
        attack: definition.startingStats.attack,
        defence: definition.startingStats.defence,
        evade: definition.startingEvade,
      };
    }),
  };
}

export function classStatLine(option: ClassOptionView): string {
  return `HP ${option.maxHealth} · ATK ${option.attack} · DEF ${option.defence} · EVA ${option.evade}`;
}
