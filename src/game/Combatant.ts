export type DamageChannel = 'physical' | 'arcane';
export type CoreAttribute = 'might' | 'finesse' | 'vigor' | 'will';

export const ATTRIBUTE_MIN = 8;
export const ATTRIBUTE_MAX = 20;
export const ARMOR_CAP = 12;
export const WARD_CAP = 12;
export const CRIT_CAP = 35;
export const PIERCE_CAP = 40;
export const EVADE_BONUS_CAP = 30;
export const EXTRA_STRIKE_CAP = 25;

/** D&D-style modifier: 8=-1, 10=0, 12=+1, 14=+2, 16=+3, 18=+4, 20=+5. */
export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function clampAttribute(score: number): number {
  return clamp(Math.floor(score), ATTRIBUTE_MIN, ATTRIBUTE_MAX);
}

export interface CombatStats {
  maxHealth: number;
  health: number;
  attack: number;
  armor: number;
  ward: number;
  might: number;
  finesse: number;
  vigor: number;
  will: number;
  damageChannel: DamageChannel;
  critChance: number;
  pierce: number;
  openingDamageMultiplier: number;
  openingPierce: number;
  firstIncomingReduction: number;
  bloodiedMultiplier: number;
  extraStrikeChance: number;
  evadeBonus: number;
  awareness: number;

  /** Compatibility aliases for rendering and seeded prototype helpers. */
  defence: number;
  str: number;
  con: number;
  dex: number;
}

export function createCombatStats(
  stats: Readonly<Partial<CombatStats>>,
): CombatStats {
  const might = clampAttribute(stats.might ?? stats.str ?? 10);
  const finesse = clampAttribute(stats.finesse ?? stats.dex ?? 10);
  const vigor = clampAttribute(stats.vigor ?? stats.con ?? 10);
  const will = clampAttribute(stats.will ?? 10);
  const armor = clamp(Math.floor(stats.armor ?? stats.defence ?? 0), 0, ARMOR_CAP);
  const ward = clamp(Math.floor(stats.ward ?? 0), 0, WARD_CAP);
  const maxHealth = Math.max(1, Math.floor(stats.maxHealth ?? 1));
  return {
    maxHealth,
    health: clamp(Math.floor(stats.health ?? maxHealth), 0, maxHealth),
    attack: Math.max(0, Math.floor(stats.attack ?? 0)),
    armor,
    ward,
    might,
    finesse,
    vigor,
    will,
    damageChannel: stats.damageChannel ?? 'physical',
    critChance: clamp(Math.floor(stats.critChance ?? 0), 0, CRIT_CAP),
    pierce: clamp(Math.floor(stats.pierce ?? 0), 0, PIERCE_CAP),
    openingDamageMultiplier: Math.max(1, stats.openingDamageMultiplier ?? 1),
    openingPierce: clamp(Math.floor(stats.openingPierce ?? 0), 0, PIERCE_CAP),
    firstIncomingReduction: clamp(Math.floor(stats.firstIncomingReduction ?? 0), 0, 80),
    bloodiedMultiplier: Math.max(1, stats.bloodiedMultiplier ?? 1),
    extraStrikeChance: clamp(Math.floor(stats.extraStrikeChance ?? 0), 0, EXTRA_STRIKE_CAP),
    evadeBonus: clamp(Math.floor(stats.evadeBonus ?? 0), 0, EVADE_BONUS_CAP),
    awareness: clamp(Math.floor(stats.awareness ?? 0), -6, 6),
    defence: armor,
    str: might,
    con: vigor,
    dex: finesse,
  };
}

/** Combat-math fixture. Live player bases come from class definitions. */
export function createPlayerStats(): CombatStats {
  return createCombatStats({
    maxHealth: 18,
    health: 18,
    attack: 5,
    armor: 1,
    might: 10,
    finesse: 14,
    vigor: 10,
    will: 10,
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
