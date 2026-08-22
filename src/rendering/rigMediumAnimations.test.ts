import { describe, expect, it } from 'vitest';
import {
  PLAYER_ANIMATION_URLS,
  PLAYER_CLIP_NAMES,
} from './playerAssets';
import {
  RIG_MEDIUM_ANIMATION_URLS,
  RIG_MEDIUM_CLIP_NAMES,
} from './rigMediumAnimations';
import playerSource from './playerAssets.ts?raw';
import enemySource from './enemyAssets.ts?raw';

describe('shared Rig_Medium animation cache', () => {
  it('is the single source of clip names and animation URLs', () => {
    expect(PLAYER_ANIMATION_URLS).toBe(RIG_MEDIUM_ANIMATION_URLS);
    expect(PLAYER_CLIP_NAMES).toBe(RIG_MEDIUM_CLIP_NAMES);
    expect(RIG_MEDIUM_ANIMATION_URLS).toEqual({
      general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
      movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
    });
    expect(RIG_MEDIUM_CLIP_NAMES).toEqual({
      idle: 'Idle_A',
      walk: 'Walking_A',
      hit: 'Hit_A',
      death: 'Death_A',
    });
  });

  it('is consumed by player and enemy asset modules without duplicate loaders', () => {
    expect(playerSource).toMatch(/from '\.\/rigMediumAnimations'/);
    expect(enemySource).toMatch(/from '\.\/rigMediumAnimations'/);
    expect(playerSource).not.toMatch(/new GLTFLoader/);
    expect(enemySource).not.toMatch(/new GLTFLoader/);
    expect(enemySource).not.toMatch(/\/models\/enemies\/kaykit\/animations\//);
  });
});
