import { describe, expect, it } from 'vitest';
import {
  PLAYER_ANIMATION_URLS,
  PLAYER_CLIP_NAMES,
} from './playerAssets';
import {
  RIG_MEDIUM_ANIMATION_URLS,
  RIG_MEDIUM_CLIP_NAMES,
  RIG_MEDIUM_LAZY_ANIMATION_URLS,
  RIG_MEDIUM_RESERVED_ANIMATION_URLS,
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
      melee: '/models/players/kaykit/animations/Rig_Medium_CombatMelee.glb',
      special: '/models/players/kaykit/animations/Rig_Medium_Special.glb',
    });
    expect(RIG_MEDIUM_CLIP_NAMES).toEqual(expect.objectContaining({
      idle: 'Idle_A',
      walk: 'Walking_A',
      hit: 'Hit_A',
      death: 'Death_A',
      pickup: 'PickUp',
      useItem: 'Use_Item',
      attack1H: 'Melee_1H_Attack_Slice_Diagonal',
      attack2H: 'Melee_2H_Attack_Chop',
      attackUnarmed: 'Melee_Unarmed_Attack_Punch_A',
      blockHit: 'Melee_Block_Hit',
      skeletonIdle: 'Skeletons_Idle',
      skeletonWalk: 'Skeletons_Walking',
      skeletonDeath: 'Skeletons_Death',
      skeletonSpawn: 'Skeletons_Spawn_Ground',
      skeletonTaunt: 'Skeletons_Taunt',
      skeletonResurrect: 'Skeletons_Death_Resurrect',
      bowRelease: 'Ranged_Bow_Release',
      magicShoot: 'Ranged_Magic_Shoot',
      magicSummon: 'Ranged_Magic_Summon',
    }));
    expect(RIG_MEDIUM_LAZY_ANIMATION_URLS).toEqual({
      ranged: '/models/players/kaykit/animations/Rig_Medium_CombatRanged.glb',
    });
    expect(RIG_MEDIUM_RESERVED_ANIMATION_URLS).toEqual({
      movementAdvanced:
        '/models/players/kaykit/animations/Rig_Medium_MovementAdvanced.glb',
      simulation: '/models/players/kaykit/animations/Rig_Medium_Simulation.glb',
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
