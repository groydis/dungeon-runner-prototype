import {
  GOLD_AMOUNT,
  LANE_COUNT,
  POTION_HEAL,
  ROW_POOL_SIZE,
  START_ROW,
} from './config';
import {
  type CombatResult,
  type CombatLogEntry,
} from './combat';
import { type CombatStats, createCaveRatStats } from './Combatant';
import {
  createCollectible,
  type Collectible,
  type CollectibleKind,
} from './Collectible';
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
import { type Rng } from './random';
import { createRowRecipe, type LaneRecipe } from './rowGeneration';
import { createEmptyTile, createTile, type Tile } from './Tile';

export interface MoveResult {
  fromCol: number;
  toCol: number;
  fromRow: number;
  toRow: number;
  destination: Tile;
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

export interface GameStateOptions {
  rollAvoidance?: AvoidanceRoll;
  createCaveRatStats?: () => CombatStats;
  createRng?: () => Rng;
}

export class GameState {
  readonly player = new Player();
  readonly grid = new Grid();
  readonly monsters = new Map<string, Monster>();
  readonly collectibles = new Map<string, Collectible>();

  distance = 0;
  status = '';
  isAnimating = false;
  runOver = false;

  private readonly rollAvoidance: AvoidanceRoll;
  private readonly createCaveRatStats: () => CombatStats;
  private readonly createRng: () => Rng;
  private rng: Rng;
  private readonly recipes = new Map<number, LaneRecipe[]>();

  constructor(options: GameStateOptions = {}) {
    this.rollAvoidance = options.rollAvoidance ?? (() => rollAvoidance());
    this.createCaveRatStats = options.createCaveRatStats ?? createCaveRatStats;
    this.createRng = options.createRng ?? (() => Math.random);
    this.rng = this.createRng();
    this.populateInitialRows();
  }

  get playerStats(): CombatStats {
    return this.player.stats;
  }

  get gold(): number {
    return this.player.gold;
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
    const minRow = this.player.row - 2;
    this.grid.pruneBelow(minRow);
    this.pruneEntitiesBelow(minRow);
  }

  /** Commits a one-row advance. Pickups and encounters resolve after this. */
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
   * Landed-tile pickups run first, then cardinal-plus encounters.
   * A tile never holds both loot and a monster.
   */
  resolveLandedPickup(): PickupResult | null {
    const tile = this.grid.getTile(this.player.row, this.player.col);
    if (!tile || (tile.content.type !== 'gold' && tile.content.type !== 'potion')) {
      return null;
    }

    const collectible = tile.content.id
      ? this.collectibles.get(tile.content.id)
      : undefined;
    if (!collectible || collectible.collected) {
      tile.content = { type: 'empty' };
      return null;
    }

    collectible.collected = true;
    tile.content = { type: 'empty' };

    if (collectible.kind === 'gold') {
      this.player.gold += GOLD_AMOUNT;
      this.status = `You found ${GOLD_AMOUNT} gold.`;
      return {
        kind: 'gold',
        id: collectible.id,
        row: collectible.row,
        col: collectible.col,
        goldGained: GOLD_AMOUNT,
        healthRestored: 0,
        alreadyFull: false,
      };
    }

    const missing = this.player.stats.maxHealth - this.player.stats.health;
    const restored = Math.min(POTION_HEAL, Math.max(0, missing));
    this.player.stats.health += restored;
    this.status =
      restored > 0
        ? `You drink a potion and restore ${restored} HP.`
        : 'You find a potion, but are already at full health.';

    return {
      kind: 'potion',
      id: collectible.id,
      row: collectible.row,
      col: collectible.col,
      goldGained: 0,
      healthRestored: restored,
      alreadyFull: restored === 0,
    };
  }

  /**
   * After the player has advanced and any pickup is done, find monsters
   * in the cardinal plus. Leaves pickup status untouched when nothing engages.
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
    if (events.length > 0) {
      this.status = events.map(encounterStartText).join(' ');
    }
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
    this.collectibles.clear();
    this.recipes.clear();
    this.rng = this.createRng();
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

  private pruneEntitiesBelow(minRow: number): void {
    for (const [id, monster] of this.monsters) {
      if (monster.row < minRow) {
        this.monsters.delete(id);
      }
    }
    for (const [id, item] of this.collectibles) {
      if (item.row < minRow) {
        this.collectibles.delete(id);
      }
    }
    for (const row of this.recipes.keys()) {
      if (row < minRow) {
        this.recipes.delete(row);
      }
    }
  }

  private populateInitialRows(): void {
    this.grid.ensureRange(
      START_ROW,
      START_ROW + ROW_POOL_SIZE + 2,
      (row, col) => this.createTile(row, col),
    );
  }

  private recipeFor(row: number): LaneRecipe[] {
    const existing = this.recipes.get(row);
    if (existing) {
      return existing;
    }
    const recipe = createRowRecipe(row, this.rng);
    this.recipes.set(row, recipe);
    return recipe;
  }

  private createTile(row: number, col: number): Tile {
    const lane = this.recipeFor(row)[col] ?? { kind: 'empty' };

    if (lane.kind === 'monster' && lane.entityId) {
      if (!this.monsters.has(lane.entityId)) {
        this.monsters.set(
          lane.entityId,
          createMonster(
            lane.entityId,
            'Cave Rat',
            row,
            col,
            this.createCaveRatStats(),
          ),
        );
      }
      return createTile(row, col, { type: 'monster', id: lane.entityId });
    }

    if ((lane.kind === 'gold' || lane.kind === 'potion') && lane.entityId) {
      if (!this.collectibles.has(lane.entityId)) {
        this.collectibles.set(
          lane.entityId,
          createCollectible(lane.entityId, lane.kind, row, col),
        );
      }
      return createTile(row, col, { type: lane.kind, id: lane.entityId });
    }

    return createEmptyTile(row, col);
  }
}
