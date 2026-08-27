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
  type MoveThreatPreview,
  type PickupResult,
  type PlayerSnapshot,
  type TileSnapshot,
  type TrapSnapshot,
  emptyBoardSnapshot,
  encounterMonsterView,
  freezeReadModel,
} from './BoardSnapshot';
import { buildCharacterSheetView, type CharacterSheetView } from './characterSheet';
import {
  LANE_COUNT,
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
  isValidLevelUpAllocation,
  type LevelUpAllocation,
  type LevelUpChoiceId,
  type LevelUpResult,
  type LevelUpView,
} from './levelUp';
import {
  type AvoidanceRoll,
  type EncounterEvent,
  calculateEvadeChance,
  combatDefeatText,
  combatVictoryText,
  encounterStartText,
  findAlignedMonsterEncounters,
  previewAlignedMonsterThreats,
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
import { createRowRecipeFactory, type RowRecipeFactory } from './rowGeneration';
import {
  goldGrantAmount,
  pickupDefinition,
  potionHealAmount,
} from './definitions/pickupCatalog';
import {
  pickPickupDenomination,
  pickupDiscriminatorForText,
} from './definitions/pickupDenominations';
import { RunWorld } from './RunWorld';
import { ShopSession } from './ShopSession';
import {
  type PotionOfferId,
  type PotionPurchaseResult,
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
  /** Class id for portrait assets; empty when no run is active. */
  classId: string;
  distance: number;
  gold: number;
  attack: number;
  defence: number;
  ward?: number;
  might: number;
  finesse: number;
  vigor: number;
  will: number;
  dex: number;
  /** Baseline side-pass chance against an unaware target (matches iOS HUD EVA). */
  evade: number;
  evadeBonus?: number;
  level: number;
  experience: number;
  nextLevelExperience: number | null;
  health: number;
  maxHealth: number;
  status: string;
  /** Monotonic event identity so repeated text can still be shown once per event. */
  statusVersion?: number;
}

export interface GameStateOptions {
  playerClass?: PlayerClassId;
  rollAvoidance?: AvoidanceRoll;
  createEnemyStats?: EnemyStatsFactory;
  createRng?: () => Rng;
  createDropRng?: () => Rng;
  createEvadeRng?: () => Rng;
  createWeaponRng?: () => Rng;
  /** Seeds pickup tiers without advancing the generation stream. */
  runSeed?: number;
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
  private _statusVersion = 0;
  private _runOver = false;

  private readonly forceAvoidance: AvoidanceRoll | undefined;
  private readonly enemyExperience?: (type: EnemyType) => number;
  private readonly createRng: () => Rng;
  private readonly createDropRng: () => Rng;
  private readonly createEvadeRng: () => Rng;
  private readonly createWeaponRng: () => Rng;
  private readonly runSeed: number;
  private rng: Rng;
  private dropRng: Rng;
  private evadeRng: Rng;
  private weaponRng: Rng;

  constructor(options: GameStateOptions = {}) {
    this.runSeed =
      options.runSeed !== undefined
        ? options.runSeed >>> 0
        : (Math.random() * 0x1_0000_0000) >>> 0;
    this.world = new RunWorld(
      options.createEnemyStats ?? createEnemyStats,
      options.createRowRecipe ?? createRowRecipeFactory(this.runSeed),
    );
    this.enemyExperience = options.enemyExperience;
    this.createRng = options.createRng ?? (() => Math.random);
    this.createDropRng = options.createDropRng ?? (() => Math.random);
    this.createEvadeRng = options.createEvadeRng ?? (() => Math.random);
    this.createWeaponRng = options.createWeaponRng ?? (() => Math.random);
    this.rng = this.createRng();
    this.dropRng = this.createDropRng();
    this.evadeRng = this.createEvadeRng();
    this.weaponRng = this.createWeaponRng();
    this.forceAvoidance = options.rollAvoidance;
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

  get weaponTierIndex(): number {
    return this.shopSession.weaponTierIndexValue;
  }

  get shieldTierIndex(): number {
    return this.shopSession.shieldTierIndexValue;
  }

  get levelUpOpen(): boolean {
    return this.pendingLevelUps.length > 0;
  }

  getHudSnapshot(): HudSnapshot {
    if (!this._player) {
      return {
        className: '',
        classId: '',
        distance: 0,
        gold: 0,
        attack: 0,
        defence: 0,
        ward: 0,
        might: 0,
        finesse: 0,
        vigor: 0,
        will: 0,
        dex: 0,
        evade: 0,
        evadeBonus: 0,
        level: 1,
        experience: 0,
        nextLevelExperience: 3,
        health: 0,
        maxHealth: 0,
        status: this._status,
        statusVersion: this._statusVersion,
      };
    }
    const stats = this._player.stats;
    return {
      className: this._player.className,
      classId: this._player.classId,
      distance: this._distance,
      gold: this._player.gold,
      attack: stats.attack,
      defence: stats.defence,
      ward: stats.ward,
      might: stats.might,
      finesse: stats.finesse,
      vigor: stats.vigor,
      will: stats.will,
      dex: stats.dex,
      evade: calculateEvadeChance(stats.dex, 0, stats.evadeBonus),
      evadeBonus: stats.evadeBonus,
      level: this._player.level,
      experience: this._player.experience,
      nextLevelExperience: this._player.nextLevelExperience,
      health: stats.health,
      maxHealth: stats.maxHealth,
      status: this._status,
      statusVersion: this._statusVersion,
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
      moveThreats: this.moveThreatPreviews(),
    });
  }

  getCharacterSheetView(): CharacterSheetView | null {
    return this._player ? buildCharacterSheetView(this._player) : null;
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
      weaponAttackBonus: this._player.weaponAttackBonus,
      shieldDefenceBonus: this._player.shieldDefenceBonus,
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

  increaseStr(amount: number): number {
    return this.requirePlayer().increaseStr(amount);
  }

  increaseCon(amount: number): number {
    return this.requirePlayer().increaseCon(amount);
  }

  increaseDef(amount: number): number {
    return this.requirePlayer().increaseDef(amount);
  }

  increaseDex(amount: number): number {
    return this.requirePlayer().increaseDex(amount);
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

  canBuyWeaponTier(): boolean {
    return this.shopSession.canBuyWeaponTier(this._player);
  }

  buyWeaponTier(): ShopPurchaseResult {
    const result = this.shopSession.buyWeaponTier(this._player);
    if (this._player && this.shopSession.isOpen) {
      this.setStatus(result.status);
    }
    return result;
  }

  canBuyShieldTier(): boolean {
    return this.shopSession.canBuyShieldTier(this._player);
  }

  buyShieldTier(): ShopPurchaseResult {
    const result = this.shopSession.buyShieldTier(this._player);
    if (this._player && this.shopSession.isOpen) {
      this.setStatus(result.status);
    }
    return result;
  }

  buyPotionOffer(offerId: PotionOfferId): PotionPurchaseResult {
    const result = this.shopSession.buyPotion(this._player, offerId);
    if (this._player && this.shopSession.isOpen) {
      this.setStatus(result.status);
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
    this.setStatus('You leave the merchant behind.');
    return { row, col };
  }

  /** Close an open shop without consuming the merchant (death / restart). */
  dismissOpenShop(): void {
    this.shopSession.close();
  }

  applyEvade(target: EncounterTarget): void {
    const monster = this.requireActiveMonster(target.id);
    this.setStatus(encounterStartText({
      kind: 'evade',
      monster: encounterMonsterView(monster),
    }));
    const gain = this.requirePlayer().addExperience(Math.floor(monster.experience / 2));
    this.pendingLevelUps.push(...gain.levelsReached);
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
      undefined,
      monster.weaponVariant?.attackBonus ?? 0,
      player.weaponAttackBonus,
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
      let status = combatVictoryText(result.monsterName);
      if (drop) {
        status +=
          drop.kind === 'gold'
            ? ` It drops ${goldGrantAmount(drop.pickupId)} gold.`
            : ` It drops a ${pickupDefinition(drop.pickupId).name.toLowerCase()}.`;
      }
      this.setStatus(status);
      return {
        drop,
        experienceGained: xpGain.gained,
        levelsReached: xpGain.levelsReached,
        levelUp: this.getLevelUpView(),
      };
    }

    player.applyHealth(0);
    this._runOver = true;
    this.setStatus(combatDefeatText(result.monsterName));
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
    return buildLevelUpView(level, this._player.experience, this._player);
  }

  chooseLevelUp(choice: LevelUpChoiceId | LevelUpAllocation): LevelUpResult {
    if (this.pendingLevelUps.length === 0 || !this._player) {
      return {
        success: false,
        reason: 'noLevelUp',
        strGained: 0,
        conGained: 0,
        defGained: 0,
        dexGained: 0,
        pendingRemaining: 0,
        status: 'There is no level-up to claim.',
      };
    }

    if (typeof choice !== 'string') {
      if (isValidLevelUpAllocation(choice)) {
        const fallback = this.getLevelUpView()?.choices.find((entry) => entry.available);
        if (fallback) {
          return this.chooseLevelUp(fallback.id);
        }
      }
      return {
        success: false,
        reason: 'invalidAllocation',
        allocation: { ...choice },
        strGained: 0,
        conGained: 0,
        defGained: 0,
        dexGained: 0,
        pendingRemaining: this.pendingLevelUps.length,
        status: 'Choose one of the available level rewards.',
      };
    }

    const level = this.pendingLevelUps[0]!;
    const applied = applyLevelUpChoice(this._player, level, choice);
    if (!applied) {
      return {
        success: false,
        reason: 'invalidChoice',
        choiceId: choice,
        strGained: 0,
        conGained: 0,
        defGained: 0,
        dexGained: 0,
        pendingRemaining: this.pendingLevelUps.length,
        status: 'That level reward is unavailable.',
      };
    }
    this.pendingLevelUps.shift();
    this.setStatus(applied.status);
    return {
      success: true,
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
    this.world.populateInitial(this.rng, this.weaponRng);
  }

  private clearRunSession(): void {
    this._distance = 0;
    this.setStatus('');
    this._runOver = false;
    this.shopSession.reset();
    this.pendingLevelUps.length = 0;
    this.activeCombatTargetId = null;
  }

  private rebuildStreams(): void {
    this.rng = this.createRng();
    this.dropRng = this.createDropRng();
    this.evadeRng = this.createEvadeRng();
    this.weaponRng = this.createWeaponRng();
  }

  private setStatus(status: string): void {
    this._status = status;
    this._statusVersion += 1;
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

  private moveThreatPreviews(): MoveThreatPreview[] {
    if (!this._player) return [];
    const nextRow = this._player.row + 1;
    return this.legalMoveCols().map((col) => ({
      col,
      threats: previewAlignedMonsterThreats(
        {
          row: nextRow,
          col,
          dex: this._player!.stats.dex,
          evadeBonus: this._player!.stats.evadeBonus,
        },
        this.world.livingMonsters(),
      ),
    })).filter((preview) => preview.threats.length > 0);
  }

  private commitMove(toCol: number): MoveResult {
    const player = this.requirePlayer();
    const fromCol = player.col;
    const fromRow = player.row;
    const toRow = fromRow + 1;

    player.moveTo(toRow, toCol);
    this._distance += 1;
    this.world.prepareAhead(player.row, this.rng, this._runOver, this.weaponRng);

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
      const gained = goldGrantAmount(collectible.pickupId);
      player.addGold(gained);
      this.setStatus(`You found ${gained} gold.`);
      return {
        kind: 'gold',
        pickupId: collectible.pickupId,
        id: collectible.id,
        row: collectible.row,
        col: collectible.col,
        goldGained: gained,
        healthRestored: 0,
        alreadyFull: false,
      };
    }

    const heal = potionHealAmount(collectible.pickupId);
    const restored = player.healPotion(heal);
    this.setStatus(
      restored > 0
        ? `You drink a ${pickupDefinition(collectible.pickupId).name.toLowerCase()} and restore ${restored} HP.`
        : `You find a ${pickupDefinition(collectible.pickupId).name.toLowerCase()}, but are already at full health.`,
    );

    return {
      kind: 'potion',
      pickupId: collectible.pickupId,
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
      this.setStatus(message);
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
      this.setStatus(message);
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
    this.setStatus(message);
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
      {
        row: this._player.row,
        col: this._player.col,
        dex: this._player.stats.dex,
        evadeBonus: this._player.stats.evadeBonus,
      },
      this.world.livingMonsters(),
      this.forceAvoidance,
      this.evadeRng,
    );
    if (events.length > 0) {
      this.setStatus(events.map(encounterStartText).join(' '));
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
    this.setStatus('A travelling merchant beckons.');
    return true;
  }

  private trySpawnDefeatDrop(monster: Monster): EnemyDropResult | null {
    const kind = rollEnemyDrop(monster.definition.dropTable, this.dropRng);
    if (kind === 'none') {
      return null;
    }

    const pickupId = pickPickupDenomination(
      kind,
      monster.row,
      this.runSeed,
      pickupDiscriminatorForText(monster.id),
    );
    const collectibleId = enemyDropCollectibleId(kind, monster.id);
    this.world.createCollectibleOnTile(
      collectibleId,
      kind,
      monster.row,
      monster.col,
      pickupId,
    );

    return {
      enemyId: monster.id,
      enemyType: monster.type,
      kind,
      pickupId,
      collectibleId,
      row: monster.row,
      col: monster.col,
    };
  }
}
