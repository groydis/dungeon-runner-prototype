import { ENCOUNTER_FX_SEC, MOVE_DURATION_SEC, TILE_PITCH, laneWorldX } from './config';
import { avoidanceRollerFromSearch } from './encounters';
import { GameState } from './GameState';
import { InputController, type TilePick } from './InputController';
import { CameraController } from '../rendering/CameraController';
import { SceneManager } from '../rendering/SceneManager';

interface MoveAnimation {
  fromCol: number;
  toCol: number;
  anchorRow: number;
  elapsed: number;
}

export class Game {
  private readonly state = new GameState({
    rollAvoidance: avoidanceRollerFromSearch(window.location.search),
  });
  private readonly camera: CameraController;
  private readonly scene: SceneManager;
  private readonly input: InputController;
  private readonly canvas: HTMLCanvasElement;
  private readonly distanceEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly resizeObserver: ResizeObserver;

  private animation: MoveAnimation | null = null;
  private encounterFxElapsed: number | null = null;
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
    this.statusEl = this.requireElement('#status');

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
    this.camera.update(dt);
    this.scene.update(nowMs / 1000);
    this.scene.render(this.camera.camera);

    requestAnimationFrame(this.loop);
  };

  private tryMove(tile: TilePick): void {
    if (this.state.isAnimating || !this.state.isForwardTile(tile.row, tile.col)) {
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

    const events = this.state.resolveMonsterEncountersAfterMove();
    this.updateHud();

    if (events.length === 0) {
      this.state.isAnimating = false;
      this.scene.refreshHighlights(this.state);
      this.input.setEnabled(true);
      return;
    }

    this.scene.refreshHighlights(this.state);
    this.scene.beginEncounterFx(events, this.state.player.col);
    this.encounterFxElapsed = 0;
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
    this.state.isAnimating = false;
    this.scene.refreshHighlights(this.state);
    this.input.setEnabled(true);
  }

  private updateHud(): void {
    this.distanceEl.textContent = `Distance: ${this.state.distance}`;
    this.statusEl.textContent = this.state.status;
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
