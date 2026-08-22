import { describe, expect, it } from 'vitest';
import { PLAYER_RENDER_KEYS } from '../game/definitions/classes';
import {
  PLAYER_ANIMATION_URLS,
  PLAYER_CLIP_NAMES,
  PLAYER_MODEL_URLS,
  isPlayerRenderKey,
  playerModelUrl,
} from './playerAssets';

describe('player asset mapping', () => {
  it('covers every player render key with a KayKit character GLB', () => {
    expect(Object.keys(PLAYER_MODEL_URLS).sort()).toEqual(
      [...PLAYER_RENDER_KEYS].sort(),
    );
    expect(PLAYER_MODEL_URLS).toEqual({
      rogue: '/models/players/kaykit/Rogue_Hooded.glb',
      ranger: '/models/players/kaykit/Ranger.glb',
      mage: '/models/players/kaykit/Mage.glb',
      knight: '/models/players/kaykit/Knight.glb',
      barbarian: '/models/players/kaykit/Barbarian.glb',
    });
    for (const key of PLAYER_RENDER_KEYS) {
      expect(isPlayerRenderKey(key)).toBe(true);
      expect(playerModelUrl(key)).toBe(PLAYER_MODEL_URLS[key]);
      expect(PLAYER_MODEL_URLS[key]).toMatch(
        /^\/models\/players\/kaykit\/.+\.glb$/,
      );
    }
  });

  it('points shared Rig_Medium clips at the existing animation GLBs', () => {
    expect(PLAYER_ANIMATION_URLS).toEqual({
      general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
      movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
    });
    expect(PLAYER_CLIP_NAMES).toEqual({
      idle: 'Idle_A',
      walk: 'Walking_A',
      hit: 'Hit_A',
      death: 'Death_A',
    });
  });
});
