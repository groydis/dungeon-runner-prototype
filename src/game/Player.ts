import {
  EVADE_CHANCE_MAX,
  PLAYER_BASE_EVADE,
  START_COL,
  START_ROW,
} from './config';
import { type CombatStats, createCombatStats, createPlayerStats } from './Combatant';
import {
  type ExperienceGain,
  PLAYER_START_EXPERIENCE,
  levelForExperience,
  levelsReachedByGain,
  nextLevelExperience,
} from './progression';

/** Logical player position, gold, and run-scoped combat stats. */
export class Player {
  private _row = START_ROW;
  private _col = START_COL;
  private _gold = 0;
  private _experience = PLAYER_START_EXPERIENCE;
  private _evade = PLAYER_BASE_EVADE;
  private _stats: CombatStats = createPlayerStats();

  get row(): number {
    return this._row;
  }

  get col(): number {
    return this._col;
  }

  get gold(): number {
    return this._gold;
  }

  get evade(): number {
    return this._evade;
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

  /** Read-only copy so callers cannot mutate live combat stats. */
  get stats(): CombatStats {
    return createCombatStats(this._stats);
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
    const missing = this._stats.maxHealth - this._stats.health;
    const restored = Math.min(Math.max(0, amount), missing);
    this._stats.health += restored;
    return restored;
  }

  takeDamage(amount: number): number {
    const incoming = Math.max(0, amount);
    const applied = Math.min(this._stats.health, incoming);
    this._stats.health -= applied;
    return applied;
  }

  /** Apply an exact combat-log health value, still clamped to [0, maxHealth]. */
  applyHealth(health: number): void {
    this._stats.health = clampStat(health, 0, this._stats.maxHealth);
  }

  increaseAttack(amount: number): number {
    const gained = Math.max(0, amount);
    this._stats.attack += gained;
    return gained;
  }

  increaseDefence(amount: number): number {
    const gained = Math.max(0, amount);
    this._stats.defence += gained;
    return gained;
  }

  /** Raises max HP only. Current HP is unchanged. */
  increaseMaxHealth(amount: number): number {
    const gained = Math.max(0, Math.floor(amount));
    this._stats.maxHealth += gained;
    return gained;
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

  increaseEvade(amount: number): number {
    const gained = Math.max(0, amount);
    const next = Math.min(EVADE_CHANCE_MAX, this._evade + gained);
    const applied = next - this._evade;
    this._evade = next;
    return applied;
  }

  reset(): void {
    this._row = START_ROW;
    this._col = START_COL;
    this._gold = 0;
    this._experience = PLAYER_START_EXPERIENCE;
    this._evade = PLAYER_BASE_EVADE;
    this._stats = createPlayerStats();
  }
}

function clampStat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
