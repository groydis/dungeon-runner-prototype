import { describe, expect, it } from 'vitest';
import {
  DUNGEON_FLOOR_KEYS,
  DUNGEON_FLOOR_URLS,
  DUNGEON_TRAP_SPIKE_NODE_NAME,
  DUNGEON_TRAP_URL,
  dungeonFloorRotation,
  dungeonFloorVariant,
} from './environmentAssets';
import source from './environmentAssets.ts?raw';

describe('dungeon environment assets', () => {
  it('uses self-contained floor and trap models', () => {
    expect([...DUNGEON_FLOOR_KEYS].sort()).toEqual(
      ['stone', 'wood'].sort(),
    );
    for (const url of Object.values(DUNGEON_FLOOR_URLS)) {
      expect(url).toMatch(/^\/models\/environment\/kaykit\/dungeon\/.+\.glb$/);
    }
    expect(DUNGEON_FLOOR_URLS.stone).toContain('floor_tile_large.glb');
    expect(DUNGEON_FLOOR_URLS.wood).toContain('floor_wood_large.glb');
    expect(DUNGEON_TRAP_URL).toContain('floor_tile_big_spikes.glb');
    expect(DUNGEON_TRAP_SPIKE_NODE_NAME).toBe('spikes');
  });

  it('selects and rotates the base floor without game-state imports', () => {
    expect(dungeonFloorVariant(17, 2)).toBe(dungeonFloorVariant(17, 2));
    expect(dungeonFloorVariant(17, 2)).toBe('stone');
    expect(
      new Set(
        Array.from({ length: 12 }, (_, row) =>
          dungeonFloorRotation(row, row % 3),
        ),
      ),
    ).toEqual(new Set([0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]));
    expect(source).not.toMatch(/from ['"][^'"]*\/(GameState|RunWorld)['"]/);
  });
});
