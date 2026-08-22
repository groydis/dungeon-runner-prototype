import { PerspectiveCamera, Vector3 } from 'three';

export class CameraController {
  readonly camera: PerspectiveCamera;

  private readonly basePosition = new Vector3(0, 8.1, 8.2);
  private readonly lookTarget = new Vector3(0, 0.05, -3.4);
  private punch = 0;

  constructor() {
    this.camera = new PerspectiveCamera(46, 1, 0.1, 48);
    this.applyPose();
  }

  setAspect(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    this.camera.aspect = aspect;
    // Portrait phones need a taller frustum to keep ~8 rows readable.
    this.camera.fov = aspect < 0.72 ? 58 : aspect < 1 ? 52 : 46;
    this.camera.updateProjectionMatrix();
  }

  nudge(): void {
    this.punch = 1;
  }

  update(dt: number): void {
    this.punch = Math.max(0, this.punch - dt * 3.2);
    this.applyPose();
  }

  private applyPose(): void {
    const bob = this.punch * 0.16;
    this.camera.position.set(
      this.basePosition.x,
      this.basePosition.y + bob * 0.12,
      this.basePosition.z - bob,
    );
    this.camera.lookAt(this.lookTarget);
  }
}
