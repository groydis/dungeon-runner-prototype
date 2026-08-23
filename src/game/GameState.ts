import {
  alarmTrapMessage,
  chooseEnemyAdvanceStep,
  selectClosestVisibleEnemy,
} from './alarm';
import {
  type BoardSnapshot,
  type CollectibleSnapshot,
  type EncounterTarget,
  type MonsterSnapshot,
  type PickupResult,
  type PlayerSnapshot,
  type TileSnapshot,
  type TrapSnapshot,
  emptyBoardSnapshot,
  encounterMonsterView,
  freezeReadModel,
} from './BoardSnapshot';
import {
  GOLD_AMOUNT,
  LANE_COUNT,
  POTION_HEAL,
  gameplayVisibleRowRange,
} from './config';
import {
  type CombatResult,
  type CombatLogEntry,
  resolveAutomaticCombat,
} from './combat';
import {
  createEnemyStats,
  enemyDropCollectibleId,
  rollEnemyDrop,
  type EnemyDropResult,
  type EnemyStatsFactory,
  type EnemyType,
} from './definitions/enemies';
import {
  applyLevelUpChoice,
  buildLevelUpView,
  evaluateLevelUpChoice,
  type LevelUpChoice,
  type LevelUpResult,
  type LevelUpView,
} from './levelUp';
import {
  type AvoidanceRoll,
  type EncounterEvent,
  combatDefeatText,
  combatVictoryText,
  encounterStartText,
  findAlignedMonsterEncounters,
  rollAvoidance,
} from './encounters';
import { type Monster } from './Monster';
import {
  buildClassSelectionView,
  type ClassSelectionView,
  type PlayerClassId,
} from './definitions/classes';
import { Player } from './Player';
import { type ExperienceGain } from './progression';
import { type Rng } from './random';
import { createRowRecipe, type RowRecipeFactory } from './rowGeneration';
import { RunWorld } from './RunWorld';
import { ShopSession } from './ShopSession';
import {
  shopStatSnapshot,
  type ShopOfferId,
  type ShopProgress,
  type ShopPurchaseResult,
  type ShopView,
} from './shop';
import {
  type CombatFinishResult,
  type MoveResult,
  type TrapResolution,
  type TurnResolution,
} from './turnResults';

export type {
  BoardSnapshot,
  CollectibleSnapshot,
  EncounterMonsterView,
  EncounterTarget,
  EnemyMoveResult,
  MonsterSnapshot,
  PickupResult,
  PlayerSnapshot,
  TileSnapshot,
  TrapSnapshot,
} from './BoardSnapshot';

export type {
  CombatFinishResult,
  MoveResult,
  TrapResolution,
  TurnResolution,
} from './turnResults';

export interface HudSnapshot {
  className: string;
  distance: number;
  gold: number;
  attack: number;
  evade: number;
  level: number;
  experience: number;
  nextLevelExperience: number | null;
  health: number;
  maxHealth: number;
  status: string;
}

export interface GameStateOptions {
  playerClass?: PlayerClassId;
  rollAvoidance?: AvoidanceRoll;
  createEnemyStats?: EnemyStatsFactory;
  createRng?: () => Rng;
  createDropRng?: () => Rng;
  createEvadeRng?: () => Rng;
  createRowRecipe?: RowRecipeFactory;
  enemyExperience?: (type: EnemyType) => number;
}

export class GameState {
  private _player: Player | null = null;
  private readonly world: RunWorld;

  private readonly shopSession = new ShopSession();
  private readonly pendingLevelUps: number[] = [];
  private activeCombatTargetId: string | null = null;

  private _distance = 0;
  private _status = '';
  private _runOver = false;

  private readonly rollAvoidance: AvoidanceRoll;
  private readonly enemyExperience?: (type: EnemyType) => number;
  private readonly createRng: () => Rng;
  private readonly createDropRng: () => Rng;
  private readonly createEvadeRng: () => Rng;
  private rng: Rng;
  private dropRng: Rng;
  private evadeRng: Rng;

  constructor(options: GameStateOptions = {}) {
    this.world = new RunWorld(
      options.createEnemyStats ?? createEnemyStats,
      options.createRowRecipe ?? createRowRecipe,
    );
    this.enemyExperience = options.enemyExperience;
    this.createRng = options.createRng ?? (() => Math.random);
    this.createDropRng = options.createDropRng ?? (() => Math.random);
    this.createEvadeRng = options.createEvadeRng ?? (() => Math.random);
    this.rng = this.createRng();
    this.dropRng = this.createDropRng();
    this.evadeRng = this.createEvadeRng();
    this.rollAvoidance =
      options.rollAvoidance ??
      ((chance = 0) => rollAvoidance(chance, this.evadeRng));
    if (options.playerClass) {
      this.beginRun(options.playerClass);
    }
  }

  get hasSelectedClass(): boolean {
    return this._player !== null;
  }

  get selectedClassId(): PlayerClassId | null {
    return this._player?.classId ?? null;
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

  get gold(): number {
    return this._player?.gold ?? 0;
  }

  get shopOpen(): boolean {
    return this.shopSession.isOpen;
  }

  get hasSpecialEquipment(): boolean {
    return this.shopSession.hasSpecialEquipment;
  }

  get levelUpOpen(): boolean {
    return this.pendingLevelUps.length > 0;
  }

  getHudSnapshot(): HudSnapshot {
    if (!this._player) {
      return {
        className: '',
        distance: 0,
        gold: 0,
        attack: 0,
        evade: 0,
        level: 1,
        experience: 0,
        nextLevelExperience: 3,
        health: 0,
        maxHealth: 0,
        status: this._status,
      };
    }
    const stats = this._player.stats;
    return {
      className: this._player.className,
      distance: this._distance,
      gold: this._player.gold,
      attack: stats.attack,
      evade: this._player.evade,
      level: this._player.level,
      experience: this._player.experience,
      nextLevelExperience: this._player.nextLevelExperience,
      health: stats.health,
      maxHealth: stats.maxHealth,
      status: this._status,
    };
  }

  getBoardSnapshot(): BoardSnapshot {
    if (!this._player) {
      return emptyBoardSnapshot();
    }
    return this.world.createBoardSnapshot({
      playerRow: this._player.row,
      playerCol: this._player.col,
      hasSelectedClass: true,
      playerRenderKey: this._player.renderKey,
      legalMoveCols: this.legalMoveCols(),
    });
  }

  getPlayerSnapshot(): PlayerSnapshot | null {
    if (!this._player) {
      return null;
    }
    return freezeReadModel({
      classId: this._player.classId,
      className: this._player.className,
      renderKey: this._player.renderKey,
      row: this._player.row,
      col: this._player.col,
      gold: this._player.gold,
      level: this._player.level,
      experience: this._player.experience,
      nextLevelExperience: this._player.nextLevelExperience,
      stats: this._player.stats,
      evade: this._player.evade,
    });
  }

  addGold(amount: number): number {
    return this.requirePlayer().addGold(amount);
  }

  takeDamage(amount: number): number {
    return this.requirePlayer().takeDamage(amount);
  }

  addExperience(amount: number): ExperienceGain {
    return this.requirePlayer().addExperience(amount);
  }

  increaseAttack(amount: number): number {
    return this.requirePlayer().increaseAttack(amount);
  }

  increaseDefence(amount: number): number {
    return this.requirePlayer().increaseDefence(amount);
  }

  increaseMaxHealth(amount: number): number {
    return this.requirePlayer().increaseMaxHealth(amount);
  }

  increaseEvade(amount: number): number {
    return this.requirePlayer().increaseEvade(amount);
  }

  getClassSelectionView(): ClassSelectionView {
    return buildClassSelectionView();
  }

  selectClass(classId: PlayerClassId): void {
    this.beginRun(classId);
  }

  /** Clear the current run and return to no-class-selected. */
  clearSelectedClass(): void {
    this._player = null;
    this.clearRunSession();
    this.world.clear();
    this.rebuildStreams();
  }

  getTile(row: number, col: number): TileSnapshot | undefined {
    return this.world.snapshotTile(row, col);
  }

  getMonsterAt(row: number, col: number): MonsterSnapshot | undefined {
    return this.world.snapshotMonsterAt(row, col);
  }

  getTrapAt(row: number, col: number): TrapSnapshot | undefined {
    return this.world.snapshotTrapAt(row, col);
  }

  getCollectibleAt(row: number, col: number): CollectibleSnapshot | undefined {
    return this.world.snapshotCollectibleAt(row, col);
  }

  isValidLane(col: number): boolean {
    return col >= 0 && col < LANE_COUNT;
  }

  isForwardTile(row: number, col: number): boolean {
    if (!this._player) {
      return false;
    }
    return (
      row === this._player.row + 1 &&
      this.isValidLane(col) &&
      Math.abs(col - this._player.col) <= 1 &&
      !this.world.isOccupiedByMonster(row, col)
    );
  }

  /**
   * Game-side consequences of a finished move animation.
   * Combat is not played back here; callers still apply the ordered log.
   */
  resolveCompletedMove(toCol: number): TurnResolution {
    if (!this._player) {
      throw new Error('Cannot move before a class is selected');
    }
    if (this._runOver) {
      throw new Error('Cannot move after the run is over');
    }
    if (this.shopSession.isOpen) {
      throw new Error('Cannot move while a merchant shop is open');
    }
    if (this.levelUpOpen) {
      throw new Error('Cannot move while a level-up choice is pending');
    }
    if (!this.isValidLane(toCol)) {
      throw new Error(`Invalid lane: ${toCol}`);
    }
    if (Math.abs(toCol - this._player.col) > 1) {
      throw new Error(`Cannot jump two lanes from ${this._player.col} to ${toCol}`);
    }
    if (this.world.isOccupiedByMonster(this._player.row + 1, toCol)) {
      throw new Error('Cannot move onto an occupied enemy tile');
    }

    this.commitMove(toCol);
    const pickup = this.resolveLandedPickup();
    this.openShopForCurrentTile();
    const trap = this.shopSession.isOpen ? null : this.resolveLandedAlarmTrap();
    const encounters = this.resolveMonsterEncountersAfterMove();
    return {
      pickup,
      shop: this.getShopView(),
      trap,
      encounters,
    };
  }

  getShopView(): ShopView | null {
    return this.shopSession.getShopView(this._player);
  }

  getShopProgressSnapshot(): Readonly<ShopProgress> {
    return this.shopSession.getProgressSnapshot();
  }

  canBuyShopOffer(offerId: ShopOfferId): boolean {
    return this.shopSession.canBuyOffer(this._player, offerId);
  }

  canBuySpecialEquipment(): boolean {
    return this.shopSession.canBuySpecialEquipment(this._player);
  }

  buyShopOffer(offerId: ShopOfferId): ShopPurchaseResult {
    const result = this.shopSession.buyOffer(this._player, offerId);
    if (this._player && this.shopSession.isOpen) {
      this._status = result.status;
    }
    return result;
  }

  buySpecialEquipment(): ShopPurchaseResult {
    const result = this.shopSession.buySpecialEquipment(this._player);
    if (this._player && this.shopSession.isOpen) {
      this._status = result.status;
    }
    return result;
  }

  leaveShop(): { row: number; col: number } | null {
    const merchant = this.shopSession.merchant;
    if (!merchant) {
      return null;
    }

    const { row, col, id } = merchant;
    merchant.markUsed();
    if (this.world.tileContent(row, col)?.id === id) {
      this.world.clearContent(row, col);
    }
    this.shopSession.close();
    this._status = 'You leave the merchant behind.';
    return { row, col };
  }

  /** Close an open shop without consuming the merchant (death / restart). */
  dismissOpenShop(): void {
    this.shopSession.close();
  }

  applyEvade(target: EncounterTarget, evadeChance?: number): void {
    const monster = this.requireActiveMonster(target.id);
    this._status = encounterStartText({
      kind: 'evade',
      monster: encounterMonsterView(monster),
      evadeChance,
    });
    this.world.removeMonster(monster);
  }

  createCombatResult(event: EncounterEvent): CombatResult {
    if (this.activeCombatTargetId !== null) {
      throw new Error(
        `Cannot start combat while target ${this.activeCombatTargetId} is still active`,
      );
    }
    const player = this.requirePlayer();
    if (event.kind !== 'combat') {
      throw new Error('Cannot create a combat result for an evade event');
    }
    const monster = this.requireActiveMonster(event.monster.id);
    this.activeCombatTargetId = monster.id;

    return resolveAutomaticCombat(
      player.stats,
      monster.stats,
      event.approach,
      { id: monster.id, name: monster.name },
    );
  }

  applyCombatLogEntry(entry: CombatLogEntry, target: EncounterTarget): void {
    this.requireActiveCombatTarget(target);
    const player = this.requirePlayer();
    if (entry.target === 'player') {
      player.applyHealth(entry.targetHealthAfter);
      return;
    }
    this.requireActiveMonster(target.id).applyHealth(entry.targetHealthAfter);
  }

  finishCombat(result: CombatResult, target: EncounterTarget): CombatFinishResult {
    if (result.monsterId !== target.id) {
      throw new Error(
        `Combat result target mismatch: expected ${result.monsterId}, got ${target.id}`,
      );
    }
    this.requireActiveCombatTarget(target);
    try {
      return this.resolveFinishedCombat(result, target);
    } finally {
      this.activeCombatTargetId = null;
    }
  }

  private resolveFinishedCombat(
    result: CombatResult,
    target: EncounterTarget,
  ): CombatFinishResult {
    const player = this.requirePlayer();
    const monster = this.requireMonsterById(target.id);
    player.applyHealth(result.playerHealthAfter);

    if (result.winner === 'player') {
      const awardRewards = !monster.encounterResolved && monster.defeated;
      this.world.removeMonster(monster);
      const drop = awardRewards ? this.trySpawnDefeatDrop(monster) : null;
      const xpGain = awardRewards
        ? player.addExperience(
            this.enemyExperience?.(monster.type) ?? monster.experience,
          )
        : { gained: 0, levelsReached: [] as number[] };
      this.pendingLevelUps.push(...xpGain.levelsReached);
      this._status = combatVictoryText(result.monsterName);
      if (drop) {
        this._status +=
          drop.kind === 'gold'
            ? ` It drops ${GOLD_AMOUNT} gold.`
            : ' It drops a potion.';
      }
      return {
        drop,
        experienceGained: xpGain.gained,
        levelsReached: xpGain.levelsReached,
        levelUp: this.getLevelUpView(),
      };
    }

    player.applyHealth(0);
    this._runOver = true;
    this._status = combatDefeatText(result.monsterName);
    return {
      drop: null,
      experienceGained: 0,
      levelsReached: [],
      levelUp: null,
    };
  }

  getLevelUpView(): LevelUpView | null {
    const level = this.pendingLevelUps[0];
    if (level === undefined || !this._player) {
      return null;
    }
    return buildLevelUpView(
      level,
      this._player.experience,
      shopStatSnapshot(this._player),
    );
  }

  chooseLevelUp(choice: LevelUpChoice): LevelUpResult {
    if (this.pendingLevelUps.length === 0 || !this._player) {
      return {
        success: false,
        reason: 'noLevelUp',
        maxHealthGained: 0,
        attackGained: 0,
        defenceGained: 0,
        evadeGained: 0,
        pendingRemaining: 0,
        status: 'There is no level-up to claim.',
      };
    }

    const eligibility = evaluateLevelUpChoice(
      choice,
      shopStatSnapshot(this._player),
    );
    if (!eligibility.available) {
      return {
        success: false,
        choice,
        reason: eligibility.reason ?? 'capped',
        maxHealthGained: 0,
        attackGained: 0,
        defenceGained: 0,
        evadeGained: 0,
        pendingRemaining: this.pendingLevelUps.length,
        status: eligibility.disabledReason ?? 'That reward is unavailable.',
      };
    }

    this.pendingLevelUps.shift();
    const applied = applyLevelUpChoice(this._player, choice);
    this._status = applied.status;
    return {
      success: true,
      choice,
      ...applied,
      pendingRemaining: this.pendingLevelUps.length,
    };
  }

  /** Close pending level-ups without applying a reward (death / restart). */
  dismissLevelUp(): void {
    this.pendingLevelUps.length = 0;
  }

  reset(): void {
    if (!this._player) {
      this.clearSelectedClass();
      return;
    }
    this.beginRun(this._player.classId);
  }

  private requirePlayer(): Player {
    if (!this._player) {
      throw new Error('No class selected');
    }
    return this._player;
  }

  private requireMonsterById(id: string): Monster {
    const monster = this.world.monsterById(id);
    if (!monster) {
      throw new Error(`Unknown encounter target: ${id}`);
    }
    return monster;
  }

  private requireActiveMonster(id: string): Monster {
    const monster = this.requireMonsterById(id);
    if (monster.encounterResolved) {
      throw new Error(`Encounter target is no longer active: ${id}`);
    }
    return monster;
  }

  private requireActiveCombatTarget(target: EncounterTarget): void {
    if (this.activeCombatTargetId === null) {
      throw new Error(`No active combat for target: ${target.id}`);
    }
    if (this.activeCombatTargetId !== target.id) {
      throw new Error(
        `Active combat target mismatch: expected ${this.activeCombatTargetId}, got ${target.id}`,
      );
    }
  }

  private beginRun(classId: PlayerClassId): void {
    this._player = new Player(classId);
    this.clearRunSession();
    this.world.clear();
    this.rebuildStreams();
    this.world.populateInitial(this.rng);
  }

  private clearRunSession(): void {
    this._distance = 0;
    this._status = '';
    this._runOver = false;
    this.shopSession.reset();
    this.pendingLevelUps.length = 0;
    this.activeCombatTargetId = null;
  }

  private rebuildStreams(): void {
    this.rng = this.createRng();
    this.dropRng = this.createDropRng();
    this.evadeRng = this.createEvadeRng();
  }

  private legalMoveCols(): number[] {
    if (!this._player) {
      return [];
    }
    const cols: number[] = [];
    const row = this._player.row + 1;
    for (let col = 0; col < LANE_COUNT; col += 1) {
      if (this.isForwardTile(row, col)) {
        cols.push(col);
      }
    }
    return cols;
  }

  private commitMove(toCol: number): MoveResult {
    const player = this.requirePlayer();
    const fromCol = player.col;
    const fromRow = player.row;
    const toRow = fromRow + 1;

    player.moveTo(toRow, toCol);
    this._distance += 1;
    this.world.prepareAhead(player.row, this.rng, this._runOver);

    const destination = this.world.snapshotTile(toRow, toCol);
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
   * Landed-tile pickups run first, then a shop if present, then an
   * Alarm Trap (which may advance one enemy), then cardinal-plus
   * encounters. A tile never holds loot, a shop, a trap, and a monster
   * together.
   */
  private resolveLandedPickup(): PickupResult | null {
    const player = this.requirePlayer();
    const content = this.world.tileContent(player.row, player.col);
    if (!content || (content.type !== 'gold' && content.type !== 'potion')) {
      return null;
    }

    const collectible = this.world.collectibleAt(player.row, player.col);
    if (!collectible || !collectible.collect()) {
      this.world.clearContent(player.row, player.col);
      return null;
    }

    this.world.clearContent(player.row, player.col);

    if (collectible.kind === 'gold') {
      player.addGold(GOLD_AMOUNT);
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

    const restored = player.heal(POTION_HEAL);
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
   * After pickups and an optional shop, a landed Alarm Trap pulls the
   * closest visible enemy one legal cardinal tile toward the player.
   */
  private resolveLandedAlarmTrap(): TrapResolution | null {
    if (this._runOver || this.shopSession.isOpen || !this._player) {
      return null;
    }

    const content = this.world.tileContent(this._player.row, this._player.col);
    if (!content || content.type !== 'trap' || !content.id) {
      return null;
    }

    const trap = this.world.trapAt(this._player.row, this._player.col);
    if (!trap || !trap.trigger()) {
      this.world.clearContent(this._player.row, this._player.col);
      return null;
    }

    this.world.clearContent(this._player.row, this._player.col);

    const enemy = selectClosestVisibleEnemy(
      this._player,
      this.world.livingMonsters(),
      gameplayVisibleRowRange(this._player.row),
    );
    if (!enemy) {
      const message = alarmTrapMessage({ moved: false });
      this._status = message;
      return {
        trapId: trap.id,
        kind: trap.kind,
        message,
      };
    }

    const from = { row: enemy.row, col: enemy.col };
    const dest = chooseEnemyAdvanceStep(from, this._player, (row, col) =>
      this.world.isValidEnemyDestination(row, col, enemy.id),
    );
    if (!dest) {
      const message = alarmTrapMessage({ enemyName: enemy.name, moved: false });
      this._status = message;
      return {
        trapId: trap.id,
        kind: trap.kind,
        message,
      };
    }

    const consumed = this.world.moveMonster(enemy, dest);
    const message = alarmTrapMessage({
      enemyName: enemy.name,
      moved: true,
      consumed,
    });
    this._status = message;
    return {
      trapId: trap.id,
      kind: trap.kind,
      enemyMove: {
        enemyId: enemy.id,
        from,
        to: dest,
        consumed,
      },
      message,
    };
  }

  /**
   * After the player has advanced and any pickup / trap is done, find
   * monsters in the cardinal plus. Leaves prior status untouched when
   * nothing engages.
   */
  private resolveMonsterEncountersAfterMove(): EncounterEvent[] {
    if (this._runOver || !this._player) {
      return [];
    }

    const events = findAlignedMonsterEncounters(
      this._player,
      this.world.livingMonsters(),
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
    if (this._runOver || this.shopSession.isOpen || !this._player) {
      return false;
    }

    const merchant = this.world.merchantAt(this._player.row, this._player.col);
    if (!merchant) {
      return false;
    }
    if (merchant.used) {
      this.world.clearContent(merchant.row, merchant.col);
      return false;
    }

    this.shopSession.open(merchant);
    this._status = 'A travelling merchant beckons.';
    return true;
  }

  private trySpawnDefeatDrop(monster: Monster): EnemyDropResult | null {
    const kind = rollEnemyDrop(monster.definition.dropTable, this.dropRng);
    if (kind === 'none') {
      return null;
    }

    const collectibleId = enemyDropCollectibleId(kind, monster.id);
    this.world.createCollectibleOnTile(
      collectibleId,
      kind,
      monster.row,
      monster.col,
    );

    return {
      enemyId: monster.id,
      enemyType: monster.type,
      kind,
      collectibleId,
      row: monster.row,
      col: monster.col,
    };
  }
}
