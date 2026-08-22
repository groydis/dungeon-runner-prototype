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
  type CombatResult,
  type CombatLogEntry,
} from './combat';
import { type CombatStats, createCaveRatStats } from './Combatant';
import {
  type AvoidanceRoll,
  type EncounterEvent,
  combatDefeatText,
  combatVictoryText,
  encounterStartText,
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
  createCaveRatStats?: () => CombatStats;
}

export class GameState {
  readonly player = new Player();
  readonly grid = new Grid();
  readonly monsters = new Map<string, Monster>();

  distance = 0;
  status = '';
  isAnimating = false;
  runOver = false;

  private readonly rollAvoidance: AvoidanceRoll;
  private readonly createCaveRatStats: () => CombatStats;

  constructor(options: GameStateOptions = {}) {
    this.rollAvoidance = options.rollAvoidance ?? (() => rollAvoidance());
    this.createCaveRatStats = options.createCaveRatStats ?? createCaveRatStats;
    this.populateInitialRows();
  }

  get playerStats(): CombatStats {
    return this.player.stats;
  }

  isValidLane(col: number): boolean {
    return col >= 0 && col < LANE_COUNT;
  }

  isForwardTile(row: number, col: number): boolean {
    return row === this.player.row + 1 && this.isValidLane(col);
  }

  prepareAhead(): void {
    if (this.runOver) {
      return;
    }
    this.grid.ensureRange(
      this.player.row,
      this.player.row + ROW_POOL_SIZE + 2,
      (row, col) => this.createTile(row, col),
    );
    this.grid.pruneBelow(this.player.row - 2);
  }

  /** Commits a one-row advance. Encounters are resolved separately after this. */
  commitMove(toCol: number): MoveResult {
    if (this.runOver) {
      throw new Error('Cannot move after the run is over');
    }
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
   * After the player has advanced, find monsters in the cardinal plus.
   * Evade/combat application happens after this so combat can play back a log.
   */
  resolveMonsterEncountersAfterMove(): EncounterEvent[] {
    if (this.runOver) {
      return [];
    }

    const events = findAlignedMonsterEncounters(
      this.player,
      this.monsters.values(),
      this.rollAvoidance,
    );
    this.status = events.length > 0 ? events.map(encounterStartText).join(' ') : '';
    return events;
  }

  applyEvade(monster: Monster): void {
    this.status = encounterStartText({ kind: 'evade', monster });
    this.removeMonster(monster);
  }

  applyCombatLogEntry(entry: CombatLogEntry, monster: Monster): void {
    if (entry.target === 'player') {
      this.player.stats.health = entry.targetHealthAfter;
      return;
    }
    monster.stats.health = entry.targetHealthAfter;
  }

  finishCombat(result: CombatResult, monster: Monster): void {
    this.player.stats.health = result.playerHealthAfter;

    if (result.winner === 'player') {
      this.status = combatVictoryText(result.monsterName);
      this.removeMonster(monster);
      return;
    }

    this.player.stats.health = 0;
    this.runOver = true;
    this.status = combatDefeatText(result.monsterName);
  }

  reset(): void {
    this.player.reset();
    this.distance = 0;
    this.status = '';
    this.isAnimating = false;
    this.runOver = false;
    this.monsters.clear();
    this.grid.clear();
    this.populateInitialRows();
  }

  private removeMonster(monster: Monster): void {
    monster.encounterResolved = true;
    const tile = this.grid.getTile(monster.row, monster.col);
    if (tile?.content.id === monster.id) {
      tile.content = { type: 'empty' };
    }
  }

  private populateInitialRows(): void {
    this.grid.ensureRange(
      START_ROW,
      START_ROW + ROW_POOL_SIZE + 2,
      (row, col) => this.createTile(row, col),
    );
  }

  private createTile(row: number, col: number): Tile {
    if (row === DEMO_MONSTER_ROW && col === DEMO_MONSTER_COL) {
      const monster = createMonster(
        DEMO_MONSTER_ID,
        DEMO_MONSTER_NAME,
        row,
        col,
        this.createCaveRatStats(),
      );
      this.monsters.set(monster.id, monster);
      return createTile(row, col, { type: 'monster', id: monster.id });
    }
    return createEmptyTile(row, col);
  }
}
