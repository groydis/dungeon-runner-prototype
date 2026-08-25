export interface CombatStats {
  maxHealth: number;
  health: number;
  attack: number;
  defence: number;
  str: number;
  con: number;
  dex: number;
}

export function createCombatStats(stats: Readonly<CombatStats>): CombatStats {
  return {
    maxHealth: stats.maxHealth,
    health: stats.health,
    attack: stats.attack,
    defence: stats.defence,
    str: stats.str,
    con: stats.con,
    dex: stats.dex,
  };
}

/** Combat-math fixture. Live player bases come from class definitions. */
export function createPlayerStats(): CombatStats {
  return createCombatStats({
    maxHealth: 20,
    health: 20,
    attack: 5,
    defence: 1,
    str: 5,
    con: 5,
    dex: 5,
  });
}
