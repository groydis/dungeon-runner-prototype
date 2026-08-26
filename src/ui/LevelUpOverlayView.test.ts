import { describe, expect, it } from 'vitest';
import { Player } from '../game/Player';
import { applyLevelUpChoice, buildLevelUpView } from '../game/levelUp';
import { experienceHudText, levelHudText } from './LevelUpOverlayView';

describe('level and XP presentation', () => {
  it('renders current and capped progression', () => {
    expect(levelHudText(1)).toBe('LVL: 1');
    expect(experienceHudText(0, 3)).toBe('XP: 0 / 3');
    expect(experienceHudText(84, null)).toBe('XP: 84 / MAX');
  });

  it('presents three authored normal choices', () => {
    const ranger = new Player('ranger');
    const view = buildLevelUpView(2, 3, ranger);
    expect(view.choices).toEqual([
      expect.objectContaining({ id: 'ranger-finesse', title: 'Sure Aim', available: true }),
      expect.objectContaining({ id: 'ranger-vigor', title: 'Trail Hardened', available: true }),
      expect.objectContaining({ id: 'piercing', title: 'Piercing', available: true }),
    ]);
  });

  it('changes the choice set at specialization and capstone levels', () => {
    const mage = new Player('mage');
    expect(buildLevelUpView(5, 18, mage).choices.map((choice) => choice.title)).toEqual(['Evoker', 'Spellbreaker', 'Channeler']);
    applyLevelUpChoice(mage, 5, 'evoker');
    expect(buildLevelUpView(10, 84, mage).choices.map((choice) => choice.title)).toEqual(['Mastery', 'Resilience']);
  });
});
