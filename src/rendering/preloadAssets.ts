import {
  PLAYER_CLASS_IDS,
  getPlayerClassDefinition,
  type PlayerClassId,
} from '../game/definitions/classes';
import { loadCombatProjectileTemplate } from './combatPresentationAssets';
import {
  DUNGEON_FLOOR_KEYS,
  DUNGEON_WALL_KEYS,
  loadDungeonFloorTemplate,
  loadDungeonTrapTemplate,
  loadDungeonWallTemplate,
  loadDungeonWallTorchTemplate,
} from './environmentAssets';
import { loadEnemyTemplate } from './enemyAssets';
import { loadMerchantClips, loadMerchantTemplate } from './merchantAssets';
import { loadPlayerClips, loadPlayerTemplate } from './playerAssets';
import {
  loadPlayerEquipmentTemplate,
  playerEquipmentLoadout,
} from './playerEquipment';
import { ACTIVE_POTION_MODEL_SIZE, loadPotionTemplate } from './potionAssets';
import {
  loadRigMediumClips,
  loadRigMediumIdleClip,
} from './rigMediumAnimations';

export interface AssetPreloadProgress {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
  readonly label: string;
}

interface PreloadTask {
  readonly label: string;
  readonly run: () => Promise<unknown>;
}

const classGameplayPromises = new Map<PlayerClassId, Promise<void>>();
let selectionBackgroundPromise: Promise<void> | null = null;

/** Assets required for a complete carousel and the visible opening dungeon. */
export function preloadBootAssets(
  onProgress?: (progress: AssetPreloadProgress) => void,
): Promise<void> {
  const tasks: PreloadTask[] = [
    {
      label: 'Preparing adventurer animations',
      run: () => loadRigMediumIdleClip(),
    },
    ...PLAYER_CLASS_IDS.map((classId) => ({
      label: `Preparing ${getPlayerClassDefinition(classId).name}`,
      run: () => preloadClassPresentation(classId),
    })),
    {
      label: 'Building the dungeon floor',
      run: () =>
        Promise.all(DUNGEON_FLOOR_KEYS.map(loadDungeonFloorTemplate)),
    },
    {
      label: 'Raising the dungeon walls',
      run: () =>
        Promise.all([
          ...DUNGEON_WALL_KEYS.map(loadDungeonWallTemplate),
          loadDungeonWallTorchTemplate(),
        ]),
    },
    {
      label: 'Setting traps and supplies',
      run: () =>
        Promise.all([
          loadDungeonTrapTemplate(),
          loadPotionTemplate(ACTIVE_POTION_MODEL_SIZE),
        ]),
    },
    {
      label: 'Waking the skeletons',
      run: () => loadEnemyTemplate('skeletonMinion'),
    },
  ];
  return runPreloadTasks(tasks, onProgress);
}

/** Quiet work performed while the player browses the character carousel. */
export function preloadCharacterSelectionBackgroundAssets(): Promise<void> {
  if (!selectionBackgroundPromise) {
    selectionBackgroundPromise = settlePreloads([
      loadRigMediumClips(),
      loadEnemyTemplate('cryptGuard'),
      loadEnemyTemplate('boneBrute'),
      loadMerchantTemplate(),
      loadMerchantClips(),
    ]);
  }
  return selectionBackgroundPromise;
}

/** Ensure the highlighted class can enter gameplay without presentation pop-in. */
export function preloadClassGameplayAssets(
  classId: PlayerClassId,
): Promise<void> {
  const cached = classGameplayPromises.get(classId);
  if (cached) {
    return cached;
  }
  const promises: Promise<unknown>[] = [
    preloadClassPresentation(classId),
    loadPlayerClips(classId),
  ];
  if (classId === 'ranger') {
    promises.push(loadCombatProjectileTemplate('bow'));
  }
  const pending = settlePreloads(promises);
  classGameplayPromises.set(classId, pending);
  return pending;
}

function preloadClassPresentation(classId: PlayerClassId): Promise<unknown> {
  return Promise.all([
    loadPlayerTemplate(classId),
    ...playerEquipmentLoadout(classId).map((visual) =>
      loadPlayerEquipmentTemplate(visual.assetKey),
    ),
  ]);
}

async function runPreloadTasks(
  tasks: readonly PreloadTask[],
  onProgress?: (progress: AssetPreloadProgress) => void,
): Promise<void> {
  let completed = 0;
  const total = tasks.length;
  onProgress?.({
    completed,
    total,
    percent: 0,
    label: 'Preparing the dungeon',
  });
  await Promise.all(
    tasks.map(async (task) => {
      try {
        await task.run();
      } catch (error) {
        console.warn(`Asset preload failed: ${task.label}`, error);
      } finally {
        completed += 1;
        onProgress?.({
          completed,
          total,
          percent: Math.round((completed / total) * 100),
          label: task.label,
        });
      }
    }),
  );
}

async function settlePreloads(promises: readonly Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Background asset preload failed', result.reason);
    }
  }
}
