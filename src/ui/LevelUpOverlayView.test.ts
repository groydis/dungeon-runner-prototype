import { describe, expect, it } from 'vitest';
import { buildLevelUpView } from '../game/levelUp';
import { experienceHudText, levelHudText } from './LevelUpOverlayView';

describe('level and XP HUD text', () => {
  it('renders the starting level and next threshold', () => {
    expect(levelHudText(1)).toBe('LVL: 1');
    expect(experienceHudText(0, 3)).toBe('XP: 0 / 3');
  });

  it('renders mid-run progress and a clean cap value', () => {
    expect(levelHudText(4)).toBe('LVL: 4');
    expect(experienceHudText(12, 18)).toBe('XP: 12 / 18');
    expect(experienceHudText(25, null)).toBe('XP: 25');
  });

  it('shows the reached level and next threshold on a level-up view', () => {
    const view = buildLevelUpView(2, 3);
    expect(view.level).toBe(2);
    expect(experienceHudText(view.experience, view.nextLevelExperience)).toBe(
      'XP: 3 / 7',
    );
    expect(view.choices.map((choice) => choice.title)).toEqual([
      'Vitality',
      'Sharpened',
      'Armoured',
      'Evasive',
    ]);
  });
});
