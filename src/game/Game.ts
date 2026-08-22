import {
  COMBAT_HIT_SEC,
  ENCOUNTER_FX_SEC,
  MOVE_DURATION_SEC,
  TILE_PITCH,
  laneWorldX,
} from './config';
import {
  type CombatResult,
  resolveAutomaticCombat,
} from './combat';
import {
  type EncounterEvent,
  avoidanceRollerFromSearch,
} from './encounters';
import { caveRatStatsFromSearch } from './Combatant';
import { GameState } from './GameState';
import { rngFactoryFromSearch } from './random';
import { InputController, type TilePick } from './InputController';
import { type Monster } from './Monster';
import { type ShopOfferId, type ShopOfferView } from './shop';
import { CameraController } from '../rendering/CameraController';
import { SceneManager } from '../rendering/SceneManager';

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
    createCaveRatStats: () => caveRatStatsFromSearch(window.location.search),
    createRng: rngFactoryFromSearch(window.location.search),
  });
  private readonly camera: CameraController;
  private readonly scene: SceneManager;
  private readonly input: InputController;
  private readonly canvas: HTMLCanvasElement;
  private readonly distanceEl: HTMLElement;
  private readonly goldEl: HTMLElement;
  private readonly attackEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly healthTextEl: HTMLElement;
  private readonly healthBarEl: HTMLElement;
  private readonly healthFillEl: HTMLElement;
  private readonly gameOverEl: HTMLElement;
  private readonly gameOverDistanceEl: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly shopEl: HTMLElement;
  private readonly shopGoldEl: HTMLElement;
  private readonly shopHealButton: HTMLButtonElement;
  private readonly shopAttackButton: HTMLButtonElement;
  private readonly shopLeaveButton: HTMLButtonElement;
  private readonly shopHealTitleEl: HTMLElement;
  private readonly shopHealDescEl: HTMLElement;
  private readonly shopHealReasonEl: HTMLElement;
  private readonly shopAttackTitleEl: HTMLElement;
  private readonly shopAttackDescEl: HTMLElement;
  private readonly shopAttackReasonEl: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly onRestart = (): void => {
    this.restartRun();
  };
  private readonly onBuyHeal = (): void => {
    this.buyShopOffer('heal');
  };
  private readonly onBuyAttack = (): void => {
    this.buyShopOffer('attack');
  };
  private readonly onLeaveShop = (): void => {
    this.leaveShop();
  };

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

    this.distanceEl = this.requireElement('#distance');
    this.goldEl = this.requireElement('#gold');
    this.attackEl = this.requireElement('#attack');
    this.statusEl = this.requireElement('#status');
    this.healthTextEl = this.requireElement('#health-text');
    this.healthBarEl = this.requireElement('#health-bar');
    this.healthFillEl = this.requireElement('#health-fill');
    this.gameOverEl = this.requireElement('#game-over');
    this.gameOverDistanceEl = this.requireElement('#game-over-distance');
    this.restartButton = this.requireElement('#restart-run') as HTMLButtonElement;
    this.restartButton.addEventListener('click', this.onRestart);

    this.shopEl = this.requireElement('#shop');
    this.shopGoldEl = this.requireElement('#shop-gold');
    this.shopHealButton = this.requireElement('#shop-offer-heal') as HTMLButtonElement;
    this.shopAttackButton = this.requireElement('#shop-offer-attack') as HTMLButtonElement;
    this.shopLeaveButton = this.requireElement('#shop-leave') as HTMLButtonElement;
    this.shopHealTitleEl = this.requireElement('#shop-heal-title');
    this.shopHealDescEl = this.requireElement('#shop-heal-desc');
    this.shopHealReasonEl = this.requireElement('#shop-heal-reason');
    this.shopAttackTitleEl = this.requireElement('#shop-attack-title');
    this.shopAttackDescEl = this.requireElement('#shop-attack-desc');
    this.shopAttackReasonEl = this.requireElement('#shop-attack-reason');
    this.shopHealButton.addEventListener('click', this.onBuyHeal);
    this.shopAttackButton.addEventListener('click', this.onBuyAttack);
    this.shopLeaveButton.addEventListener('click', this.onLeaveShop);
    this.shopEl.addEventListener('pointerdown', this.blockShopPointer);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.scene.bindWindow(this.state);
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
    this.restartButton.removeEventListener('click', this.onRestart);
    this.shopHealButton.removeEventListener('click', this.onBuyHeal);
    this.shopAttackButton.removeEventListener('click', this.onBuyAttack);
    this.shopLeaveButton.removeEventListener('click', this.onLeaveShop);
    this.shopEl.removeEventListener('pointerdown', this.blockShopPointer);
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
      this.state.runOver ||
      this.state.shopOpen ||
      this.state.isAnimating ||
      !this.state.isForwardTile(tile.row, tile.col)
    ) {
      return;
    }

    this.state.isAnimating = true;
    this.input.setEnabled(false);
    this.scene.refreshHighlights(this.state);
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

    this.state.commitMove(toCol);
    this.scene.setScrollZ(0);
    this.scene.recycleDepartingRow(leftBehindRow, this.state);
    this.scene.layoutRows(this.state.player.row);
    this.scene.setPlayerVisual(laneWorldX(this.state.player.col), 0);

    const pickup = this.state.resolveLandedPickup();
    if (pickup) {
      this.scene.beginCollectFx(pickup);
    }
    if (this.state.openShopForCurrentTile()) {
      this.showShop();
    }
    this.pendingEvents = this.state.resolveMonsterEncountersAfterMove();
    this.scene.refreshHighlights(this.state);
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

    const result = resolveAutomaticCombat(
      this.state.playerStats,
      event.monster.stats,
      event.approach,
      { id: event.monster.id, name: event.monster.name },
    );
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
      this.scene.refreshHighlights(this.state);
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
      this.scene.refreshHighlights(this.state);
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
    this.scene.refreshHighlights(this.state);
    this.updateHud();

    if (this.state.runOver) {
      this.state.isAnimating = false;
      this.input.setEnabled(false);
      this.closeShopOverlay();
      this.state.dismissOpenShop();
      this.showGameOver();
      return;
    }

    if (this.state.shopOpen) {
      this.state.isAnimating = true;
      this.input.setEnabled(false);
      this.scene.refreshHighlights(this.state);
      return;
    }

    this.state.isAnimating = false;
    this.scene.refreshHighlights(this.state);
    this.input.setEnabled(true);
  }

  private restartRun(): void {
    this.animation = null;
    this.encounterFxElapsed = null;
    this.combatPlayback = null;
    this.pendingEvents = [];
    this.scene.clearTransientFx();
    this.closeShopOverlay();
    this.state.reset();
    this.scene.bindWindow(this.state);
    this.hideGameOver();
    this.input.setEnabled(true);
    this.updateHud();
  }

  private showGameOver(): void {
    this.gameOverDistanceEl.textContent = `Distance: ${this.state.distance}`;
    this.gameOverEl.hidden = false;
  }

  private hideGameOver(): void {
    this.gameOverEl.hidden = true;
  }

  private showShop(): void {
    this.renderShop();
    this.shopEl.hidden = false;
  }

  private closeShopOverlay(): void {
    this.shopEl.hidden = true;
  }

  private renderShop(): void {
    const view = this.state.getShopView();
    if (!view) {
      this.closeShopOverlay();
      return;
    }

    this.shopGoldEl.textContent = `Gold: ${view.gold}`;
    this.renderShopOffer(
      this.shopHealButton,
      this.shopHealTitleEl,
      this.shopHealDescEl,
      this.shopHealReasonEl,
      view.offers.find((offer) => offer.id === 'heal'),
    );
    this.renderShopOffer(
      this.shopAttackButton,
      this.shopAttackTitleEl,
      this.shopAttackDescEl,
      this.shopAttackReasonEl,
      view.offers.find((offer) => offer.id === 'attack'),
    );
  }

  private renderShopOffer(
    button: HTMLButtonElement,
    titleEl: HTMLElement,
    descEl: HTMLElement,
    reasonEl: HTMLElement,
    offer: ShopOfferView | undefined,
  ): void {
    if (!offer) {
      return;
    }

    titleEl.textContent = `${offer.title} — ${offer.cost} gold`;
    descEl.textContent = offer.description;
    reasonEl.textContent = offer.available ? '' : (offer.reasonText ?? '');
    button.disabled = !offer.available;
    const reason = offer.available
      ? offer.description
      : (offer.reasonText ?? 'Unavailable');
    button.setAttribute(
      'aria-label',
      `${offer.title}, ${offer.cost} gold. ${reason}`,
    );
  }

  private buyShopOffer(offerId: ShopOfferId): void {
    if (!this.state.shopOpen) {
      return;
    }
    this.state.buyShopOffer(offerId);
    this.updateHud();
  }

  private leaveShop(): void {
    const shop = this.state.activeShop;
    if (!shop) {
      return;
    }

    const { row, col } = shop;
    this.state.leaveShop();
    this.closeShopOverlay();
    this.scene.beginMerchantLeaveFx(row, col);
    this.state.isAnimating = false;
    this.scene.refreshHighlights(this.state);
    this.input.setEnabled(true);
    this.updateHud();
  }

  private blockShopPointer = (event: PointerEvent): void => {
    event.stopPropagation();
  };

  private updateHud(): void {
    const { health, maxHealth } = this.state.playerStats;
    const ratio = maxHealth <= 0 ? 0 : Math.max(0, Math.min(1, health / maxHealth));
    this.distanceEl.textContent = `Distance: ${this.state.distance}`;
    this.goldEl.textContent = `Gold: ${this.state.gold}`;
    this.attackEl.textContent = `ATK: ${this.state.playerStats.attack}`;
    this.statusEl.textContent = this.state.status;
    if (this.state.shopOpen) {
      this.renderShop();
    }
    this.healthTextEl.textContent = `HP ${health} / ${maxHealth}`;
    this.healthBarEl.setAttribute('aria-valuemax', String(maxHealth));
    this.healthBarEl.setAttribute('aria-valuenow', String(health));
    this.healthFillEl.style.transform = `scaleX(${ratio})`;
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

  private requireElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Missing HUD element ${selector}`);
    }
    return element;
  }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
