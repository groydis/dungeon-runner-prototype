import { START_COL, START_ROW } from './config';
import {
  ARMOR_CAP,
  ATTRIBUTE_MAX,
  CRIT_CAP,
  EVADE_BONUS_CAP,
  EXTRA_STRIKE_CAP,
  PIERCE_CAP,
  WARD_CAP,
  attributeModifier,
  clamp,
  createCombatStats,
  type CombatStats,
  type CoreAttribute,
} from './Combatant';
import {
  computeMaxHealth,
  getPlayerClassDefinition,
  proficiencyBonus,
  shieldArmorForTier,
  weaponProfileForClass,
  type CoreAttributes,
  type PlayerClassDefinition,
  type PlayerClassId,
  type PlayerRenderKey,
} from './definitions/classes';
import { type DeepReadonly } from './freeze';
import {
  MAX_PLAYER_EXPERIENCE,
  PLAYER_START_EXPERIENCE,
  levelForExperience,
  levelsReachedByGain,
  nextLevelExperience,
  type ExperienceGain,
} from './progression';

export class Player {
  private readonly _classId: PlayerClassId;
  private _row = START_ROW;
  private _col = START_COL;
  private _gold = 0;
  private _experience = PLAYER_START_EXPERIENCE;
  private _attributes: CoreAttributes;
  private _health: number;
  private _weaponTierIndex = 0;
  private _shieldTierIndex = 0;
  private _armorUpgrades = 0;
  private _wardUpgrades = 0;
  private readonly _techniqueRanks = new Map<string, number>();
  private _specialization: string | null = null;
  private _capstone: string | null = null;

  constructor(classId: PlayerClassId) {
    this._classId = classId;
    this._attributes = { ...this.definition.attributes };
    this._health = this.maxHealth;
  }

  get classId(): PlayerClassId { return this._classId; }
  get className(): string { return this.definition.name; }
  get renderKey(): PlayerRenderKey { return this.definition.renderKey; }
  get definition(): DeepReadonly<PlayerClassDefinition> { return getPlayerClassDefinition(this._classId); }
  get row(): number { return this._row; }
  get col(): number { return this._col; }
  get gold(): number { return this._gold; }
  get experience(): number { return this._experience; }
  get level(): number { return levelForExperience(this._experience); }
  get nextLevelExperience(): number | null { return nextLevelExperience(this._experience); }
  get stats(): CombatStats { return createCombatStats(this.derivedStats()); }
  get attributes(): Readonly<CoreAttributes> { return { ...this._attributes }; }
  get specialization(): string | null { return this._specialization; }
  get capstone(): string | null { return this._capstone; }
  get weaponTierIndex(): number { return this._weaponTierIndex; }
  get shieldTierIndex(): number { return this._shieldTierIndex; }
  get weaponAttackBonus(): number { return this._weaponTierIndex; }
  get shieldDefenceBonus(): number { return this._shieldTierIndex; }

  moveTo(row: number, col: number): void { this._row = row; this._col = col; }
  addGold(amount: number): number {
    const gained = Math.max(0, Math.floor(amount));
    this._gold += gained;
    return gained;
  }
  trySpendGold(amount: number): boolean {
    if (amount < 0 || this._gold < amount) return false;
    this._gold -= amount;
    return true;
  }
  heal(amount: number): number {
    const restored = Math.min(Math.max(0, Math.round(amount)), this.maxHealth - this._health);
    this._health += restored;
    return restored;
  }
  healPotion(amount: number): number { return this.heal(amount * this.potionMultiplier); }
  healForLevelUp(): number { return this.heal(Math.max(1, Math.ceil(this.maxHealth * 0.2))); }
  takeDamage(amount: number): number {
    const applied = Math.min(this._health, Math.max(0, Math.floor(amount)));
    this._health -= applied;
    return applied;
  }
  applyHealth(health: number): void { this._health = clamp(Math.floor(health), 0, this.maxHealth); }

  increaseAttribute(attribute: CoreAttribute, amount: number): number {
    const before = this._attributes[attribute];
    this._attributes[attribute] = clamp(before + Math.max(0, Math.floor(amount)), 8, ATTRIBUTE_MAX);
    return this._attributes[attribute] - before;
  }
  increaseArmor(amount: number): number {
    const before = this.stats.armor;
    this._armorUpgrades += Math.max(0, Math.floor(amount));
    return this.stats.armor - before;
  }
  increaseWard(amount: number): number {
    const before = this.stats.ward;
    this._wardUpgrades += Math.max(0, Math.floor(amount));
    return this.stats.ward - before;
  }
  increaseTechnique(id: string, amount = 1): number {
    const before = this.techniqueRank(id);
    const after = clamp(before + Math.max(0, Math.floor(amount)), 0, 3);
    this._techniqueRanks.set(id, after);
    return after - before;
  }
  techniqueRank(id: string): number { return this._techniqueRanks.get(id) ?? 0; }
  chooseSpecialization(id: string): boolean {
    if (this._specialization) return false;
    this._specialization = id;
    return true;
  }
  chooseCapstone(id: string): boolean {
    if (this._capstone) return false;
    this._capstone = id;
    return true;
  }

  increaseStr(amount: number): number { return this.increaseAttribute('might', amount); }
  increaseCon(amount: number): number { return this.increaseAttribute('vigor', amount); }
  increaseDef(amount: number): number { return this.increaseArmor(amount); }
  increaseDex(amount: number): number { return this.increaseAttribute('finesse', amount); }
  setWeaponTier(index: number): void { this._weaponTierIndex = Math.max(0, Math.floor(index)); }
  setShieldTier(index: number): void { this._shieldTierIndex = Math.max(0, Math.floor(index)); }
  setWeaponAttackBonus(amount: number): void { this.setWeaponTier(amount); }
  setShieldDefenceBonus(amount: number): void { this.setShieldTier(amount); }

  addExperience(amount: number): ExperienceGain {
    const from = this._experience;
    this._experience = Math.min(MAX_PLAYER_EXPERIENCE, from + Math.max(0, Math.floor(amount)));
    return {
      gained: this._experience - from,
      experience: this._experience,
      level: this.level,
      levelsReached: levelsReachedByGain(from, this._experience),
    };
  }

  reset(): void {
    this._row = START_ROW; this._col = START_COL; this._gold = 0;
    this._experience = PLAYER_START_EXPERIENCE;
    this._attributes = { ...this.definition.attributes };
    this._weaponTierIndex = 0; this._shieldTierIndex = 0;
    this._armorUpgrades = 0; this._wardUpgrades = 0;
    this._techniqueRanks.clear(); this._specialization = null; this._capstone = null;
    this._health = this.maxHealth;
  }

  private get maxHealth(): number {
    return computeMaxHealth(this.definition.baseHealth, this._attributes.vigor, this.level)
      + this.specializationHealthBonus;
  }

  private get potionMultiplier(): number {
    const classBonus = this.definition.feature === 'wardedRecovery' ? 0.25 : 0;
    const technique = this.techniqueRank('restoration') * 0.1;
    const specialization = this._specialization === 'apothecary' ? 0.25 : 0;
    const mastery = this._capstone === 'mastery' && this._specialization === 'apothecary' ? 0.2 : 0;
    return 1 + classBonus + technique + specialization + mastery;
  }

  private get specializationHealthBonus(): number {
    const base = this._specialization === 'survivor' || this._specialization === 'juggernaut' ? 6 : 0;
    const mastery = this._capstone === 'mastery' && (this._specialization === 'survivor' || this._specialization === 'juggernaut') ? 6 : 0;
    return base + mastery;
  }

  private derivedStats(): CombatStats {
    const d = this.definition;
    const weapon = weaponProfileForClass(this._classId, this._weaponTierIndex);
    const scaling = this._attributes[weapon.scalingAttribute];
    const mastery = this._capstone === 'mastery';
    const resilience = this._capstone === 'resilience';
    const spec = this._specialization;
    const maxHealth = this.maxHealth;
    const armor = d.baseArmor + (this._classId === 'knight' ? shieldArmorForTier(this._shieldTierIndex) : 0)
      + this._armorUpgrades + (spec === 'bastion' ? 2 : 0) + (mastery && spec === 'bastion' ? 1 : 0);
    const ward = d.baseWard + Math.max(0, attributeModifier(this._attributes.will)) + weapon.ward
      + this._wardUpgrades + (resilience ? 1 : 0)
      + (spec === 'spellbreaker' || spec === 'warden' || spec === 'loreWarden' ? 2 : 0)
      + (mastery && (spec === 'spellbreaker' || spec === 'warden' || spec === 'loreWarden') ? 1 : 0);
    const powerBonus = spec === 'knightDuelist' ? 1 : 0;
    const critSpec = spec === 'assassin' || spec === 'executioner' ? 10 : spec === 'knightDuelist' ? 10 : 0;
    const critMastery = mastery && (spec === 'assassin' || spec === 'executioner') ? 10 : mastery && spec === 'knightDuelist' ? 5 : 0;
    const pierceSpec = spec === 'rogueDuelist' ? 10 : spec === 'sharpshooter' ? 15 : spec === 'spellbreaker' ? 10 : 0;
    const pierceMastery = mastery && spec === 'rogueDuelist' ? 10 : mastery && (spec === 'sharpshooter' || spec === 'spellbreaker') ? 10 : 0;
    const evadeSpec = spec === 'acrobat' || spec === 'scout' ? 10 : 0;
    const evadeMastery = mastery && (spec === 'acrobat' || spec === 'scout') ? 10 : 0;
    return createCombatStats({
      maxHealth, health: Math.min(this._health, maxHealth),
      attack: weapon.basePower + proficiencyBonus(this.level) + attributeModifier(scaling) + powerBonus + (mastery && spec === 'knightDuelist' ? 1 : 0),
      armor: clamp(armor, 0, ARMOR_CAP), ward: clamp(ward, 0, WARD_CAP),
      ...this._attributes, damageChannel: weapon.channel,
      critChance: clamp(weapon.critChance + (d.feature === 'shadowStep' ? 5 : 0) + critSpec + critMastery, 0, CRIT_CAP),
      pierce: clamp(weapon.pierce + pierceSpec + pierceMastery + this.techniqueRank('piercing') * 5, 0, PIERCE_CAP),
      openingDamageMultiplier: 1 + (d.feature === 'arcaneSurge' ? 0.2 : 0) + this.techniqueRank('arcaneSurge') * 0.05 + (spec === 'evoker' ? 0.15 : 0) + (mastery && spec === 'evoker' ? 0.1 : 0),
      openingPierce: d.feature === 'piercingShot' ? 20 : 0,
      firstIncomingReduction: (d.feature === 'guardedOpening' ? 30 : 0) + this.techniqueRank('bulwark') * 5 + (spec === 'seer' ? 25 : 0) + (mastery && spec === 'seer' ? 15 : 0),
      bloodiedMultiplier: 1 + (d.feature === 'bloodied' ? 0.2 : 0) + this.techniqueRank('fury') * 0.05 + (spec === 'berserker' ? 0.1 : 0) + (mastery && spec === 'berserker' ? 0.1 : 0),
      extraStrikeChance: clamp((spec === 'channeler' ? 15 : 0) + (mastery && spec === 'channeler' ? 10 : 0), 0, EXTRA_STRIKE_CAP),
      evadeBonus: clamp((d.feature === 'shadowStep' ? 15 : 0) + this.techniqueRank('shadowcraft') * 5 + evadeSpec + evadeMastery, 0, EVADE_BONUS_CAP),
    });
  }
}
