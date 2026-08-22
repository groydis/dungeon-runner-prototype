import { type AlarmConsumedKind } from './alarm';
import { type CollectibleKind } from './Collectible';
import { type CombatStats } from './Combatant';
import { LANE_COUNT, ROW_POOL_SIZE, START_COL, START_ROW } from './config';
import { type EnemyType } from './definitions/enemies';
import { deepFreeze, type DeepReadonly } from './freeze';
import { type GridPosition, type TileContentType } from './Tile';
import { type TrapKind } from './Trap';

export interface TileContentSnapshot {
  readonly type: TileContentType;
  readonly id?: string;
}

export interface TileMonsterView {
  readonly id: string;
  readonly type: EnemyType;
  readonly renderKey: string;
}

export interface TileSnapshot {
  readonly row: number;
  readonly col: number;
  readonly content: TileContentSnapshot;
  readonly monster?: TileMonsterView;
}

export interface BoardRowSnapshot {
  readonly row: number;
  readonly tiles: readonly TileSnapshot[];
}

export interface BoardSnapshot {
  readonly playerRow: number;
  readonly playerCol: number;
  readonly originRow: number;
  readonly originCol: number;
  readonly hasSelectedClass: boolean;
  readonly legalMoveCols: readonly number[];
  readonly rows: readonly BoardRowSnapshot[];
}

export interface MonsterSnapshot {
  readonly id: string;
  readonly type: EnemyType;
  readonly name: string;
  readonly renderKey: string;
  readonly row: number;
  readonly col: number;
  readonly encounterResolved: boolean;
  readonly perception: number;
  readonly experience: number;
  readonly stats: Readonly<CombatStats>;
}

export interface CollectibleSnapshot {
  readonly id: string;
  readonly kind: CollectibleKind;
  readonly row: number;
  readonly col: number;
  readonly collected: boolean;
}

export interface TrapSnapshot {
  readonly id: string;
  readonly kind: TrapKind;
  readonly row: number;
  readonly col: number;
  readonly triggered: boolean;
}

export interface PickupResult {
  kind: CollectibleKind;
  id: string;
  row: number;
  col: number;
  goldGained: number;
  healthRestored: number;
  alreadyFull: boolean;
}

export interface EnemyMoveResult {
  enemyId: string;
  from: GridPosition;
  to: GridPosition;
  consumed?: AlarmConsumedKind;
}

export interface BoardViewInput {
  playerRow: number;
  playerCol: number;
  hasSelectedClass: boolean;
  legalMoveCols: readonly number[];
  rowCount?: number;
}

export function emptyBoardSnapshot(): BoardSnapshot {
  return createBoardSnapshotFromTiles(
    {
      playerRow: START_ROW,
      playerCol: START_COL,
      hasSelectedClass: false,
      legalMoveCols: [],
    },
    () => undefined,
  );
}

export function createBoardSnapshotFromTiles(
  view: BoardViewInput,
  tileAt: (row: number, col: number) => TileSnapshot | undefined,
): BoardSnapshot {
  const originRow = view.hasSelectedClass ? view.playerRow : START_ROW;
  const originCol = view.hasSelectedClass ? view.playerCol : START_COL;
  const rowCount = view.rowCount ?? ROW_POOL_SIZE;
  const rows: BoardRowSnapshot[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const row = originRow + i;
    const tiles: TileSnapshot[] = [];
    for (let col = 0; col < LANE_COUNT; col += 1) {
      tiles.push(
        tileAt(row, col) ?? {
          row,
          col,
          content: { type: 'empty' },
        },
      );
    }
    rows.push({ row, tiles });
  }

  return deepFreeze({
    playerRow: view.hasSelectedClass ? view.playerRow : START_ROW,
    playerCol: view.hasSelectedClass ? view.playerCol : START_COL,
    originRow,
    originCol,
    hasSelectedClass: view.hasSelectedClass,
    legalMoveCols: [...view.legalMoveCols],
    rows,
  });
}

export function tileAt(
  snapshot: BoardSnapshot,
  row: number,
  col: number,
): TileSnapshot | undefined {
  return snapshot.rows.find((entry) => entry.row === row)?.tiles[col];
}

export function snapshotContentType(
  snapshot: BoardSnapshot,
  row: number,
  col: number,
): TileContentType | undefined {
  return tileAt(snapshot, row, col)?.content.type;
}

export function freezeReadModel<T>(value: T): DeepReadonly<T> {
  return deepFreeze(value);
}
