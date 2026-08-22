import {
  COMBAT_HIT_SEC,
  ENCOUNTER_FX_SEC,
  MOVE_DURATION_SEC,
  TILE_PITCH,
  laneWorldX,
} from './config';
import { type CombatResult } from './combat';
import {
  type EncounterEvent,
  avoidanceRollerFromSearch,
} from './encounters';
import { enemyStatsFactoryFromSearch } from './definitions/enemies';
import { GameState } from './GameState';
import { rngFactoryFromSearch } from './random';
import { InputController, type TilePick } from './InputController';
import { type Monster } from './Monster';
import { type ShopOfferId } from './shop';
import { CameraController } from '../rendering/CameraController';
import { SceneManager } from '../rendering/SceneManager';
import { GameOverView } from '../ui/GameOverView';
import { HudView } from '../ui/HudView';
import { ShopOverlayView } from '../ui/ShopOverlayView';

interface MoveAnimation {
  fromCol: number;
  toCol: number;
  anchorRow: number;
  elapsed: number;
}

interface CombatPlayback {
  result: CombatResult;
  monster: Monster;
  entryIndex: number;
  elapsed: number;
}

export class Game {
  private readonly state = new GameState({
    rollAvoidance: avoidanceRollerFromSearch(window.location.search),
    createEnemyStats: enemyStatsFactoryFromSearch(window.location.search),
    createRng: rngFactoryFromSearch(window.location.search),
  });
  private readonly camera: CameraController;
  private readonly scene: SceneManager;
  private readonly input: InputController;
  private readonly canvas: HTMLCanvasElement;
  private readonly hud: HudView;
  private readonly gameOver: GameOverView;
  private readonly shop: ShopOverlayView;
  private readonly resizeObserver: ResizeObserver;

  private animation: MoveAnimation | null = null;
  private encounterFxElapsed: number | null = null;
  private pendingEvents: EncounterEvent[] = [];
  private combatPlayback: CombatPlayback | null = null;
  private lastTimeMs = 0;
  private running = false;

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
    this.gameOver.onRestart(() => this.restartRun());
    this.shop.onHeal(() => this.buyShopOffer('heal'));
    this.shop.onAttack(() => this.buyShopOffer('attack'));
    this.shop.onLeave(() => this.leaveShop());

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.scene.bindWindow(this.state, { interactive: true });
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
    this.resizeObserver.disconnect();
    this.gameOver.dispose();
    this.shop.dispose();
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
    this.updateEncounterFx(dt);
    this.updateCombatPlayback(dt);
    this.camera.update(dt);
    this.scene.update(nowMs / 1000);
    this.scene.render(this.camera.camera);

    requestAnimationFrame(this.loop);
  };

  private tryMove(tile: TilePick): void {
    if (
      this.boardLocked ||
      this.state.runOver ||
      this.state.shopOpen ||
      !this.state.isForwardTile(tile.row, tile.col)
    ) {
      return;
    }

    this.setBoardInteractive(false);
    this.camera.nudge();

    this.animation = {
      fromCol: this.state.player.col,
      toCol: tile.col,
      anchorRow: this.state.player.row,
      elapsed: 0,
    };
  }

  private updateMove(dt: number): void {
    if (!this.animation) {
      return;
    }

    this.animation.elapsed += dt;
    const t = Math.min(1, this.animation.elapsed / MOVE_DURATION_SEC);
    const eased = easeOutCubic(t);

    this.scene.setScrollZ(eased * TILE_PITCH);
    this.scene.layoutRows(this.animation.anchorRow);
    this.scene.setPlayerVisual(
      lerp(laneWorldX(this.animation.fromCol), laneWorldX(this.animation.toCol), eased),
      Math.sin(t * Math.PI) * 0.22,
    );

    if (t < 1) {
      return;
    }

    const toCol = this.animation.toCol;
    const leftBehindRow = this.animation.anchorRow;
    this.animation = null;

    const resolution = this.state.resolveCompletedMove(toCol);
    this.scene.setScrollZ(0);
    this.scene.recycleDepartingRow(leftBehindRow, this.state);
    this.scene.layoutRows(this.state.player.row);
    this.scene.setPlayerVisual(laneWorldX(this.state.player.col), 0);

    if (resolution.pickup) {
      this.scene.beginCollectFx(resolution.pickup);
    }
    if (resolution.shop) {
      this.shop.show(resolution.shop);
    }
    this.pendingEvents = resolution.encounters;
    this.setBoardInteractive(false);
    this.updateHud();
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
      this.scene.beginEncounterFx([event], this.state.player.col);
      this.encounterFxElapsed = 0;
      return;
    }

    const result = this.state.createCombatResult(event);
    this.combatPlayback = {
      result,
      monster: event.monster,
      entryIndex: 0,
      elapsed: 0,
    };
    this.beginCurrentCombatHit();
  }

  private updateEncounterFx(dt: number): void {
    if (this.encounterFxElapsed === null) {
      return;
    }

    this.encounterFxElapsed += dt;
    const t = Math.min(1, this.encounterFxElapsed / ENCOUNTER_FX_SEC);
    this.scene.updateEncounterFx(t);

    if (t < 1) {
      return;
    }

    this.scene.endEncounterFx();
    this.encounterFxElapsed = null;
    this.playNextPendingEvent();
  }

  private updateCombatPlayback(dt: number): void {
    if (!this.combatPlayback) {
      return;
    }

    this.combatPlayback.elapsed += dt;
    const t = Math.min(1, this.combatPlayback.elapsed / COMBAT_HIT_SEC);
    this.scene.updateCombatHit(t);

    if (t < 1) {
      return;
    }

    this.scene.endCombatHit();
    this.combatPlayback.entryIndex += 1;
    this.combatPlayback.elapsed = 0;

    if (this.combatPlayback.entryIndex >= this.combatPlayback.result.log.length) {
      this.state.finishCombat(this.combatPlayback.result, this.combatPlayback.monster);
      this.combatPlayback = null;
      this.setBoardInteractive(false);
      this.updateHud();
      this.playNextPendingEvent();
      return;
    }

    this.beginCurrentCombatHit();
  }

  private beginCurrentCombatHit(): void {
    const playback = this.combatPlayback;
    if (!playback) {
      return;
    }

    const entry = playback.result.log[playback.entryIndex];
    if (!entry) {
      this.state.finishCombat(playback.result, playback.monster);
      this.combatPlayback = null;
      this.setBoardInteractive(false);
      this.updateHud();
      this.playNextPendingEvent();
      return;
    }

    this.state.applyCombatLogEntry(entry, playback.monster);
    this.updateHud();
    this.scene.beginCombatHit(
      entry,
      this.state.player.col,
      playback.monster.row,
      playback.monster.col,
    );
  }

  private finishEncounterSequence(): void {
    this.updateHud();

    if (this.state.runOver) {
      this.setBoardInteractive(false);
      this.shop.hide();
      this.state.dismissOpenShop();
      this.gameOver.show(this.state.distance);
      return;
    }

    if (this.state.shopOpen) {
      this.setBoardInteractive(false);
      return;
    }

    this.setBoardInteractive(true);
  }

  private restartRun(): void {
    this.animation = null;
    this.encounterFxElapsed = null;
    this.combatPlayback = null;
    this.pendingEvents = [];
    this.scene.clearTransientFx();
    this.shop.hide();
    this.state.reset();
    this.scene.bindWindow(this.state, { interactive: true });
    this.gameOver.hide();
    this.setBoardInteractive(true);
    this.updateHud();
  }

  private buyShopOffer(offerId: ShopOfferId): void {
    if (!this.state.shopOpen) {
      return;
    }
    this.state.buyShopOffer(offerId);
    this.updateHud();
  }

  private leaveShop(): void {
    const left = this.state.leaveShop();
    if (!left) {
      return;
    }

    this.shop.hide();
    this.scene.beginMerchantLeaveFx(left.row, left.col);
    this.setBoardInteractive(true);
    this.updateHud();
  }

  private get boardLocked(): boolean {
    return (
      this.animation !== null ||
      this.combatPlayback !== null ||
      this.encounterFxElapsed !== null
    );
  }

  private setBoardInteractive(interactive: boolean): void {
    this.input.setEnabled(interactive);
    this.scene.refreshHighlights(this.state, { interactive });
  }

  private updateHud(): void {
    this.hud.update(this.state.getHudSnapshot());
    const shopView = this.state.getShopView();
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
