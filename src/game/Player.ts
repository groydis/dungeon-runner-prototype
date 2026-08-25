import {
  START_COL,
  START_ROW,
} from './config';
import { type CombatStats, createCombatStats } from './Combatant';
import {
  computeClassDamage,
  computeMaxHealth,
  getPlayerClassDefinition,
  type PlayerClassDefinition,
  type PlayerClassId,
  type PlayerRenderKey,
} from './definitions/classes';
import { type DeepReadonly } from './freeze';
import {
  type ExperienceGain,
  PLAYER_START_EXPERIENCE,
  levelForExperience,
  levelsReachedByGain,
  nextLevelExperience,
} from './progression';

/** Logical player position, gold, class, and run-scoped combat attributes. */
export class Player {
  private _classId: PlayerClassId;
  private _row = START_ROW;
  private _col = START_COL;
  private _gold = 0;
  private _experience = PLAYER_START_EXPERIENCE;
  private _str: number;
  private _con: number;
  private _def: number;
  private _dex: number;
  /** Current HP — independent of maxHealth; raising max does not heal. */
  private _health: number;

  constructor(classId: PlayerClassId) {
    this._classId = classId;
    const starting = this.definition.startingStats;
    this._str = starting.str;
    this._con = starting.con;
    this._def = starting.defence;
    this._dex = starting.dex;
    this._health = computeMaxHealth(this._str, this._con);
  }

  get classId(): PlayerClassId {
    return this._classId;
  }

  get className(): string {
    return this.definition.name;
  }

  get renderKey(): PlayerRenderKey {
    return this.definition.renderKey;
  }

  get definition(): DeepReadonly<PlayerClassDefinition> {
    return getPlayerClassDefinition(this._classId);
  }

  get row(): number {
    return this._row;
  }

  get col(): number {
    return this._col;
  }

  get gold(): number {
    return this._gold;
  }

  get experience(): number {
    return this._experience;
  }

  get level(): number {
    return levelForExperience(this._experience);
  }

  get nextLevelExperience(): number | null {
    return nextLevelExperience(this._experience);
  }

  /** Live-derived combat stats from attributes; callers get a copy. */
  get stats(): CombatStats {
    return createCombatStats(this.derivedStats());
  }

  moveTo(row: number, col: number): void {
    this._row = row;
    this._col = col;
  }

  addGold(amount: number): number {
    const gained = Math.max(0, Math.floor(amount));
    this._gold += gained;
    return gained;
  }

  trySpendGold(amount: number): boolean {
    if (amount < 0 || this._gold < amount) {
      return false;
    }
    this._gold -= amount;
    return true;
  }

  heal(amount: number): number {
    const maxHealth = this.maxHealth;
    const missing = maxHealth - this._health;
    const restored = Math.min(Math.max(0, amount), missing);
    this._health += restored;
    return restored;
  }

  takeDamage(amount: number): number {
    const incoming = Math.max(0, amount);
    const applied = Math.min(this._health, incoming);
    this._health -= applied;
    return applied;
  }

  /** Apply an exact combat-log health value, still clamped to [0, maxHealth]. */
  applyHealth(health: number): void {
    this._health = clampStat(health, 0, this.maxHealth);
  }

  increaseStr(amount: number): number {
    return this.applyAttributeGain('_str', amount);
  }

  increaseCon(amount: number): number {
    return this.applyAttributeGain('_con', amount);
  }

  increaseDef(amount: number): number {
    return this.applyAttributeGain('_def', amount);
  }

  increaseDex(amount: number): number {
    return this.applyAttributeGain('_dex', amount);
  }

  addExperience(amount: number): ExperienceGain {
    const gained = Math.max(0, Math.floor(amount));
    const from = this._experience;
    this._experience += gained;
    return {
      gained,
      experience: this._experience,
      level: this.level,
      levelsReached: levelsReachedByGain(from, this._experience),
    };
  }

  reset(): void {
    this._row = START_ROW;
    this._col = START_COL;
    this._gold = 0;
    this._experience = PLAYER_START_EXPERIENCE;
    const starting = this.definition.startingStats;
    this._str = starting.str;
    this._con = starting.con;
    this._def = starting.defence;
    this._dex = starting.dex;
    this._health = computeMaxHealth(this._str, this._con);
  }

  private get maxHealth(): number {
    return computeMaxHealth(this._str, this._con);
  }

  private derivedStats(): CombatStats {
    const maxHealth = this.maxHealth;
    return {
      maxHealth,
      health: this._health,
      attack: computeClassDamage(this._classId, {
        str: this._str,
        con: this._con,
        def: this._def,
        dex: this._dex,
      }),
      defence: this._def,
      str: this._str,
      con: this._con,
      dex: this._dex,
    };
  }

  private applyAttributeGain(
    key: '_str' | '_con' | '_def' | '_dex',
    amount: number,
  ): number {
    const gained = Math.max(0, Math.floor(amount));
    this[key] += gained;
    return gained;
  }
}

function clampStat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
