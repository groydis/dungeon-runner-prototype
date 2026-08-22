import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  WebGLRenderer,
  type Camera,
} from 'three';
import {
  LANE_COUNT,
  ROW_POOL_SIZE,
  TILE_PITCH,
  TILE_SIZE,
  laneWorldX,
  rowWorldZ,
} from '../game/config';
import { type EncounterEvent } from '../game/encounters';
import { type GameState } from '../game/GameState';
import { type Tile } from '../game/Tile';

interface RowView {
  group: Group;
  tiles: Mesh[];
  hitPlanes: Mesh[];
  monsters: Mesh[];
  assignedRow: number;
}

interface EncounterFxView {
  event: EncounterEvent;
  monsterMesh: Mesh;
  monsterBaseX: number;
  playerBaseX: number;
}

export class SceneManager {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;

  private readonly rowViews: RowView[] = [];
  private readonly playerMesh: Group;
  private readonly floorMaterialA: MeshStandardMaterial;
  private readonly floorMaterialB: MeshStandardMaterial;
  private readonly highlightMaterial: MeshStandardMaterial;
  private readonly monsterMaterial: MeshStandardMaterial;
  private readonly hitMaterial: MeshBasicMaterial;

  private scrollZ = 0;
  private highlightRow = Number.NaN;
  private encounterFx: EncounterFxView[] = [];

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
    this.monsterMaterial = new MeshStandardMaterial({
      color: 0xc4372e,
      roughness: 0.45,
      metalness: 0.12,
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
    this.playerMesh = this.createPlayer();
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
  bindWindow(state: GameState): void {
    for (let i = 0; i < this.rowViews.length; i += 1) {
      const row = state.player.row + i;
      this.bindRow(this.rowViews[i], row, state.grid.getRow(row));
    }
    this.refreshHighlights(state);
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
      this.bindRow(view, farRow, state.grid.getRow(farRow));
    }
  }

  refreshHighlights(state: GameState): void {
    this.highlightRow = state.isAnimating ? Number.NaN : state.player.row + 1;
    for (const view of this.rowViews) {
      this.applyTileChrome(view, state.grid.getRow(view.assignedRow));
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
      meshes.push(...view.hitPlanes, ...view.tiles);
    }
    return meshes;
  }

  update(elapsedSec: number): void {
    const pulse = 0.22 + 0.18 * Math.sin(elapsedSec * 3.4);
    this.highlightMaterial.emissiveIntensity = pulse;
  }

  /** Visual-only: show the resolved monster again so the outcome can play. */
  beginEncounterFx(events: EncounterEvent[], playerCol: number): void {
    this.encounterFx = [];
    for (const event of events) {
      const mesh = this.findMonsterMesh(event.monster.row, event.monster.col);
      if (!mesh) {
        continue;
      }
      mesh.visible = true;
      mesh.scale.setScalar(1);
      mesh.position.x = laneWorldX(event.monster.col);
      mesh.position.y = 0.46;
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = 1;
      this.encounterFx.push({
        event,
        monsterMesh: mesh,
        monsterBaseX: laneWorldX(event.monster.col),
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
        fx.monsterMesh.position.y = 0.46 + t * 0.32;
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

  endEncounterFx(): void {
    for (const fx of this.encounterFx) {
      fx.monsterMesh.visible = false;
      fx.monsterMesh.scale.setScalar(1);
      fx.monsterMesh.position.x = fx.monsterBaseX;
      fx.monsterMesh.position.y = 0.46;
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
    const monsterGeo = new SphereGeometry(0.28, 10, 8);

    for (let i = 0; i < ROW_POOL_SIZE; i += 1) {
      const group = new Group();
      const tiles: Mesh[] = [];
      const hitPlanes: Mesh[] = [];
      const monsters: Mesh[] = [];

      for (let col = 0; col < LANE_COUNT; col += 1) {
        const tile = new Mesh(tileGeo, this.floorMaterialA);
        tile.position.set(laneWorldX(col), 0, 0);

        const hit = new Mesh(hitGeo, this.hitMaterial);
        hit.rotation.x = -Math.PI / 2;
        hit.position.set(laneWorldX(col), 0.12, 0);

        const monster = new Mesh(monsterGeo, this.monsterMaterial.clone());
        monster.position.set(laneWorldX(col), 0.46, 0);
        monster.visible = false;

        group.add(tile, hit, monster);
        tiles.push(tile);
        hitPlanes.push(hit);
        monsters.push(monster);
      }

      this.scene.add(group);
      this.rowViews.push({
        group,
        tiles,
        hitPlanes,
        monsters,
        assignedRow: i,
      });
    }
  }

  private bindRow(view: RowView, row: number, tiles: Tile[] | undefined): void {
    view.assignedRow = row;
    this.applyTileChrome(view, tiles);
  }

  private applyTileChrome(view: RowView, tiles: Tile[] | undefined): void {
    const highlighted = view.assignedRow === this.highlightRow;

    for (let col = 0; col < LANE_COUNT; col += 1) {
      const mesh = view.tiles[col];
      const hit = view.hitPlanes[col];
      const monster = view.monsters[col];
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
      const playingFx = this.encounterFx.some((fx) => fx.monsterMesh === monster);
      monster.visible = playingFx || tile?.content.type === 'monster';
    }
  }

  private findMonsterMesh(row: number, col: number): Mesh | undefined {
    const view = this.rowViews.find((rowView) => rowView.assignedRow === row);
    return view?.monsters[col];
  }

  private createPlayer(): Group {
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
    return group;
  }
}
