import { Box3, type Group, type Object3D } from 'three';
import { type EnemyType } from '../game/definitions/enemies';
import {
  loadGltfScene,
  type RigMediumClipMap,
} from './rigMediumAnimations';

export type EnemyRenderKey = EnemyType;

export const ENEMY_RENDER_KEYS: readonly EnemyRenderKey[] = [
  'caveRat',
  'cryptGuard',
  'boneBrute',
];

export const ENEMY_MODEL_URLS: Record<EnemyRenderKey, string> = {
  caveRat: '/models/enemies/kaykit/Skeleton_Minion.glb',
  cryptGuard: '/models/enemies/kaykit/Skeleton_Rogue.glb',
  boneBrute: '/models/enemies/kaykit/Skeleton_Warrior.glb',
};

export const ENEMY_ATTACK_CLIPS: Record<
  EnemyRenderKey,
  'attackUnarmed' | 'attack1H' | 'attack2H'
> = {
  caveRat: 'attackUnarmed',
  cryptGuard: 'attack1H',
  boneBrute: 'attack2H',
};

export interface EnemyModelFit {
  readonly height: number;
  readonly wrapperY: number;
  readonly yaw: number;
}

/** Per-model presentation. SceneManager must not hard-code these. */
export const ENEMY_MODEL_FITS: Record<EnemyRenderKey, EnemyModelFit> = {
  caveRat: { height: 0.78, wrapperY: 0.46, yaw: 0 },
  cryptGuard: { height: 0.96, wrapperY: 0.58, yaw: 0 },
  boneBrute: { height: 1.08, wrapperY: 0.52, yaw: 0 },
};

export function isEnemyRenderKey(value: string): value is EnemyRenderKey {
  return (ENEMY_RENDER_KEYS as readonly string[]).includes(value);
}

export function enemyModelUrl(key: EnemyRenderKey): string {
  return ENEMY_MODEL_URLS[key];
}

export function loadEnemyTemplate(key: EnemyRenderKey): Promise<Group> {
  return loadGltfScene(enemyModelUrl(key));
}

export function enemyAttackClip(key: EnemyRenderKey, clips: RigMediumClipMap) {
  return clips[ENEMY_ATTACK_CLIPS[key]];
}

export function fitEnemyModel(root: Object3D, key: EnemyRenderKey): void {
  const fit = ENEMY_MODEL_FITS[key];
  root.rotation.y = fit.yaw;
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const height = Math.max(box.max.y - box.min.y, 0.001);
  root.scale.multiplyScalar(fit.height / height);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y + fit.wrapperY;
}
