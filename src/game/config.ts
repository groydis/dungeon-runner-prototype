export const LANE_COUNT = 3;
export const VISIBLE_ROWS = 8;

/** Extra pooled rows so the departing row can scroll off-screen and a new far row can fade in. */
export const ROW_POOL_SIZE = VISIBLE_ROWS + 2;

export const TILE_SIZE = 1.18;
export const TILE_GAP = 0.1;
export const TILE_PITCH = TILE_SIZE + TILE_GAP;

export const MOVE_DURATION_SEC = 0.36;
export const ENCOUNTER_FX_SEC = 0.42;
export const COMBAT_HIT_SEC = 0.3;
export const COLLECT_FX_SEC = 0.38;

/** Rows 1..N after the start row stay empty so the first N moves are safe. */
export const SAFE_ROWS_AFTER_START = 3;

export const GOLD_AMOUNT = 1;
export const POTION_HEAL = 4;

/** Demo Cave Rat after the safe opening, centre lane, for front-on / side-pass tests. */
export const DEMO_MONSTER_ROW = 4;
export const DEMO_MONSTER_COL = 1;
export const DEMO_MONSTER_ID = 'demo-cave-rat';
export const DEMO_MONSTER_NAME = 'Cave Rat';

export const START_ROW = 0;
export const START_COL = 1;

export function laneWorldX(col: number): number {
  return (col - 1) * TILE_PITCH;
}

export function rowWorldZ(row: number, playerRow: number, scrollZ = 0): number {
  return (row - playerRow) * -TILE_PITCH + scrollZ;
}
