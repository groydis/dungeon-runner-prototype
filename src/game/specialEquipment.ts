import { type PlayerClassId } from './definitions/classes';

export type SpecialEquipmentId =
  | 'venomfangDagger'
  | 'moonpiercerBow'
  | 'shardcallerStaff'
  | 'frostguardArsenal'
  | 'worldbreakerHammer'
  | 'verdantStaff';

export interface SpecialEquipmentStatGains {
  readonly str: number;
  readonly con: number;
  readonly def: number;
  readonly dex: number;
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
  rogue: special('venomfangDagger', 'rogue', 'Venomfang Dagger', 'A quick blade with an alchemical edge.', 50, {
    dex: 3,
  }),
  ranger: special('moonpiercerBow', 'ranger', 'Moonpiercer Bow', 'An ornate bow balanced for a sure release.', 50, {
    dex: 3,
  }),
  mage: special('shardcallerStaff', 'mage', 'Shardcaller Staff', 'Arcane fragments orbit its crystal focus.', 50, {
    con: 3,
  }),
  knight: special('frostguardArsenal', 'knight', 'Frostguard Arsenal', 'An ice-forged sword paired with a warded shield.', 50, {
    def: 3,
  }),
  barbarian: special('worldbreakerHammer', 'barbarian', 'Worldbreaker Hammer', 'A brutal stone maul made for impossible blows.', 50, {
    con: 4,
  }),
  lorekeeper: special('verdantStaff', 'lorekeeper', 'Verdant Staff', 'Living crystal steadies both spell and scholar.', 50, {
    def: 3,
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
  if (gains.str > 0) entries.push(`+${gains.str} STR`);
  if (gains.con > 0) entries.push(`+${gains.con} CON`);
  if (gains.def > 0) entries.push(`+${gains.def} DEF`);
  if (gains.dex > 0) entries.push(`+${gains.dex} DEX`);
  return entries.join(' · ');
}

/** Authored attribute package — no caps or derived-stat plumbing. */
export function applicableSpecialEquipmentGains(
  gains: SpecialEquipmentStatGains,
): SpecialEquipmentStatGains {
  return {
    str: gains.str,
    con: gains.con,
    def: gains.def,
    dex: gains.dex,
  };
}

export function hasSpecialEquipmentGain(
  gains: SpecialEquipmentStatGains,
): boolean {
  return gains.str + gains.con + gains.def + gains.dex > 0;
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
      str: gains.str ?? NO_GAIN,
      con: gains.con ?? NO_GAIN,
      def: gains.def ?? NO_GAIN,
      dex: gains.dex ?? NO_GAIN,
    }),
  });
}
