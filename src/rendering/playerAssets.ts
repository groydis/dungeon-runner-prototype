import { AnimationClip, Box3, Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  PLAYER_RENDER_KEYS,
  type PlayerRenderKey,
} from '../game/definitions/classes';

export const PLAYER_MODEL_URLS: Record<PlayerRenderKey, string> = {
  rogue: '/models/players/kaykit/Rogue_Hooded.glb',
  ranger: '/models/players/kaykit/Ranger.glb',
  mage: '/models/players/kaykit/Mage.glb',
  knight: '/models/players/kaykit/Knight.glb',
  barbarian: '/models/players/kaykit/Barbarian.glb',
};

export const PLAYER_ANIMATION_URLS = {
  general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
  movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
} as const;

export const PLAYER_CLIP_NAMES = {
  idle: 'Idle_A',
  walk: 'Walking_A',
  hit: 'Hit_A',
  death: 'Death_A',
} as const;

export type PlayerClipId = keyof typeof PLAYER_CLIP_NAMES;

export type PlayerClipMap = {
  readonly [K in PlayerClipId]?: AnimationClip;
};

/** Target in-world height so KayKit adventurers match the old capsule. */
export const PLAYER_MODEL_HEIGHT = 0.98;
/** Wrapper `playerMesh` sits at y=0.62; offset the clone so feet stay on the tile. */
export const PLAYER_MODEL_WRAPPER_Y = 0.62;
/** Face into the dungeon (−Z), matching camera look-at. */
export const PLAYER_MODEL_YAW = Math.PI;

const ROOT_POSITION_TRACKS = /\.(root|Rig_Medium)\.position$/;

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<Group | AnimationClip[]>>();
let clipsPromise: Promise<PlayerClipMap> | null = null;

export function isPlayerRenderKey(value: string): value is PlayerRenderKey {
  return (PLAYER_RENDER_KEYS as readonly string[]).includes(value);
}

export function playerModelUrl(key: PlayerRenderKey): string {
  return PLAYER_MODEL_URLS[key];
}

export function loadPlayerTemplate(key: PlayerRenderKey): Promise<Group> {
  const url = playerModelUrl(key);
  const cached = gltfCache.get(url);
  if (cached) {
    return cached as Promise<Group>;
  }
  const pending = loader.loadAsync(url).then((gltf) => gltf.scene);
  gltfCache.set(url, pending);
  return pending;
}

export function loadPlayerClips(): Promise<PlayerClipMap> {
  if (!clipsPromise) {
    clipsPromise = Promise.all([
      loadAnimationClips(PLAYER_ANIMATION_URLS.general),
      loadAnimationClips(PLAYER_ANIMATION_URLS.movement),
    ]).then(([general, movement]) => {
      const clips = [...general, ...movement];
      return {
        idle: findClip(clips, PLAYER_CLIP_NAMES.idle),
        walk: findClip(clips, PLAYER_CLIP_NAMES.walk),
        hit: findClip(clips, PLAYER_CLIP_NAMES.hit),
        death: findClip(clips, PLAYER_CLIP_NAMES.death),
      };
    });
  }
  return clipsPromise;
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

export function neutralizeRootMotion(clip: AnimationClip): AnimationClip {
  const copy = clip.clone();
  copy.tracks = copy.tracks.filter((track) => !isRootPositionTrack(track.name));
  return copy;
}

function isRootPositionTrack(name: string): boolean {
  return (
    name === 'root.position' ||
    name === 'Rig_Medium.position' ||
    ROOT_POSITION_TRACKS.test(name)
  );
}

function loadAnimationClips(url: string): Promise<AnimationClip[]> {
  const cached = gltfCache.get(url);
  if (cached) {
    return cached as Promise<AnimationClip[]>;
  }
  const pending = loader.loadAsync(url).then((gltf) =>
    gltf.animations.map((clip) => neutralizeRootMotion(clip)),
  );
  gltfCache.set(url, pending);
  return pending;
}

function findClip(clips: AnimationClip[], name: string): AnimationClip | undefined {
  return clips.find((clip) => clip.name === name);
}
