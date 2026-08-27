import { attributeModifier, type CombatStats, type CoreAttribute } from './Combatant';
import { weaponProfileForClass } from './definitions/classes';
import { shieldTierDisplayName, weaponTierDisplayName } from './definitions/playerWeaponProgression';
import { calculateEvadeChance } from './encounters';
import { type Player } from './Player';

export interface CharacterAttributeView {
  id: CoreAttribute;
  label: string;
  score: number;
  modifier: number;
}

export interface CharacterMetricView { label: string; value: string }
export interface CharacterTechniqueView { label: string; rank: number }

export interface CharacterSheetView {
  className: string;
  level: number;
  featureText: string;
  weaponName: string;
  shieldName: string | null;
  damageChannel: CombatStats['damageChannel'];
  attributes: CharacterAttributeView[];
  combat: CharacterMetricView[];
  specialization: string | null;
  capstone: string | null;
  techniques: CharacterTechniqueView[];
}

const ATTRIBUTE_LABELS: Record<CoreAttribute, string> = {
  might: 'Might', finesse: 'Finesse', vigor: 'Vigor', will: 'Will',
};
const TECHNIQUE_LABELS: Record<string, string> = {
  shadowcraft: 'Shadowcraft', piercing: 'Piercing', arcaneSurge: 'Arcane Surge',
  bulwark: 'Bulwark', fury: 'Fury', restoration: 'Restoration',
};
const PROGRESSION_LABELS: Record<string, string> = {
  rogueDuelist: 'Duelist', knightDuelist: 'Duelist', loreWarden: 'Warden',
  mastery: 'Mastery', resilience: 'Resilience',
};

export function buildCharacterSheetView(player: Player): CharacterSheetView {
  const stats = player.stats;
  const attributes = player.attributes;
  const weapon = weaponProfileForClass(player.classId, player.weaponTierIndex);
  return {
    className: player.className,
    level: player.level,
    featureText: player.definition.featureText,
    weaponName: weaponTierDisplayName(player.classId, player.weaponTierIndex),
    shieldName: player.classId === 'knight' ? shieldTierDisplayName(player.shieldTierIndex) : null,
    damageChannel: weapon.channel,
    attributes: (Object.keys(ATTRIBUTE_LABELS) as CoreAttribute[]).map((id) => ({
      id, label: ATTRIBUTE_LABELS[id], score: attributes[id], modifier: attributeModifier(attributes[id]),
    })),
    combat: [
      metric('Maximum HP', stats.maxHealth),
      metric('Power', stats.attack),
      metric('Armor', stats.armor),
      metric('Ward', stats.ward),
      percent('Critical chance', stats.critChance),
      percent('Pierce', stats.pierce),
      percent('Evade vs Awareness 0', calculateEvadeChance(stats.finesse, 0, stats.evadeBonus)),
      percent('Extra strike', stats.extraStrikeChance),
      percent('Opening damage', Math.round((stats.openingDamageMultiplier - 1) * 100), true),
      percent('Opening pierce', stats.openingPierce),
      percent('First-hit reduction', stats.firstIncomingReduction),
      percent('Bloodied damage', Math.round((stats.bloodiedMultiplier - 1) * 100), true),
      percent('Potion healing', player.potionHealingBonusPercent, true),
    ],
    specialization: labelFor(player.specialization),
    capstone: labelFor(player.capstone),
    techniques: [...player.techniqueRanks]
      .filter(([, rank]) => rank > 0)
      .map(([id, rank]) => ({ label: TECHNIQUE_LABELS[id] ?? humanize(id), rank })),
  };
}

function metric(label: string, value: number): CharacterMetricView { return { label, value: String(value) }; }
function percent(label: string, value: number, bonus = false): CharacterMetricView {
  return { label, value: `${bonus && value > 0 ? '+' : ''}${value}%` };
}
function labelFor(id: string | null): string | null { return id ? (PROGRESSION_LABELS[id] ?? humanize(id)) : null; }
function humanize(id: string): string {
  const spaced = id.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
