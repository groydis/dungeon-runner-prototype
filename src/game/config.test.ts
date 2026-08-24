import { describe, expect, it } from 'vitest';
import {
  PLAYER_WORLD_Z,
  TILE_PITCH,
  TRAILING_ROW_COUNT,
  rowWorldZ,
} from './config';

describe('rowWorldZ trailing offset', () => {
  it('sits the player row at PLAYER_WORLD_Z and the trailing row one pitch nearer', () => {
    expect(TRAILING_ROW_COUNT).toBe(1);
    expect(PLAYER_WORLD_Z).toBe(TILE_PITCH);

    const playerRow = 5;
    expect(rowWorldZ(playerRow, playerRow)).toBe(PLAYER_WORLD_Z);
    expect(rowWorldZ(playerRow - TRAILING_ROW_COUNT, playerRow)).toBe(
      2 * TILE_PITCH,
    );
  });
});
