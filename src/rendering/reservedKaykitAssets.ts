/**
 * Future-ready KayKit assets kept out of current class/enemy rules and eager loads.
 * Promote an entry into the active registry only when its gameplay definition exists.
 */
export const RESERVED_KAYKIT_PLAYER_URLS = {
  rogueUnhooded: '/models/players/kaykit/Rogue.glb',
  druid: '/models/players/kaykit/Druid.glb',
  engineer: '/models/players/kaykit/Engineer.glb',
} as const;

export const RESERVED_KAYKIT_ENEMY_URLS = {
  skeletonMage: '/models/enemies/kaykit/Skeleton_Mage.glb',
  necromancer: '/models/enemies/kaykit/Necromancer.glb',
} as const;

const WEAPON_ROOT = '/models/players/kaykit/weapons';

export const RESERVED_KAYKIT_EQUIPMENT_URLS = {
  arrowBow: `${WEAPON_ROOT}/arrow_bow.glb`,
  arrowBowBundle: `${WEAPON_ROOT}/arrow_bow_bundle.glb`,
  arrowCrossbow: `${WEAPON_ROOT}/arrow_crossbow.glb`,
  arrowCrossbowBundle: `${WEAPON_ROOT}/arrow_crossbow_bundle.glb`,
  axe1H: `${WEAPON_ROOT}/axe_1handed.glb`,
  bow: `${WEAPON_ROOT}/bow.glb`,
  crossbow1H: `${WEAPON_ROOT}/crossbow_1handed.glb`,
  crossbow2H: `${WEAPON_ROOT}/crossbow_2handed.glb`,
  druidStaff: `${WEAPON_ROOT}/druid_staff.glb`,
  engineerWrench: `${WEAPON_ROOT}/engineer_Wrench.glb`,
  quiver: `${WEAPON_ROOT}/quiver.glb`,
  shieldBadgeColor: `${WEAPON_ROOT}/shield_badge_color.glb`,
  shieldRound: `${WEAPON_ROOT}/shield_round.glb`,
  shieldRoundBarbarian: `${WEAPON_ROOT}/shield_round_barbarian.glb`,
  shieldRoundColor: `${WEAPON_ROOT}/shield_round_color.glb`,
  shieldSpikes: `${WEAPON_ROOT}/shield_spikes.glb`,
  shieldSpikesColor: `${WEAPON_ROOT}/shield_spikes_color.glb`,
  shieldSquare: `${WEAPON_ROOT}/shield_square.glb`,
  shieldSquareColor: `${WEAPON_ROOT}/shield_square_color.glb`,
  smokebomb: `${WEAPON_ROOT}/smokebomb.glb`,
  spellbookClosed: `${WEAPON_ROOT}/spellbook_closed.glb`,
  spellbookOpen: `${WEAPON_ROOT}/spellbook_open.glb`,
  sword2H: `${WEAPON_ROOT}/sword_2handed.glb`,
  sword2HColor: `${WEAPON_ROOT}/sword_2handed_color.glb`,
  wand: `${WEAPON_ROOT}/wand.glb`,
} as const;
