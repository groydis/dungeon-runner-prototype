export const PLAYER_START_LEVEL = 1;
export const PLAYER_START_EXPERIENCE = 0;

/**
 * Cumulative XP required to reach each listed level.
 * Append more entries to extend the cap without changing callers.
 */
export const LEVEL_XP_THRESHOLDS: readonly { level: number; experience: number }[] =
  [
    { level: 2, experience: 3 },
    { level: 3, experience: 7 },
    { level: 4, experience: 12 },
    { level: 5, experience: 18 },
    { level: 6, experience: 25 },
    { level: 7, experience: 35 },
    { level: 8, experience: 48 },
    { level: 9, experience: 64 },
    { level: 10, experience: 84 },
  ];

export const MAX_PLAYER_EXPERIENCE = 84;

export function levelForExperience(experience: number): number {
  let level = PLAYER_START_LEVEL;
  for (const entry of LEVEL_XP_THRESHOLDS) {
    if (experience >= entry.experience) {
      level = entry.level;
      continue;
    }
    break;
  }
  return level;
}

/** Next cumulative threshold, or null when the defined table is exhausted. */
export function nextLevelExperience(experience: number): number | null {
  for (const entry of LEVEL_XP_THRESHOLDS) {
    if (experience < entry.experience) {
      return entry.experience;
    }
  }
  return null;
}

export function levelsReachedByGain(fromExperience: number, toExperience: number): number[] {
  const reached: number[] = [];
  for (const entry of LEVEL_XP_THRESHOLDS) {
    if (fromExperience < entry.experience && toExperience >= entry.experience) {
      reached.push(entry.level);
    }
  }
  return reached;
}

export interface ExperienceGain {
  gained: number;
  experience: number;
  level: number;
  levelsReached: number[];
}
