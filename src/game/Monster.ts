import { type CombatStats, createCombatStats } from './Combatant';
import {
  type EnemyDefinition,
  type EnemyType,
  getEnemyDefinition,
} from './definitions/enemies';

/** Run-specific monster instance. Type/stats come from a static definition. */
export class Monster {
  readonly id: string;
  readonly type: EnemyType;
  readonly definition: EnemyDefinition;
  private _row: number;
  private _col: number;
  private _encounterResolved = false;
  private readonly _stats: CombatStats;

  constructor(
    id: string,
    type: EnemyType,
    row: number,
    col: number,
    stats?: CombatStats,
  ) {
    this.id = id;
    this.type = type;
    this.definition = getEnemyDefinition(type);
    this._row = row;
    this._col = col;
    this._stats = createCombatStats(stats ?? this.definition.startingStats);
  }

  get row(): number {
    return this._row;
  }

  get col(): number {
    return this._col;
  }

  get name(): string {
    return this.definition.name;
  }

  get renderKey(): string {
    return this.definition.renderKey;
  }

  get encounterResolved(): boolean {
    return this._encounterResolved;
  }

  get defeated(): boolean {
    return this._stats.health <= 0;
  }

  /** Read-only copy so callers cannot mutate live combat stats. */
  get stats(): CombatStats {
    return createCombatStats(this._stats);
  }

  takeDamage(amount: number): number {
    const incoming = Math.max(0, amount);
    const applied = Math.min(this._stats.health, incoming);
    this._stats.health -= applied;
    return applied;
  }

  /** Apply an exact combat-log health value, still clamped to [0, maxHealth]. */
  applyHealth(health: number): void {
    this._stats.health = Math.min(
      this._stats.maxHealth,
      Math.max(0, health),
    );
  }

  resolveEncounter(): void {
    this._encounterResolved = true;
  }

  moveTo(row: number, col: number): void {
    this._row = row;
    this._col = col;
  }
}

export function createMonster(
  id: string,
  type: EnemyType,
  row: number,
  col: number,
  stats?: CombatStats,
): Monster {
  return new Monster(id, type, row, col, stats);
}
