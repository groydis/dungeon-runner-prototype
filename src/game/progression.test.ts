import { describe, expect, it } from 'vitest';
import {
  LEVEL_XP_THRESHOLDS,
  PLAYER_START_EXPERIENCE,
  PLAYER_START_LEVEL,
  levelForExperience,
  levelsReachedByGain,
  nextLevelExperience,
} from './progression';

describe('progression thresholds', () => {
  it('starts a run at level 1 with 0 XP and the next threshold at 3', () => {
    expect(PLAYER_START_LEVEL).toBe(1);
    expect(PLAYER_START_EXPERIENCE).toBe(0);
    expect(levelForExperience(0)).toBe(1);
    expect(nextLevelExperience(0)).toBe(3);
  });

  it('uses the cumulative thresholds through level 10', () => {
    expect(LEVEL_XP_THRESHOLDS).toEqual([
      { level: 2, experience: 3 },
      { level: 3, experience: 7 },
      { level: 4, experience: 12 },
      { level: 5, experience: 18 },
      { level: 6, experience: 25 },
      { level: 7, experience: 35 },
      { level: 8, experience: 48 },
      { level: 9, experience: 64 },
      { level: 10, experience: 84 },
    ]);

    expect(levelForExperience(2)).toBe(1);
    expect(levelForExperience(3)).toBe(2);
    expect(levelForExperience(6)).toBe(2);
    expect(levelForExperience(7)).toBe(3);
    expect(levelForExperience(12)).toBe(4);
    expect(levelForExperience(18)).toBe(5);
    expect(levelForExperience(25)).toBe(6);
    expect(nextLevelExperience(3)).toBe(7);
    expect(nextLevelExperience(7)).toBe(12);
    expect(nextLevelExperience(12)).toBe(18);
    expect(nextLevelExperience(18)).toBe(25);
    expect(nextLevelExperience(25)).toBe(35);
    expect(nextLevelExperience(84)).toBeNull();
  });

  it('queues every threshold crossed by a single XP gain', () => {
    expect(levelsReachedByGain(0, 2)).toEqual([]);
    expect(levelsReachedByGain(2, 3)).toEqual([2]);
    expect(levelsReachedByGain(0, 12)).toEqual([2, 3, 4]);
    expect(levelsReachedByGain(6, 25)).toEqual([3, 4, 5, 6]);
  });
});
