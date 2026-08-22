import { AnimationClip, Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Shared KayKit Rig_Medium clips. Player and enemy rendering both consume this cache. */
export const RIG_MEDIUM_ANIMATION_URLS = {
  general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
  movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
} as const;

export const RIG_MEDIUM_CLIP_NAMES = {
  idle: 'Idle_A',
  walk: 'Walking_A',
  hit: 'Hit_A',
  death: 'Death_A',
} as const;

export type RigMediumClipId = keyof typeof RIG_MEDIUM_CLIP_NAMES;

export type RigMediumClipMap = {
  readonly [K in RigMediumClipId]?: AnimationClip;
};

const ROOT_POSITION_TRACKS = /\.(root|Rig_Medium)\.position$/;

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<Group>>();
const clipCache = new Map<string, Promise<AnimationClip[]>>();
let clipsPromise: Promise<RigMediumClipMap> | null = null;

export function loadGltfScene(url: string): Promise<Group> {
  const cached = sceneCache.get(url);
  if (cached) {
    return cached;
  }
  const pending = loader.loadAsync(url).then((gltf) => gltf.scene);
  sceneCache.set(url, pending);
  return pending;
}

export function loadRigMediumClips(): Promise<RigMediumClipMap> {
  if (!clipsPromise) {
    clipsPromise = Promise.all([
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.general),
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.movement),
    ]).then(([general, movement]) => {
      const clips = [...general, ...movement];
      return {
        idle: findClip(clips, RIG_MEDIUM_CLIP_NAMES.idle),
        walk: findClip(clips, RIG_MEDIUM_CLIP_NAMES.walk),
        hit: findClip(clips, RIG_MEDIUM_CLIP_NAMES.hit),
        death: findClip(clips, RIG_MEDIUM_CLIP_NAMES.death),
      };
    });
  }
  return clipsPromise;
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
  const cached = clipCache.get(url);
  if (cached) {
    return cached;
  }
  const pending = loader.loadAsync(url).then((gltf) =>
    gltf.animations.map((clip) => neutralizeRootMotion(clip)),
  );
  clipCache.set(url, pending);
  return pending;
}

function findClip(clips: AnimationClip[], name: string): AnimationClip | undefined {
  return clips.find((clip) => clip.name === name);
}
