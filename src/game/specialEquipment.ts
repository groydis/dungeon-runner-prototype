import {
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from './config';
import { type PlayerClassId } from './definitions/classes';

export type SpecialEquipmentId =
  | 'venomfangDagger'
  | 'moonpiercerBow'
  | 'shardcallerStaff'
  | 'frostguardArsenal'
  | 'worldbreakerHammer'
  | 'verdantStaff';

export interface SpecialEquipmentStatGains {
  readonly maxHealth: number;
  readonly attack: number;
  readonly defence: number;
  readonly evade: number;
}

export interface SpecialEquipmentDefinition {
  readonly id: SpecialEquipmentId;
  readonly classId: PlayerClassId;
  readonly name: string;
  readonly flavour: string;
  readonly cost: number;
  readonly gains: SpecialEquipmentStatGains;
}

const NO_GAIN = 0;

export const SPECIAL_EQUIPMENT_BY_CLASS: Readonly<
  Record<PlayerClassId, SpecialEquipmentDefinition>
> = Object.freeze({
  rogue: special('venomfangDagger', 'rogue', 'Venomfang Dagger', 'A quick blade with an alchemical edge.', 6, {
    attack: 2,
    evade: 1,
  }),
  ranger: special('moonpiercerBow', 'ranger', 'Moonpiercer Bow', 'An ornate bow balanced for a sure release.', 6, {
    attack: 2,
    evade: 1,
  }),
  mage: special('shardcallerStaff', 'mage', 'Shardcaller Staff', 'Arcane fragments orbit its crystal focus.', 7, {
    attack: 3,
  }),
  knight: special('frostguardArsenal', 'knight', 'Frostguard Arsenal', 'An ice-forged sword paired with a warded shield.', 8, {
    attack: 2,
    defence: 2,
  }),
  barbarian: special('worldbreakerHammer', 'barbarian', 'Worldbreaker Hammer', 'A brutal stone maul made for impossible blows.', 8, {
    maxHealth: 2,
    attack: 3,
  }),
  lorekeeper: special('verdantStaff', 'lorekeeper', 'Verdant Staff', 'Living crystal steadies both spell and scholar.', 7, {
    attack: 2,
    defence: 1,
  }),
});

export function specialEquipmentForClass(
  classId: PlayerClassId,
): SpecialEquipmentDefinition {
  return SPECIAL_EQUIPMENT_BY_CLASS[classId];
}

export function specialEquipmentStatLine(
  gains: SpecialEquipmentStatGains,
): string {
  const entries: string[] = [];
  if (gains.maxHealth > 0) entries.push(`+${gains.maxHealth} MAX HP`);
  if (gains.attack > 0) entries.push(`+${gains.attack} ATK`);
  if (gains.defence > 0) entries.push(`+${gains.defence} DEF`);
  if (gains.evade > 0) entries.push(`+${gains.evade} EVA`);
  return entries.join(' · ');
}

export function applicableSpecialEquipmentGains(
  gains: SpecialEquipmentStatGains,
  current: SpecialEquipmentStatSnapshot,
): SpecialEquipmentStatGains {
  return {
    maxHealth: cappedGain(current.maxHealth, gains.maxHealth, PLAYER_MAX_HEALTH_CAP),
    attack: cappedGain(current.attack, gains.attack, PLAYER_ATTACK_CAP),
    defence: cappedGain(current.defence, gains.defence, PLAYER_DEFENCE_CAP),
    evade: cappedGain(current.evade, gains.evade, PLAYER_EVADE_MAX),
  };
}

export interface SpecialEquipmentStatSnapshot {
  readonly maxHealth: number;
  readonly attack: number;
  readonly defence: number;
  readonly evade: number;
}

export function hasSpecialEquipmentGain(
  gains: SpecialEquipmentStatGains,
): boolean {
  return gains.maxHealth + gains.attack + gains.defence + gains.evade > 0;
}

function special(
  id: SpecialEquipmentId,
  classId: PlayerClassId,
  name: string,
  flavour: string,
  cost: number,
  gains: Partial<SpecialEquipmentStatGains>,
): SpecialEquipmentDefinition {
  return Object.freeze({
    id,
    classId,
    name,
    flavour,
    cost,
    gains: Object.freeze({
      maxHealth: gains.maxHealth ?? NO_GAIN,
      attack: gains.attack ?? NO_GAIN,
      defence: gains.defence ?? NO_GAIN,
      evade: gains.evade ?? NO_GAIN,
    }),
  });
}

function cappedGain(current: number, requested: number, cap: number): number {
  return Math.max(0, Math.min(requested, cap - current));
}
