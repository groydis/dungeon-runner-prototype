import { Box3, type Group, type Object3D, Vector3 } from 'three';
import { loadGltfScene } from './rigMediumAnimations';

export const PROJECTILE_POOL_SIZE = 4;

export const COMBAT_PROJECTILE_URLS = {
  bow: '/models/players/kaykit/weapons/arrow_bow.glb',
  crossbow: '/models/players/kaykit/weapons/arrow_crossbow.glb',
} as const;

export type CombatProjectileKind = keyof typeof COMBAT_PROJECTILE_URLS;

export function loadCombatProjectileTemplate(
  kind: CombatProjectileKind,
): Promise<Group> {
  return loadGltfScene(COMBAT_PROJECTILE_URLS[kind]);
}

/** Normalize KayKit arrows to a compact combat-readable world-space length. */
export function fitCombatProjectile(root: Object3D): void {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  root.scale.multiplyScalar(0.42 / longest);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const center = box.getCenter(new Vector3());
  root.position.sub(center);
}
