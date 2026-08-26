import { type CombatStats, createCombatStats } from './Combatant';
import {
  type EnemyDefinition,
  type EnemyRenderKey,
  type EnemyType,
  enemyExperienceAtRow,
  getEnemyDefinition,
} from './definitions/enemies';
import { type EnemyWeaponVariant } from './definitions/enemyWeapons';
import { type DeepReadonly } from './freeze';

/** Run-specific monster instance. Type/stats come from a static definition. */
export class Monster {
  readonly id: string;
  readonly type: EnemyType;
  readonly definition: DeepReadonly<EnemyDefinition>;
  private _row: number;
  private _col: number;
  private _encounterResolved = false;
  private readonly _stats: CombatStats;
  private readonly _weaponVariant: EnemyWeaponVariant | null;

  constructor(
    id: string,
    type: EnemyType,
    row: number,
    col: number,
    stats?: CombatStats,
    weaponVariant: EnemyWeaponVariant | null = null,
  ) {
    this.id = id;
    this.type = type;
    this.definition = getEnemyDefinition(type);
    this._row = row;
    this._col = col;
    this._stats = createCombatStats(stats ?? this.definition.startingStats);
    this._weaponVariant = weaponVariant;
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

  get renderKey(): EnemyRenderKey {
    return this.definition.renderKey;
  }

  get weaponVariant(): EnemyWeaponVariant | null {
    return this._weaponVariant;
  }

  get experience(): number {
    return enemyExperienceAtRow(this.type, this._row);
  }

  get elite(): boolean {
    return this.definition.elite;
  }

  get encounterResolved(): boolean {
    return this._encounterResolved;
  }

  get defeated(): boolean {
    return this._stats.health <= 0;
  }

  /** Read-only copy so callers cannot mutate live combat stats. */
  get stats(): CombatStats {
    return createCombatStats({
      ...this._stats,
      attack: this._stats.attack + (this._weaponVariant?.attackBonus ?? 0),
      armor: this._stats.armor + (this._weaponVariant?.defenceBonus ?? 0),
    });
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
  weaponVariant: EnemyWeaponVariant | null = null,
): Monster {
  return new Monster(id, type, row, col, stats, weaponVariant);
}
