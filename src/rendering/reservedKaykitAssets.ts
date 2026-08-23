/**
 * Future-ready KayKit assets kept out of current class/enemy rules and eager loads.
 * Promote an entry into the active registry only when its gameplay definition exists.
 */
export const RESERVED_KAYKIT_PLAYER_URLS = {
  rogueUnhooded: '/models/players/kaykit/Rogue.glb',
  druid: '/models/players/kaykit/Druid.glb',
} as const;

const WEAPON_ROOT = '/models/players/kaykit/weapons';

export const RESERVED_KAYKIT_EQUIPMENT_URLS = {
  arrowBowBundle: `${WEAPON_ROOT}/arrow_bow_bundle.glb`,
  arrowCrossbowBundle: `${WEAPON_ROOT}/arrow_crossbow_bundle.glb`,
  bow: `${WEAPON_ROOT}/bow.glb`,
  druidStaff: `${WEAPON_ROOT}/druid_staff.glb`,
  quiver: `${WEAPON_ROOT}/quiver.glb`,
} as const;
