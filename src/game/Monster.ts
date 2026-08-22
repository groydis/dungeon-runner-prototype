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
  readonly row: number;
  readonly col: number;
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
    this.row = row;
    this.col = col;
    this._stats = createCombatStats(stats ?? this.definition.startingStats);
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
