import { type CombatStats, createCaveRatStats, createCombatStats } from './Combatant';

export interface Monster {
  id: string;
  name: string;
  row: number;
  col: number;
  encounterResolved: boolean;
  stats: CombatStats;
}

export function createMonster(
  id: string,
  name: string,
  row: number,
  col: number,
  stats: CombatStats = createCaveRatStats(),
): Monster {
  return {
    id,
    name,
    row,
    col,
    encounterResolved: false,
    stats: createCombatStats(stats),
  };
}
