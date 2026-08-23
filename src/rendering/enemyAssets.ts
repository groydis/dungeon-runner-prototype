import { Box3, type Group, type Object3D } from 'three';
import { type EnemyRenderKey } from '../game/definitions/enemies';

export type { EnemyRenderKey };
import {
  loadGltfScene,
  loadRigMediumClips,
  type RigMediumClipMap,
} from './rigMediumAnimations';

export const ENEMY_RENDER_KEYS: readonly EnemyRenderKey[] = [
  'skeletonMinion',
  'cryptGuard',
  'boneBrute',
  'skeletonMage',
  'necromancer',
];

export const ENEMY_MODEL_URLS: Record<EnemyRenderKey, string> = {
  skeletonMinion: '/models/enemies/kaykit/Skeleton_Minion.glb',
  cryptGuard: '/models/enemies/kaykit/Skeleton_Rogue.glb',
  boneBrute: '/models/enemies/kaykit/Skeleton_Warrior.glb',
  skeletonMage: '/models/enemies/kaykit/Skeleton_Mage.glb',
  necromancer: '/models/enemies/kaykit/Necromancer.glb',
};

export type EnemyAttackClipId =
  | 'attackUnarmed'
  | 'attackUnarmedKick'
  | 'attack1H'
  | 'attack1HChop'
  | 'attack1HHorizontal'
  | 'attack1HStab'
  | 'attack2H'
  | 'attack2HSlice'
  | 'attack2HSpin'
  | 'attack2HStab'
  | 'magicShoot'
  | 'magicSpellcasting'
  | 'magicSummon';

export const ENEMY_ATTACK_CLIPS: Record<
  EnemyRenderKey,
  readonly EnemyAttackClipId[]
> = {
  skeletonMinion: ['attackUnarmed', 'attackUnarmedKick'],
  cryptGuard: ['attack1H', 'attack1HChop', 'attack1HHorizontal', 'attack1HStab'],
  boneBrute: ['attack2H', 'attack2HSlice', 'attack2HSpin', 'attack2HStab'],
  skeletonMage: ['magicShoot', 'magicSpellcasting'],
  necromancer: ['magicSummon'],
};

export interface EnemyModelFit {
  readonly height: number;
  readonly wrapperY: number;
  readonly yaw: number;
}

/** Per-model presentation. SceneManager must not hard-code these. */
export const ENEMY_MODEL_FITS: Record<EnemyRenderKey, EnemyModelFit> = {
  skeletonMinion: { height: 0.78, wrapperY: 0.46, yaw: 0 },
  cryptGuard: { height: 0.96, wrapperY: 0.58, yaw: 0 },
  boneBrute: { height: 1.08, wrapperY: 0.52, yaw: 0 },
  skeletonMage: { height: 0.96, wrapperY: 0.58, yaw: 0 },
  necromancer: { height: 1.06, wrapperY: 0.6, yaw: 0 },
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

export function loadEnemyClips(key: EnemyRenderKey): Promise<RigMediumClipMap> {
  return loadRigMediumClips({
    includeRanged: key === 'skeletonMage' || key === 'necromancer',
  });
}

export function enemyAttackClip(
  key: EnemyRenderKey,
  clips: RigMediumClipMap,
  sequenceIndex = 0,
) {
  const choices = ENEMY_ATTACK_CLIPS[key];
  return clips[choices[sequenceIndex % choices.length]];
}

export function enemySpawnClip(key: EnemyRenderKey, clips: RigMediumClipMap) {
  return key === 'necromancer'
    ? clips.skeletonResurrect
    : clips.skeletonSpawn;
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
