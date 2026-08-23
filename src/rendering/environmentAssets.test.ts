import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { LANE_COUNT, TILE_PITCH, TILE_SIZE, laneWorldX } from '../game/config';
import {
  DUNGEON_FLOOR_KEYS,
  DUNGEON_FLOOR_URLS,
  DUNGEON_TRAP_SPIKE_NODE_NAME,
  DUNGEON_TRAP_URL,
  DUNGEON_WALL_KEYS,
  DUNGEON_WALL_LIGHT_KEYS,
  DUNGEON_WALL_TORCH_URL,
  DUNGEON_WALL_URLS,
  dungeonFloorRotation,
  dungeonFloorVariant,
  dungeonWallTorchSide,
  dungeonWallTransmitsLight,
  dungeonWallVariant,
  fitDungeonWallModel,
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

  it('registers self-contained wall and mounted-torch models', () => {
    expect(DUNGEON_WALL_KEYS).toHaveLength(9);
    for (const url of Object.values(DUNGEON_WALL_URLS)) {
      expect(url).toMatch(
        /^\/models\/environment\/kaykit\/dungeon\/walls\/.+\.glb$/,
      );
    }
    expect(DUNGEON_WALL_TORCH_URL).toMatch(
      /^\/models\/environment\/kaykit\/dungeon\/props\/.+\.glb$/,
    );
  });

  it('chooses deterministic wall variation and sparse alternating torches', () => {
    expect(dungeonWallVariant(18, 'left')).toBe(
      dungeonWallVariant(18, 'left'),
    );
    expect(dungeonWallVariant(0, 'left')).toBe('stone');
    expect(dungeonWallVariant(2, 'right')).toBe('stone');
    expect(
      new Set(
        Array.from({ length: 500 }, (_, row) => [
          dungeonWallVariant(row, 'left'),
          dungeonWallVariant(row, 'right'),
        ]).flat(),
      ),
    ).toEqual(new Set(DUNGEON_WALL_KEYS));
    expect(dungeonWallTorchSide(3)).toBeNull();
    expect(dungeonWallTorchSide(4)).toBe('left');
    expect(dungeonWallTorchSide(11)).toBe('right');
    expect(dungeonWallTorchSide(18)).toBe('left');
  });

  it('limits exterior light beams to windowed and gated wall modules', () => {
    expect([...DUNGEON_WALL_LIGHT_KEYS]).toEqual([
      'gated',
      'archedGated',
    ]);
    for (const key of DUNGEON_WALL_KEYS) {
      expect(dungeonWallTransmitsLight(key)).toBe(
        DUNGEON_WALL_LIGHT_KEYS.includes(
          key as (typeof DUNGEON_WALL_LIGHT_KEYS)[number],
        ),
      );
    }
  });

  it('fits wall modules continuously outside the three-lane road', () => {
    const roadEdge = Math.abs(laneWorldX(LANE_COUNT - 1)) + TILE_SIZE / 2;
    const makeWall = () => {
      const root = new Group();
      const mesh = new Mesh(new BoxGeometry(4, 4, 1), new MeshBasicMaterial());
      mesh.position.y = 2;
      root.add(mesh);
      return root;
    };

    const left = makeWall();
    fitDungeonWallModel(left, 'left');
    const leftBounds = new Box3().setFromObject(left);
    expect(leftBounds.max.x).toBeCloseTo(-roadEdge);
    expect(leftBounds.max.z - leftBounds.min.z).toBeCloseTo(TILE_PITCH);

    const right = makeWall();
    fitDungeonWallModel(right, 'right');
    const rightBounds = new Box3().setFromObject(right);
    expect(rightBounds.min.x).toBeCloseTo(roadEdge);
    expect(rightBounds.max.z - rightBounds.min.z).toBeCloseTo(TILE_PITCH);
  });
});
