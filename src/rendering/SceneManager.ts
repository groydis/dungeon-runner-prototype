import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  WebGLRenderer,
  type Camera,
} from 'three';
import {
  COLLECT_FX_SEC,
  LANE_COUNT,
  MERCHANT_LEAVE_FX_SEC,
  ROW_POOL_SIZE,
  TILE_PITCH,
  TILE_SIZE,
  laneWorldX,
  rowWorldZ,
} from '../game/config';
import { type CombatLogEntry } from '../game/combat';
import { type CollectibleKind } from '../game/Collectible';
import { type EncounterEvent } from '../game/encounters';
import { type EnemyType } from '../game/definitions/enemies';
import {
  type EnemyMoveResult,
  type GameState,
  type PickupResult,
} from '../game/GameState';

const ENEMY_RENDER_KEYS: readonly EnemyType[] = ['caveRat', 'cryptGuard', 'boneBrute'];

interface RowView {
  group: Group;
  tiles: Mesh[];
  hitPlanes: Mesh[];
  monsterVariants: Record<EnemyType, Mesh>[];
  golds: Mesh[];
  potions: Mesh[];
  traps: Group[];
  merchants: Group[];
  assignedRow: number;
}

interface EncounterFxView {
  event: EncounterEvent;
  monsterMesh: Mesh;
  monsterBaseX: number;
  monsterBaseY: number;
  playerBaseX: number;
}

interface CombatHitFx {
  attacker: CombatLogEntry['attacker'];
  isSurpriseStrike: boolean;
  monsterMesh: Mesh;
  monsterBaseX: number;
  monsterBaseY: number;
  playerBaseX: number;
}

interface CollectFx {
  kind: CollectibleKind;
  mesh: Mesh;
  startedAt: number;
  baseY: number;
}

interface MerchantLeaveFx {
  group: Group;
  startedAt: number;
  baseY: number;
}

interface TrapConsumeFx {
  group: Group;
  startedAt: number;
}

interface EnemyAdvanceFx {
  mesh: Mesh;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  baseY: number;
}

export class SceneManager {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;

  private readonly rowViews: RowView[] = [];
  private readonly playerMesh: Group;
  private readonly playerBody: Mesh;
  private readonly floorMaterialA: MeshStandardMaterial;
  private readonly floorMaterialB: MeshStandardMaterial;
  private readonly highlightMaterial: MeshStandardMaterial;
  private readonly caveRatMaterial: MeshStandardMaterial;
  private readonly cryptGuardMaterial: MeshStandardMaterial;
  private readonly boneBruteMaterial: MeshStandardMaterial;
  private readonly goldMaterial: MeshStandardMaterial;
  private readonly potionMaterial: MeshStandardMaterial;
  private readonly merchantStallMaterial: MeshStandardMaterial;
  private readonly merchantPillarMaterial: MeshStandardMaterial;
  private readonly merchantHoodMaterial: MeshStandardMaterial;
  private readonly merchantLanternMaterial: MeshStandardMaterial;
  private readonly trapPlateMaterial: MeshStandardMaterial;
  private readonly trapRuneMaterial: MeshStandardMaterial;
  private readonly hitMaterial: MeshBasicMaterial;

  private scrollZ = 0;
  private highlightRow = Number.NaN;
  private readonly highlightCols = new Set<number>();
  private encounterFx: EncounterFxView[] = [];
  private combatHit: CombatHitFx | null = null;
  private collectFx: CollectFx[] = [];
  private merchantLeaveFx: MerchantLeaveFx[] = [];
  private trapTrigger: Group | null = null;
  private trapConsumeFx: TrapConsumeFx[] = [];
  private enemyAdvanceFx: EnemyAdvanceFx | null = null;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x121316, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.background = new Color(0x121316);
    this.scene.fog = new Fog(0x121316, 13, 22);

    this.addLights();

    this.floorMaterialA = new MeshStandardMaterial({
      color: 0x2c3038,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.floorMaterialB = new MeshStandardMaterial({
      color: 0x24272e,
      roughness: 0.94,
      metalness: 0.04,
    });
    this.highlightMaterial = new MeshStandardMaterial({
      color: 0x6d7f4c,
      emissive: 0x7dff6a,
      emissiveIntensity: 0.28,
      roughness: 0.62,
      metalness: 0.08,
    });
    this.caveRatMaterial = new MeshStandardMaterial({
      color: 0xc4372e,
      roughness: 0.45,
      metalness: 0.12,
      transparent: true,
      opacity: 1,
    });
    this.cryptGuardMaterial = new MeshStandardMaterial({
      color: 0x6d7d8f,
      roughness: 0.48,
      metalness: 0.18,
      transparent: true,
      opacity: 1,
    });
    this.boneBruteMaterial = new MeshStandardMaterial({
      color: 0xdc5a28,
      roughness: 0.42,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    });
    this.goldMaterial = new MeshStandardMaterial({
      color: 0xf4c430,
      emissive: 0xffd24a,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.55,
      transparent: true,
      opacity: 1,
    });
    this.potionMaterial = new MeshStandardMaterial({
      color: 0x3ec6cf,
      emissive: 0x3ec6cf,
      emissiveIntensity: 0.4,
      roughness: 0.32,
      metalness: 0.18,
      transparent: true,
      opacity: 1,
    });
    this.merchantStallMaterial = new MeshStandardMaterial({
      color: 0x2a2438,
      roughness: 0.78,
      metalness: 0.08,
      transparent: true,
      opacity: 1,
    });
    this.merchantPillarMaterial = new MeshStandardMaterial({
      color: 0x5b4aa8,
      emissive: 0x6a5cff,
      emissiveIntensity: 0.42,
      roughness: 0.38,
      metalness: 0.22,
      transparent: true,
      opacity: 1,
    });
    this.merchantHoodMaterial = new MeshStandardMaterial({
      color: 0x241833,
      roughness: 0.7,
      metalness: 0.06,
      transparent: true,
      opacity: 1,
    });
    this.merchantLanternMaterial = new MeshStandardMaterial({
      color: 0x8ec8ff,
      emissive: 0x7ab8ff,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.28,
      transparent: true,
      opacity: 1,
    });
    this.trapPlateMaterial = new MeshStandardMaterial({
      color: 0x8a2a12,
      emissive: 0xff4a1a,
      emissiveIntensity: 0.45,
      roughness: 0.48,
      metalness: 0.22,
      transparent: true,
      opacity: 1,
    });
    this.trapRuneMaterial = new MeshStandardMaterial({
      color: 0xff7a2a,
      emissive: 0xff8a30,
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.18,
      transparent: true,
      opacity: 1,
    });
    this.hitMaterial = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
    });

    this.buildRowPool();
    const player = this.createPlayer();
    this.playerMesh = player.group;
    this.playerBody = player.body;
    this.scene.add(this.playerMesh);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  setScrollZ(scrollZ: number): void {
    this.scrollZ = scrollZ;
  }

  setPlayerVisual(colX: number, hopY: number): void {
    this.playerMesh.position.set(colX, 0.62 + hopY, 0);
  }

  /** Initial bind of the recycled row pool to the current logical window. */
  bindWindow(state: GameState, presentation: { interactive: boolean }): void {
    for (let i = 0; i < this.rowViews.length; i += 1) {
      const row = state.player.row + i;
      this.bindRow(this.rowViews[i], row, state);
    }
    this.refreshHighlights(state, presentation);
    this.layoutRows(state.player.row);
    this.setPlayerVisual(laneWorldX(state.player.col), 0);
  }

  /**
   * Reuses the row that just left the screen as the new far row
   * instead of allocating more meshes.
   */
  recycleDepartingRow(leftBehindRow: number, state: GameState): void {
    const farRow = state.player.row + ROW_POOL_SIZE - 1;
    const view = this.rowViews.find((rowView) => rowView.assignedRow === leftBehindRow);
    if (view) {
      this.bindRow(view, farRow, state);
    }
  }

  refreshHighlights(state: GameState, presentation: { interactive: boolean }): void {
    this.highlightRow = presentation.interactive ? state.player.row + 1 : Number.NaN;
    this.highlightCols.clear();
    if (presentation.interactive) {
      for (let col = 0; col < LANE_COUNT; col += 1) {
        if (state.isForwardTile(this.highlightRow, col)) {
          this.highlightCols.add(col);
        }
      }
    }
    for (const view of this.rowViews) {
      this.applyTileChrome(view, state);
    }
  }

  layoutRows(anchorRow: number): void {
    for (const view of this.rowViews) {
      const z = rowWorldZ(view.assignedRow, anchorRow, this.scrollZ);
      view.group.position.z = z;
      // Hide tiles once they pass the player toward the camera so recycle pops stay off-screen.
      view.group.visible = z < TILE_PITCH * 0.55;
    }
  }

  getSelectableMeshes(): Mesh[] {
    const meshes: Mesh[] = [];
    for (const view of this.rowViews) {
      if (view.assignedRow !== this.highlightRow) {
        continue;
      }
      for (const col of this.highlightCols) {
        meshes.push(view.hitPlanes[col], view.tiles[col]);
      }
    }
    return meshes;
  }

  update(elapsedSec: number): void {
    this.clock = elapsedSec;
    const pulse = 0.22 + 0.18 * Math.sin(elapsedSec * 3.4);
    this.highlightMaterial.emissiveIntensity = pulse;
    this.updateCollectibleIdle(elapsedSec);
    this.updateCollectFx(elapsedSec);
    this.updateTrapIdle(elapsedSec);
    this.updateTrapConsumeFx(elapsedSec);
    this.updateMerchantIdle(elapsedSec);
    this.updateMerchantLeaveFx(elapsedSec);
  }

  beginCollectFx(pickup: PickupResult): void {
    const mesh =
      pickup.kind === 'gold'
        ? this.findGoldMesh(pickup.row, pickup.col)
        : this.findPotionMesh(pickup.row, pickup.col);
    if (!mesh) {
      return;
    }
    mesh.visible = true;
    this.collectFx.push({
      kind: pickup.kind,
      mesh,
      startedAt: this.clock,
      baseY: pickup.kind === 'gold' ? 0.38 : 0.42,
    });
  }

  beginItemConsumeFx(kind: CollectibleKind, row: number, col: number): void {
    this.beginCollectFx({
      kind,
      id: '',
      row,
      col,
      goldGained: 0,
      healthRestored: 0,
      alreadyFull: false,
    });
  }

  beginTrapTriggerFx(row: number, col: number): void {
    const group = this.findTrapGroup(row, col);
    if (!group) {
      this.trapTrigger = null;
      return;
    }
    group.visible = true;
    this.trapTrigger = group;
  }

  updateTrapTriggerFx(t: number): void {
    const group = this.trapTrigger;
    if (!group) {
      return;
    }
    const flash = 1 + Math.sin(t * Math.PI) * 0.55;
    group.scale.setScalar(flash);
    this.setTrapOpacity(group, 1 - t * 0.85);
    this.setTrapEmissive(group, 0.7 + (1 - t) * 1.4);
  }

  endTrapTriggerFx(): void {
    if (this.trapTrigger) {
      this.resetTrapGroup(this.trapTrigger, this.trapColFromGroup(this.trapTrigger));
      this.trapTrigger.visible = false;
    }
    this.trapTrigger = null;
  }

  beginTrapConsumeFx(row: number, col: number): void {
    const group = this.findTrapGroup(row, col);
    if (!group) {
      return;
    }
    group.visible = true;
    this.trapConsumeFx = this.trapConsumeFx.filter((fx) => fx.group !== group);
    this.trapConsumeFx.push({
      group,
      startedAt: this.clock,
    });
  }

  beginEnemyAdvanceFx(move: EnemyMoveResult): void {
    const mesh = this.findMonsterMesh(move.to.row, move.to.col);
    if (!mesh) {
      this.enemyAdvanceFx = null;
      return;
    }
    const startX = laneWorldX(move.from.col);
    const endX = laneWorldX(move.to.col);
    const startZ = (move.from.row - move.to.row) * -TILE_PITCH;
    mesh.visible = true;
    mesh.position.x = startX;
    mesh.position.z = startZ;
    this.enemyAdvanceFx = {
      mesh,
      startX,
      startZ,
      endX,
      endZ: 0,
      baseY: monsterBaseY(mesh),
    };
  }

  updateEnemyAdvanceFx(t: number): void {
    const fx = this.enemyAdvanceFx;
    if (!fx) {
      return;
    }
    const eased = 1 - (1 - t) ** 3;
    fx.mesh.position.x = fx.startX + (fx.endX - fx.startX) * eased;
    fx.mesh.position.z = fx.startZ + (fx.endZ - fx.startZ) * eased;
    fx.mesh.position.y = fx.baseY + Math.sin(t * Math.PI) * 0.14;
    fx.mesh.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.08);
  }

  endEnemyAdvanceFx(): void {
    const fx = this.enemyAdvanceFx;
    if (fx) {
      fx.mesh.position.x = fx.endX;
      fx.mesh.position.z = fx.endZ;
      fx.mesh.position.y = fx.baseY;
      fx.mesh.scale.setScalar(1);
    }
    this.enemyAdvanceFx = null;
  }

  /** Visual-only: show the resolved monster again so the outcome can play. */
  beginEncounterFx(events: EncounterEvent[], playerCol: number): void {
    this.encounterFx = [];
    for (const event of events) {
      const mesh = this.findMonsterMesh(
        event.monster.row,
        event.monster.col,
        event.monster.renderKey,
      );
      if (!mesh) {
        continue;
      }
      const baseY = monsterBaseY(mesh);
      mesh.visible = true;
      mesh.scale.setScalar(1);
      mesh.position.x = laneWorldX(event.monster.col);
      mesh.position.y = baseY;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = 1;
      this.encounterFx.push({
        event,
        monsterMesh: mesh,
        monsterBaseX: laneWorldX(event.monster.col),
        monsterBaseY: baseY,
        playerBaseX: laneWorldX(playerCol),
      });
    }
  }

  updateEncounterFx(t: number): void {
    const swing = Math.sin(t * Math.PI);
    for (const fx of this.encounterFx) {
      const material = fx.monsterMesh.material as MeshStandardMaterial;
      if (fx.event.kind === 'evade') {
        fx.monsterMesh.scale.setScalar(Math.max(0.02, 1 - t));
        fx.monsterMesh.position.y = fx.monsterBaseY + t * 0.32;
        material.opacity = 1 - t;
        continue;
      }
      if (fx.event.approach === 'surprise') {
        const towardMonster = fx.monsterBaseX - fx.playerBaseX;
        this.playerMesh.position.x = fx.playerBaseX + towardMonster * swing * 0.45;
        this.playerMesh.scale.setScalar(1 + swing * 0.12);
        fx.monsterMesh.position.x = fx.monsterBaseX + towardMonster * swing * 0.18;
        fx.monsterMesh.scale.setScalar(1 - swing * 0.18);
        material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        continue;
      }
      const pulse = 1 + swing * 0.32;
      fx.monsterMesh.scale.setScalar(pulse);
      this.playerMesh.scale.setScalar(pulse);
      material.opacity = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
    }
  }

  beginCombatHit(
    entry: CombatLogEntry,
    playerCol: number,
    monsterRow: number,
    monsterCol: number,
  ): void {
    const mesh = this.findMonsterMesh(monsterRow, monsterCol);
    if (!mesh) {
      this.combatHit = null;
      return;
    }
    mesh.visible = true;
    this.combatHit = {
      attacker: entry.attacker,
      isSurpriseStrike: entry.isSurpriseStrike,
      monsterMesh: mesh,
      monsterBaseX: laneWorldX(monsterCol),
      monsterBaseY: monsterBaseY(mesh),
      playerBaseX: laneWorldX(playerCol),
    };
  }

  updateCombatHit(t: number): void {
    const fx = this.combatHit;
    if (!fx) {
      return;
    }

    const swing = Math.sin(t * Math.PI);
    const towardMonster = fx.monsterBaseX - fx.playerBaseX;
    const playerMaterial = this.playerBody.material as MeshStandardMaterial;
    const monsterMaterial = fx.monsterMesh.material as MeshStandardMaterial;

    if (fx.attacker === 'player') {
      const reach = fx.isSurpriseStrike ? 0.72 : 0.42;
      this.playerMesh.position.x = fx.playerBaseX + towardMonster * swing * reach;
      this.playerMesh.scale.setScalar(1 + swing * (fx.isSurpriseStrike ? 0.22 : 0.1));
      fx.monsterMesh.position.x = fx.monsterBaseX + towardMonster * swing * 0.16;
      fx.monsterMesh.scale.setScalar(1 - swing * 0.14);
      monsterMaterial.emissive.setHex(0xfff1c8);
      monsterMaterial.emissiveIntensity = swing * (fx.isSurpriseStrike ? 1.1 : 0.7);
      playerMaterial.emissive.setHex(fx.isSurpriseStrike ? 0xffe27a : 0x3ecf8e);
      playerMaterial.emissiveIntensity = swing * (fx.isSurpriseStrike ? 0.9 : 0.2);
      return;
    }

    const towardPlayer = fx.playerBaseX - fx.monsterBaseX;
    fx.monsterMesh.position.x = fx.monsterBaseX + towardPlayer * swing * 0.5;
    fx.monsterMesh.scale.setScalar(1 + swing * 0.12);
    this.playerMesh.position.x = fx.playerBaseX + towardPlayer * swing * 0.18;
    this.playerMesh.scale.setScalar(1 - swing * 0.08);
    playerMaterial.emissive.setHex(0xff5a4a);
    playerMaterial.emissiveIntensity = swing * 0.85;
    monsterMaterial.emissive.setHex(0xc4372e);
    monsterMaterial.emissiveIntensity = swing * 0.35;
  }

  endCombatHit(): void {
    const fx = this.combatHit;
    const playerMaterial = this.playerBody.material as MeshStandardMaterial;
    playerMaterial.emissive.setHex(0x000000);
    playerMaterial.emissiveIntensity = 0;
    this.playerMesh.scale.setScalar(1);
    if (fx) {
      fx.monsterMesh.scale.setScalar(1);
      fx.monsterMesh.position.x = fx.monsterBaseX;
      fx.monsterMesh.position.y = fx.monsterBaseY;
      const monsterMaterial = fx.monsterMesh.material as MeshStandardMaterial;
      monsterMaterial.emissive.setHex(0x000000);
      monsterMaterial.emissiveIntensity = 0;
      this.playerMesh.position.x = fx.playerBaseX;
    }
    this.combatHit = null;
  }

  beginMerchantLeaveFx(row: number, col: number): void {
    const group = this.findMerchantGroup(row, col);
    if (!group) {
      return;
    }
    group.visible = true;
    this.merchantLeaveFx = this.merchantLeaveFx.filter((fx) => fx.group !== group);
    this.merchantLeaveFx.push({
      group,
      startedAt: this.clock,
      baseY: group.position.y,
    });
  }

  clearTransientFx(): void {
    this.endEncounterFx();
    this.endCombatHit();
    this.endTrapTriggerFx();
    this.endEnemyAdvanceFx();
    this.collectFx = [];
    this.resetTrapConsumeFx();
    this.resetMerchantLeaveFx();
  }

  endEncounterFx(): void {
    for (const fx of this.encounterFx) {
      fx.monsterMesh.visible = false;
      fx.monsterMesh.scale.setScalar(1);
      fx.monsterMesh.position.x = fx.monsterBaseX;
      fx.monsterMesh.position.y = fx.monsterBaseY;
      (fx.monsterMesh.material as MeshStandardMaterial).opacity = 1;
      this.playerMesh.position.x = fx.playerBaseX;
    }
    this.playerMesh.scale.setScalar(1);
    this.encounterFx = [];
  }

  render(camera: Camera): void {
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private addLights(): void {
    this.scene.add(new HemisphereLight(0xb7c4d4, 0x1b1c20, 0.72));

    const key = new DirectionalLight(0xfff1d2, 0.9);
    key.position.set(3.4, 9.5, 5.2);
    this.scene.add(key);

    const fill = new DirectionalLight(0x8ea4c4, 0.28);
    fill.position.set(-5, 4, -2);
    this.scene.add(fill);
  }

  private buildRowPool(): void {
    const tileGeo = new BoxGeometry(TILE_SIZE, 0.14, TILE_SIZE);
    const hitGeo = new PlaneGeometry(TILE_PITCH * 0.96, TILE_PITCH * 0.96);
    const caveRatGeo = new SphereGeometry(0.28, 10, 8);
    const cryptGuardGeo = new CapsuleGeometry(0.16, 0.52, 4, 8);
    const boneBruteGeo = new BoxGeometry(0.5, 0.62, 0.5);
    const goldGeo = new CylinderGeometry(0.16, 0.16, 0.05, 14);
    const potionGeo = new CapsuleGeometry(0.09, 0.16, 3, 8);
    const stallGeo = new BoxGeometry(0.38, 0.16, 0.26);
    const pillarGeo = new CylinderGeometry(0.07, 0.09, 0.7, 8);
    const hoodGeo = new CylinderGeometry(0.02, 0.16, 0.14, 8);
    const lanternGeo = new SphereGeometry(0.11, 10, 8);
    const trapPlateGeo = new CircleGeometry(0.34, 14);
    const trapRuneGeo = new RingGeometry(0.12, 0.22, 14);
    const trapMarkGeo = new BoxGeometry(0.05, 0.02, 0.12);

    for (let i = 0; i < ROW_POOL_SIZE; i += 1) {
      const group = new Group();
      const tiles: Mesh[] = [];
      const hitPlanes: Mesh[] = [];
      const monsterVariants: Record<EnemyType, Mesh>[] = [];
      const golds: Mesh[] = [];
      const potions: Mesh[] = [];
      const traps: Group[] = [];
      const merchants: Group[] = [];

      for (let col = 0; col < LANE_COUNT; col += 1) {
        const tile = new Mesh(tileGeo, this.floorMaterialA);
        tile.position.set(laneWorldX(col), 0, 0);

        const hit = new Mesh(hitGeo, this.hitMaterial);
        hit.rotation.x = -Math.PI / 2;
        hit.position.set(laneWorldX(col), 0.12, 0);

        const variants = this.createEnemyPlaceholders(
          col,
          caveRatGeo,
          cryptGuardGeo,
          boneBruteGeo,
        );

        const gold = new Mesh(goldGeo, this.goldMaterial.clone());
        gold.position.set(laneWorldX(col), 0.38, 0);
        gold.rotation.x = Math.PI / 2;
        gold.visible = false;

        const potion = new Mesh(potionGeo, this.potionMaterial.clone());
        potion.position.set(laneWorldX(col), 0.42, 0);
        potion.visible = false;

        const merchant = this.createMerchantPlaceholder(
          col,
          stallGeo,
          pillarGeo,
          hoodGeo,
          lanternGeo,
        );
        const trap = this.createTrapPlaceholder(
          col,
          trapPlateGeo,
          trapRuneGeo,
          trapMarkGeo,
        );

        group.add(tile, hit, ...Object.values(variants), gold, potion, trap, merchant);
        tiles.push(tile);
        hitPlanes.push(hit);
        monsterVariants.push(variants);
        golds.push(gold);
        potions.push(potion);
        traps.push(trap);
        merchants.push(merchant);
      }

      this.scene.add(group);
      this.rowViews.push({
        group,
        tiles,
        hitPlanes,
        monsterVariants,
        golds,
        potions,
        traps,
        merchants,
        assignedRow: i,
      });
    }
  }

  private bindRow(view: RowView, row: number, state: GameState): void {
    this.merchantLeaveFx = this.merchantLeaveFx.filter(
      (fx) => !view.merchants.includes(fx.group),
    );
    this.trapConsumeFx = this.trapConsumeFx.filter(
      (fx) => !view.traps.includes(fx.group),
    );
    if (this.trapTrigger && view.traps.includes(this.trapTrigger)) {
      this.endTrapTriggerFx();
    }
    view.assignedRow = row;
    this.applyTileChrome(view, state);
  }

  private applyTileChrome(view: RowView, state: GameState): void {
    const tiles = state.getRow(view.assignedRow);
    for (let col = 0; col < LANE_COUNT; col += 1) {
      const highlighted =
        view.assignedRow === this.highlightRow && this.highlightCols.has(col);
      const mesh = view.tiles[col];
      const hit = view.hitPlanes[col];
      const variants = view.monsterVariants[col];
      const gold = view.golds[col];
      const potion = view.potions[col];
      const trap = view.traps[col];
      const merchant = view.merchants[col];
      const tile = tiles?.[col];

      mesh.userData.row = view.assignedRow;
      mesh.userData.col = col;
      hit.userData.row = view.assignedRow;
      hit.userData.col = col;

      mesh.material = highlighted
        ? this.highlightMaterial
        : (view.assignedRow + col) % 2 === 0
          ? this.floorMaterialA
          : this.floorMaterialB;
      mesh.position.y = highlighted ? 0.05 : 0;
      const renderKey = state.getMonsterAt(view.assignedRow, col)?.renderKey;
      for (const key of ENEMY_RENDER_KEYS) {
        const monster = variants[key];
        const playingMonsterFx =
          this.encounterFx.some((fx) => fx.monsterMesh === monster) ||
          this.combatHit?.monsterMesh === monster ||
          this.enemyAdvanceFx?.mesh === monster;
        monster.visible =
          playingMonsterFx ||
          (tile?.content.type === 'monster' && key === renderKey);
        if (this.enemyAdvanceFx?.mesh === monster) {
          continue;
        }
      }

      const collectingGold = this.collectFx.some((fx) => fx.mesh === gold);
      const collectingPotion = this.collectFx.some((fx) => fx.mesh === potion);
      if (!collectingGold) {
        this.resetCollectibleMesh(gold, col, 0.38, Math.PI / 2);
      }
      if (!collectingPotion) {
        this.resetCollectibleMesh(potion, col, 0.42, 0);
      }
      gold.visible = collectingGold || tile?.content.type === 'gold';
      potion.visible = collectingPotion || tile?.content.type === 'potion';

      const playingTrap =
        this.trapTrigger === trap ||
        this.trapConsumeFx.some((fx) => fx.group === trap);
      if (!playingTrap) {
        this.resetTrapGroup(trap, col);
      }
      trap.visible = playingTrap || tile?.content.type === 'trap';

      const leavingMerchant = this.isMerchantLeaving(merchant);
      if (!leavingMerchant) {
        this.resetMerchantGroup(merchant, col);
      }
      merchant.visible = leavingMerchant || tile?.content.type === 'shop';
    }
  }

  private resetCollectibleMesh(
    mesh: Mesh,
    col: number,
    baseY: number,
    tiltX: number,
  ): void {
    mesh.position.set(laneWorldX(col), baseY, 0);
    mesh.scale.setScalar(1);
    mesh.rotation.set(tiltX, 0, 0);
    const material = mesh.material as MeshStandardMaterial;
    material.opacity = 1;
  }

  private updateCollectibleIdle(elapsedSec: number): void {
    for (const view of this.rowViews) {
      if (!view.group.visible) {
        continue;
      }
      for (let col = 0; col < LANE_COUNT; col += 1) {
        const gold = view.golds[col];
        const potion = view.potions[col];
        const phase = elapsedSec * 3 + view.assignedRow + col;
        if (gold.visible && !this.collectFx.some((fx) => fx.mesh === gold)) {
          gold.position.y = 0.38 + Math.sin(phase) * 0.05;
          gold.rotation.y = elapsedSec * 2.2;
        }
        if (potion.visible && !this.collectFx.some((fx) => fx.mesh === potion)) {
          potion.position.y = 0.42 + Math.sin(phase + 0.8) * 0.05;
          potion.rotation.y = elapsedSec * 1.4;
        }
      }
    }
  }

  private updateCollectFx(elapsedSec: number): void {
    const remaining: CollectFx[] = [];
    for (const fx of this.collectFx) {
      const t = Math.min(1, (elapsedSec - fx.startedAt) / COLLECT_FX_SEC);
      const material = fx.mesh.material as MeshStandardMaterial;
      if (fx.kind === 'gold') {
        fx.mesh.position.y = fx.baseY + t * 0.55;
        fx.mesh.scale.setScalar(1 + t * 0.45);
        fx.mesh.rotation.y += 0.18;
        material.opacity = 1 - t;
      } else {
        fx.mesh.position.y = fx.baseY + t * 0.28;
        fx.mesh.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.35);
        material.emissiveIntensity = 0.4 + (1 - t) * 0.8;
        material.opacity = 1 - t;
      }
      if (t < 1) {
        remaining.push(fx);
        continue;
      }
      fx.mesh.visible = false;
      material.opacity = 1;
      material.emissiveIntensity = fx.kind === 'gold' ? 0.55 : 0.4;
      fx.mesh.scale.setScalar(1);
    }
    this.collectFx = remaining;
  }

  private findMonsterMesh(
    row: number,
    col: number,
    renderKey?: string,
  ): Mesh | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    const variants = view?.monsterVariants[col];
    if (!variants) {
      return undefined;
    }
    if (renderKey && isEnemyRenderKey(renderKey)) {
      return variants[renderKey];
    }
    return ENEMY_RENDER_KEYS.map((key) => variants[key]).find((mesh) => mesh.visible);
  }

  private createEnemyPlaceholders(
    col: number,
    caveRatGeo: SphereGeometry,
    cryptGuardGeo: CapsuleGeometry,
    boneBruteGeo: BoxGeometry,
  ): Record<EnemyType, Mesh> {
    const caveRat = new Mesh(caveRatGeo, this.caveRatMaterial.clone());
    caveRat.position.set(laneWorldX(col), 0.46, 0);
    caveRat.userData.baseY = 0.46;
    caveRat.visible = false;

    const cryptGuard = new Mesh(cryptGuardGeo, this.cryptGuardMaterial.clone());
    cryptGuard.position.set(laneWorldX(col), 0.58, 0);
    cryptGuard.userData.baseY = 0.58;
    cryptGuard.visible = false;

    const boneBrute = new Mesh(boneBruteGeo, this.boneBruteMaterial.clone());
    boneBrute.position.set(laneWorldX(col), 0.52, 0);
    boneBrute.userData.baseY = 0.52;
    boneBrute.visible = false;

    return { caveRat, cryptGuard, boneBrute };
  }

  private createTrapPlaceholder(
    col: number,
    plateGeo: CircleGeometry,
    runeGeo: RingGeometry,
    markGeo: BoxGeometry,
  ): Group {
    const group = new Group();
    group.position.set(laneWorldX(col), 0, 0);

    const plate = new Mesh(plateGeo, this.trapPlateMaterial.clone());
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = 0.085;
    plate.userData.role = 'plate';

    const rune = new Mesh(runeGeo, this.trapRuneMaterial.clone());
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.095;
    rune.userData.role = 'rune';

    const markA = new Mesh(markGeo, this.trapRuneMaterial.clone());
    markA.position.set(0, 0.1, 0);
    const markB = new Mesh(markGeo, this.trapRuneMaterial.clone());
    markB.rotation.y = Math.PI / 2;
    markB.position.set(0, 0.1, 0);

    group.add(plate, rune, markA, markB);
    group.visible = false;
    return group;
  }

  private findTrapGroup(row: number, col: number): Group | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    return view?.traps[col];
  }

  private resetTrapGroup(group: Group, col: number): void {
    group.position.set(laneWorldX(col), 0, 0);
    group.scale.setScalar(1);
    this.setTrapOpacity(group, 1);
    this.setTrapEmissive(group, 0.85);
  }

  private setTrapOpacity(group: Group, opacity: number): void {
    for (const child of group.children) {
      const material = (child as Mesh).material as MeshStandardMaterial | undefined;
      if (material) {
        material.opacity = opacity;
      }
    }
  }

  private setTrapEmissive(group: Group, intensity: number): void {
    for (const child of group.children) {
      const material = (child as Mesh).material as MeshStandardMaterial | undefined;
      if (material) {
        material.emissiveIntensity = intensity;
      }
    }
  }

  private trapColFromGroup(group: Group): number {
    for (const view of this.rowViews) {
      const col = view.traps.indexOf(group);
      if (col >= 0) {
        return col;
      }
    }
    return 1;
  }

  private updateTrapIdle(elapsedSec: number): void {
    for (const view of this.rowViews) {
      if (!view.group.visible) {
        continue;
      }
      for (let col = 0; col < LANE_COUNT; col += 1) {
        const trap = view.traps[col];
        if (
          !trap.visible ||
          this.trapTrigger === trap ||
          this.trapConsumeFx.some((fx) => fx.group === trap)
        ) {
          continue;
        }
        const phase = elapsedSec * 3.1 + view.assignedRow + col;
        const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(phase));
        this.setTrapEmissive(trap, pulse);
        trap.position.y = Math.sin(phase * 0.7) * 0.012;
      }
    }
  }

  private updateTrapConsumeFx(elapsedSec: number): void {
    const remaining: TrapConsumeFx[] = [];
    for (const fx of this.trapConsumeFx) {
      const t = Math.min(1, (elapsedSec - fx.startedAt) / COLLECT_FX_SEC);
      fx.group.scale.setScalar(Math.max(0.02, 1 - t));
      this.setTrapOpacity(fx.group, 1 - t);
      this.setTrapEmissive(fx.group, 0.85 + (1 - t) * 1.1);
      if (t < 1) {
        remaining.push(fx);
        continue;
      }
      fx.group.visible = false;
      this.resetTrapGroup(fx.group, this.trapColFromGroup(fx.group));
    }
    this.trapConsumeFx = remaining;
  }

  private resetTrapConsumeFx(): void {
    for (const fx of this.trapConsumeFx) {
      fx.group.visible = false;
      this.resetTrapGroup(fx.group, this.trapColFromGroup(fx.group));
    }
    this.trapConsumeFx = [];
  }

  private findGoldMesh(row: number, col: number): Mesh | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    return view?.golds[col];
  }

  private findPotionMesh(row: number, col: number): Mesh | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    return view?.potions[col];
  }

  private findMerchantGroup(row: number, col: number): Group | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    return view?.merchants[col];
  }

  private createMerchantPlaceholder(
    col: number,
    stallGeo: BoxGeometry,
    pillarGeo: CylinderGeometry,
    hoodGeo: CylinderGeometry,
    lanternGeo: SphereGeometry,
  ): Group {
    const group = new Group();
    group.position.set(laneWorldX(col), 0, 0);

    const stall = new Mesh(stallGeo, this.merchantStallMaterial.clone());
    stall.position.set(0.14, 0.18, 0.02);

    const pillar = new Mesh(pillarGeo, this.merchantPillarMaterial.clone());
    pillar.position.set(-0.05, 0.45, 0);

    const lantern = new Mesh(lanternGeo, this.merchantLanternMaterial.clone());
    lantern.position.set(-0.05, 0.78, 0);
    lantern.userData.role = 'lantern';

    const hood = new Mesh(hoodGeo, this.merchantHoodMaterial.clone());
    hood.position.set(-0.05, 0.9, 0);

    group.add(stall, pillar, lantern, hood);
    group.visible = false;
    return group;
  }

  private resetMerchantGroup(group: Group, col: number): void {
    group.position.set(laneWorldX(col), 0, 0);
    group.scale.setScalar(1);
    for (const child of group.children) {
      const mesh = child as Mesh;
      const material = mesh.material as MeshStandardMaterial | undefined;
      if (material) {
        material.opacity = 1;
      }
    }
  }

  private isMerchantLeaving(group: Group): boolean {
    return this.merchantLeaveFx.some((fx) => fx.group === group);
  }

  private updateMerchantIdle(elapsedSec: number): void {
    for (const view of this.rowViews) {
      if (!view.group.visible) {
        continue;
      }
      for (let col = 0; col < LANE_COUNT; col += 1) {
        const merchant = view.merchants[col];
        if (!merchant.visible || this.isMerchantLeaving(merchant)) {
          continue;
        }
        const phase = elapsedSec * 2.2 + view.assignedRow + col;
        merchant.position.y = Math.sin(phase) * 0.045;
        const lantern = merchant.children.find(
          (child) => child.userData.role === 'lantern',
        ) as Mesh | undefined;
        if (lantern) {
          const material = lantern.material as MeshStandardMaterial;
          material.emissiveIntensity = 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(phase * 1.6));
        }
      }
    }
  }

  private updateMerchantLeaveFx(elapsedSec: number): void {
    const remaining: MerchantLeaveFx[] = [];
    for (const fx of this.merchantLeaveFx) {
      const t = Math.min(1, (elapsedSec - fx.startedAt) / MERCHANT_LEAVE_FX_SEC);
      fx.group.position.y = fx.baseY + t * 0.38;
      fx.group.scale.setScalar(Math.max(0.02, 1 - t * 0.88));
      this.setMerchantOpacity(fx.group, 1 - t);
      if (t < 1) {
        remaining.push(fx);
        continue;
      }
      fx.group.visible = false;
      this.resetMerchantGroup(
        fx.group,
        this.merchantColFromGroup(fx.group),
      );
    }
    this.merchantLeaveFx = remaining;
  }

  private resetMerchantLeaveFx(): void {
    for (const fx of this.merchantLeaveFx) {
      fx.group.visible = false;
      this.resetMerchantGroup(fx.group, this.merchantColFromGroup(fx.group));
    }
    this.merchantLeaveFx = [];
  }

  private setMerchantOpacity(group: Group, opacity: number): void {
    for (const child of group.children) {
      const material = (child as Mesh).material as MeshStandardMaterial | undefined;
      if (material) {
        material.opacity = opacity;
      }
    }
  }

  private merchantColFromGroup(group: Group): number {
    for (const view of this.rowViews) {
      const col = view.merchants.indexOf(group);
      if (col >= 0) {
        return col;
      }
    }
    return 1;
  }

  private createPlayer(): { group: Group; body: Mesh } {
    const group = new Group();

    const body = new Mesh(
      new CapsuleGeometry(0.22, 0.42, 4, 8),
      new MeshStandardMaterial({
        color: 0x3ecf8e,
        roughness: 0.38,
        metalness: 0.16,
      }),
    );

    const shadow = new Mesh(
      new CircleGeometry(0.28, 16),
      new MeshStandardMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.32,
        roughness: 1,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.54;

    group.add(shadow, body);
    group.position.set(0, 0.62, 0);
    return { group, body };
  }
}

function monsterBaseY(mesh: Mesh): number {
  return typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : 0.46;
}

function isEnemyRenderKey(key: string): key is EnemyType {
  return (ENEMY_RENDER_KEYS as readonly string[]).includes(key);
}
