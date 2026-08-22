import { describe, expect, it } from 'vitest';
import source from './SceneManager.ts?raw';

describe('SceneManager domain boundary', () => {
  it('does not import Monster, Player, GameState, or RunWorld', () => {
    expect(source).not.toMatch(/from ['"][^'"]*\/Monster['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/Player['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/GameState['"]/);
    expect(source).not.toMatch(/from ['"][^'"]*\/RunWorld['"]/);
  });
});
