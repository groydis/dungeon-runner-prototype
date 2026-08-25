import { type AlarmConsumedKind } from './alarm';
import {
  createBoardSnapshotFromTiles,
  freezeReadModel,
  type BoardSnapshot,
  type BoardViewInput,
  type CollectibleSnapshot,
  type MonsterSnapshot,
  type TileSnapshot,
  type TrapSnapshot,
} from './BoardSnapshot';
import {
  createCollectible,
  type Collectible,
} from './Collectible';
import { createCombatStats } from './Combatant';
import { LANE_COUNT, ROW_POOL_SIZE, START_ROW } from './config';
import {
  type EnemyStatsFactory,
  type EnemyType,
} from './definitions/enemies';
import { type PickupId } from './definitions/pickupCatalog';
import { Grid } from './Grid';
import { createMerchant, type Merchant } from './Merchant';
import { createMonster, type Monster } from './Monster';
import { type Rng } from './random';
import {
  monsterLane,
  type LaneRecipe,
  type RowRecipeFactory,
} from './rowGeneration';
import {
  createEmptyTile,
  createTile,
  type GridPosition,
  type Tile,
  type TileContent,
} from './Tile';
import { createTrap, type Trap } from './Trap';

/** Mutable board, recipes, and entity maps for one run. */
export class RunWorld {
  private readonly grid = new Grid();
  private readonly monsters = new Map<string, Monster>();
  private readonly collectibles = new Map<string, Collectible>();
  private readonly merchants = new Map<string, Merchant>();
  private readonly traps = new Map<string, Trap>();
  private readonly recipes = new Map<number, LaneRecipe[]>();

  constructor(
    private readonly createEnemyStats: EnemyStatsFactory,
    private readonly createRowRecipe: RowRecipeFactory,
  ) {}

  clear(): void {
    this.monsters.clear();
    this.collectibles.clear();
    this.merchants.clear();
    this.traps.clear();
    this.recipes.clear();
    this.grid.clear();
  }

  populateInitial(rng: Rng): void {
    this.grid.ensureRange(
      START_ROW,
      START_ROW + ROW_POOL_SIZE + 2,
      (row, col) => this.materializeTile(row, col, rng),
    );
  }

  prepareAhead(playerRow: number, rng: Rng, runOver: boolean): void {
    if (runOver) {
      return;
    }
    this.grid.ensureRange(
      playerRow,
      playerRow + ROW_POOL_SIZE + 2,
      (row, col) => this.materializeTile(row, col, rng),
    );
    const minRow = playerRow - 2;
    this.grid.pruneBelow(minRow);
    this.pruneEntitiesBelow(minRow);
  }

  isValidLane(col: number): boolean {
    return col >= 0 && col < LANE_COUNT;
  }

  tileContent(row: number, col: number): Readonly<TileContent> | undefined {
    const tile = this.grid.getTile(row, col);
    return tile ? { type: tile.content.type, id: tile.content.id } : undefined;
  }

  hasTile(row: number, col: number): boolean {
    return this.grid.getTile(row, col) !== undefined;
  }

  livingMonsters(): Iterable<Monster> {
    return this.monsters.values();
  }

  monsterById(id: string): Monster | undefined {
    return this.monsters.get(id);
  }

  monsterAt(row: number, col: number): Monster | undefined {
    const tile = this.grid.getTile(row, col);
    if (!tile || tile.content.type !== 'monster' || !tile.content.id) {
      return undefined;
    }
    return this.monsters.get(tile.content.id);
  }

  trapAt(row: number, col: number): Trap | undefined {
    const tile = this.grid.getTile(row, col);
    if (!tile || tile.content.type !== 'trap' || !tile.content.id) {
      return undefined;
    }
    return this.traps.get(tile.content.id);
  }

  collectibleAt(row: number, col: number): Collectible | undefined {
    const tile = this.grid.getTile(row, col);
    if (
      !tile ||
      (tile.content.type !== 'gold' && tile.content.type !== 'potion') ||
      !tile.content.id
    ) {
      return undefined;
    }
    return this.collectibles.get(tile.content.id);
  }

  merchantAt(row: number, col: number): Merchant | undefined {
    const tile = this.grid.getTile(row, col);
    if (!tile || tile.content.type !== 'shop' || !tile.content.id) {
      return undefined;
    }
    return this.merchants.get(tile.content.id);
  }

  isOccupiedByMonster(row: number, col: number): boolean {
    const monster = this.monsterAt(row, col);
    return Boolean(monster && !monster.encounterResolved);
  }

  isValidEnemyDestination(row: number, col: number, movingId: string): boolean {
    if (!this.isValidLane(col)) {
      return false;
    }
    const tile = this.grid.getTile(row, col);
    if (!tile) {
      return false;
    }
    if (tile.content.type === 'shop') {
      return false;
    }
    if (tile.content.type === 'monster') {
      return tile.content.id === movingId;
    }
    return (
      tile.content.type === 'empty' ||
      tile.content.type === 'gold' ||
      tile.content.type === 'potion' ||
      tile.content.type === 'trap'
    );
  }

  clearContent(row: number, col: number): void {
    const tile = this.grid.getTile(row, col);
    if (!tile) {
      return;
    }
    this.writeLaneRecipe(row, col, { kind: 'empty' });
    tile.content = { type: 'empty' };
  }

  removeMonster(monster: Monster): void {
    monster.resolveEncounter();
    const tile = this.grid.getTile(monster.row, monster.col);
    if (tile?.content.id === monster.id) {
      this.clearContent(monster.row, monster.col);
    }
  }

  moveMonster(monster: Monster, dest: GridPosition): AlarmConsumedKind | undefined {
    const fromTile = this.grid.getTile(monster.row, monster.col);
    if (fromTile?.content.id === monster.id) {
      this.clearContent(monster.row, monster.col);
    }

    const destTile = this.grid.getTile(dest.row, dest.col);
    if (!destTile) {
      throw new Error(`Missing enemy destination tile ${dest.row}:${dest.col}`);
    }

    const consumed = this.consumeBlockingContent(destTile);
    monster.moveTo(dest.row, dest.col);
    destTile.content = { type: 'monster', id: monster.id };
    this.writeLaneRecipe(dest.row, dest.col, monsterLane(monster.id, monster.type));
    return consumed;
  }

  placeCollectible(collectible: Collectible): void {
    this.collectibles.set(collectible.id, collectible);
    const tile = this.grid.getTile(collectible.row, collectible.col);
    if (!tile) {
      return;
    }
    tile.content = { type: collectible.kind, id: collectible.id };
    this.writeLaneRecipe(collectible.row, collectible.col, {
      kind: collectible.kind,
      entityId: collectible.id,
      pickupId: collectible.pickupId,
    });
  }

  createCollectibleOnTile(
    id: string,
    kind: 'gold' | 'potion',
    row: number,
    col: number,
    pickupId?: PickupId,
  ): Collectible {
    const collectible = createCollectible(id, kind, row, col, pickupId);
    this.placeCollectible(collectible);
    return collectible;
  }

  snapshotTile(row: number, col: number): TileSnapshot | undefined {
    const tile = this.grid.getTile(row, col);
    if (!tile) {
      return undefined;
    }
    return freezeReadModel(this.toTileSnapshot(tile));
  }

  snapshotMonsterAt(row: number, col: number): MonsterSnapshot | undefined {
    const monster = this.monsterAt(row, col);
    if (!monster) {
      return undefined;
    }
    return freezeReadModel({
      id: monster.id,
      type: monster.type,
      name: monster.name,
      renderKey: monster.renderKey,
      row: monster.row,
      col: monster.col,
      encounterResolved: monster.encounterResolved,
      perception: monster.perception,
      experience: monster.experience,
      elite: monster.elite,
      stats: createCombatStats(monster.stats),
    });
  }

  snapshotTrapAt(row: number, col: number): TrapSnapshot | undefined {
    const trap = this.trapAt(row, col);
    if (!trap) {
      return undefined;
    }
    return freezeReadModel({
      id: trap.id,
      kind: trap.kind,
      row: trap.row,
      col: trap.col,
      triggered: trap.triggered,
    });
  }

  snapshotCollectibleAt(row: number, col: number): CollectibleSnapshot | undefined {
    const item = this.collectibleAt(row, col);
    if (!item) {
      return undefined;
    }
    return freezeReadModel({
      id: item.id,
      kind: item.kind,
      pickupId: item.pickupId,
      row: item.row,
      col: item.col,
      collected: item.collected,
    });
  }

  createBoardSnapshot(view: BoardViewInput): BoardSnapshot {
    return createBoardSnapshotFromTiles(view, (row, col) => this.snapshotTile(row, col));
  }

  private toTileSnapshot(tile: Tile): TileSnapshot {
    const collectible =
      tile.content.type === 'gold' || tile.content.type === 'potion'
        ? this.collectibles.get(tile.content.id ?? '')
        : undefined;
    const content: TileSnapshot['content'] = {
      type: tile.content.type,
      ...(tile.content.id ? { id: tile.content.id } : {}),
      ...(collectible ? { pickupId: collectible.pickupId } : {}),
    };
    const occupant = this.monsterAt(tile.row, tile.col);
    return {
      row: tile.row,
      col: tile.col,
      content,
      ...(occupant
        ? {
            monster: {
              id: occupant.id,
              type: occupant.type as EnemyType,
              renderKey: occupant.renderKey,
            },
          }
        : {}),
    };
  }

  private consumeBlockingContent(tile: Tile): AlarmConsumedKind | undefined {
    if (tile.content.type === 'gold' || tile.content.type === 'potion') {
      const item = tile.content.id
        ? this.collectibles.get(tile.content.id)
        : undefined;
      item?.collect();
      const kind = tile.content.type;
      this.clearContent(tile.row, tile.col);
      return kind;
    }

    if (tile.content.type === 'trap') {
      const trap = tile.content.id ? this.traps.get(tile.content.id) : undefined;
      trap?.trigger();
      this.clearContent(tile.row, tile.col);
      return 'trap';
    }

    return undefined;
  }

  private writeLaneRecipe(row: number, col: number, recipe: LaneRecipe): void {
    const lanes = this.recipes.get(row);
    if (!lanes || col < 0 || col >= lanes.length) {
      return;
    }
    lanes[col] = recipe;
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
    for (const [id, merchant] of this.merchants) {
      if (merchant.row < minRow) {
        this.merchants.delete(id);
      }
    }
    for (const [id, trap] of this.traps) {
      if (trap.row < minRow) {
        this.traps.delete(id);
      }
    }
    for (const row of this.recipes.keys()) {
      if (row < minRow) {
        this.recipes.delete(row);
      }
    }
  }

  private recipeFor(row: number, rng: Rng): LaneRecipe[] {
    const existing = this.recipes.get(row);
    if (existing) {
      return existing;
    }
    const recipe = this.createRowRecipe(row, rng).map((lane) => ({ ...lane }));
    this.recipes.set(row, recipe);
    return recipe;
  }

  private materializeTile(row: number, col: number, rng: Rng): Tile {
    const lane = this.recipeFor(row, rng)[col] ?? { kind: 'empty' };

    if (lane.kind === 'monster') {
      const existing = this.monsters.get(lane.entityId);
      if (existing) {
        if (
          existing.row === row &&
          existing.col === col &&
          !existing.encounterResolved
        ) {
          return createTile(row, col, { type: 'monster', id: lane.entityId });
        }
        return createEmptyTile(row, col);
      }
      this.monsters.set(
        lane.entityId,
        createMonster(
          lane.entityId,
          lane.enemyType,
          row,
          col,
          this.createEnemyStats(lane.enemyType),
        ),
      );
      return createTile(row, col, { type: 'monster', id: lane.entityId });
    }

    if (lane.kind === 'shop') {
      if (!this.merchants.has(lane.entityId)) {
        this.merchants.set(lane.entityId, createMerchant(lane.entityId, row, col));
      }
      return createTile(row, col, { type: 'shop', id: lane.entityId });
    }

    if (lane.kind === 'trap') {
      const existing = this.traps.get(lane.entityId);
      if (existing?.triggered) {
        return createEmptyTile(row, col);
      }
      if (!existing) {
        this.traps.set(
          lane.entityId,
          createTrap(lane.entityId, lane.trapKind, row, col),
        );
      }
      return createTile(row, col, { type: 'trap', id: lane.entityId });
    }

    if (lane.kind === 'gold' || lane.kind === 'potion') {
      const existing = this.collectibles.get(lane.entityId);
      if (existing?.collected) {
        return createEmptyTile(row, col);
      }
      if (!existing) {
        this.collectibles.set(
          lane.entityId,
          createCollectible(lane.entityId, lane.kind, row, col, lane.pickupId),
        );
      }
      return createTile(row, col, { type: lane.kind, id: lane.entityId });
    }

    return createEmptyTile(row, col);
  }
}
