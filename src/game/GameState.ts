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
  resolveAutomaticCombat,
} from './combat';
import { type CombatStats } from './Combatant';
import {
  createCollectible,
  type Collectible,
  type CollectibleKind,
} from './Collectible';
import {
  createEnemyStats,
  type EnemyStatsFactory,
} from './definitions/enemies';
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
import { createMerchant, type Merchant } from './Merchant';
import { createMonster, type Monster } from './Monster';
import { Player } from './Player';
import { type Rng } from './random';
import { createRowRecipe, type LaneRecipe } from './rowGeneration';
import {
  type ActiveShop,
  applyShopPurchase,
  buildShopView,
  createActiveShop,
  evaluateShopOffer,
  type ShopOfferId,
  type ShopPurchaseResult,
  type ShopView,
} from './shop';
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

export interface TurnResolution {
  pickup: PickupResult | null;
  shop: ShopView | null;
  encounters: EncounterEvent[];
}

export interface HudSnapshot {
  distance: number;
  gold: number;
  attack: number;
  health: number;
  maxHealth: number;
  status: string;
}

export interface GameStateOptions {
  rollAvoidance?: AvoidanceRoll;
  createEnemyStats?: EnemyStatsFactory;
  createRng?: () => Rng;
}

export class GameState {
  readonly player = new Player();

  private readonly grid = new Grid();
  private readonly monsters = new Map<string, Monster>();
  private readonly collectibles = new Map<string, Collectible>();
  private readonly merchants = new Map<string, Merchant>();
  private readonly recipes = new Map<number, LaneRecipe[]>();
  private activeShop: ActiveShop | null = null;

  private _distance = 0;
  private _status = '';
  private _runOver = false;

  private readonly rollAvoidance: AvoidanceRoll;
  private readonly createEnemyStats: EnemyStatsFactory;
  private readonly createRng: () => Rng;
  private rng: Rng;

  constructor(options: GameStateOptions = {}) {
    this.rollAvoidance = options.rollAvoidance ?? (() => rollAvoidance());
    this.createEnemyStats = options.createEnemyStats ?? createEnemyStats;
    this.createRng = options.createRng ?? (() => Math.random);
    this.rng = this.createRng();
    this.populateInitialRows();
  }

  get distance(): number {
    return this._distance;
  }

  get status(): string {
    return this._status;
  }

  get runOver(): boolean {
    return this._runOver;
  }

  get playerStats(): CombatStats {
    return this.player.stats;
  }

  get gold(): number {
    return this.player.gold;
  }

  get shopOpen(): boolean {
    return this.activeShop !== null;
  }

  getHudSnapshot(): HudSnapshot {
    const stats = this.player.stats;
    return {
      distance: this._distance,
      gold: this.player.gold,
      attack: stats.attack,
      health: stats.health,
      maxHealth: stats.maxHealth,
      status: this._status,
    };
  }

  getTile(row: number, col: number): Tile | undefined {
    return this.grid.getTile(row, col);
  }

  getRow(row: number): Tile[] | undefined {
    return this.grid.getRow(row);
  }

  getMonsterAt(row: number, col: number): Monster | undefined {
    const tile = this.grid.getTile(row, col);
    if (!tile || tile.content.type !== 'monster' || !tile.content.id) {
      return undefined;
    }
    return this.monsters.get(tile.content.id);
  }

  isValidLane(col: number): boolean {
    return col >= 0 && col < LANE_COUNT;
  }

  isForwardTile(row: number, col: number): boolean {
    return row === this.player.row + 1 && this.isValidLane(col);
  }

  /**
   * Game-side consequences of a finished move animation.
   * Combat is not played back here; callers still apply the ordered log.
   */
  resolveCompletedMove(toCol: number): TurnResolution {
    if (this._runOver) {
      throw new Error('Cannot move after the run is over');
    }
    if (this.activeShop) {
      throw new Error('Cannot move while a merchant shop is open');
    }
    if (!this.isValidLane(toCol)) {
      throw new Error(`Invalid lane: ${toCol}`);
    }

    this.commitMove(toCol);
    const pickup = this.resolveLandedPickup();
    this.openShopForCurrentTile();
    const encounters = this.resolveMonsterEncountersAfterMove();
    return {
      pickup,
      shop: this.getShopView(),
      encounters,
    };
  }

  getShopView(): ShopView | null {
    return buildShopView(
      this.activeShop?.merchant ?? null,
      this.player.gold,
      this.player.stats,
    );
  }

  canBuyShopOffer(offerId: ShopOfferId): boolean {
    return evaluateShopOffer(
      this.activeShop?.merchant ?? null,
      offerId,
      this.player.gold,
      this.player.stats,
    ).available;
  }

  buyShopOffer(offerId: ShopOfferId): ShopPurchaseResult {
    const merchant = this.activeShop?.merchant;
    if (!merchant) {
      return {
        success: false,
        offerId,
        reason: 'noShop',
        goldRemaining: this.player.gold,
        goldSpent: 0,
        healthRestored: 0,
        attackGained: 0,
        status: 'There is no merchant here.',
      };
    }

    const result = applyShopPurchase(
      merchant,
      offerId,
      this.player.gold,
      this.player.stats,
    );
    if (!result.success) {
      this._status = result.status;
      return result;
    }

    this.player.trySpendGold(result.goldSpent);
    this.player.heal(result.healthRestored);
    this.player.increaseAttack(result.attackGained);
    this._status = result.status;
    return result;
  }

  leaveShop(): { row: number; col: number } | null {
    const shop = this.activeShop;
    if (!shop) {
      return null;
    }

    const { row, col, id } = shop.merchant;
    shop.merchant.markUsed();
    const tile = this.grid.getTile(row, col);
    if (tile?.content.id === id) {
      tile.content = { type: 'empty' };
    }
    this.activeShop = null;
    this._status = 'You leave the merchant behind.';
    return { row, col };
  }

  /** Close an open shop without consuming the merchant (death / restart). */
  dismissOpenShop(): void {
    this.activeShop = null;
  }

  applyEvade(monster: Monster): void {
    this._status = encounterStartText({ kind: 'evade', monster });
    this.removeMonster(monster);
  }

  createCombatResult(event: EncounterEvent): CombatResult {
    if (event.kind !== 'combat') {
      throw new Error('Cannot create a combat result for an evade event');
    }

    return resolveAutomaticCombat(
      this.player.stats,
      event.monster.stats,
      event.approach,
      { id: event.monster.id, name: event.monster.name },
    );
  }

  applyCombatLogEntry(entry: CombatLogEntry, monster: Monster): void {
    if (entry.target === 'player') {
      this.player.applyHealth(entry.targetHealthAfter);
      return;
    }
    monster.applyHealth(entry.targetHealthAfter);
  }

  finishCombat(result: CombatResult, monster: Monster): void {
    this.player.applyHealth(result.playerHealthAfter);

    if (result.winner === 'player') {
      this._status = combatVictoryText(result.monsterName);
      this.removeMonster(monster);
      return;
    }

    this.player.applyHealth(0);
    this._runOver = true;
    this._status = combatDefeatText(result.monsterName);
  }

  reset(): void {
    this.player.reset();
    this._distance = 0;
    this._status = '';
    this._runOver = false;
    this.monsters.clear();
    this.collectibles.clear();
    this.merchants.clear();
    this.activeShop = null;
    this.recipes.clear();
    this.rng = this.createRng();
    this.grid.clear();
    this.populateInitialRows();
  }

  private prepareAhead(): void {
    if (this._runOver) {
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

  private commitMove(toCol: number): MoveResult {
    const fromCol = this.player.col;
    const fromRow = this.player.row;
    const toRow = fromRow + 1;

    this.player.moveTo(toRow, toCol);
    this._distance += 1;

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
   * Landed-tile pickups run first, then a shop if present, then
   * cardinal-plus encounters. A tile never holds loot, a shop, and a
   * monster together.
   */
  private resolveLandedPickup(): PickupResult | null {
    const tile = this.grid.getTile(this.player.row, this.player.col);
    if (!tile || (tile.content.type !== 'gold' && tile.content.type !== 'potion')) {
      return null;
    }

    const collectible = tile.content.id
      ? this.collectibles.get(tile.content.id)
      : undefined;
    if (!collectible || !collectible.collect()) {
      tile.content = { type: 'empty' };
      return null;
    }

    tile.content = { type: 'empty' };

    if (collectible.kind === 'gold') {
      this.player.addGold(GOLD_AMOUNT);
      this._status = `You found ${GOLD_AMOUNT} gold.`;
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

    const restored = this.player.heal(POTION_HEAL);
    this._status =
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
  private resolveMonsterEncountersAfterMove(): EncounterEvent[] {
    if (this._runOver) {
      return [];
    }

    const events = findAlignedMonsterEncounters(
      this.player,
      this.monsters.values(),
      this.rollAvoidance,
    );
    if (events.length > 0) {
      this._status = events.map(encounterStartText).join(' ');
    }
    return events;
  }

  /**
   * Shop opens after pickups and before encounters.
   * Shop rows have no other content, so encounters should not fire here.
   */
  private openShopForCurrentTile(): boolean {
    if (this._runOver || this.activeShop) {
      return false;
    }

    const tile = this.grid.getTile(this.player.row, this.player.col);
    if (!tile || tile.content.type !== 'shop' || !tile.content.id) {
      return false;
    }

    const merchant = this.merchants.get(tile.content.id);
    if (!merchant || merchant.used) {
      tile.content = { type: 'empty' };
      return false;
    }

    this.activeShop = createActiveShop(merchant);
    this._status = 'A travelling merchant beckons.';
    return true;
  }

  private removeMonster(monster: Monster): void {
    monster.resolveEncounter();
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
    for (const [id, merchant] of this.merchants) {
      if (merchant.row < minRow) {
        this.merchants.delete(id);
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

    if (lane.kind === 'monster') {
      if (!this.monsters.has(lane.entityId)) {
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
      }
      return createTile(row, col, { type: 'monster', id: lane.entityId });
    }

    if (lane.kind === 'shop') {
      if (!this.merchants.has(lane.entityId)) {
        this.merchants.set(
          lane.entityId,
          createMerchant(lane.entityId, row, col),
        );
      }
      return createTile(row, col, { type: 'shop', id: lane.entityId });
    }

    if (lane.kind === 'gold' || lane.kind === 'potion') {
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
