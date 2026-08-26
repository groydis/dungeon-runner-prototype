import { Box3, type Group, type Object3D } from 'three';
import {
  PLAYER_RENDER_KEYS,
  type PlayerRenderKey,
} from '../game/definitions/classes';
import { PLAYER_WEAPON_PROGRESSION } from '../game/definitions/playerWeaponProgression';
import {
  loadGltfScene,
  loadRigMediumClips,
  RIG_MEDIUM_ANIMATION_URLS,
  RIG_MEDIUM_CLIP_NAMES,
  type RigMediumClipMap,
} from './rigMediumAnimations';

export const PLAYER_MODEL_URLS: Record<PlayerRenderKey, string> = {
  rogue: '/models/players/kaykit/Rogue_Hooded.glb',
  ranger: '/models/players/kaykit/Ranger.glb',
  mage: '/models/players/kaykit/Mage.glb',
  knight: '/models/players/kaykit/Knight.glb',
  barbarian: '/models/players/kaykit/Barbarian.glb',
  lorekeeper: '/models/players/kaykit/Lorekeeper.glb',
};

export const PLAYER_ANIMATION_URLS = RIG_MEDIUM_ANIMATION_URLS;
export const PLAYER_CLIP_NAMES = RIG_MEDIUM_CLIP_NAMES;
export type PlayerClipMap = RigMediumClipMap;
export type PlayerAttackClipId =
  | 'attack1H'
  | 'attack1HChop'
  | 'attack1HHorizontal'
  | 'attack1HStab'
  | 'attack2H'
  | 'attack2HSlice'
  | 'attack2HSpin'
  | 'attack2HStab'
  | 'bowRelease'
  | 'ranged1HShoot'
  | 'ranged2HShoot'
  | 'magicShoot'
  | 'magicSpellcasting';

/** Per-class attack cycles; ranged clips are loaded only for Ranger and Mage. */
export const PLAYER_ATTACK_CLIPS: {
  readonly [K in PlayerRenderKey]: readonly PlayerAttackClipId[];
} = {
  rogue: ['attack1H', 'attack1HChop', 'attack1HHorizontal', 'attack1HStab'],
  ranger: ['bowRelease'],
  mage: ['magicShoot', 'magicSpellcasting'],
  knight: ['attack1H', 'attack1HHorizontal', 'attack1HStab'],
  barbarian: ['attack2H', 'attack2HSlice', 'attack2HSpin', 'attack2HStab'],
  lorekeeper: ['magicSpellcasting', 'magicShoot'],
};

/** Target in-world height so KayKit adventurers match the old capsule. */
export const PLAYER_MODEL_HEIGHT = 0.98;
/** Wrapper `playerMesh` sits at y=0.62; offset the clone so feet stay on the tile. */
export const PLAYER_MODEL_WRAPPER_Y = 0.62;
/** Face into the dungeon (−Z), matching camera look-at. */
export const PLAYER_MODEL_YAW = Math.PI;

export function isPlayerRenderKey(value: string): value is PlayerRenderKey {
  return (PLAYER_RENDER_KEYS as readonly string[]).includes(value);
}

export function playerModelUrl(key: PlayerRenderKey): string {
  return PLAYER_MODEL_URLS[key];
}

export function loadPlayerTemplate(key: PlayerRenderKey): Promise<Group> {
  return loadGltfScene(playerModelUrl(key));
}

export function loadPlayerClips(key: PlayerRenderKey): Promise<PlayerClipMap> {
  return loadRigMediumClips({
    includeRanged:
      key === 'ranger' || key === 'mage' || key === 'lorekeeper',
  });
}

export function playerAttackClip(
  key: PlayerRenderKey | null | undefined,
  clips: PlayerClipMap,
  sequenceIndex = 0,
  weaponTierIndex = 0,
) {
  if (key === 'ranger') {
    const ladder = PLAYER_WEAPON_PROGRESSION.ranger;
    const index = Math.max(0, Math.min(weaponTierIndex, ladder.length - 1));
    const weaponId = ladder[index]!;
    if (weaponId === 'crossbow1H') {
      return clips.ranged1HShoot;
    }
    if (weaponId === 'crossbow2H') {
      return clips.ranged2HShoot;
    }
  }
  const choices = key ? PLAYER_ATTACK_CLIPS[key] : undefined;
  if (!choices || choices.length === 0) {
    return undefined;
  }
  const clipId = choices[sequenceIndex % choices.length];
  return clips[clipId];
}

export function fitPlayerModel(root: Object3D): void {
  root.rotation.y = PLAYER_MODEL_YAW;
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const height = Math.max(box.max.y - box.min.y, 0.001);
  root.scale.multiplyScalar(PLAYER_MODEL_HEIGHT / height);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y + PLAYER_MODEL_WRAPPER_Y;
}
