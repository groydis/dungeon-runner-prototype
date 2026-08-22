import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_ROW,
  LANE_COUNT,
  SAFE_ROWS_AFTER_START,
  SHOP_ROW_INTERVAL,
  START_ROW,
  TRAP_START_ROW,
} from './config';
import { collectibleId, type CollectibleKind } from './Collectible';
import { pickEnemyTypeForRow } from './definitions/encounterPools';
import { type EnemyType } from './definitions/enemies';
import { merchantId } from './Merchant';
import { pickWeighted, randomInt, type Rng } from './random';
import { type TrapKind, trapId } from './Trap';

export type LaneKind = 'empty' | 'monster' | 'gold' | 'potion' | 'shop' | 'trap';

export interface EmptyLaneRecipe {
  kind: 'empty';
}

export interface MonsterLaneRecipe {
  kind: 'monster';
  entityId: string;
  enemyType: EnemyType;
}

export interface CollectibleLaneRecipe {
  kind: 'gold' | 'potion';
  entityId: string;
}

export interface ShopLaneRecipe {
  kind: 'shop';
  entityId: string;
}

export interface TrapLaneRecipe {
  kind: 'trap';
  entityId: string;
  trapKind: TrapKind;
}

export type LaneRecipe =
  | EmptyLaneRecipe
  | MonsterLaneRecipe
  | CollectibleLaneRecipe
  | ShopLaneRecipe
  | TrapLaneRecipe;

export type RowRecipeFactory = (row: number, rng: Rng) => LaneRecipe[];

/**
 * Rows 5–7 (after the demo rat, before traps). Must sum to 100.
 * empty 45 / monster 25 / gold 15 / potion 10 / monster+loot 5
 */
export const EARLY_ROW_PATTERN_WEIGHTS = [
  { item: 'empty', weight: 45 },
  { item: 'monster', weight: 25 },
  { item: 'gold', weight: 15 },
  { item: 'potion', weight: 10 },
  { item: 'monsterAndLoot', weight: 5 },
] as const;

/**
 * Rows 8+ that are not Merchant rows. Must sum to 100.
 */
export const ROW_PATTERN_WEIGHTS = [
  { item: 'empty', weight: 35 },
  { item: 'monster', weight: 25 },
  { item: 'gold', weight: 15 },
  { item: 'potion', weight: 10 },
  { item: 'monsterAndLoot', weight: 5 },
  { item: 'alarm', weight: 5 },
  { item: 'monsterAndAlarm', weight: 5 },
] as const;

export type RowPattern =
  | (typeof EARLY_ROW_PATTERN_WEIGHTS)[number]['item']
  | (typeof ROW_PATTERN_WEIGHTS)[number]['item'];

const LAST_SAFE_ROW = START_ROW + SAFE_ROWS_AFTER_START;

export function createRowRecipe(row: number, rng: Rng): LaneRecipe[] {
  const empty = emptyRow();

  if (row <= LAST_SAFE_ROW) {
    return empty;
  }

  if (row === DEMO_MONSTER_ROW) {
    empty[DEMO_MONSTER_COL] = monsterLane(DEMO_MONSTER_ID, 'caveRat');
    return empty;
  }

  if (isMerchantRow(row)) {
    const col = randomInt(rng, LANE_COUNT);
    empty[col] = {
      kind: 'shop',
      entityId: merchantId(row),
    };
    return empty;
  }

  const weights =
    row < TRAP_START_ROW ? EARLY_ROW_PATTERN_WEIGHTS : ROW_PATTERN_WEIGHTS;
  return recipeFromPattern(row, pickWeighted(weights, rng), rng);
}

export function isMerchantRow(row: number): boolean {
  return row >= SHOP_ROW_INTERVAL && row % SHOP_ROW_INTERVAL === 0;
}

export function emptyRow(): LaneRecipe[] {
  return Array.from({ length: LANE_COUNT }, () => ({ kind: 'empty' as const }));
}

export function monsterLane(entityId: string, enemyType: EnemyType): MonsterLaneRecipe {
  return {
    kind: 'monster',
    entityId,
    enemyType,
  };
}

export function alarmLane(row: number, col: number): TrapLaneRecipe {
  return {
    kind: 'trap',
    entityId: trapId(row, col),
    trapKind: 'alarm',
  };
}

function recipeFromPattern(row: number, pattern: RowPattern, rng: Rng): LaneRecipe[] {
  const lanes = emptyRow();

  if (pattern === 'empty') {
    return lanes;
  }

  if (pattern === 'monster') {
    place(
      lanes,
      randomInt(rng, LANE_COUNT),
      monsterLane(`monster-${row}`, pickEnemyTypeForRow(row, rng)),
    );
    return lanes;
  }

  if (pattern === 'gold' || pattern === 'potion') {
    const col = randomInt(rng, LANE_COUNT);
    place(lanes, col, {
      kind: pattern,
      entityId: collectibleId(pattern, row, col),
    });
    return lanes;
  }

  if (pattern === 'alarm') {
    const col = randomInt(rng, LANE_COUNT);
    place(lanes, col, alarmLane(row, col));
    return lanes;
  }

  const [first, second] = pickTwoDistinctCols(rng);

  if (pattern === 'monsterAndAlarm') {
    place(lanes, first, monsterLane(`monster-${row}`, pickEnemyTypeForRow(row, rng)));
    place(lanes, second, alarmLane(row, second));
    return lanes;
  }

  const lootKind: CollectibleKind = rng() < 0.5 ? 'gold' : 'potion';
  place(lanes, first, monsterLane(`monster-${row}`, pickEnemyTypeForRow(row, rng)));
  place(lanes, second, {
    kind: lootKind,
    entityId: collectibleId(lootKind, row, second),
  });
  return lanes;
}

function pickTwoDistinctCols(rng: Rng): [number, number] {
  const first = randomInt(rng, LANE_COUNT);
  let second = randomInt(rng, LANE_COUNT - 1);
  if (second >= first) {
    second += 1;
  }
  return [first, second];
}

function place(lanes: LaneRecipe[], col: number, recipe: LaneRecipe): void {
  lanes[col] = recipe;
}
