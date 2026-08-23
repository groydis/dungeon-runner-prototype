import { type CombatResult } from './combat';
import { type EncounterEvent } from './encounters';
import { type EncounterMonsterView } from './BoardSnapshot';
import { type TrapResolution } from './turnResults';

export interface MoveAnimation {
  fromCol: number;
  toCol: number;
  anchorRow: number;
  elapsed: number;
}

export interface CombatPlayback {
  result: CombatResult;
  target: EncounterMonsterView;
  entryIndex: number;
  elapsed: number;
  awaitingEnemyDeath: boolean;
}

export interface TrapPlayback {
  resolution: TrapResolution;
  phase: 'flash' | 'advance';
  elapsed: number;
}

/**
 * Authoritative Game.ts presentation/input-lock state.
 * Only `idle` enables board highlights and raycast input.
 */
export type PresentationPhase =
  | { kind: 'classSelection' }
  | { kind: 'idle' }
  | { kind: 'moving'; animation: MoveAnimation }
  | { kind: 'trap'; playback: TrapPlayback }
  | { kind: 'encounter'; event: EncounterEvent; elapsed: number; durationSec: number }
  | { kind: 'combat'; playback: CombatPlayback }
  | { kind: 'drop'; elapsed: number }
  | { kind: 'shop' }
  | { kind: 'levelUp' }
  | { kind: 'gameOver' };

export type PresentationKind = PresentationPhase['kind'];

export const PRESENTATION_KINDS: readonly PresentationKind[] = [
  'classSelection',
  'idle',
  'moving',
  'trap',
  'encounter',
  'combat',
  'drop',
  'shop',
  'levelUp',
  'gameOver',
];

export function isBoardInteractive(phase: PresentationPhase): boolean {
  return phase.kind === 'idle';
}

export function locksBoard(kind: PresentationKind): boolean {
  return kind !== 'idle';
}
