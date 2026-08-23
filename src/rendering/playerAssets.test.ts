import { describe, expect, it } from 'vitest';
import { PLAYER_RENDER_KEYS } from '../game/definitions/classes';
import {
  PLAYER_ANIMATION_URLS,
  PLAYER_ATTACK_CLIPS,
  PLAYER_CLIP_NAMES,
  PLAYER_MODEL_URLS,
  isPlayerRenderKey,
  playerModelUrl,
} from './playerAssets';
import {
  RIG_MEDIUM_ANIMATION_URLS,
  RIG_MEDIUM_CLIP_NAMES,
} from './rigMediumAnimations';

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
      lorekeeper: '/models/players/kaykit/Lorekeeper.glb',
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
    expect(PLAYER_ANIMATION_URLS).toBe(RIG_MEDIUM_ANIMATION_URLS);
    expect(PLAYER_CLIP_NAMES).toBe(RIG_MEDIUM_CLIP_NAMES);
    expect(PLAYER_ANIMATION_URLS).toEqual({
      general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
      movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
      melee: '/models/players/kaykit/animations/Rig_Medium_CombatMelee.glb',
      special: '/models/players/kaykit/animations/Rig_Medium_Special.glb',
    });
    expect(PLAYER_CLIP_NAMES).toEqual(expect.objectContaining({
      idle: 'Idle_A',
      walk: 'Walking_A',
      hit: 'Hit_A',
      death: 'Death_A',
      attack1H: 'Melee_1H_Attack_Slice_Diagonal',
      attack2H: 'Melee_2H_Attack_Chop',
      attackUnarmed: 'Melee_Unarmed_Attack_Punch_A',
      skeletonIdle: 'Skeletons_Idle',
      skeletonWalk: 'Skeletons_Walking',
      skeletonDeath: 'Skeletons_Death',
      bowRelease: 'Ranged_Bow_Release',
      magicShoot: 'Ranged_Magic_Shoot',
    }));
    expect(PLAYER_ATTACK_CLIPS).toEqual({
      rogue: ['attack1H', 'attack1HChop', 'attack1HHorizontal', 'attack1HStab'],
      ranger: ['bowRelease'],
      mage: ['magicShoot', 'magicSpellcasting'],
      knight: ['attack1H', 'attack1HHorizontal', 'attack1HStab'],
      barbarian: ['attack2H', 'attack2HSlice', 'attack2HSpin', 'attack2HStab'],
      lorekeeper: ['magicSpellcasting', 'magicShoot'],
    });
  });
});
