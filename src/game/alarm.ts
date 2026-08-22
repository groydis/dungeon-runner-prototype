import { LANE_COUNT } from './config';
import { type Monster } from './Monster';
import { type GridPosition } from './Tile';

export type AlarmConsumedKind = 'gold' | 'potion' | 'trap';

export interface VisibleRowRange {
  minRow: number;
  maxRow: number;
}

export function manhattan(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * Closest unresolved living enemy inside the logical visible window.
 * Ties: lower |dRow|, then lower |dCol|, then stable id order.
 */
export function selectClosestVisibleEnemy(
  player: GridPosition,
  monsters: Iterable<Monster>,
  visible: VisibleRowRange,
): Monster | undefined {
  const eligible: Monster[] = [];
  for (const monster of monsters) {
    if (monster.encounterResolved || monster.defeated) {
      continue;
    }
    if (monster.row < visible.minRow || monster.row > visible.maxRow) {
      continue;
    }
    eligible.push(monster);
  }

  eligible.sort((a, b) => {
    const manh = manhattan(a, player) - manhattan(b, player);
    if (manh !== 0) {
      return manh;
    }
    const rowDist =
      Math.abs(a.row - player.row) - Math.abs(b.row - player.row);
    if (rowDist !== 0) {
      return rowDist;
    }
    const colDist =
      Math.abs(a.col - player.col) - Math.abs(b.col - player.col);
    if (colDist !== 0) {
      return colDist;
    }
    return a.id.localeCompare(b.id);
  });

  return eligible[0];
}

/**
 * One cardinal step that reduces Manhattan distance.
 * Vertical toward the player is tried first; horizontal is the fallback.
 */
export function chooseEnemyAdvanceStep(
  enemy: GridPosition,
  player: GridPosition,
  isValidDestination: (row: number, col: number) => boolean,
): GridPosition | null {
  const current = manhattan(enemy, player);
  const candidates: GridPosition[] = [];

  if (enemy.row !== player.row) {
    candidates.push({
      row: enemy.row + Math.sign(player.row - enemy.row),
      col: enemy.col,
    });
  }
  if (enemy.col !== player.col) {
    candidates.push({
      row: enemy.row,
      col: enemy.col + Math.sign(player.col - enemy.col),
    });
  }

  for (const dest of candidates) {
    if (dest.col < 0 || dest.col >= LANE_COUNT) {
      continue;
    }
    if (manhattan(dest, player) >= current) {
      continue;
    }
    if (!isValidDestination(dest.row, dest.col)) {
      continue;
    }
    return dest;
  }

  return null;
}

export function alarmTrapMessage(options: {
  enemyName?: string;
  moved: boolean;
  consumed?: AlarmConsumedKind;
}): string {
  if (!options.enemyName) {
    return 'You trigger an Alarm Trap… but nothing answers.';
  }
  if (!options.moved) {
    return `Alarm Trap! The ${options.enemyName} is alerted, but cannot close in.`;
  }
  if (options.consumed === 'gold') {
    return `Alarm Trap! The ${options.enemyName} closes in and crushes the gold.`;
  }
  if (options.consumed === 'potion') {
    return `Alarm Trap! The ${options.enemyName} closes in and crushes a potion.`;
  }
  if (options.consumed === 'trap') {
    return `Alarm Trap! The ${options.enemyName} closes in and crushes an Alarm Trap.`;
  }
  return `Alarm Trap! The ${options.enemyName} closes in.`;
}
