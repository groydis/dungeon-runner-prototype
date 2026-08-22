import { type CombatStats } from '../Combatant';

export type EnemyType = 'caveRat';

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  startingStats: CombatStats;
  renderKey: string;
}

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  caveRat: {
    type: 'caveRat',
    name: 'Cave Rat',
    startingStats: {
      maxHealth: 8,
      health: 8,
      attack: 3,
      defence: 0,
    },
    renderKey: 'caveRat',
  },
};

export function getEnemyDefinition(type: EnemyType): EnemyDefinition {
  return ENEMY_DEFINITIONS[type];
}
