import { type AlarmConsumedKind } from './alarm';
import { type CollectibleKind } from './Collectible';
import { type CombatStats } from './Combatant';
import {
  LANE_COUNT,
  ROW_POOL_SIZE,
  START_COL,
  START_ROW,
  TRAILING_ROW_COUNT,
} from './config';
import { type PlayerClassId, type PlayerRenderKey } from './definitions/classes';
import { type EnemyRenderKey, type EnemyType } from './definitions/enemies';
import { type PickupId } from './definitions/pickupCatalog';
import { deepFreeze, type DeepReadonly } from './freeze';
import { type GridPosition, type TileContentType } from './Tile';
import { type TrapKind } from './Trap';

export interface TileContentSnapshot {
  readonly type: TileContentType;
  readonly id?: string;
  /** Present for gold/potion tiles so rendering can pick the tier model. */
  readonly pickupId?: PickupId;
}

export interface TileMonsterView {
  readonly id: string;
  readonly type: EnemyType;
  readonly renderKey: EnemyRenderKey;
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
  readonly playerRenderKey: PlayerRenderKey | null;
  readonly legalMoveCols: readonly number[];
  readonly rows: readonly BoardRowSnapshot[];
}

export interface MonsterSnapshot {
  readonly id: string;
  readonly type: EnemyType;
  readonly name: string;
  readonly renderKey: EnemyRenderKey;
  readonly row: number;
  readonly col: number;
  readonly encounterResolved: boolean;
  readonly perception: number;
  readonly experience: number;
  readonly elite: boolean;
  readonly stats: Readonly<CombatStats>;
}

/** Frozen encounter/combat target. No domain methods or live stats. */
export interface EncounterMonsterView {
  readonly id: string;
  readonly type: EnemyType;
  readonly name: string;
  readonly row: number;
  readonly col: number;
  readonly renderKey: EnemyRenderKey;
}

export interface EncounterTarget {
  readonly id: string;
}

export interface PlayerSnapshot {
  readonly classId: PlayerClassId;
  readonly className: string;
  readonly renderKey: PlayerRenderKey;
  readonly row: number;
  readonly col: number;
  readonly gold: number;
  readonly level: number;
  readonly experience: number;
  readonly nextLevelExperience: number | null;
  readonly stats: Readonly<CombatStats>;
}

export interface CollectibleSnapshot {
  readonly id: string;
  readonly kind: CollectibleKind;
  readonly pickupId: PickupId;
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
  pickupId: PickupId;
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
  playerRenderKey?: PlayerRenderKey | null;
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
  const firstRow = originRow - TRAILING_ROW_COUNT;
  const rows: BoardRowSnapshot[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const row = firstRow + i;
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
    playerRenderKey: view.hasSelectedClass ? (view.playerRenderKey ?? null) : null,
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

export function encounterMonsterView(monster: {
  id: string;
  type: EnemyType;
  name: string;
  row: number;
  col: number;
  renderKey: EnemyRenderKey;
}): EncounterMonsterView {
  return freezeReadModel({
    id: monster.id,
    type: monster.type,
    name: monster.name,
    row: monster.row,
    col: monster.col,
    renderKey: monster.renderKey,
  });
}
