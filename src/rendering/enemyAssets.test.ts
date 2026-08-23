import { describe, expect, it } from 'vitest';
import {
  ENEMY_DEFINITIONS,
  getEnemyDefinition,
} from '../game/definitions/enemies';
import {
  ENEMY_ATTACK_CLIPS,
  ENEMY_MODEL_FITS,
  ENEMY_MODEL_URLS,
  ENEMY_RENDER_KEYS,
  enemyModelUrl,
  isEnemyRenderKey,
} from './enemyAssets';
import source from './enemyAssets.ts?raw';

describe('enemy asset mapping', () => {
  it('covers every current enemy render key with a KayKit skeleton GLB', () => {
    expect([...ENEMY_RENDER_KEYS]).toEqual([
      'skeletonMinion',
      'cryptGuard',
      'boneBrute',
      'skeletonMage',
      'necromancer',
    ]);
    expect(Object.keys(ENEMY_MODEL_URLS).sort()).toEqual(
      [...ENEMY_RENDER_KEYS].sort(),
    );
    expect(ENEMY_MODEL_URLS).toEqual({
      skeletonMinion: '/models/enemies/kaykit/Skeleton_Minion.glb',
      cryptGuard: '/models/enemies/kaykit/Skeleton_Rogue.glb',
      boneBrute: '/models/enemies/kaykit/Skeleton_Warrior.glb',
      skeletonMage: '/models/enemies/kaykit/Skeleton_Mage.glb',
      necromancer: '/models/enemies/kaykit/Necromancer.glb',
    });
    expect(ENEMY_ATTACK_CLIPS).toEqual({
      skeletonMinion: ['attackUnarmed', 'attackUnarmedKick'],
      cryptGuard: ['attack1H', 'attack1HChop', 'attack1HHorizontal', 'attack1HStab'],
      boneBrute: ['attack2H', 'attack2HSlice', 'attack2HSpin', 'attack2HStab'],
      skeletonMage: ['magicShoot', 'magicSpellcasting'],
      necromancer: ['magicSummon'],
    });
    for (const key of ENEMY_RENDER_KEYS) {
      expect(isEnemyRenderKey(key)).toBe(true);
      expect(enemyModelUrl(key)).toBe(ENEMY_MODEL_URLS[key]);
      expect(ENEMY_MODEL_FITS[key]).toEqual(
        expect.objectContaining({
          height: expect.any(Number),
          wrapperY: expect.any(Number),
          yaw: expect.any(Number),
        }),
      );
    }
  });

  it('maps every enemy definition render key to a registry entry', () => {
    for (const type of Object.keys(ENEMY_DEFINITIONS) as Array<
      keyof typeof ENEMY_DEFINITIONS
    >) {
      const definition = getEnemyDefinition(type);
      expect(isEnemyRenderKey(definition.renderKey)).toBe(true);
      if (isEnemyRenderKey(definition.renderKey)) {
        expect(ENEMY_MODEL_URLS[definition.renderKey]).toBeDefined();
      }
    }
  });

  it('does not own a second Rig_Medium animation URL table', () => {
    expect(source).not.toMatch(/Rig_Medium_General/);
    expect(source).not.toMatch(/Rig_Medium_MovementBasic/);
    expect(source).not.toMatch(/GLTFLoader/);
  });
});
