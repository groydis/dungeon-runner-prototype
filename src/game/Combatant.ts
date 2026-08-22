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

export function createPlayerStats(): CombatStats {
  return createCombatStats({
    maxHealth: 20,
    health: 20,
    attack: 5,
    defence: 1,
  });
}

export function createCaveRatStats(): CombatStats {
  return createCombatStats({
    maxHealth: 8,
    health: 8,
    attack: 3,
    defence: 0,
  });
}

/** Development helper: `?fatal=1` gives the demo rat enough attack to kill. */
export function caveRatStatsFromSearch(search: string): CombatStats {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  if (params.get('fatal') === '1') {
    return createCombatStats({
      maxHealth: 8,
      health: 8,
      attack: 99,
      defence: 0,
    });
  }
  return createCaveRatStats();
}
