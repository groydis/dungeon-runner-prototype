export interface CombatStats {
  maxHealth: number;
  health: number;
  attack: number;
  defence: number;
}

export function createCombatStats(stats: CombatStats): CombatStats {
  return {
    maxHealth: stats.maxHealth,
    health: stats.health,
    attack: stats.attack,
    defence: stats.defence,
  };
}

/** Combat-math fixture. Live player bases come from class definitions. */
export function createPlayerStats(): CombatStats {
  return createCombatStats({
    maxHealth: 20,
    health: 20,
    attack: 5,
    defence: 1,
  });
}
