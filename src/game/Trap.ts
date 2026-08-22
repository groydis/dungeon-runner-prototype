export type TrapKind = 'alarm';

/** Run-specific trap instance. Trigger/consume belongs here, not rendering. */
export class Trap {
  readonly id: string;
  readonly kind: TrapKind;
  readonly row: number;
  readonly col: number;
  private _triggered = false;

  constructor(id: string, kind: TrapKind, row: number, col: number) {
    this.id = id;
    this.kind = kind;
    this.row = row;
    this.col = col;
  }

  get triggered(): boolean {
    return this._triggered;
  }

  /**
   * Marks the trap consumed. Returns false if it already fired.
   * GameState decides whether that consume is a player Alarm or a crush.
   */
  trigger(): boolean {
    if (this._triggered) {
      return false;
    }
    this._triggered = true;
    return true;
  }
}

export function createTrap(
  id: string,
  kind: TrapKind,
  row: number,
  col: number,
): Trap {
  return new Trap(id, kind, row, col);
}

export function trapId(row: number, col: number): string {
  return `trap-${row}-${col}`;
}
