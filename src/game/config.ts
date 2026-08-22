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
export const DROP_SPAWN_FX_SEC = 0.32;
export const TRAP_FX_SEC = 0.34;
export const ENEMY_ADVANCE_FX_SEC = 0.32;

/** Rows 1..N after the start row stay empty so the first N moves are safe. */
export const SAFE_ROWS_AFTER_START = 3;

export const GOLD_AMOUNT = 1;
export const POTION_HEAL = 4;

/** Run-scoped player Evade. Side-pass chance is evade − perception, clamped here. */
export const PLAYER_BASE_EVADE = 1;
export const EVADE_CHANCE_MAX = 85;

/** First shop at this row, then every N rows: 14, 28, 42, … */
export const SHOP_ROW_INTERVAL = 14;
export const SHOP_HEAL_COST = 1;
export const SHOP_HEAL_AMOUNT = 5;
export const SHOP_ATTACK_COST = 3;
export const SHOP_ATTACK_BONUS = 1;
export const MERCHANT_LEAVE_FX_SEC = 0.36;

/** Demo Cave Rat after the safe opening, centre lane, for front-on / side-pass tests. */
export const DEMO_MONSTER_ROW = 4;
export const DEMO_MONSTER_COL = 1;
export const DEMO_MONSTER_ID = 'demo-cave-rat';

/** Alarm Traps never appear before this row. Rows 5–7 keep the early weights. */
export const TRAP_START_ROW = 8;

export const START_ROW = 0;
export const START_COL = 1;

/** Logical window matching the recycled row-mesh pool (no Three.js). */
export function gameplayVisibleRowRange(playerRow: number): {
  minRow: number;
  maxRow: number;
} {
  return {
    minRow: playerRow,
    maxRow: playerRow + ROW_POOL_SIZE - 1,
  };
}

export function laneWorldX(col: number): number {
  return (col - 1) * TILE_PITCH;
}

export function rowWorldZ(row: number, playerRow: number, scrollZ = 0): number {
  return (row - playerRow) * -TILE_PITCH + scrollZ;
}
