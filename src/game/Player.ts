import { START_COL, START_ROW } from './config';
import { type CombatStats, createCombatStats, createPlayerStats } from './Combatant';

/** Logical player position, gold, and run-scoped combat stats. */
export class Player {
  private _row = START_ROW;
  private _col = START_COL;
  private _gold = 0;
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

  reset(): void {
    this._row = START_ROW;
    this._col = START_COL;
    this._gold = 0;
    this._stats = createPlayerStats();
  }
}

function clampStat(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
