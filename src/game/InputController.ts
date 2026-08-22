import {
  Raycaster,
  Vector2,
  type Camera,
  type Object3D,
} from 'three';

export interface TilePick {
  row: number;
  col: number;
}

interface TileUserData {
  row?: number;
  col?: number;
}

export class InputController {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Camera;
  private readonly getTargets: () => Object3D[];
  private readonly onPick: (tile: TilePick) => void;
  private enabled = true;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    getTargets: () => Object3D[],
    onPick: (tile: TilePick) => void,
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.getTargets = getTargets;
    this.onPick = onPick;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
  }

  private preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.getTargets(), false);
    const hit = hits[0];
    if (!hit) {
      return;
    }

    const data = hit.object.userData as TileUserData;
    if (typeof data.row !== 'number' || typeof data.col !== 'number') {
      return;
    }

    this.onPick({ row: data.row, col: data.col });
  };
}
