import { type EnemyWeaponVariant } from '../game/definitions/enemyWeapons';
import {
  type PlayerEquipmentMount,
  type PlayerEquipmentVisual,
} from './playerEquipment';

const RIGHT_HAND_DEFAULT = {
  mount: 'handslot.r' as const,
  position: [0, 0, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1,
};

const LEFT_HAND_DEFAULT = {
  mount: 'handslot.l' as const,
  position: [0, 0, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1,
};

function mountVisual(
  assetKey: PlayerEquipmentVisual['assetKey'],
  mount: PlayerEquipmentMount,
): PlayerEquipmentVisual {
  const defaults =
    mount === 'handslot.l' ? LEFT_HAND_DEFAULT : RIGHT_HAND_DEFAULT;
  return {
    assetKey,
    mount,
    position: defaults.position,
    rotation: defaults.rotation,
    scale: defaults.scale,
  };
}

/** Rendering-only mounts for a rolled enemy weapon variant. */
export function enemyEquipmentLoadout(
  variant: EnemyWeaponVariant | null,
): readonly PlayerEquipmentVisual[] {
  if (!variant) {
    return [];
  }
  const loadout: PlayerEquipmentVisual[] = [
    mountVisual(variant.weaponAssetKey, variant.weaponMount),
  ];
  if (variant.shieldAssetKey && variant.shieldMount) {
    loadout.push(mountVisual(variant.shieldAssetKey, variant.shieldMount));
  }
  if (variant.offhandWeaponAssetKey && variant.offhandWeaponMount) {
    loadout.push(
      mountVisual(variant.offhandWeaponAssetKey, variant.offhandWeaponMount),
    );
  }
  return loadout;
}

export function enemyWeaponVariantsEqual(
  a: EnemyWeaponVariant | null,
  b: EnemyWeaponVariant | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.weaponAssetKey === b.weaponAssetKey &&
    a.shieldAssetKey === b.shieldAssetKey &&
    a.offhandWeaponAssetKey === b.offhandWeaponAssetKey &&
    a.attackBonus === b.attackBonus &&
    a.defenceBonus === b.defenceBonus
  );
}
