import { ARMOR_CAP, ATTRIBUTE_MAX, WARD_CAP, type CoreAttribute } from './Combatant';
import { type Player } from './Player';
import { nextLevelExperience } from './progression';

/** Compatibility shape retained for old integrations; the live UI now selects one authored choice. */
export interface LevelUpAllocation { str: number; con: number; def: number; dex: number }
export type LevelUpAttributeId = keyof LevelUpAllocation;
export const LEVEL_UP_ATTRIBUTES: readonly LevelUpAttributeId[] = ['str', 'con', 'def', 'dex'];
export const LEVEL_UP_FREE_POINTS = 2;
export type LevelUpChoiceId = string;
export type LevelUpUnavailableReason = 'noLevelUp' | 'invalidAllocation' | 'invalidChoice';

export interface LevelUpChoiceView {
  id: LevelUpChoiceId;
  title: string;
  description: string;
  available: boolean;
  impact: string;
}
export interface LevelUpView {
  level: number;
  experience: number;
  nextLevelExperience: number | null;
  choices: LevelUpChoiceView[];
  /** Compatibility fields. */ freePoints: number; attributes: LevelUpAllocation;
}
export interface LevelUpResult {
  success: boolean;
  reason?: LevelUpUnavailableReason;
  choiceId?: LevelUpChoiceId;
  allocation?: LevelUpAllocation;
  strGained: number; conGained: number; defGained: number; dexGained: number;
  pendingRemaining: number;
  status: string;
}

interface ChoiceDefinition { id: string; title: string; description: string; kind: 'attribute' | 'armor' | 'ward' | 'technique' | 'specialization' | 'capstone'; value: string }

const REGULAR_CHOICES: Record<Player['classId'], readonly ChoiceDefinition[]> = {
  rogue: [attribute('rogue-finesse', 'Quick Hands', 'Increase FIN by 2.', 'finesse'), attribute('rogue-vigor', 'Hard to Kill', 'Increase VIG by 2.', 'vigor'), technique('shadowcraft', 'Shadowcraft', '+5% critical chance per rank.')],
  ranger: [attribute('ranger-finesse', 'Sure Aim', 'Increase FIN by 2.', 'finesse'), attribute('ranger-vigor', 'Trail Hardened', 'Increase VIG by 2.', 'vigor'), technique('piercing', 'Piercing', '+5% Armor pierce per rank.')],
  mage: [attribute('mage-will', 'Deep Study', 'Increase WIL by 2.', 'will'), ward('mage-ward', 'Arcane Ward', 'Increase Ward by 1.'), technique('arcaneSurge', 'Arcane Surge', '+5% opening damage per rank.')],
  knight: [attribute('knight-might', 'Weapon Drill', 'Increase MIG by 2.', 'might'), armor('knight-armor', 'Heavy Plate', 'Increase Armor by 1.'), technique('bulwark', 'Bulwark', 'Reduce the first incoming hit by another 5% per rank.')],
  barbarian: [attribute('barbarian-might', 'Brute Force', 'Increase MIG by 2.', 'might'), attribute('barbarian-vigor', 'Iron Gut', 'Increase VIG by 2.', 'vigor'), technique('fury', 'Fury', '+5% bloodied damage per rank.')],
  lorekeeper: [attribute('lorekeeper-will', 'Forbidden Lore', 'Increase WIL by 2.', 'will'), ward('lorekeeper-ward', 'Warded Mind', 'Increase Ward by 1.'), technique('restoration', 'Restoration', 'Potions restore 10% more per rank.')],
};

const SPECIALIZATIONS: Record<Player['classId'], readonly ChoiceDefinition[]> = {
  rogue: [spec('assassin', 'Assassin', '+10% critical chance.'), spec('acrobat', 'Acrobat', '+10% evade chance.'), spec('rogueDuelist', 'Duelist', '+10% Armor pierce.')],
  ranger: [spec('sharpshooter', 'Sharpshooter', '+15% Armor pierce.'), spec('scout', 'Scout', '+10% evade chance.'), spec('survivor', 'Survivor', '+6 maximum HP.')],
  mage: [spec('evoker', 'Evoker', '+15% opening damage.'), spec('spellbreaker', 'Spellbreaker', '+2 Ward and +10% pierce.'), spec('channeler', 'Channeler', '15% chance to strike twice.')],
  knight: [spec('bastion', 'Bastion', '+2 Armor.'), spec('knightDuelist', 'Duelist', '+1 Power and +10% critical chance.'), spec('warden', 'Warden', '+2 Ward.')],
  barbarian: [spec('berserker', 'Berserker', '+10% bloodied damage.'), spec('juggernaut', 'Juggernaut', '+6 maximum HP.'), spec('executioner', 'Executioner', '+10% critical chance.')],
  lorekeeper: [spec('loreWarden', 'Warden', '+2 Ward.'), spec('apothecary', 'Apothecary', 'Potions restore 25% more.'), spec('seer', 'Seer', 'Reduce the first incoming hit by 25%.')],
};

const CAPSTONES: readonly ChoiceDefinition[] = [
  { id: 'mastery', title: 'Mastery', description: 'Deepen your level 5 specialization.', kind: 'capstone', value: 'mastery' },
  { id: 'resilience', title: 'Resilience', description: '+2 VIG and +1 Ward.', kind: 'capstone', value: 'resilience' },
];

export function buildLevelUpView(level: number, experience: number, subject: Player | LevelUpAllocation): LevelUpView {
  if (!('classId' in subject)) {
    return { level, experience, nextLevelExperience: nextLevelExperience(experience), freePoints: LEVEL_UP_FREE_POINTS, attributes: { ...subject }, choices: [] };
  }
  const player = subject;
  const definitions = level === 5 ? SPECIALIZATIONS[player.classId] : level === 10 ? CAPSTONES : REGULAR_CHOICES[player.classId];
  return {
    level, experience, nextLevelExperience: nextLevelExperience(experience), freePoints: 0,
    attributes: playerAttributeSnapshot(player),
    choices: definitions.map((choice) => {
      const available = choiceAvailable(player, choice);
      return { ...choice, available, impact: available ? previewChoiceImpact(player, level, choice.id) : 'Maximum reached.' };
    }),
  };
}

function previewChoiceImpact(player: Player, level: number, choiceId: string): string {
  const preview = player.cloneForPreview();
  const before = progressionValues(player);
  applyLevelUpChoice(preview, level, choiceId);
  const after = progressionValues(preview);
  const changes = before.flatMap((entry, index) => {
    const next = after[index]!;
    return entry.value === next.value ? [] : [`${entry.label} ${entry.value} → ${next.value}`];
  });
  return changes.join(' · ') || 'Build feature unlocked.';
}

function progressionValues(player: Player): { label: string; value: string }[] {
  const a = player.attributes;
  const s = player.stats;
  return [
    { label: 'MIG', value: String(a.might) }, { label: 'FIN', value: String(a.finesse) },
    { label: 'VIG', value: String(a.vigor) }, { label: 'WIL', value: String(a.will) },
    { label: 'HP', value: String(s.maxHealth) }, { label: 'Power', value: String(s.attack) },
    { label: 'Armor', value: String(s.armor) }, { label: 'Ward', value: String(s.ward) },
    { label: 'Crit', value: `${s.critChance}%` }, { label: 'Pierce', value: `${s.pierce}%` },
    { label: 'EVA bonus', value: `${s.evadeBonus}%` },
    { label: 'Opening damage', value: `${Math.round((s.openingDamageMultiplier - 1) * 100)}%` },
    { label: 'Opening pierce', value: `${s.openingPierce}%` },
    { label: 'First-hit reduction', value: `${s.firstIncomingReduction}%` },
    { label: 'Bloodied damage', value: `${Math.round((s.bloodiedMultiplier - 1) * 100)}%` },
    { label: 'Extra strike', value: `${s.extraStrikeChance}%` },
    { label: 'Potion healing', value: `${player.potionHealingBonusPercent}%` },
  ];
}

export function applyLevelUpChoice(player: Player, level: number, choiceId: LevelUpChoiceId): Omit<LevelUpResult, 'success' | 'pendingRemaining'> | null {
  const definitions = level === 5 ? SPECIALIZATIONS[player.classId] : level === 10 ? CAPSTONES : REGULAR_CHOICES[player.classId];
  const choice = definitions.find((entry) => entry.id === choiceId);
  if (!choice || !choiceAvailable(player, choice)) return null;
  let strGained = 0; let conGained = 0; let defGained = 0; let dexGained = 0;
  if (choice.kind === 'attribute') {
    const gained = player.increaseAttribute(choice.value as CoreAttribute, 2);
    if (choice.value === 'might') strGained = gained;
    if (choice.value === 'vigor') conGained = gained;
    if (choice.value === 'finesse') dexGained = gained;
  } else if (choice.kind === 'armor') defGained = player.increaseArmor(1);
  else if (choice.kind === 'ward') player.increaseWard(1);
  else if (choice.kind === 'technique') player.increaseTechnique(choice.value);
  else if (choice.kind === 'specialization') player.chooseSpecialization(choice.value);
  else if (choice.value === 'resilience') {
    conGained = player.increaseAttribute('vigor', 2);
    player.increaseWard(1);
    player.chooseCapstone(choice.value);
  } else player.chooseCapstone(choice.value);
  const healed = player.healForLevelUp();
  return { choiceId, strGained, conGained, defGained, dexGained, status: `Level ${level}: ${choice.title}. Restored ${healed} HP.` };
}

function choiceAvailable(player: Player, choice: ChoiceDefinition): boolean {
  if (choice.kind === 'attribute') return player.attributes[choice.value as CoreAttribute] < ATTRIBUTE_MAX;
  if (choice.kind === 'armor') return player.stats.armor < ARMOR_CAP;
  if (choice.kind === 'ward') return player.stats.ward < WARD_CAP;
  if (choice.kind === 'technique') return player.techniqueRank(choice.value) < 3;
  if (choice.kind === 'specialization') return player.specialization === null;
  if (choice.value === 'mastery') return player.specialization !== null && player.capstone === null;
  return player.capstone === null && (player.attributes.vigor < ATTRIBUTE_MAX || player.stats.ward < WARD_CAP);
}

function attribute(id: string, title: string, description: string, value: CoreAttribute): ChoiceDefinition { return { id, title, description, kind: 'attribute', value }; }
function armor(id: string, title: string, description: string): ChoiceDefinition { return { id, title, description, kind: 'armor', value: 'armor' }; }
function ward(id: string, title: string, description: string): ChoiceDefinition { return { id, title, description, kind: 'ward', value: 'ward' }; }
function technique(id: string, title: string, description: string): ChoiceDefinition { return { id, title, description, kind: 'technique', value: id }; }
function spec(id: string, title: string, description: string): ChoiceDefinition { return { id, title, description, kind: 'specialization', value: id }; }

export function emptyLevelUpAllocation(): LevelUpAllocation { return { str: 0, con: 0, def: 0, dex: 0 }; }
export function allocationSum(a: LevelUpAllocation): number { return a.str + a.con + a.def + a.dex; }
export function isValidLevelUpAllocation(a: LevelUpAllocation): boolean {
  return LEVEL_UP_ATTRIBUTES.every((key) => Number.isInteger(a[key]) && a[key] >= 0) && allocationSum(a) === LEVEL_UP_FREE_POINTS;
}
/** Deprecated adapter. Authored choices replace free allocation. */
export function applyLevelUpAllocation(): null { return null; }
export function playerAttributeSnapshot(player: { stats: { might?: number; finesse?: number; vigor?: number; str: number; con: number; dex: number } }): LevelUpAllocation {
  const stats = player.stats;
  return { str: stats.might ?? stats.str, con: stats.vigor ?? stats.con, def: 'defence' in stats ? Number(stats.defence) : 0, dex: stats.finesse ?? stats.dex };
}
