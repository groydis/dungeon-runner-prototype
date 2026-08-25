import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
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
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  SpotLight,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
  type Camera,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import {
  COLLECT_FX_SEC,
  COMBAT_HIT_SEC,
  ENCOUNTER_FX_SEC,
  ENEMY_DEATH_FADE_SEC,
  LANE_COUNT,
  MERCHANT_LEAVE_FX_SEC,
  PLAYER_WORLD_Z,
  ROW_POOL_SIZE,
  TILE_PITCH,
  TILE_SIZE,
  TRAILING_ROW_COUNT,
  laneWorldX,
  rowWorldZ,
} from '../game/config';
import { type CombatLogEntry } from '../game/combat';
import {
  tileAt,
  type BoardSnapshot,
  type EnemyMoveResult,
  type PickupResult,
} from '../game/BoardSnapshot';
import { type CollectibleKind } from '../game/Collectible';
import { type EncounterEvent } from '../game/encounters';
import { type PlayerRenderKey } from '../game/definitions/classes';
import { type EnemyDropResult } from '../game/definitions/enemies';
import { type EnemyWeaponVariant } from '../game/definitions/enemyWeapons';
import {
  coinModelSizeForPickup,
  potionModelSizeForPickup,
} from '../game/definitions/pickupCatalog';
import {
  ENEMY_RENDER_KEYS,
  enemyAttackClip,
  enemyModelUrl,
  enemySpawnClip,
  fitEnemyModel,
  loadEnemyClips,
  loadEnemyTemplate,
  type EnemyRenderKey,
} from './enemyAssets';
import {
  enemyEquipmentLoadout,
  enemyWeaponVariantsEqual,
} from './enemyEquipment';
import {
  DUNGEON_FLOOR_KEYS,
  DUNGEON_WALL_KEYS,
  dungeonFloorRotation,
  dungeonFloorVariant,
  dungeonWallTorchSide,
  dungeonWallTransmitsLight,
  dungeonWallVariant,
  fitDungeonFloorModel,
  fitDungeonTrapModel,
  fitDungeonWallModel,
  fitDungeonWallTorch,
  loadDungeonFloorTemplate,
  loadDungeonTrapTemplate,
  loadDungeonWallTemplate,
  loadDungeonWallTorchTemplate,
  type DungeonFloorAssetKey,
  type DungeonWallAssetKey,
  type DungeonWallSide,
} from './environmentAssets';
import {
  fitPlayerModel,
  loadPlayerClips,
  loadPlayerTemplate,
  playerModelUrl,
  playerAttackClip,
  type PlayerClipMap,
} from './playerAssets';
import {
  FLOOR_COIN_MODEL_SIZES,
  fitCoinModel,
  loadCoinTemplate,
  type CoinModelSize,
} from './coinAssets';
import {
  FLOOR_POTION_MODEL_SIZES,
  fitPotionModel,
  loadPotionTemplate,
  type PotionModelSize,
} from './potionAssets';
import {
  fitMerchantModel,
  loadMerchantClips,
  loadMerchantTemplate,
} from './merchantAssets';
import {
  NO_EQUIPMENT_UPGRADES,
  PLAYER_WEAPON_MOUNT_NAME,
  loadPlayerEquipmentTemplate,
  playerEquipmentLoadout,
  playerEquipmentMountNames,
  playerEquipmentUrl,
  playerProjectileKind,
  type PlayerEquipmentUpgradeLevels,
  type PlayerEquipmentVisual,
} from './playerEquipment';
import { type RigMediumClipMap } from './rigMediumAnimations';
import {
  fitCombatProjectile,
  loadCombatProjectileTemplate,
  PROJECTILE_POOL_SIZE,
  type CombatProjectileKind,
} from './combatPresentationAssets';

interface EnemySlot {
  key: EnemyRenderKey;
  col: number;
  group: Group;
  placeholder: Mesh;
  model: Group | null;
  mixer: AnimationMixer | null;
  clips: RigMediumClipMap;
  materials: MeshStandardMaterial[];
  loopAction: AnimationAction | null;
  oneShotAction: AnimationAction | null;
  loadToken: number;
  occupantId: string | null;
  weaponVariant: EnemyWeaponVariant | null;
  equipmentMounts: Group[];
  equipmentLoadToken: number;
  dying: boolean;
  deathFadeStartedAt: number | null;
  attackSequence: number;
}

interface DungeonWallSlot {
  side: DungeonWallSide;
  group: Group;
  placeholder: Mesh;
  models: Partial<Record<DungeonWallAssetKey, Group>>;
  assetKey: DungeonWallAssetKey;
  torchModel: Group | null;
  torchGlow: DungeonTorchGlow | null;
  windowLight: Group;
}

interface DungeonTorchGlow {
  group: Group;
  core: Mesh;
  halo: Mesh;
  light: PointLight;
}

interface RowView {
  group: Group;
  tiles: Mesh[];
  floorModels: Partial<Record<DungeonFloorAssetKey, Group>>[];
  floorAssetKeys: (DungeonFloorAssetKey | null)[];
  hitPlanes: Mesh[];
  enemySlots: Record<EnemyRenderKey, EnemySlot>[];
  golds: Mesh[];
  potions: Mesh[];
  traps: Group[];
  merchants: Group[];
  walls: Record<DungeonWallSide, DungeonWallSlot>;
  assignedRow: number;
}

interface EncounterFxView {
  event: EncounterEvent;
  monsterMesh: Group;
  monsterBaseX: number;
  monsterBaseY: number;
  monsterBaseZ: number;
  monsterBaseRotationY: number;
  playerBaseX: number;
  playerBaseRotationY: number;
}

interface CombatHitFx {
  attacker: CombatLogEntry['attacker'];
  isSurpriseStrike: boolean;
  monsterMesh: Group;
  monsterBaseX: number;
  monsterBaseY: number;
  monsterBaseRotationY: number;
  playerBaseX: number;
  playerBaseRotationY: number;
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

interface MerchantPresentation {
  model: Group | null;
  mixer: AnimationMixer | null;
}

interface TrapConsumeFx {
  group: Group;
  startedAt: number;
}

interface EnemyAdvanceFx {
  mesh: Group;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  baseY: number;
}

interface DropSpawnFx {
  kind: CollectibleKind;
  mesh: Mesh;
  baseY: number;
}

interface ProjectileFx {
  group: Group;
  start: Vector3;
  end: Vector3;
}

const TRAP_SPIKE_RETRACTION = 1.35;
const TRAP_SPIKE_IDLE_EXTENSION = 0.22;
const COMBAT_FLASH_RED = 0xff5a4a;
const TORCH_LIGHT_COLOR = 0xff7a32;
const TORCH_LIGHT_INTENSITY = 3.4;
const TORCH_LIGHT_DISTANCE = TILE_PITCH * 2.8;
const WINDOW_BEAM_COLOR = 0xffd69a;
const WINDOW_LIGHT_REACH = TILE_PITCH * 1.12;

export class SceneManager {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;

  private readonly rowViews: RowView[] = [];
  private readonly playerMesh: Group;
  private readonly playerBody: Mesh;
  private playerModel: Group | null = null;
  private playerMixer: AnimationMixer | null = null;
  private playerClips: PlayerClipMap = {};
  private playerLoopAction: AnimationAction | null = null;
  private playerOneShotAction: AnimationAction | null = null;
  private playerModelMaterials: MeshStandardMaterial[] = [];
  private playerRenderKey: PlayerRenderKey | null = null;
  private playerEquipmentMounts: Group[] = [];
  private playerEquipmentUpgrades: PlayerEquipmentUpgradeLevels =
    NO_EQUIPMENT_UPGRADES;
  private playerSpecialEquipmentEquipped = false;
  private playerEquipmentLoadToken = 0;
  private playerAttackSequence = 0;
  private playerLoadToken = 0;
  private playerMoving = false;
  private playerDead = false;
  private readonly floorMaterialA: MeshStandardMaterial;
  private readonly floorMaterialB: MeshStandardMaterial;
  private readonly wallFallbackMaterial: MeshStandardMaterial;
  private readonly highlightMaterial: MeshStandardMaterial;
  private readonly skeletonMinionMaterial: MeshStandardMaterial;
  private readonly cryptGuardMaterial: MeshStandardMaterial;
  private readonly boneBruteMaterial: MeshStandardMaterial;
  private readonly skeletonMageMaterial: MeshStandardMaterial;
  private readonly necromancerMaterial: MeshStandardMaterial;
  private readonly goldMaterial: MeshStandardMaterial;
  private readonly potionMaterial: MeshStandardMaterial;
  private readonly coinTemplates = new Map<CoinModelSize, Group>();
  private readonly potionTemplates = new Map<PotionModelSize, Group>();
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
  private readonly merchantPresentations = new WeakMap<
    Group,
    MerchantPresentation
  >();
  private trapTrigger: Group | null = null;
  private trapConsumeFx: TrapConsumeFx[] = [];
  private enemyAdvanceFx: EnemyAdvanceFx | null = null;
  private dropSpawnFx: DropSpawnFx | null = null;
  private readonly projectilePools: Partial<
    Record<CombatProjectileKind, Group[]>
  > = {};
  private readonly projectilePoolPromises = new Map<
    CombatProjectileKind,
    Promise<void>
  >();
  private activeProjectile: ProjectileFx | null = null;
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
    this.wallFallbackMaterial = new MeshStandardMaterial({
      color: 0x4a4e55,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.highlightMaterial = new MeshStandardMaterial({
      color: 0x6d7f4c,
      emissive: 0x7dff6a,
      emissiveIntensity: 0.28,
      roughness: 0.62,
      metalness: 0.08,
    });
    this.skeletonMinionMaterial = new MeshStandardMaterial({
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
    this.skeletonMageMaterial = new MeshStandardMaterial({
      color: 0x7656c7,
      emissive: 0x47318f,
      emissiveIntensity: 0.28,
      roughness: 0.4,
      metalness: 0.12,
      transparent: true,
      opacity: 1,
    });
    this.necromancerMaterial = new MeshStandardMaterial({
      color: 0x34204f,
      emissive: 0x9b45d6,
      emissiveIntensity: 0.48,
      roughness: 0.34,
      metalness: 0.16,
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
    void this.installDungeonFloorModels();
    void this.installDungeonWallModels();
    void this.installDungeonTrapModels();
    void this.installCoinModels();
    void this.installPotionModels();
    void this.installMerchantModels();
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
    this.playerMesh.position.set(colX, 0.62 + hopY, PLAYER_WORLD_Z);
  }

  setPlayerRenderKey(renderKey: PlayerRenderKey | null): void {
    if (renderKey === this.playerRenderKey) {
      return;
    }
    this.playerRenderKey = renderKey;
    if (!renderKey) {
      this.playerEquipmentUpgrades = NO_EQUIPMENT_UPGRADES;
      this.playerSpecialEquipmentEquipped = false;
      this.playerAttackSequence = 0;
    }
    this.playerLoadToken += 1;
    this.playerMoving = false;
    this.playerDead = false;
    this.removePlayerModel();
    if (!renderKey) {
      return;
    }
    const projectileKind = playerProjectileKind(
      renderKey,
      this.playerEquipmentUpgrades,
    );
    if (projectileKind) {
      void this.prepareProjectilePool(projectileKind);
    }
    void this.installPlayerModel(renderKey, this.playerLoadToken);
  }

  setPlayerEquipmentUpgradeLevels(
    upgrades: PlayerEquipmentUpgradeLevels,
  ): void {
    const normalized = {
      sharpened: Math.max(0, upgrades.sharpened),
      armoured: Math.max(0, upgrades.armoured),
    };
    if (
      normalized.sharpened === this.playerEquipmentUpgrades.sharpened &&
      normalized.armoured === this.playerEquipmentUpgrades.armoured
    ) {
      return;
    }
    this.playerEquipmentUpgrades = normalized;
    const projectileKind = playerProjectileKind(
      this.playerRenderKey,
      this.playerEquipmentUpgrades,
    );
    if (projectileKind) {
      void this.prepareProjectilePool(projectileKind);
    }
    if (this.playerModel && this.playerRenderKey) {
      void this.installPlayerEquipmentLoadout(
        this.playerModel,
        this.playerRenderKey,
        this.playerLoadToken,
      );
    }
  }

  setPlayerSpecialEquipmentEquipped(equipped: boolean): void {
    if (equipped === this.playerSpecialEquipmentEquipped) {
      return;
    }
    this.playerSpecialEquipmentEquipped = equipped;
    if (this.playerModel && this.playerRenderKey) {
      void this.installPlayerEquipmentLoadout(
        this.playerModel,
        this.playerRenderKey,
        this.playerLoadToken,
      );
    }
  }

  setPlayerMoving(moving: boolean): void {
    if (this.playerMoving === moving) {
      return;
    }
    this.playerMoving = moving;
    if (!this.playerDead && !this.playerOneShotAction) {
      this.playPlayerLocomotion(false);
    }
  }

  playPlayerHit(): void {
    if (this.playerDead) {
      return;
    }
    this.playPlayerOneShot(
      this.playerRenderKey === 'knight'
        ? (this.playerClips.blockHit ?? this.playerClips.hit)
        : this.playerClips.hit,
      this.playerRenderKey === 'knight' ? 'block' : 'hit',
    );
  }

  playPlayerAttack(): void {
    if (this.playerDead) {
      return;
    }
    const clip = playerAttackClip(
      this.playerRenderKey,
      this.playerClips,
      this.playerAttackSequence,
      this.playerEquipmentUpgrades.sharpened,
    );
    this.playerAttackSequence += 1;
    this.playPlayerOneShot(clip, 'attack');
  }

  playPlayerPickup(kind: CollectibleKind): void {
    if (this.playerDead) {
      return;
    }
    this.playPlayerOneShot(
      kind === 'potion' ? this.playerClips.useItem : this.playerClips.pickup,
      kind === 'potion' ? 'item' : 'pickup',
    );
  }

  playPlayerDeath(): void {
    this.playerDead = true;
    this.playPlayerOneShot(this.playerClips.death, 'death');
  }

  playEnemyHit(target: { id: string; row: number; col: number; renderKey: EnemyRenderKey }): void {
    const slot = this.findEnemySlot(target.row, target.col, target.renderKey, target.id);
    if (!slot || slot.dying) {
      return;
    }
    this.playEnemyOneShot(slot, slot.clips.hit, 'hit');
  }

  playEnemyAttack(target: {
    id: string;
    row: number;
    col: number;
    renderKey: EnemyRenderKey;
  }): void {
    const slot = this.findEnemySlot(
      target.row,
      target.col,
      target.renderKey,
      target.id,
    );
    if (!slot || slot.dying) {
      return;
    }
    const clip = enemyAttackClip(slot.key, slot.clips, slot.attackSequence);
    slot.attackSequence += 1;
    this.playEnemyOneShot(slot, clip, 'attack');
  }

  playEnemyTaunt(target: {
    id: string;
    row: number;
    col: number;
    renderKey: EnemyRenderKey;
  }): void {
    const slot = this.findEnemySlot(
      target.row,
      target.col,
      target.renderKey,
      target.id,
    );
    if (!slot || slot.dying) {
      return;
    }
    this.playEnemyOneShot(slot, slot.clips.skeletonTaunt, 'taunt');
  }

  playEnemyDeath(target: {
    id: string;
    row: number;
    col: number;
    renderKey: EnemyRenderKey;
  }): void {
    const slot = this.findEnemySlot(
      target.row,
      target.col,
      target.renderKey,
      target.id,
    );
    if (!slot) {
      return;
    }
    const clip = slot.clips.skeletonDeath ?? slot.clips.death;
    slot.dying = true;
    slot.deathFadeStartedAt = null;
    slot.group.visible = true;
    this.playEnemyOneShot(slot, clip, 'death');
  }

  isEnemyDeathPresentationComplete(target: { id: string }): boolean {
    return !this.findEnemySlotById(target.id)?.dying;
  }

  /** Initial bind of the recycled row pool to the current logical window. */
  bindWindow(
    snapshot: BoardSnapshot,
    presentation: { interactive: boolean },
  ): void {
    for (let i = 0; i < this.rowViews.length; i += 1) {
      const row = snapshot.originRow - TRAILING_ROW_COUNT + i;
      this.bindRow(this.rowViews[i], row, snapshot);
    }
    this.refreshHighlights(snapshot, presentation);
    this.layoutRows(snapshot.originRow);
    this.setPlayerVisual(laneWorldX(snapshot.originCol), 0);
    this.setPlayerRenderKey(snapshot.playerRenderKey);
  }

  /**
   * Reuses the row that just left the screen as the new far row
   * instead of allocating more meshes.
   */
  recycleDepartingRow(leftBehindRow: number, snapshot: BoardSnapshot): void {
    const departingRow = leftBehindRow - TRAILING_ROW_COUNT;
    const farRow =
      snapshot.playerRow + ROW_POOL_SIZE - TRAILING_ROW_COUNT - 1;
    const view = this.rowViews.find(
      (rowView) => rowView.assignedRow === departingRow,
    );
    if (view) {
      this.bindRow(view, farRow, snapshot);
    }
  }

  refreshHighlights(
    snapshot: BoardSnapshot,
    presentation: { interactive: boolean },
  ): void {
    this.highlightRow =
      presentation.interactive && snapshot.hasSelectedClass
        ? snapshot.playerRow + 1
        : Number.NaN;
    this.highlightCols.clear();
    if (presentation.interactive) {
      for (const col of snapshot.legalMoveCols) {
        this.highlightCols.add(col);
      }
    }
    for (const view of this.rowViews) {
      this.applyTileChrome(view, snapshot);
    }
  }

  layoutRows(anchorRow: number): void {
    for (const view of this.rowViews) {
      const z = rowWorldZ(view.assignedRow, anchorRow, this.scrollZ);
      view.group.position.z = z;
      // Hide tiles once they pass the trailing slot toward the camera so recycle pops stay off-screen.
      view.group.visible = z < PLAYER_WORLD_Z + TILE_PITCH * 1.55;
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
    const dt = Math.min(0.05, Math.max(0, elapsedSec - this.clock));
    this.clock = elapsedSec;
    this.playerMixer?.update(dt);
    this.updateEnemyMixers(dt);
    this.updateEnemyDeathFades(elapsedSec);
    const pulse = 0.22 + 0.18 * Math.sin(elapsedSec * 3.4);
    this.highlightMaterial.emissiveIntensity = pulse;
    this.updateCollectibleIdle(elapsedSec);
    this.updateCollectFx(elapsedSec);
    this.updateTrapIdle(elapsedSec);
    this.updateTrapConsumeFx(elapsedSec);
    this.updateMerchantIdle(elapsedSec);
    this.updateMerchantMixers(dt);
    this.updateMerchantLeaveFx(elapsedSec);
    this.updateDungeonTorchFlicker(elapsedSec);
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

  beginDropSpawnFx(drop: EnemyDropResult): void {
    const mesh =
      drop.kind === 'gold'
        ? this.findGoldMesh(drop.row, drop.col)
        : this.findPotionMesh(drop.row, drop.col);
    if (!mesh) {
      this.dropSpawnFx = null;
      return;
    }
    const baseY = drop.kind === 'gold' ? 0.38 : 0.42;
    mesh.visible = true;
    mesh.scale.setScalar(0.15);
    mesh.position.y = baseY + 0.28;
    this.setCollectibleOpacity(mesh, 0.2);
    this.setCollectibleEmissive(mesh, 1.2);
    this.dropSpawnFx = {
      kind: drop.kind,
      mesh,
      baseY,
    };
  }

  updateDropSpawnFx(t: number): void {
    const fx = this.dropSpawnFx;
    if (!fx) {
      return;
    }
    const bounce = 1 - (1 - t) ** 3;
    fx.mesh.visible = true;
    fx.mesh.scale.setScalar(0.15 + bounce * 0.95);
    fx.mesh.position.y = fx.baseY + (1 - bounce) * 0.28;
    this.setCollectibleOpacity(fx.mesh, 0.2 + bounce * 0.8);
    this.setCollectibleEmissive(fx.mesh, 1.2 - bounce * 0.6);
  }

  endDropSpawnFx(): void {
    const fx = this.dropSpawnFx;
    if (fx) {
      this.setCollectibleOpacity(fx.mesh, 1);
      this.setCollectibleEmissive(
        fx.mesh,
        fx.kind === 'gold' ? 0.55 : 0.4,
      );
      fx.mesh.scale.setScalar(1);
      fx.mesh.position.y = fx.baseY;
    }
    this.dropSpawnFx = null;
  }

  beginItemConsumeFx(kind: CollectibleKind, row: number, col: number): void {
    this.beginCollectFx({
      kind,
      pickupId: kind === 'gold' ? 'gold' : 'potion',
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
    const rise = 1 - (1 - Math.min(1, t / 0.42)) ** 3;
    if (this.setTrapSpikeExtension(group, rise)) {
      group.scale.setScalar(1);
      this.setTrapOpacity(group, 1);
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
    const slot = this.findSlotByGroup(mesh);
    if (slot && !slot.dying) {
      this.playEnemyLocomotion(slot, true, false);
    }
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
      const slot = this.findSlotByGroup(fx.mesh);
      if (slot && !slot.dying) {
        this.playEnemyLocomotion(slot, false, false);
      }
    }
    this.enemyAdvanceFx = null;
  }

  /** Visual-only: show the resolved monster again so the outcome can play. */
  beginEncounterFx(events: EncounterEvent[], playerCol: number): void {
    this.encounterFx = [];
    const playerBaseRotationY = this.playerMesh.rotation.y;
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
      this.setEnemyOpacity(mesh, 1);
      const monsterBaseRotationY = mesh.rotation.y;
      this.facePlayerAndEnemy(mesh);
      if (event.kind === 'evade') {
        const slot = this.findSlotByGroup(mesh);
        if (slot) {
          this.playEnemyLocomotion(slot, true, false);
        }
        const fleeDirection =
          Math.sign(mesh.position.x - laneWorldX(playerCol)) || 1;
        mesh.rotation.y = fleeDirection * (Math.PI / 2);
      }
      this.encounterFx.push({
        event,
        monsterMesh: mesh,
        monsterBaseX: laneWorldX(event.monster.col),
        monsterBaseY: baseY,
        monsterBaseZ: mesh.position.z,
        monsterBaseRotationY,
        playerBaseX: laneWorldX(playerCol),
        playerBaseRotationY,
      });
    }
  }

  private facePlayerAndEnemy(monsterMesh: Group): void {
    const playerPosition = this.playerMesh.getWorldPosition(new Vector3());
    const monsterPosition = monsterMesh.getWorldPosition(new Vector3());
    const dx = monsterPosition.x - playerPosition.x;
    const dz = monsterPosition.z - playerPosition.z;
    if (Math.hypot(dx, dz) < 0.001) {
      return;
    }
    // KayKit players face -Z and skeletons face +Z at wrapper yaw 0, so the
    // same wrapper yaw turns their opposite forward axes toward one another.
    const facingYaw = Math.atan2(-dx, -dz);
    this.playerMesh.rotation.y = facingYaw;
    monsterMesh.rotation.y = facingYaw;
  }

  updateEncounterFx(t: number): void {
    for (const fx of this.encounterFx) {
      if (fx.event.kind === 'evade') {
        // The skeleton leg cycle is authored KayKit animation; this off-board
        // wrapper translation and late fade are procedural Three.js motion.
        const eased = t * t * (3 - 2 * t);
        const fleeDirection = Math.sign(fx.monsterBaseX - fx.playerBaseX) || 1;
        fx.monsterMesh.position.x =
          fx.monsterBaseX + fleeDirection * TILE_PITCH * 2.4 * eased;
        fx.monsterMesh.position.y = fx.monsterBaseY;
        fx.monsterMesh.scale.setScalar(1);
        this.setEnemyOpacity(
          fx.monsterMesh,
          t > 0.68 ? 1 - (t - 0.68) / 0.32 : 1,
        );
      }
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
    const monsterBaseRotationY = mesh.rotation.y;
    const playerBaseRotationY = this.playerMesh.rotation.y;
    this.facePlayerAndEnemy(mesh);
    this.combatHit = {
      attacker: entry.attacker,
      isSurpriseStrike: entry.isSurpriseStrike,
      monsterMesh: mesh,
      monsterBaseX: laneWorldX(monsterCol),
      monsterBaseY: monsterBaseY(mesh),
      monsterBaseRotationY,
      playerBaseX: laneWorldX(playerCol),
      playerBaseRotationY,
    };
    if (entry.attacker === 'player') {
      this.launchPlayerProjectile(mesh);
    }
  }

  updateCombatHit(t: number): void {
    const fx = this.combatHit;
    if (!fx) {
      return;
    }

    // Authored KayKit attack/hit/death clips supply character motion. Three.js
    // only carries projectile travel and material flashes during combat hits.
    const swing = Math.sin(t * Math.PI);
    const playerMaterials = this.playerFlashMaterials();
    const monsterMaterials = this.enemyFlashMaterials(fx.monsterMesh);
    if (this.activeProjectile) {
      const travel = Math.min(1, t * 1.35);
      this.activeProjectile.group.position.lerpVectors(
        this.activeProjectile.start,
        this.activeProjectile.end,
        travel,
      );
    }

    if (fx.attacker === 'player') {
      this.flashPlayerMaterials(
        monsterMaterials,
        COMBAT_FLASH_RED,
        swing * (fx.isSurpriseStrike ? 1.1 : 0.7),
      );
      this.flashPlayerMaterials(
        playerMaterials,
        COMBAT_FLASH_RED,
        swing * (fx.isSurpriseStrike ? 0.9 : 0.2),
      );
      return;
    }

    this.flashPlayerMaterials(playerMaterials, COMBAT_FLASH_RED, swing * 0.85);
    this.flashPlayerMaterials(monsterMaterials, COMBAT_FLASH_RED, swing * 0.35);
  }

  endCombatHit(): void {
    const fx = this.combatHit;
    this.flashPlayerMaterials(this.playerFlashMaterials(), 0x000000, 0);
    this.playerMesh.scale.setScalar(1);
    if (fx) {
      fx.monsterMesh.scale.setScalar(1);
      fx.monsterMesh.position.x = fx.monsterBaseX;
      fx.monsterMesh.position.y = fx.monsterBaseY;
      fx.monsterMesh.rotation.y = fx.monsterBaseRotationY;
      this.flashPlayerMaterials(
        this.enemyFlashMaterials(fx.monsterMesh),
        0x000000,
        0,
      );
      this.playerMesh.position.x = fx.playerBaseX;
      this.playerMesh.rotation.y = fx.playerBaseRotationY;
    }
    this.releaseActiveProjectile();
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
    this.endDropSpawnFx();
    this.collectFx = [];
    this.resetTrapConsumeFx();
    this.resetMerchantLeaveFx();
    this.releaseActiveProjectile();
  }

  endEncounterFx(): void {
    for (const fx of this.encounterFx) {
      const evaded = fx.event.kind === 'evade';
      fx.monsterMesh.visible = !evaded;
      fx.monsterMesh.scale.setScalar(1);
      fx.monsterMesh.position.x = fx.monsterBaseX;
      fx.monsterMesh.position.y = fx.monsterBaseY;
      fx.monsterMesh.position.z = fx.monsterBaseZ;
      fx.monsterMesh.rotation.y = fx.monsterBaseRotationY;
      this.setEnemyOpacity(fx.monsterMesh, 1);
      this.playerMesh.position.x = fx.playerBaseX;
      this.playerMesh.rotation.y = fx.playerBaseRotationY;
      const slot = this.findSlotByGroup(fx.monsterMesh);
      if (slot && !evaded) {
        this.playEnemyLocomotion(slot, false, false);
      }
    }
    this.playerMesh.scale.setScalar(1);
    this.encounterFx = [];
  }

  render(camera: Camera): void {
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.playerLoadToken += 1;
    this.removePlayerModel();
    for (const view of this.rowViews) {
      this.releaseRowEnemySlots(view);
    }
    for (const pool of Object.values(this.projectilePools)) {
      for (const projectile of pool ?? []) {
        projectile.removeFromParent();
      }
    }
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
    const wallGeo = new BoxGeometry(TILE_PITCH / 4, TILE_PITCH, TILE_PITCH);
    const skeletonMinionGeo = new SphereGeometry(0.28, 10, 8);
    const cryptGuardGeo = new CapsuleGeometry(0.16, 0.52, 4, 8);
    const boneBruteGeo = new BoxGeometry(0.5, 0.62, 0.5);
    const goldGeo = new CylinderGeometry(0.16, 0.16, 0.05, 14);
    // Bake flat-coin orientation so parent rotation stays identity for child GLBs.
    goldGeo.rotateX(Math.PI / 2);
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
      const floorModels: Partial<Record<DungeonFloorAssetKey, Group>>[] = [];
      const floorAssetKeys: (DungeonFloorAssetKey | null)[] = [];
      const hitPlanes: Mesh[] = [];
      const enemySlots: Record<EnemyRenderKey, EnemySlot>[] = [];
      const golds: Mesh[] = [];
      const potions: Mesh[] = [];
      const traps: Group[] = [];
      const merchants: Group[] = [];
      const walls: Record<DungeonWallSide, DungeonWallSlot> = {
        left: this.createDungeonWallSlot('left', wallGeo),
        right: this.createDungeonWallSlot('right', wallGeo),
      };

      group.add(walls.left.group, walls.right.group);

      for (let col = 0; col < LANE_COUNT; col += 1) {
        const tile = new Mesh(tileGeo, this.floorMaterialA);
        tile.position.set(laneWorldX(col), 0, 0);

        const hit = new Mesh(hitGeo, this.hitMaterial);
        hit.rotation.x = -Math.PI / 2;
        hit.position.set(laneWorldX(col), 0.12, 0);

        const variants = this.createEnemySlots(
          col,
          skeletonMinionGeo,
          cryptGuardGeo,
          boneBruteGeo,
        );

        const gold = new Mesh(goldGeo, this.goldMaterial.clone());
        gold.position.set(laneWorldX(col), 0.38, 0);
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

        group.add(tile, hit, ...Object.values(variants).map((slot) => slot.group), gold, potion, trap, merchant);
        tiles.push(tile);
        floorModels.push({});
        floorAssetKeys.push(dungeonFloorVariant(i, col));
        hitPlanes.push(hit);
        enemySlots.push(variants);
        golds.push(gold);
        potions.push(potion);
        traps.push(trap);
        merchants.push(merchant);
      }

      this.scene.add(group);
      this.rowViews.push({
        group,
        tiles,
        floorModels,
        floorAssetKeys,
        hitPlanes,
        enemySlots,
        golds,
        potions,
        traps,
        merchants,
        walls,
        assignedRow: i,
      });
    }
  }

  private createDungeonWallSlot(
    side: DungeonWallSide,
    geometry: BoxGeometry,
  ): DungeonWallSlot {
    const group = new Group();
    group.name = `dungeonWall-${side}`;
    const placeholder = new Mesh(geometry, this.wallFallbackMaterial.clone());
    const roadEdge = Math.abs(laneWorldX(LANE_COUNT - 1)) + TILE_SIZE / 2;
    const halfThickness = TILE_PITCH / 8;
    placeholder.position.set(
      side === 'left'
        ? -(roadEdge + halfThickness)
        : roadEdge + halfThickness,
      0.071 + TILE_PITCH / 2,
      0,
    );
    placeholder.name = `dungeonWallFallback-${side}`;
    const windowLight = this.createDungeonWindowLight(side);
    group.add(placeholder, windowLight);
    return {
      side,
      group,
      placeholder,
      models: {},
      assetKey: 'stone',
      torchModel: null,
      torchGlow: null,
      windowLight,
    };
  }

  private createDungeonWindowLight(side: DungeonWallSide): Group {
    const roadEdge = Math.abs(laneWorldX(LANE_COUNT - 1)) + TILE_SIZE / 2;
    const direction = side === 'left' ? 1 : -1;
    const source = new Vector3(
      direction * -(roadEdge + TILE_PITCH * 0.14),
      0.071 + TILE_PITCH * 0.72,
      0,
    );
    const end = new Vector3(
      source.x + direction * WINDOW_LIGHT_REACH,
      0.071 + TILE_PITCH * 0.12,
      0,
    );

    const group = new Group();
    group.name = `dungeonWindowLight-${side}`;
    group.visible = false;

    const target = new Group();
    target.name = 'dungeonWindowLightTarget';
    target.position.copy(end);
    const light = new SpotLight(
      WINDOW_BEAM_COLOR,
      2.7,
      source.distanceTo(end) + TILE_PITCH * 0.35,
      0.24,
      1,
      2,
    );
    light.name = 'dungeonWindowSpotLight';
    light.position.copy(source);
    light.target = target;
    light.castShadow = false;
    group.add(light, target);
    return group;
  }

  private async installDungeonFloorModels(): Promise<void> {
    try {
      const templates = await Promise.all(
        DUNGEON_FLOOR_KEYS.map(async (key) => ({
          key,
          template: await loadDungeonFloorTemplate(key),
        })),
      );
      for (const view of this.rowViews) {
        for (let col = 0; col < LANE_COUNT; col += 1) {
          for (const { key, template } of templates) {
            const model = template.clone(true);
            model.name = `dungeonFloor-${key}`;
            fitDungeonFloorModel(model);
            model.visible = false;
            view.tiles[col].add(model);
            view.floorModels[col][key] = model;
          }
          this.applyDungeonFloorVariant(view, col);
        }
      }
    } catch (error) {
      console.error('Failed to load KayKit dungeon floor models', error);
    }
  }

  private async installDungeonWallModels(): Promise<void> {
    try {
      const [templates, torchTemplate] = await Promise.all([
        Promise.all(
          DUNGEON_WALL_KEYS.map(async (key) => ({
            key,
            template: await loadDungeonWallTemplate(key),
          })),
        ),
        loadDungeonWallTorchTemplate(),
      ]);
      for (const view of this.rowViews) {
        for (const side of ['left', 'right'] as const) {
          const slot = view.walls[side];
          for (const { key, template } of templates) {
            const model = template.clone(true);
            cloneMeshMaterials(model);
            model.name = `dungeonWall-${side}-${key}`;
            fitDungeonWallModel(model, side);
            model.visible = false;
            slot.group.add(model);
            slot.models[key] = model;
          }

          const torch = torchTemplate.clone(true);
          cloneMeshMaterials(torch);
          torch.name = `dungeonWallTorch-${side}`;
          fitDungeonWallTorch(torch, side);
          torch.visible = false;
          slot.group.add(torch);
          slot.torchModel = torch;

          const glow = this.createDungeonWallTorchGlow(torch, side);
          glow.group.visible = false;
          slot.group.add(glow.group);
          slot.torchGlow = glow;
        }
        this.applyDungeonWallPresentation(view);
      }
    } catch (error) {
      console.error('Failed to load KayKit dungeon wall models', error);
    }
  }

  private createDungeonWallTorchGlow(
    torch: Group,
    side: DungeonWallSide,
  ): DungeonTorchGlow {
    torch.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(torch);
    const width = Math.max(bounds.max.x - bounds.min.x, 0.001);
    const height = Math.max(bounds.max.y - bounds.min.y, 0.001);
    const glow = new Group();
    glow.name = `dungeonWallTorchGlow-${side}`;
    glow.position.set(
      side === 'left'
        ? bounds.max.x - width * 0.16
        : bounds.min.x + width * 0.16,
      bounds.max.y - height * 0.12,
      (bounds.min.z + bounds.max.z) / 2,
    );

    const coreMaterial = new MeshBasicMaterial({
      color: 0xffd083,
      toneMapped: false,
    });
    const core = new Mesh(new SphereGeometry(0.04, 8, 6), coreMaterial);
    core.name = 'torchFlameCore';

    const haloMaterial = new MeshBasicMaterial({
      color: TORCH_LIGHT_COLOR,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const halo = new Mesh(new SphereGeometry(0.095, 8, 6), haloMaterial);
    halo.name = 'torchFlameHalo';

    const light = new PointLight(
      TORCH_LIGHT_COLOR,
      TORCH_LIGHT_INTENSITY,
      TORCH_LIGHT_DISTANCE,
      2,
    );
    light.name = 'torchPointLight';
    light.position.y = 0.025;
    glow.add(halo, core, light);
    return { group: glow, core, halo, light };
  }

  private updateDungeonTorchFlicker(elapsedSec: number): void {
    for (const view of this.rowViews) {
      if (!view.group.visible) {
        continue;
      }
      for (const side of ['left', 'right'] as const) {
        const glow = view.walls[side].torchGlow;
        if (!glow?.group.visible) {
          continue;
        }

        const seed = view.assignedRow * 1.917 + (side === 'left' ? 0.37 : 2.41);
        const slow = Math.sin(elapsedSec * 2.15 + seed);
        const medium = Math.sin(elapsedSec * 6.7 + seed * 1.73);
        const quick = Math.sin(elapsedSec * 12.9 + seed * 2.29);
        const brightness = 0.9 + slow * 0.055 + medium * 0.035 + quick * 0.018;
        const volume = 0.98 + slow * 0.035 + medium * 0.022;

        glow.light.intensity = TORCH_LIGHT_INTENSITY * brightness;
        glow.core.scale.setScalar(0.98 + (volume - 0.98) * 0.45);
        glow.halo.scale.set(
          volume * (1 + quick * 0.012),
          volume * (1 - quick * 0.018),
          volume,
        );
        glow.core.position.y = medium * 0.004 + quick * 0.002;
        glow.halo.position.y = slow * 0.006 + quick * 0.003;
      }
    }
  }

  private async installDungeonTrapModels(): Promise<void> {
    try {
      const template = await loadDungeonTrapTemplate();
      for (const view of this.rowViews) {
        for (const trap of view.traps) {
          const model = template.clone(true);
          cloneMeshMaterials(model);
          const spikes = fitDungeonTrapModel(model);
          model.name = 'dungeonTrap-spikes';
          model.userData.role = 'kaykitTrap';
          trap.add(model);

          for (const child of trap.children) {
            if (child.userData.role === 'fallback') {
              child.visible = false;
            }
          }
          trap.userData.spikeNode = spikes;
          trap.userData.spikeExtendedY = spikes.position.y;
          trap.userData.spikeRetractedY =
            spikes.position.y - TRAP_SPIKE_RETRACTION;
          this.resetTrapGroup(trap, this.trapColFromGroup(trap));
        }
      }
    } catch (error) {
      console.error('Failed to load KayKit dungeon spike trap model', error);
    }
  }

  private async installCoinModels(): Promise<void> {
    try {
      await Promise.all(
        FLOOR_COIN_MODEL_SIZES.map(async (size) => {
          this.coinTemplates.set(size, await loadCoinTemplate(size));
        }),
      );
      for (const view of this.rowViews) {
        for (const gold of view.golds) {
          this.mountCoinModel(gold, 'coin');
        }
      }
    } catch (error) {
      console.error('Failed to load KayKit coin models', error);
    }
  }

  private mountCoinModel(gold: Mesh, size: CoinModelSize): void {
    for (const child of [...gold.children]) {
      if (child.name.startsWith('kaykitCoin-')) {
        child.removeFromParent();
      }
    }
    const template = this.coinTemplates.get(size);
    if (!template) {
      return;
    }
    const model = template.clone(true);
    cloneMeshMaterials(model);
    fitCoinModel(model, size);
    model.name = `kaykitCoin-${size}`;
    gold.add(model);
    (gold.material as MeshStandardMaterial).visible = false;
    gold.userData.coinSize = size;
  }

  private async installPotionModels(): Promise<void> {
    try {
      await Promise.all(
        FLOOR_POTION_MODEL_SIZES.map(async (size) => {
          this.potionTemplates.set(size, await loadPotionTemplate(size));
        }),
      );
      for (const view of this.rowViews) {
        for (const potion of view.potions) {
          this.mountPotionModel(potion, 'small');
        }
      }
    } catch (error) {
      console.error('Failed to load KayKit potion models', error);
    }
  }

  private mountPotionModel(potion: Mesh, size: PotionModelSize): void {
    for (const child of [...potion.children]) {
      if (child.name.startsWith('kaykitPotion-')) {
        child.removeFromParent();
      }
    }
    const template = this.potionTemplates.get(size);
    if (!template) {
      return;
    }
    const model = template.clone(true);
    cloneMeshMaterials(model);
    fitPotionModel(model, size);
    model.name = `kaykitPotion-${size}-red`;
    potion.add(model);
    (potion.material as MeshStandardMaterial).visible = false;
    potion.userData.potionSize = size;
  }

  private async installMerchantModels(): Promise<void> {
    try {
      const [template, clips] = await Promise.all([
        loadMerchantTemplate(),
        loadMerchantClips(),
      ]);
      for (const view of this.rowViews) {
        for (const merchant of view.merchants) {
          const model = cloneSkinned(template) as Group;
          cloneMeshMaterials(model);
          model.name = 'kaykitMerchant-Hoarder';
          fitMerchantModel(model);
          merchant.add(model);

          for (const child of merchant.children) {
            if (
              child.userData.role === 'fallback' ||
              child.userData.fallback === true
            ) {
              child.visible = false;
            }
          }

          const mixer = new AnimationMixer(model);
          const idle = clips.idle;
          if (idle) {
            const action = mixer.clipAction(idle);
            action.setLoop(LoopRepeat, Infinity);
            action.play();
          }
          this.merchantPresentations.set(merchant, { model, mixer });
        }
      }
    } catch (error) {
      console.error('Failed to load KayKit Hoarder merchant model', error);
    }
  }

  private applyDungeonFloorVariant(
    view: RowView,
    col: number,
    selected: DungeonFloorAssetKey | null = view.floorAssetKeys[col],
  ): void {
    view.floorAssetKeys[col] = selected;
    for (const key of DUNGEON_FLOOR_KEYS) {
      const model = view.floorModels[col][key];
      if (model) {
        model.visible = key === selected;
        model.rotation.y =
          key === 'stone'
            ? dungeonFloorRotation(view.assignedRow, col)
            : 0;
      }
    }
  }

  private applyDungeonWallPresentation(view: RowView): void {
    const torchSide = dungeonWallTorchSide(view.assignedRow);
    for (const side of ['left', 'right'] as const) {
      const slot = view.walls[side];
      const selected = dungeonWallVariant(view.assignedRow, side);
      slot.assetKey = selected;
      for (const key of DUNGEON_WALL_KEYS) {
        const model = slot.models[key];
        if (model) {
          model.visible = key === selected;
        }
      }
      slot.placeholder.visible = !slot.models[selected];
      slot.windowLight.visible =
        Boolean(slot.models[selected]) && dungeonWallTransmitsLight(selected);
      if (slot.torchModel) {
        slot.torchModel.visible = torchSide === side;
      }
      if (slot.torchGlow) {
        slot.torchGlow.group.visible = torchSide === side;
      }
    }
  }

  private bindRow(view: RowView, row: number, snapshot: BoardSnapshot): void {
    this.merchantLeaveFx = this.merchantLeaveFx.filter(
      (fx) => !view.merchants.includes(fx.group),
    );
    this.trapConsumeFx = this.trapConsumeFx.filter(
      (fx) => !view.traps.includes(fx.group),
    );
    if (this.trapTrigger && view.traps.includes(this.trapTrigger)) {
      this.endTrapTriggerFx();
    }
    if (
      this.dropSpawnFx &&
      (view.golds.includes(this.dropSpawnFx.mesh) ||
        view.potions.includes(this.dropSpawnFx.mesh))
    ) {
      this.endDropSpawnFx();
    }
    this.releaseRowEnemySlots(view);
    view.assignedRow = row;
    this.applyDungeonWallPresentation(view);
    this.applyTileChrome(view, snapshot);
  }

  private applyTileChrome(view: RowView, snapshot: BoardSnapshot): void {
    for (let col = 0; col < LANE_COUNT; col += 1) {
      const highlighted =
        view.assignedRow === this.highlightRow && this.highlightCols.has(col);
      const mesh = view.tiles[col];
      const hit = view.hitPlanes[col];
      const variants = view.enemySlots[col];
      const gold = view.golds[col];
      const potion = view.potions[col];
      const trap = view.traps[col];
      const merchant = view.merchants[col];
      const tile = tileAt(snapshot, view.assignedRow, col);

      if (tile?.content.type === 'gold') {
        const size = coinModelSizeForPickup(tile.content.pickupId ?? 'gold');
        if (
          gold.userData.coinSize !== size &&
          this.coinTemplates.has(size)
        ) {
          this.mountCoinModel(gold, size);
        }
      }

      if (tile?.content.type === 'potion') {
        const size = potionModelSizeForPickup(tile.content.pickupId ?? 'potion');
        if (
          potion.userData.potionSize !== size &&
          this.potionTemplates.has(size)
        ) {
          this.mountPotionModel(potion, size);
        }
      }

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
      const floorAssetKey =
        tile?.content.type === 'trap'
          ? null
          : tile?.content.type === 'shop'
            ? 'wood'
            : dungeonFloorVariant(view.assignedRow, col);
      this.applyDungeonFloorVariant(view, col, floorAssetKey);
      const occupant =
        tile?.content.type === 'monster' && tile.monster ? tile.monster : undefined;
      for (const key of ENEMY_RENDER_KEYS) {
        const slot = variants[key];
        const playingMonsterFx = this.isEnemyGroupInFx(slot.group);
        if (this.enemyAdvanceFx?.mesh === slot.group) {
          slot.group.visible = true;
          if (occupant && occupant.renderKey === key) {
            this.requestEnemyModel(
              slot,
              occupant.id,
              key,
              occupant.weaponVariant,
            );
          }
          continue;
        }
        if (occupant && occupant.renderKey === key) {
          slot.group.visible = true;
          this.requestEnemyModel(
            slot,
            occupant.id,
            key,
            occupant.weaponVariant,
          );
          continue;
        }
        if (playingMonsterFx || slot.dying) {
          slot.group.visible = true;
          continue;
        }
        this.releaseEnemySlot(slot);
      }

      const collectingGold = this.collectFx.some((fx) => fx.mesh === gold);
      const collectingPotion = this.collectFx.some((fx) => fx.mesh === potion);
      const spawningGold = this.dropSpawnFx?.mesh === gold;
      const spawningPotion = this.dropSpawnFx?.mesh === potion;
      if (!collectingGold && !spawningGold) {
        this.resetCollectibleMesh(gold, col, 0.38, 0);
      }
      if (!collectingPotion && !spawningPotion) {
        this.resetCollectibleMesh(potion, col, 0.42, 0);
      }
      gold.visible = collectingGold || spawningGold || tile?.content.type === 'gold';
      potion.visible = collectingPotion || spawningPotion || tile?.content.type === 'potion';

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
    this.setCollectibleOpacity(mesh, 1);
  }

  private setCollectibleOpacity(root: Object3D, opacity: number): void {
    root.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) {
        return;
      }
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        material.transparent = opacity < 1 || material.transparent;
        material.opacity = opacity;
      }
    });
  }

  private setCollectibleEmissive(root: Object3D, intensity: number): void {
    root.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) {
        return;
      }
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        if (material instanceof MeshStandardMaterial) {
          material.emissiveIntensity = intensity;
        }
      }
    });
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
        if (
          gold.visible &&
          !this.collectFx.some((fx) => fx.mesh === gold) &&
          this.dropSpawnFx?.mesh !== gold
        ) {
          gold.position.y = 0.38 + Math.sin(phase) * 0.05;
          gold.rotation.y = elapsedSec * 2.2;
        }
        if (
          potion.visible &&
          !this.collectFx.some((fx) => fx.mesh === potion) &&
          this.dropSpawnFx?.mesh !== potion
        ) {
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
      if (fx.kind === 'gold') {
        fx.mesh.position.y = fx.baseY + t * 0.55;
        fx.mesh.scale.setScalar(1 + t * 0.45);
        fx.mesh.rotation.y += 0.18;
        this.setCollectibleOpacity(fx.mesh, 1 - t);
      } else {
        fx.mesh.position.y = fx.baseY + t * 0.28;
        fx.mesh.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.35);
        this.setCollectibleEmissive(fx.mesh, 0.4 + (1 - t) * 0.8);
        this.setCollectibleOpacity(fx.mesh, 1 - t);
      }
      if (t < 1) {
        remaining.push(fx);
        continue;
      }
      fx.mesh.visible = false;
      this.setCollectibleOpacity(fx.mesh, 1);
      this.setCollectibleEmissive(
        fx.mesh,
        fx.kind === 'gold' ? 0.55 : 0.4,
      );
      fx.mesh.scale.setScalar(1);
    }
    this.collectFx = remaining;
  }

  private findMonsterMesh(
    row: number,
    col: number,
    renderKey?: EnemyRenderKey,
  ): Group | undefined {
    return this.findEnemySlot(row, col, renderKey)?.group;
  }

  private findEnemySlot(
    row: number,
    col: number,
    renderKey?: EnemyRenderKey,
    occupantId?: string,
  ): EnemySlot | undefined {
    if (occupantId) {
      const byId = this.findEnemySlotById(occupantId);
      if (byId) {
        return byId;
      }
    }
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    const variants = view?.enemySlots[col];
    if (!variants) {
      return undefined;
    }
    if (renderKey) {
      return variants[renderKey];
    }
    return ENEMY_RENDER_KEYS.map((key) => variants[key]).find(
      (slot) => slot.group.visible,
    );
  }

  private findEnemySlotById(id: string): EnemySlot | undefined {
    for (const view of this.rowViews) {
      for (const variants of view.enemySlots) {
        for (const key of ENEMY_RENDER_KEYS) {
          if (variants[key].occupantId === id) {
            return variants[key];
          }
        }
      }
    }
    return undefined;
  }

  private findSlotByGroup(group: Group): EnemySlot | undefined {
    for (const view of this.rowViews) {
      for (const variants of view.enemySlots) {
        for (const key of ENEMY_RENDER_KEYS) {
          if (variants[key].group === group) {
            return variants[key];
          }
        }
      }
    }
    return undefined;
  }

  private createEnemySlots(
    col: number,
    skeletonMinionGeo: SphereGeometry,
    cryptGuardGeo: CapsuleGeometry,
    boneBruteGeo: BoxGeometry,
  ): Record<EnemyRenderKey, EnemySlot> {
    return {
      skeletonMinion: this.createEnemySlot(
        'skeletonMinion',
        col,
        skeletonMinionGeo,
        this.skeletonMinionMaterial,
        0.46,
      ),
      cryptGuard: this.createEnemySlot(
        'cryptGuard',
        col,
        cryptGuardGeo,
        this.cryptGuardMaterial,
        0.58,
      ),
      boneBrute: this.createEnemySlot(
        'boneBrute',
        col,
        boneBruteGeo,
        this.boneBruteMaterial,
        0.52,
      ),
      skeletonWarrior: this.createEnemySlot(
        'skeletonWarrior',
        col,
        boneBruteGeo,
        this.boneBruteMaterial,
        0.52,
      ),
      skeletonMage: this.createEnemySlot(
        'skeletonMage',
        col,
        cryptGuardGeo,
        this.skeletonMageMaterial,
        0.58,
      ),
      necromancer: this.createEnemySlot(
        'necromancer',
        col,
        cryptGuardGeo,
        this.necromancerMaterial,
        0.6,
      ),
    };
  }

  private createEnemySlot(
    key: EnemyRenderKey,
    col: number,
    geometry: SphereGeometry | CapsuleGeometry | BoxGeometry,
    material: MeshStandardMaterial,
    baseY: number,
  ): EnemySlot {
    const group = new Group();
    group.position.set(laneWorldX(col), baseY, 0);
    group.userData.baseY = baseY;
    group.visible = false;
    const placeholder = new Mesh(geometry, material.clone());
    group.add(placeholder);
    return {
      key,
      col,
      group,
      placeholder,
      model: null,
      mixer: null,
      clips: {},
      materials: [placeholder.material as MeshStandardMaterial],
      loopAction: null,
      oneShotAction: null,
      loadToken: 0,
      occupantId: null,
      weaponVariant: null,
      equipmentMounts: [],
      equipmentLoadToken: 0,
      dying: false,
      deathFadeStartedAt: null,
      attackSequence: 0,
    };
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
    plate.userData.role = 'fallback';

    const rune = new Mesh(runeGeo, this.trapRuneMaterial.clone());
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.095;
    rune.userData.role = 'fallback';

    const markA = new Mesh(markGeo, this.trapRuneMaterial.clone());
    markA.position.set(0, 0.1, 0);
    markA.userData.role = 'fallback';
    const markB = new Mesh(markGeo, this.trapRuneMaterial.clone());
    markB.rotation.y = Math.PI / 2;
    markB.position.set(0, 0.1, 0);
    markB.userData.role = 'fallback';

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
    this.setTrapSpikeExtension(group, TRAP_SPIKE_IDLE_EXTENSION);
  }

  private setTrapOpacity(group: Group, opacity: number): void {
    group.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) {
        return;
      }
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        material.transparent = opacity < 1 || material.transparent;
        material.opacity = opacity;
      }
    });
  }

  private setTrapEmissive(group: Group, intensity: number): void {
    group.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) {
        return;
      }
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        if (material instanceof MeshStandardMaterial) {
          material.emissiveIntensity = intensity;
        }
      }
    });
  }

  private setTrapSpikeExtension(group: Group, extension: number): boolean {
    const spikes = group.userData.spikeNode as Object3D | undefined;
    const retractedY = group.userData.spikeRetractedY as number | undefined;
    const extendedY = group.userData.spikeExtendedY as number | undefined;
    if (!spikes || retractedY === undefined || extendedY === undefined) {
      return false;
    }
    const amount = Math.min(1, Math.max(0, extension));
    spikes.position.y = retractedY + (extendedY - retractedY) * amount;
    return true;
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
        if (!this.setTrapSpikeExtension(trap, TRAP_SPIKE_IDLE_EXTENSION)) {
          trap.position.y = Math.sin(phase * 0.7) * 0.012;
        }
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
    stall.userData.role = 'fallback';

    const pillar = new Mesh(pillarGeo, this.merchantPillarMaterial.clone());
    pillar.position.set(-0.05, 0.45, 0);
    pillar.userData.role = 'fallback';

    const lantern = new Mesh(lanternGeo, this.merchantLanternMaterial.clone());
    lantern.position.set(-0.05, 0.78, 0);
    lantern.userData.role = 'lantern';
    lantern.userData.fallback = true;

    const hood = new Mesh(hoodGeo, this.merchantHoodMaterial.clone());
    hood.position.set(-0.05, 0.9, 0);
    hood.userData.role = 'fallback';

    group.add(stall, pillar, lantern, hood);
    this.merchantPresentations.set(group, { model: null, mixer: null });
    group.visible = false;
    return group;
  }

  private resetMerchantGroup(group: Group, col: number): void {
    group.position.set(laneWorldX(col), 0, 0);
    group.scale.setScalar(1);
    this.setMerchantOpacity(group, 1);
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
        if (this.merchantPresentations.get(merchant)?.model) {
          merchant.position.y = 0;
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

  private updateMerchantMixers(dt: number): void {
    for (const view of this.rowViews) {
      if (!view.group.visible) {
        continue;
      }
      for (const merchant of view.merchants) {
        if (!merchant.visible) {
          continue;
        }
        this.merchantPresentations.get(merchant)?.mixer?.update(dt);
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
    group.traverse((child) => {
      if (!('isMesh' in child) || !child.isMesh) {
        return;
      }
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        material.transparent = opacity < 1 || material.transparent;
        material.opacity = opacity;
      }
    });
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

  private async installPlayerModel(
    key: PlayerRenderKey,
    token: number,
  ): Promise<void> {
    try {
      const [template, clips] = await Promise.all([
        loadPlayerTemplate(key),
        loadPlayerClips(key),
      ]);
      if (token !== this.playerLoadToken || this.playerRenderKey !== key) {
        return;
      }
      const model = cloneSkinned(template) as Group;
      fitPlayerModel(model);
      this.attachPlayerModel(model, clips);
      await this.installPlayerEquipmentLoadout(model, key, token);
    } catch (error) {
      if (token !== this.playerLoadToken) {
        return;
      }
      console.error(
        `Failed to load player model '${key}' from ${playerModelUrl(key)}`,
        error,
      );
      this.playerBody.visible = true;
    }
  }

  private async installPlayerEquipmentLoadout(
    model: Group,
    key: PlayerRenderKey,
    playerToken: number,
  ): Promise<void> {
    const equipmentToken = ++this.playerEquipmentLoadToken;
    this.removePlayerEquipment();
    const loadout = playerEquipmentLoadout(
      key,
      this.playerEquipmentUpgrades,
      this.playerSpecialEquipmentEquipped,
    );
    await Promise.all(
      loadout.map((visual) =>
        this.installPlayerEquipment(
          model,
          visual,
          loadPlayerEquipmentTemplate(visual.assetKey),
          key,
          playerToken,
          equipmentToken,
        ),
      ),
    );
  }

  private async installPlayerEquipment(
    model: Group,
    loadout: PlayerEquipmentVisual,
    templatePromise: Promise<Group>,
    key: PlayerRenderKey,
    playerToken: number,
    equipmentToken: number,
  ): Promise<void> {
    try {
      const weaponTemplate = await templatePromise;
      if (
        playerToken !== this.playerLoadToken ||
        equipmentToken !== this.playerEquipmentLoadToken ||
        this.playerRenderKey !== key ||
        this.playerModel !== model
      ) {
        return;
      }
      this.attachPlayerEquipment(model, weaponTemplate, loadout);
    } catch (error) {
      if (
        playerToken !== this.playerLoadToken ||
        equipmentToken !== this.playerEquipmentLoadToken
      ) {
        return;
      }
      console.error(
        `Failed to load player equipment '${loadout.assetKey}' from ${playerEquipmentUrl(loadout.assetKey)}`,
        error,
      );
    }
  }

  private attachPlayerEquipment(
    model: Group,
    template: Group,
    loadout: PlayerEquipmentVisual,
  ): void {
    const slot = findEquipmentMount(model, loadout.mount);
    if (!slot) {
      console.error(
        `Failed to attach player equipment '${loadout.assetKey}': missing mount '${loadout.mount}'`,
      );
      return;
    }
    const mount = new Group();
    mount.name = `${PLAYER_WEAPON_MOUNT_NAME}-${loadout.assetKey}`;
    mount.position.set(...loadout.position);
    mount.rotation.set(...loadout.rotation);
    mount.scale.setScalar(loadout.scale);
    mount.add(template.clone());
    slot.add(mount);
    this.playerEquipmentMounts.push(mount);
  }

  private removePlayerEquipment(): void {
    for (const mount of this.playerEquipmentMounts) {
      mount.removeFromParent();
    }
    this.playerEquipmentMounts = [];
  }

  private async installEnemyEquipmentLoadout(
    slot: EnemySlot,
    model: Group,
    weaponVariant: EnemyWeaponVariant | null,
    occupantId: string,
    modelToken: number,
  ): Promise<void> {
    const equipmentToken = ++slot.equipmentLoadToken;
    this.removeEnemyEquipment(slot);
    const loadout = enemyEquipmentLoadout(weaponVariant);
    await Promise.all(
      loadout.map((visual) =>
        this.installEnemyEquipment(
          slot,
          model,
          visual,
          loadPlayerEquipmentTemplate(visual.assetKey),
          occupantId,
          modelToken,
          equipmentToken,
        ),
      ),
    );
  }

  private async installEnemyEquipment(
    slot: EnemySlot,
    model: Group,
    loadout: PlayerEquipmentVisual,
    templatePromise: Promise<Group>,
    occupantId: string,
    modelToken: number,
    equipmentToken: number,
  ): Promise<void> {
    try {
      const weaponTemplate = await templatePromise;
      if (
        modelToken !== slot.loadToken ||
        equipmentToken !== slot.equipmentLoadToken ||
        slot.occupantId !== occupantId ||
        slot.model !== model
      ) {
        return;
      }
      this.attachEnemyEquipment(slot, model, weaponTemplate, loadout);
    } catch (error) {
      if (
        modelToken !== slot.loadToken ||
        equipmentToken !== slot.equipmentLoadToken
      ) {
        return;
      }
      console.error(
        `Failed to load enemy equipment '${loadout.assetKey}' from ${playerEquipmentUrl(loadout.assetKey)}`,
        error,
      );
    }
  }

  private attachEnemyEquipment(
    slot: EnemySlot,
    model: Group,
    template: Group,
    loadout: PlayerEquipmentVisual,
  ): void {
    const mountNode = findEquipmentMount(model, loadout.mount);
    if (!mountNode) {
      console.error(
        `Failed to attach enemy equipment '${loadout.assetKey}': missing mount '${loadout.mount}'`,
      );
      return;
    }
    const mount = new Group();
    mount.name = `${PLAYER_WEAPON_MOUNT_NAME}-${loadout.assetKey}`;
    mount.position.set(...loadout.position);
    mount.rotation.set(...loadout.rotation);
    mount.scale.setScalar(loadout.scale);
    mount.add(template.clone());
    mountNode.add(mount);
    slot.equipmentMounts.push(mount);
  }

  private removeEnemyEquipment(slot: EnemySlot): void {
    for (const mount of slot.equipmentMounts) {
      mount.removeFromParent();
    }
    slot.equipmentMounts = [];
  }

  private attachPlayerModel(model: Group, clips: PlayerClipMap): void {
    this.removePlayerModel();
    this.playerModel = model;
    this.playerClips = clips;
    this.playerModelMaterials = collectStandardMaterials(model);
    this.playerMesh.add(model);
    this.playerBody.visible = false;
    this.playerMixer = new AnimationMixer(model);
    this.playPlayerLocomotion(true);
  }

  private removePlayerModel(): void {
    this.playerEquipmentLoadToken += 1;
    this.removePlayerEquipment();
    this.playerMixer?.stopAllAction();
    this.playerMixer = null;
    this.playerLoopAction = null;
    this.playerOneShotAction = null;
    this.playerClips = {};
    this.playerModelMaterials = [];
    if (this.playerModel) {
      this.playerMesh.remove(this.playerModel);
      this.playerModel = null;
    }
    this.playerBody.visible = true;
  }

  private prepareProjectilePool(kind: CombatProjectileKind): Promise<void> {
    if (this.projectilePools[kind]) {
      return Promise.resolve();
    }
    const cached = this.projectilePoolPromises.get(kind);
    if (cached) {
      return cached;
    }
    const pending = loadCombatProjectileTemplate(kind)
      .then((template) => {
        const pool: Group[] = [];
        for (let i = 0; i < PROJECTILE_POOL_SIZE; i += 1) {
          const wrapper = new Group();
          wrapper.name = `${kind}Projectile-${i}`;
          const model = template.clone(true);
          fitCombatProjectile(model);
          wrapper.add(model);
          wrapper.visible = false;
          this.scene.add(wrapper);
          pool.push(wrapper);
        }
        this.projectilePools[kind] = pool;
      })
      .catch((error) => {
        console.error(`Failed to load ${kind} projectile`, error);
      });
    this.projectilePoolPromises.set(kind, pending);
    return pending;
  }

  private launchPlayerProjectile(target: Group): void {
    const kind = playerProjectileKind(
      this.playerRenderKey,
      this.playerEquipmentUpgrades,
    );
    if (!kind) {
      return;
    }
    const projectile = this.projectilePools[kind]?.find((entry) => !entry.visible);
    if (!projectile) {
      void this.prepareProjectilePool(kind);
      return;
    }
    const start = this.playerMesh.getWorldPosition(new Vector3());
    start.y += 0.5;
    const end = target.getWorldPosition(new Vector3());
    end.y += 0.5;
    projectile.position.copy(start);
    projectile.lookAt(end);
    projectile.visible = true;
    this.activeProjectile = { group: projectile, start, end };
  }

  private releaseActiveProjectile(): void {
    if (this.activeProjectile) {
      this.activeProjectile.group.visible = false;
    }
    this.activeProjectile = null;
  }

  private playPlayerLocomotion(immediate: boolean): void {
    if (!this.playerMixer || this.playerDead) {
      return;
    }
    const clip = this.playerMoving
      ? (this.playerClips.walk ?? this.playerClips.idle)
      : (this.playerClips.idle ?? this.playerClips.walk);
    if (!clip) {
      return;
    }
    const next = this.playerMixer.clipAction(clip);
    next.setLoop(LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    if (this.playerLoopAction === next && next.isRunning()) {
      return;
    }
    const fade = immediate ? 0 : 0.16;
    this.playerLoopAction?.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    this.playerLoopAction = next;
  }

  private playPlayerOneShot(
    clip: PlayerClipMap[keyof PlayerClipMap],
    kind: 'attack' | 'hit' | 'block' | 'pickup' | 'item' | 'death',
  ): void {
    const mixer = this.playerMixer;
    if (!mixer || !clip) {
      return;
    }
    this.playerLoopAction?.fadeOut(0.08);
    this.playerOneShotAction?.fadeOut(0.04);
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    if (kind !== 'death') {
      action.setEffectiveTimeScale(
        Math.max(1, clip.duration / (oneShotDuration(kind) * 0.9)),
      );
    }
    action.reset().fadeIn(0.06).play();
    this.playerOneShotAction = action;
    const token = this.playerLoadToken;
    const onFinished = (event: { action: AnimationAction }): void => {
      if (event.action !== action) {
        return;
      }
      mixer.removeEventListener('finished', onFinished);
      if (this.playerOneShotAction !== action) {
        return;
      }
      if (token !== this.playerLoadToken || kind === 'death' || this.playerDead) {
        return;
      }
      this.playerOneShotAction = null;
      this.playPlayerLocomotion(false);
    };
    mixer.addEventListener('finished', onFinished);
  }

  private playerFlashMaterials(): MeshStandardMaterial[] {
    if (this.playerModel && this.playerModelMaterials.length > 0) {
      return this.playerModelMaterials;
    }
    return [this.playerBody.material as MeshStandardMaterial];
  }

  private flashPlayerMaterials(
    materials: MeshStandardMaterial[],
    hex: number,
    intensity: number,
  ): void {
    for (const material of materials) {
      material.emissive.setHex(hex);
      material.emissiveIntensity = intensity;
    }
  }

  private updateEnemyMixers(dt: number): void {
    for (const view of this.rowViews) {
      for (const variants of view.enemySlots) {
        for (const key of ENEMY_RENDER_KEYS) {
          variants[key].mixer?.update(dt);
        }
      }
    }
  }

  private updateEnemyDeathFades(elapsedSec: number): void {
    for (const view of this.rowViews) {
      for (const variants of view.enemySlots) {
        for (const key of ENEMY_RENDER_KEYS) {
          const slot = variants[key];
          if (!slot.dying || slot.deathFadeStartedAt === null) {
            continue;
          }
          const t = Math.min(
            1,
            (elapsedSec - slot.deathFadeStartedAt) / ENEMY_DEATH_FADE_SEC,
          );
          this.setEnemyOpacity(slot.group, 1 - t);
          if (t >= 1) {
            this.releaseEnemySlot(slot);
          }
        }
      }
    }
  }

  private requestEnemyModel(
    slot: EnemySlot,
    occupantId: string,
    key: EnemyRenderKey,
    weaponVariant: EnemyWeaponVariant | null,
  ): void {
    if (
      slot.occupantId === occupantId &&
      (slot.model || slot.loadToken > 0) &&
      enemyWeaponVariantsEqual(slot.weaponVariant, weaponVariant)
    ) {
      return;
    }
    this.detachEnemyModel(slot);
    slot.dying = false;
    slot.deathFadeStartedAt = null;
    slot.occupantId = occupantId;
    slot.weaponVariant = weaponVariant;
    slot.loadToken += 1;
    const token = slot.loadToken;
    void this.installEnemyModel(slot, key, occupantId, token);
  }

  private async installEnemyModel(
    slot: EnemySlot,
    key: EnemyRenderKey,
    occupantId: string,
    token: number,
  ): Promise<void> {
    try {
      const [template, clips] = await Promise.all([
        loadEnemyTemplate(key),
        loadEnemyClips(key),
      ]);
      if (
        token !== slot.loadToken ||
        slot.occupantId !== occupantId ||
        slot.key !== key
      ) {
        return;
      }
      const model = cloneSkinned(template) as Group;
      cloneMeshMaterials(model);
      fitEnemyModel(model, key);
      this.attachEnemyModel(slot, model, clips);
      await this.installEnemyEquipmentLoadout(
        slot,
        model,
        slot.weaponVariant,
        occupantId,
        token,
      );
    } catch (error) {
      if (token !== slot.loadToken) {
        return;
      }
      console.error(
        `Failed to load enemy model '${key}' from ${enemyModelUrl(key)}`,
        error,
      );
      slot.placeholder.visible = true;
    }
  }

  private attachEnemyModel(
    slot: EnemySlot,
    model: Group,
    clips: RigMediumClipMap,
  ): void {
    this.detachEnemyModel(slot);
    slot.model = model;
    slot.clips = clips;
    slot.materials = collectStandardMaterials(model);
    slot.group.add(model);
    slot.placeholder.visible = false;
    slot.mixer = new AnimationMixer(model);
    if (slot.dying) {
      slot.deathFadeStartedAt = null;
      this.playEnemyOneShot(
        slot,
        clips.skeletonDeath ?? clips.death,
        'death',
      );
      return;
    }
    this.playEnemyOneShot(slot, enemySpawnClip(slot.key, clips), 'spawn');
  }

  private detachEnemyModel(slot: EnemySlot): void {
    this.removeEnemyEquipment(slot);
    slot.mixer?.stopAllAction();
    slot.mixer = null;
    slot.loopAction = null;
    slot.oneShotAction = null;
    slot.clips = {};
    slot.materials = [slot.placeholder.material as MeshStandardMaterial];
    if (slot.model) {
      slot.group.remove(slot.model);
      slot.model = null;
    }
    slot.placeholder.visible = true;
  }

  private releaseEnemySlot(slot: EnemySlot): void {
    slot.loadToken += 1;
    slot.occupantId = null;
    slot.weaponVariant = null;
    slot.dying = false;
    slot.deathFadeStartedAt = null;
    slot.attackSequence = 0;
    this.detachEnemyModel(slot);
    slot.group.visible = false;
    slot.group.position.set(laneWorldX(slot.col), monsterBaseY(slot.group), 0);
    slot.group.scale.setScalar(1);
    this.setEnemyOpacity(slot.group, 1);
    this.flashPlayerMaterials(this.enemyFlashMaterials(slot.group), 0x000000, 0);
  }

  private releaseRowEnemySlots(view: RowView): void {
    for (const variants of view.enemySlots) {
      for (const key of ENEMY_RENDER_KEYS) {
        this.releaseEnemySlot(variants[key]);
      }
    }
  }

  private playEnemyLocomotion(
    slot: EnemySlot,
    walking: boolean,
    immediate: boolean,
  ): void {
    if (!slot.mixer || slot.dying) {
      return;
    }
    const clip = walking
      ? (slot.clips.skeletonWalk ?? slot.clips.walk ?? slot.clips.idle)
      : (slot.clips.skeletonIdle ?? slot.clips.idle ?? slot.clips.walk);
    if (!clip) {
      return;
    }
    const next = slot.mixer.clipAction(clip);
    next.setLoop(LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    if (slot.loopAction === next && next.isRunning()) {
      return;
    }
    const fade = immediate ? 0 : 0.16;
    slot.loopAction?.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    slot.loopAction = next;
  }

  private playEnemyOneShot(
    slot: EnemySlot,
    clip: RigMediumClipMap[keyof RigMediumClipMap],
    kind: 'attack' | 'hit' | 'taunt' | 'spawn' | 'death',
  ): void {
    const mixer = slot.mixer;
    if (!mixer || !clip) {
      if (kind === 'death') {
        slot.dying = true;
        slot.deathFadeStartedAt = this.clock;
      }
      return;
    }
    slot.loopAction?.fadeOut(0.08);
    slot.oneShotAction?.fadeOut(0.04);
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    if (kind !== 'death') {
      action.setEffectiveTimeScale(
        Math.max(1, clip.duration / (oneShotDuration(kind) * 0.9)),
      );
    }
    action.reset().fadeIn(0.06).play();
    slot.oneShotAction = action;
    const token = slot.loadToken;
    const occupantId = slot.occupantId;
    const onFinished = (event: { action: AnimationAction }): void => {
      if (event.action !== action) {
        return;
      }
      mixer.removeEventListener('finished', onFinished);
      if (slot.oneShotAction !== action) {
        return;
      }
      if (token !== slot.loadToken || slot.occupantId !== occupantId) {
        return;
      }
      slot.oneShotAction = null;
      if (kind === 'death') {
        slot.deathFadeStartedAt = this.clock;
        return;
      }
      this.playEnemyLocomotion(slot, false, false);
    };
    mixer.addEventListener('finished', onFinished);
  }

  private isEnemyGroupInFx(group: Group): boolean {
    return (
      this.encounterFx.some((fx) => fx.monsterMesh === group) ||
      this.combatHit?.monsterMesh === group ||
      this.enemyAdvanceFx?.mesh === group
    );
  }

  private enemyFlashMaterials(group: Group): MeshStandardMaterial[] {
    const slot = this.findSlotByGroup(group);
    if (slot?.model && slot.materials.length > 0) {
      return slot.materials;
    }
    if (slot) {
      return [slot.placeholder.material as MeshStandardMaterial];
    }
    return [];
  }

  private setEnemyOpacity(group: Group, opacity: number): void {
    for (const material of this.enemyFlashMaterials(group)) {
      material.transparent = true;
      material.opacity = opacity;
    }
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

function findEquipmentMount(
  root: Object3D,
  mount: PlayerEquipmentVisual['mount'],
): Object3D | undefined {
  for (const name of playerEquipmentMountNames(mount)) {
    const node = root.getObjectByName(name);
    if (node) {
      return node;
    }
  }
  let found: Object3D | undefined;
  const names = playerEquipmentMountNames(mount);
  root.traverse((child) => {
    if (found) {
      return;
    }
    const skinned = child as SkinnedMesh;
    if (!skinned.isSkinnedMesh || !skinned.skeleton) {
      return;
    }
    found = skinned.skeleton.bones.find((bone) => names.includes(bone.name));
  });
  return found;
}

function cloneMeshMaterials(root: Group): void {
  root.traverse((child) => {
    if (!('isMesh' in child) || !child.isMesh) {
      return;
    }
    const mesh = child as Mesh;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });
}

function collectStandardMaterials(root: Group): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((child) => {
    if (!('isMesh' in child) || !child.isMesh) {
      return;
    }
    const mesh = child as Mesh;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material instanceof MeshStandardMaterial) {
        materials.push(material);
      }
    }
  });
  return materials;
}

function monsterBaseY(object: Group): number {
  return typeof object.userData.baseY === 'number' ? object.userData.baseY : 0.46;
}

function oneShotDuration(
  kind:
    | 'attack'
    | 'hit'
    | 'block'
    | 'pickup'
    | 'item'
    | 'taunt'
    | 'spawn',
): number {
  if (kind === 'pickup' || kind === 'item') {
    return COLLECT_FX_SEC;
  }
  if (kind === 'taunt' || kind === 'spawn') {
    return ENCOUNTER_FX_SEC;
  }
  return COMBAT_HIT_SEC;
}
