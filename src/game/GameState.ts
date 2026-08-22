import {
  DEMO_MONSTER_COL,
  DEMO_MONSTER_ID,
  DEMO_MONSTER_NAME,
  DEMO_MONSTER_ROW,
  LANE_COUNT,
  ROW_POOL_SIZE,
  START_ROW,
} from './config';
import {
  type AvoidanceRoll,
  type EncounterEvent,
  encounterStatusText,
  findAlignedMonsterEncounters,
  rollAvoidance,
} from './encounters';
import { Grid } from './Grid';
import { createMonster, type Monster } from './Monster';
import { Player } from './Player';
import { createEmptyTile, createTile, type Tile } from './Tile';

export interface MoveResult {
  fromCol: number;
  toCol: number;
  fromRow: number;
  toRow: number;
  destination: Tile;
}

export interface GameStateOptions {
  rollAvoidance?: AvoidanceRoll;
}

export class GameState {
  readonly player = new Player();
  readonly grid = new Grid();
  readonly monsters = new Map<string, Monster>();

  distance = 0;
  status = '';
  isAnimating = false;

  private readonly rollAvoidance: AvoidanceRoll;

  constructor(options: GameStateOptions = {}) {
    this.rollAvoidance = options.rollAvoidance ?? (() => rollAvoidance());
    this.grid.ensureRange(
      START_ROW,
      START_ROW + ROW_POOL_SIZE + 2,
      (row, col) => this.createTile(row, col),
    );
  }

  isValidLane(col: number): boolean {
    return col >= 0 && col < LANE_COUNT;
  }

  isForwardTile(row: number, col: number): boolean {
    return row === this.player.row + 1 && this.isValidLane(col);
  }

  prepareAhead(): void {
    this.grid.ensureRange(
      this.player.row,
      this.player.row + ROW_POOL_SIZE + 2,
      (row, col) => this.createTile(row, col),
    );
    this.grid.pruneBelow(this.player.row - 2);
  }

  /** Commits a one-row advance. Encounters are resolved separately after this. */
  commitMove(toCol: number): MoveResult {
    if (!this.isValidLane(toCol)) {
      throw new Error(`Invalid lane: ${toCol}`);
    }

    const fromCol = this.player.col;
    const fromRow = this.player.row;
    const toRow = fromRow + 1;

    this.player.col = toCol;
    this.player.row = toRow;
    this.distance += 1;

    this.prepareAhead();

    const destination = this.grid.getTile(toRow, toCol);
    if (!destination) {
      throw new Error(`Missing destination tile ${toRow}:${toCol}`);
    }

    return {
      fromCol,
      toCol,
      fromRow,
      toRow,
      destination,
    };
  }

  /**
   * After the player has advanced, resolve monsters in the cardinal plus around them.
   * Same lane is a guaranteed fight; an adjacent lane rolls avoidance once.
   */
  resolveMonsterEncountersAfterMove(): EncounterEvent[] {
    const events = findAlignedMonsterEncounters(
      this.player,
      this.monsters.values(),
      this.rollAvoidance,
    );

    this.status = '';
    for (const event of events) {
      this.markMonsterResolved(event.monster);
    }
    if (events.length > 0) {
      this.status = events.map(encounterStatusText).join(' ');
    }

    return events;
  }

  private markMonsterResolved(monster: Monster): void {
    monster.encounterResolved = true;
    const tile = this.grid.getTile(monster.row, monster.col);
    if (tile?.content.id === monster.id) {
      tile.content = { type: 'empty' };
    }
  }

  private createTile(row: number, col: number): Tile {
    if (row === DEMO_MONSTER_ROW && col === DEMO_MONSTER_COL) {
      const monster = createMonster(
        DEMO_MONSTER_ID,
        DEMO_MONSTER_NAME,
        row,
        col,
      );
      this.monsters.set(monster.id, monster);
      return createTile(row, col, { type: 'monster', id: monster.id });
    }
    return createEmptyTile(row, col);
  }
}
