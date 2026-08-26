import {
  COMBAT_HIT_SEC,
  DROP_SPAWN_FX_SEC,
  ENCOUNTER_FX_SEC,
  ENEMY_ADVANCE_FX_SEC,
  MOVE_DURATION_SEC,
  TILE_PITCH,
  TRAP_FX_SEC,
  evadeDurationSec,
  fleeHopCount,
  laneWorldX,
} from './config';
import { type CombatResult } from './combat';
import {
  type EncounterEvent,
  avoidanceOverrideFromSearch,
} from './encounters';
import {
  PLAYER_CLASS_IDS,
  type PlayerClassId,
} from './definitions/classes';
import { enemyStatsFactoryFromSearch } from './definitions/enemies';
import { GameState } from './GameState';
import { type EncounterMonsterView } from './BoardSnapshot';
import {
  isBoardInteractive,
  type PresentationPhase,
} from './presentationPhase';
import {
  dropRngFactoryFromSearch,
  evadeRngFactoryFromSearch,
  rngFactoryFromSearch,
  seedFromSearch,
  weaponRngFactoryFromSearch,
} from './random';
import { InputController, type TilePick } from './InputController';
import {
  POTION_OFFER_IDS,
  type PotionOfferId,
} from './shop';
import { CameraController } from '../rendering/CameraController';
import { ClassSelectionPreview } from '../rendering/ClassSelectionPreview';
import { EquipmentShopPreview } from '../rendering/EquipmentShopPreview';
import { MerchantShopPreview } from '../rendering/MerchantShopPreview';
import { PotionShopPreview } from '../rendering/PotionShopPreview';
import {
  preloadCharacterSelectionBackgroundAssets,
  preloadClassGameplayAssets,
} from '../rendering/preloadAssets';
import { SceneManager } from '../rendering/SceneManager';
import { reportRunDeath } from '../telemetry/runDeath';
import { ClassSelectionView } from '../ui/ClassSelectionView';
import { GameOverView } from '../ui/GameOverView';
import { HudView } from '../ui/HudView';
import { LevelUpOverlayView } from '../ui/LevelUpOverlayView';
import { ShopOverlayView } from '../ui/ShopOverlayView';

export class Game {
  private readonly state = new GameState({
    rollAvoidance: avoidanceOverrideFromSearch(window.location.search),
    createEnemyStats: enemyStatsFactoryFromSearch(window.location.search),
    createRng: rngFactoryFromSearch(window.location.search),
    createDropRng: dropRngFactoryFromSearch(window.location.search),
    createEvadeRng: evadeRngFactoryFromSearch(window.location.search),
    createWeaponRng: weaponRngFactoryFromSearch(window.location.search),
    runSeed: seedFromSearch(window.location.search),
  });
  private readonly camera: CameraController;
  private readonly scene: SceneManager;
  private readonly input: InputController;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: HudView;
  private readonly gameOver: GameOverView;
  private readonly shop: ShopOverlayView;
  private readonly merchantShopPreview: MerchantShopPreview;
  private readonly equipmentShopPreview: EquipmentShopPreview;
  private readonly potionShopPreview: PotionShopPreview;
  private readonly levelUp: LevelUpOverlayView;
  private readonly classSelect: ClassSelectionView;
  private readonly classSelectionPreview: ClassSelectionPreview;
  private readonly resizeObserver: ResizeObserver;

  private phase: PresentationPhase = { kind: 'classSelection' };
  private pendingEvents: EncounterEvent[] = [];
  private presentationGeneration = 0;
  private lastTimeMs = 0;
  private running = false;
  private deathReported = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new CameraController();
    this.scene = new SceneManager(canvas);
    this.input = new InputController(
      canvas,
      this.camera.camera,
      () => this.scene.getSelectableMeshes(),
      (tile) => this.tryMove(tile),
    );

    this.hud = new HudView();
    this.gameOver = new GameOverView();
    this.shop = new ShopOverlayView();
    const merchantPreviewCanvas =
      document.querySelector<HTMLCanvasElement>('#shop-merchant-preview');
    if (!merchantPreviewCanvas) {
      throw new Error('Missing required element: #shop-merchant-preview');
    }
    this.merchantShopPreview = new MerchantShopPreview(merchantPreviewCanvas);
    const equipmentPreviewCanvas =
      document.querySelector<HTMLCanvasElement>('#shop-weapon-preview');
    if (!equipmentPreviewCanvas) {
      throw new Error('Missing required element: #shop-weapon-preview');
    }
    this.equipmentShopPreview = new EquipmentShopPreview(
      equipmentPreviewCanvas,
    );
    const potionCanvases = Object.fromEntries(
      POTION_OFFER_IDS.map((offerId) => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          `#shop-potion-preview-${offerId}`,
        );
        if (!canvas) {
          throw new Error(
            `Missing required element: #shop-potion-preview-${offerId}`,
          );
        }
        return [offerId, canvas];
      }),
    ) as Record<PotionOfferId, HTMLCanvasElement>;
    this.potionShopPreview = new PotionShopPreview(potionCanvases);
    this.levelUp = new LevelUpOverlayView();
    const classPreviewCanvas =
      document.querySelector<HTMLCanvasElement>('#class-model-preview');
    if (!classPreviewCanvas) {
      throw new Error('Missing required element: #class-model-preview');
    }
    this.classSelectionPreview = new ClassSelectionPreview(classPreviewCanvas);
    this.classSelect = new ClassSelectionView();
    this.classSelect.onChange((classId) => {
      this.classSelectionPreview.setClassId(classId);
      void preloadClassGameplayAssets(classId);
    });
    this.gameOver.onRestart(() => this.returnToClassSelection());
    for (const classId of PLAYER_CLASS_IDS) {
      this.classSelect.onSelect(classId, () => this.selectClass(classId));
    }
    for (const offerId of POTION_OFFER_IDS) {
      this.shop.onPotion(offerId, () => this.buyPotionOffer(offerId));
    }
    this.shop.onLeave(() => this.leaveShop());
    this.shop.onWeaponUpgrade(() => this.buyWeaponTier());
    this.shop.onShieldUpgrade(() => this.buyShieldTier());
    this.levelUp.onConfirm(() => this.confirmLevelUp());

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.scene.bindWindow(this.state.getBoardSnapshot(), { interactive: false });
    this.classSelectionPreview.setVisible(true);
    this.classSelect.show(this.state.getClassSelectionView());
    void preloadCharacterSelectionBackgroundAssets();
    this.setPhase({ kind: 'classSelection' });
    this.handleResize();
    this.updateHud();
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTimeMs = performance.now();
    requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.running = false;
    this.presentationGeneration += 1;
    this.resizeObserver.disconnect();
    this.gameOver.dispose();
    this.shop.dispose();
    this.merchantShopPreview.dispose();
    this.equipmentShopPreview.dispose();
    this.potionShopPreview.dispose();
    this.levelUp.dispose();
    this.classSelect.dispose();
    this.classSelectionPreview.dispose();
    this.input.dispose();
    this.scene.dispose();
  }

  private loop = (nowMs: number): void => {
    if (!this.running) {
      return;
    }

    const dt = Math.min(0.05, (nowMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = nowMs;

    this.updateMove(dt);
    this.updateTrapPlayback(dt);
    this.updateEncounterFx(dt);
    this.updateCombatPlayback(dt);
    this.updateDropSpawn(dt);
    this.camera.update(dt);
    this.scene.update(nowMs / 1000);
    this.scene.render(this.camera.camera);
    this.merchantShopPreview.update(dt);
    this.merchantShopPreview.render();
    this.equipmentShopPreview.update(dt);
    this.equipmentShopPreview.render();
    this.potionShopPreview.update(dt);
    this.potionShopPreview.render();
    this.classSelectionPreview.update(dt);
    this.classSelectionPreview.render();

    requestAnimationFrame(this.loop);
  };

  private tryMove(tile: TilePick): void {
    if (
      this.phase.kind !== 'idle' ||
      this.state.runOver ||
      !this.state.hasSelectedClass ||
      this.state.shopOpen ||
      this.state.levelUpOpen ||
      !this.state.isForwardTile(tile.row, tile.col)
    ) {
      return;
    }

    this.camera.nudge();
    this.scene.setPlayerMoving(true);

    const player = this.requirePlayerSnapshot();
    this.setPhase({
      kind: 'moving',
      animation: {
        fromCol: player.col,
        toCol: tile.col,
        anchorRow: player.row,
        elapsed: 0,
      },
    });
  }

  private updateMove(dt: number): void {
    if (this.phase.kind !== 'moving') {
      return;
    }

    const animation = this.phase.animation;
    animation.elapsed += dt;
    const t = Math.min(1, animation.elapsed / MOVE_DURATION_SEC);
    const eased = easeOutCubic(t);

    this.scene.setScrollZ(eased * TILE_PITCH);
    this.scene.layoutRows(animation.anchorRow);
    this.scene.setPlayerVisual(
      lerp(laneWorldX(animation.fromCol), laneWorldX(animation.toCol), eased),
      Math.sin(t * Math.PI) * 0.22,
    );

    if (t < 1) {
      return;
    }

    const toCol = animation.toCol;
    const leftBehindRow = animation.anchorRow;
    this.scene.setPlayerMoving(false);

    const resolution = this.state.resolveCompletedMove(toCol);
    this.scene.setScrollZ(0);
    this.scene.recycleDepartingRow(leftBehindRow, this.state.getBoardSnapshot());
    const player = this.requirePlayerSnapshot();
    this.scene.layoutRows(player.row);
    this.scene.setPlayerVisual(laneWorldX(player.col), 0);

    if (resolution.pickup) {
      this.scene.playPlayerPickup(resolution.pickup.kind);
      this.scene.beginCollectFx(resolution.pickup);
    }
    if (resolution.shop) {
      this.shop.show(resolution.shop);
      this.merchantShopPreview.setVisible(true);
    }
    this.pendingEvents = resolution.encounters;
    this.updateHud();

    if (resolution.trap) {
      this.setPhase({
        kind: 'trap',
        playback: {
          resolution: resolution.trap,
          phase: 'flash',
          elapsed: 0,
        },
      });
      const player = this.requirePlayerSnapshot();
      this.scene.beginTrapTriggerFx(player.row, player.col);
      if (resolution.trap.enemyMove) {
        this.scene.beginEnemyAdvanceFx(resolution.trap.enemyMove);
        this.scene.updateEnemyAdvanceFx(0);
      }
      return;
    }

    this.playNextPendingEvent();
  }

  private updateTrapPlayback(dt: number): void {
    if (this.phase.kind !== 'trap') {
      return;
    }

    const playback = this.phase.playback;
    playback.elapsed += dt;
    const duration =
      playback.phase === 'flash' ? TRAP_FX_SEC : ENEMY_ADVANCE_FX_SEC;
    const t = Math.min(1, playback.elapsed / duration);

    if (playback.phase === 'flash') {
      this.scene.updateTrapTriggerFx(t);
    } else {
      this.scene.updateEnemyAdvanceFx(t);
    }

    if (t < 1) {
      return;
    }

    if (playback.phase === 'flash') {
      this.scene.endTrapTriggerFx();
      const move = playback.resolution.enemyMove;
      if (move) {
        if (move.consumed === 'gold' || move.consumed === 'potion') {
          this.scene.beginItemConsumeFx(move.consumed, move.to.row, move.to.col);
        }
        if (move.consumed === 'trap') {
          this.scene.beginTrapConsumeFx(move.to.row, move.to.col);
        }
        playback.phase = 'advance';
        playback.elapsed = 0;
        return;
      }
    } else {
      this.scene.endEnemyAdvanceFx();
    }

    this.playNextPendingEvent();
  }

  private playNextPendingEvent(): void {
    const event = this.pendingEvents.shift();
    if (!event || this.state.runOver) {
      this.finishEncounterSequence();
      return;
    }

    if (event.kind === 'evade') {
      this.state.applyEvade(event.monster);
      this.updateHud();
      const player = this.requirePlayerSnapshot();
      const hops = fleeHopCount(event.monster.row, player.row);
      this.scene.beginEncounterFx([event], player.col, player.row);
      this.setPhase({
        kind: 'encounter',
        event,
        elapsed: 0,
        durationSec: evadeDurationSec(hops),
      });
      return;
    }

    this.scene.playEnemyTaunt(event.monster);
    const player = this.requirePlayerSnapshot();
    this.scene.beginEncounterFx([event], player.col, player.row);
    this.setPhase({
      kind: 'encounter',
      event,
      elapsed: 0,
      durationSec: ENCOUNTER_FX_SEC,
    });
  }

  private beginCombat(event: Extract<EncounterEvent, { kind: 'combat' }>): void {
    const result = this.state.createCombatResult(event);
    this.setPhase({
      kind: 'combat',
      playback: {
        result,
        target: event.monster,
        entryIndex: 0,
        elapsed: 0,
        awaitingEnemyDeath: false,
      },
    });
    this.beginCurrentCombatHit();
  }

  private updateEncounterFx(dt: number): void {
    if (this.phase.kind !== 'encounter') {
      return;
    }

    this.phase.elapsed += dt;
    const t = Math.min(1, this.phase.elapsed / this.phase.durationSec);
    this.scene.updateEncounterFx(t);

    if (t < 1) {
      return;
    }

    this.scene.endEncounterFx();
    const event = this.phase.event;
    if (event.kind === 'combat') {
      this.beginCombat(event);
      return;
    }
    this.playNextPendingEvent();
  }

  private updateCombatPlayback(dt: number): void {
    if (this.phase.kind !== 'combat') {
      return;
    }

    const playback = this.phase.playback;
    playback.elapsed += dt;
    const t = Math.min(1, playback.elapsed / COMBAT_HIT_SEC);
    this.scene.updateCombatHit(t);

    if (t < 1) {
      return;
    }
    if (
      playback.awaitingEnemyDeath &&
      !this.scene.isEnemyDeathPresentationComplete(playback.target)
    ) {
      return;
    }

    this.scene.endCombatHit();
    playback.entryIndex += 1;
    playback.elapsed = 0;

    if (playback.entryIndex >= playback.result.log.length) {
      this.concludeCombat(playback.result, playback.target);
      return;
    }

    this.beginCurrentCombatHit();
  }

  private beginCurrentCombatHit(): void {
    if (this.phase.kind !== 'combat') {
      return;
    }

    const playback = this.phase.playback;
    const entry = playback.result.log[playback.entryIndex];
    if (!entry) {
      this.concludeCombat(playback.result, playback.target);
      return;
    }

    this.state.applyCombatLogEntry(entry, playback.target);
    this.updateHud();
    playback.awaitingEnemyDeath = false;
    if (entry.attacker === 'player') {
      this.scene.playPlayerAttack();
    } else {
      this.scene.playEnemyAttack(playback.target);
    }
    if (entry.target === 'player') {
      if (entry.targetHealthAfter <= 0) {
        this.scene.playPlayerDeath();
      } else {
        this.scene.playPlayerHit();
      }
    } else if (entry.targetHealthAfter <= 0) {
      this.scene.playEnemyDeath(playback.target);
      playback.awaitingEnemyDeath = true;
    } else {
      this.scene.playEnemyHit(playback.target);
    }
    this.scene.beginCombatHit(
      entry,
      this.requirePlayerSnapshot().col,
      playback.target.row,
      playback.target.col,
      this.lastTimeMs / 1000,
    );
  }

  private concludeCombat(result: CombatResult, target: EncounterMonsterView): void {
    const finish = this.state.finishCombat(result, target);
    this.updateHud();

    if (finish.drop) {
      this.setPhase({ kind: 'drop', elapsed: 0 });
      this.scene.beginDropSpawnFx(finish.drop);
      return;
    }

    if (this.tryOpenLevelUp()) {
      return;
    }

    this.playNextPendingEvent();
  }

  private updateDropSpawn(dt: number): void {
    if (this.phase.kind !== 'drop') {
      return;
    }

    this.phase.elapsed += dt;
    const t = Math.min(1, this.phase.elapsed / DROP_SPAWN_FX_SEC);
    this.scene.updateDropSpawnFx(t);

    if (t < 1) {
      return;
    }

    this.scene.endDropSpawnFx();
    if (this.tryOpenLevelUp()) {
      return;
    }
    this.playNextPendingEvent();
  }

  private finishEncounterSequence(): void {
    this.updateHud();

    if (this.state.runOver) {
      this.shop.hide();
      this.merchantShopPreview.setVisible(false);
      this.equipmentShopPreview.setWeaponOffer(null);
      this.potionShopPreview.setActiveOffers([]);
      this.levelUp.hide();
      this.state.dismissOpenShop();
      this.state.dismissLevelUp();
      this.reportAnonymousDeath();
      this.gameOver.show(this.state.distance);
      this.setPhase({ kind: 'gameOver' });
      return;
    }

    if (this.tryOpenLevelUp()) {
      return;
    }

    if (this.state.shopOpen) {
      this.setPhase({ kind: 'shop' });
      return;
    }

    if (!this.state.hasSelectedClass) {
      this.setPhase({ kind: 'classSelection' });
      return;
    }

    this.setPhase({ kind: 'idle' });
  }

  private async selectClass(classId: PlayerClassId): Promise<void> {
    const token = this.presentationGeneration;
    this.classSelect.setPreparing(true);
    await preloadClassGameplayAssets(classId);
    if (
      !this.running ||
      token !== this.presentationGeneration ||
      this.phase.kind !== 'classSelection'
    ) {
      return;
    }
    this.state.selectClass(classId);
    this.classSelect.hide();
    this.classSelectionPreview.setVisible(false);
    this.scene.bindWindow(this.state.getBoardSnapshot(), { interactive: true });
    this.setPhase({ kind: 'idle' });
    this.updateHud();
  }

  private reportAnonymousDeath(): void {
    if (this.deathReported) {
      return;
    }
    this.deathReported = true;
    reportRunDeath(this.state.getHudSnapshot().level);
  }

  private returnToClassSelection(): void {
    this.presentationGeneration += 1;
    this.deathReported = false;
    this.pendingEvents = [];
    this.scene.clearTransientFx();
    this.shop.hide();
    this.merchantShopPreview.setVisible(false);
    this.equipmentShopPreview.setWeaponOffer(null);
    this.potionShopPreview.setActiveOffers([]);
    this.levelUp.hide();
    this.gameOver.hide();
    this.state.clearSelectedClass();
    this.scene.bindWindow(this.state.getBoardSnapshot(), { interactive: false });
    this.classSelectionPreview.setVisible(true);
    this.classSelect.show(this.state.getClassSelectionView());
    this.setPhase({ kind: 'classSelection' });
    this.updateHud();
  }

  private buyWeaponTier(): void {
    if (this.phase.kind !== 'shop' || !this.state.shopOpen) {
      return;
    }
    const result = this.state.buyWeaponTier();
    if (result.success) {
      this.scene.setPlayerWeaponTiers(
        this.state.weaponTierIndex,
        this.state.shieldTierIndex,
      );
    }
    this.updateHud();
  }

  private buyShieldTier(): void {
    if (this.phase.kind !== 'shop' || !this.state.shopOpen) {
      return;
    }
    const result = this.state.buyShieldTier();
    if (result.success) {
      this.scene.setPlayerWeaponTiers(
        this.state.weaponTierIndex,
        this.state.shieldTierIndex,
      );
    }
    this.updateHud();
  }

  private buyPotionOffer(offerId: PotionOfferId): void {
    if (this.phase.kind !== 'shop' || !this.state.shopOpen) {
      return;
    }
    this.state.buyPotionOffer(offerId);
    this.updateHud();
  }

  private confirmLevelUp(): void {
    if (this.phase.kind !== 'levelUp' || !this.state.levelUpOpen) {
      return;
    }

    const choiceId = this.levelUp.getChoiceId();
    if (!choiceId) {
      return;
    }
    const result = this.state.chooseLevelUp(choiceId);
    this.updateHud();
    if (!result.success) {
      return;
    }

    if (this.tryOpenLevelUp()) {
      return;
    }

    this.levelUp.hide();
    this.playNextPendingEvent();
  }

  private tryOpenLevelUp(): boolean {
    if (this.state.runOver || !this.state.levelUpOpen) {
      return false;
    }
    const view = this.state.getLevelUpView();
    if (!view) {
      return false;
    }
    this.levelUp.show(view);
    this.setPhase({ kind: 'levelUp' });
    return true;
  }

  private leaveShop(): void {
    if (this.phase.kind !== 'shop') {
      return;
    }
    const left = this.state.leaveShop();
    if (!left) {
      return;
    }

    this.shop.hide();
    this.merchantShopPreview.setVisible(false);
    this.equipmentShopPreview.setWeaponOffer(null);
    this.potionShopPreview.setActiveOffers([]);
    this.scene.beginMerchantLeaveFx(left.row, left.col);
    this.setPhase({ kind: 'idle' });
    this.updateHud();
  }

  private requirePlayerSnapshot() {
    const player = this.state.getPlayerSnapshot();
    if (!player) {
      throw new Error('No class selected');
    }
    return player;
  }

  private setPhase(phase: PresentationPhase): void {
    this.phase = phase;
    const interactive = isBoardInteractive(phase);
    this.input.setEnabled(interactive);
    this.scene.refreshHighlights(this.state.getBoardSnapshot(), { interactive });
  }

  private updateHud(): void {
    this.hud.update(this.state.getHudSnapshot());
    const shopView = this.state.getShopView();
    this.scene.setPlayerWeaponTiers(
      this.state.weaponTierIndex,
      this.state.shieldTierIndex,
    );
    this.merchantShopPreview.setVisible(shopView !== null);
    this.equipmentShopPreview.setWeaponOffer(shopView?.weaponOffer ?? null);
    this.potionShopPreview.setActiveOffers(
      shopView?.potionOffers.map((offer) => offer.id) ?? [],
    );
    if (shopView) {
      this.shop.render(shopView);
    }
  }

  private handleResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    this.scene.setSize(width, height);
    this.camera.setAspect(width, height);
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
