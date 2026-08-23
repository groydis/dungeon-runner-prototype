import { describe, expect, it } from 'vitest';
import {
  COMBAT_PROJECTILE_URLS,
  PROJECTILE_POOL_SIZE,
} from './combatPresentationAssets';
import sceneSource from './SceneManager.ts?raw';

describe('combat presentation assets', () => {
  it('maps bow and crossbow arrows to self-contained GLBs', () => {
    expect(COMBAT_PROJECTILE_URLS).toEqual({
      bow: '/models/players/kaykit/weapons/arrow_bow.glb',
      crossbow: '/models/players/kaykit/weapons/arrow_crossbow.glb',
    });
    expect(PROJECTILE_POOL_SIZE).toBe(4);
  });

  it('uses a reusable projectile pool instead of allocating per hit', () => {
    expect(sceneSource).toMatch(/projectilePools/);
    expect(sceneSource).toMatch(/find\(\(entry\) => !entry\.visible\)/);
    expect(sceneSource).not.toMatch(/new Group\(\).*beginCombatHit/s);
  });
});
