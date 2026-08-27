import { describe, expect, it } from 'vitest';
import { experienceProgress } from './HudView';

describe('experienceProgress', () => {
  it('matches iOS HUDProgress within the current level span', () => {
    expect(experienceProgress(1, 0, 3)).toBe(0);
    expect(experienceProgress(1, 2, 3)).toBeCloseTo(2 / 3);
    expect(experienceProgress(2, 3, 7)).toBe(0);
    expect(experienceProgress(2, 5, 7)).toBe(0.5);
    expect(experienceProgress(6, 25, null)).toBe(1);
  });
});
