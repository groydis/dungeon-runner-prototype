import { AnimationClip, Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Shared KayKit Rig_Medium clips. Player and enemy rendering both consume this cache. */
export const RIG_MEDIUM_ANIMATION_URLS = {
  general: '/models/players/kaykit/animations/Rig_Medium_General.glb',
  movement: '/models/players/kaykit/animations/Rig_Medium_MovementBasic.glb',
  melee: '/models/players/kaykit/animations/Rig_Medium_CombatMelee.glb',
  special: '/models/players/kaykit/animations/Rig_Medium_Special.glb',
} as const;

/** Download on first use by a ranged class or enemy. */
export const RIG_MEDIUM_LAZY_ANIMATION_URLS = {
  ranged: '/models/players/kaykit/animations/Rig_Medium_CombatRanged.glb',
} as const;

/** Retained for later gameplay but never requested by the current runtime. */
export const RIG_MEDIUM_RESERVED_ANIMATION_URLS = {
  movementAdvanced:
    '/models/players/kaykit/animations/Rig_Medium_MovementAdvanced.glb',
  simulation: '/models/players/kaykit/animations/Rig_Medium_Simulation.glb',
} as const;

export const RIG_MEDIUM_CLIP_NAMES = {
  idle: 'Idle_A',
  walk: 'Walking_A',
  hit: 'Hit_A',
  death: 'Death_A',
  pickup: 'PickUp',
  useItem: 'Use_Item',
  attack1H: 'Melee_1H_Attack_Slice_Diagonal',
  attack1HChop: 'Melee_1H_Attack_Chop',
  attack1HHorizontal: 'Melee_1H_Attack_Slice_Horizontal',
  attack1HStab: 'Melee_1H_Attack_Stab',
  attack2H: 'Melee_2H_Attack_Chop',
  attack2HSlice: 'Melee_2H_Attack_Slice',
  attack2HSpin: 'Melee_2H_Attack_Spin',
  attack2HStab: 'Melee_2H_Attack_Stab',
  attackUnarmed: 'Melee_Unarmed_Attack_Punch_A',
  attackUnarmedKick: 'Melee_Unarmed_Attack_Kick',
  blockHit: 'Melee_Block_Hit',
  skeletonIdle: 'Skeletons_Idle',
  skeletonWalk: 'Skeletons_Walking',
  skeletonDeath: 'Skeletons_Death',
  skeletonSpawn: 'Skeletons_Spawn_Ground',
  skeletonTaunt: 'Skeletons_Taunt',
  skeletonResurrect: 'Skeletons_Death_Resurrect',
  bowRelease: 'Ranged_Bow_Release',
  ranged1HShoot: 'Ranged_1H_Shoot',
  ranged2HShoot: 'Ranged_2H_Shoot',
  magicShoot: 'Ranged_Magic_Shoot',
  magicSpellcasting: 'Ranged_Magic_Spellcasting',
  magicSummon: 'Ranged_Magic_Summon',
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
let rangedClipsPromise: Promise<RigMediumClipMap> | null = null;

export function loadGltfScene(url: string): Promise<Group> {
  const cached = sceneCache.get(url);
  if (cached) {
    return cached;
  }
  const pending = loader.loadAsync(url).then((gltf) => gltf.scene);
  sceneCache.set(url, pending);
  return pending;
}

export async function loadRigMediumClips(
  options: { includeRanged?: boolean } = {},
): Promise<RigMediumClipMap> {
  if (!clipsPromise) {
    clipsPromise = Promise.all([
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.general),
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.movement),
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.melee),
      loadAnimationClips(RIG_MEDIUM_ANIMATION_URLS.special),
    ]).then(([general, movement, melee, special]) => {
      const clips = [...general, ...movement, ...melee, ...special];
      return {
        idle: findClip(clips, RIG_MEDIUM_CLIP_NAMES.idle),
        walk: findClip(clips, RIG_MEDIUM_CLIP_NAMES.walk),
        hit: findClip(clips, RIG_MEDIUM_CLIP_NAMES.hit),
        death: findClip(clips, RIG_MEDIUM_CLIP_NAMES.death),
        pickup: findClip(clips, RIG_MEDIUM_CLIP_NAMES.pickup),
        useItem: findClip(clips, RIG_MEDIUM_CLIP_NAMES.useItem),
        attack1H: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack1H),
        attack1HChop: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack1HChop),
        attack1HHorizontal: findClip(
          clips,
          RIG_MEDIUM_CLIP_NAMES.attack1HHorizontal,
        ),
        attack1HStab: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack1HStab),
        attack2H: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack2H),
        attack2HSlice: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack2HSlice),
        attack2HSpin: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack2HSpin),
        attack2HStab: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attack2HStab),
        attackUnarmed: findClip(clips, RIG_MEDIUM_CLIP_NAMES.attackUnarmed),
        attackUnarmedKick: findClip(
          clips,
          RIG_MEDIUM_CLIP_NAMES.attackUnarmedKick,
        ),
        blockHit: findClip(clips, RIG_MEDIUM_CLIP_NAMES.blockHit),
        skeletonIdle: findClip(clips, RIG_MEDIUM_CLIP_NAMES.skeletonIdle),
        skeletonWalk: findClip(clips, RIG_MEDIUM_CLIP_NAMES.skeletonWalk),
        skeletonDeath: findClip(clips, RIG_MEDIUM_CLIP_NAMES.skeletonDeath),
        skeletonSpawn: findClip(clips, RIG_MEDIUM_CLIP_NAMES.skeletonSpawn),
        skeletonTaunt: findClip(clips, RIG_MEDIUM_CLIP_NAMES.skeletonTaunt),
        skeletonResurrect: findClip(
          clips,
          RIG_MEDIUM_CLIP_NAMES.skeletonResurrect,
        ),
      };
    });
  }
  const clips = await clipsPromise;
  if (!options.includeRanged) {
    return clips;
  }
  return { ...clips, ...(await loadRigMediumRangedClips()) };
}

/** Load bow and magic clips only for ranged classes or enemies. */
export function loadRigMediumRangedClips(): Promise<RigMediumClipMap> {
  if (!rangedClipsPromise) {
    rangedClipsPromise = loadAnimationClips(
      RIG_MEDIUM_LAZY_ANIMATION_URLS.ranged,
    ).then((clips) => ({
      bowRelease: findClip(clips, RIG_MEDIUM_CLIP_NAMES.bowRelease),
      ranged1HShoot: findClip(clips, RIG_MEDIUM_CLIP_NAMES.ranged1HShoot),
      ranged2HShoot: findClip(clips, RIG_MEDIUM_CLIP_NAMES.ranged2HShoot),
      magicShoot: findClip(clips, RIG_MEDIUM_CLIP_NAMES.magicShoot),
      magicSpellcasting: findClip(
        clips,
        RIG_MEDIUM_CLIP_NAMES.magicSpellcasting,
      ),
      magicSummon: findClip(clips, RIG_MEDIUM_CLIP_NAMES.magicSummon),
    }));
  }
  return rangedClipsPromise;
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
