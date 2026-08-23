import { describe, expect, it } from 'vitest';
import {
  PRESENTATION_KINDS,
  isBoardInteractive,
  locksBoard,
} from './presentationPhase';
import gameSource from './Game.ts?raw';

describe('presentation phase helpers', () => {
  it('enables board interaction only while idle', () => {
    expect(isBoardInteractive({ kind: 'idle' })).toBe(true);
    expect(locksBoard('idle')).toBe(false);

    for (const kind of PRESENTATION_KINDS) {
      if (kind === 'idle') {
        continue;
      }
      expect(locksBoard(kind)).toBe(true);
    }

    expect(isBoardInteractive({ kind: 'classSelection' })).toBe(false);
    expect(isBoardInteractive({ kind: 'shop' })).toBe(false);
    expect(isBoardInteractive({ kind: 'levelUp' })).toBe(false);
    expect(isBoardInteractive({ kind: 'gameOver' })).toBe(false);
    expect(isBoardInteractive({ kind: 'drop', elapsed: 0 })).toBe(false);
  });

  it('keeps Game.ts presentation control on the phase helper', () => {
    expect(gameSource).toMatch(/from ['"]\.\/presentationPhase['"]/);
    expect(gameSource).toMatch(/isBoardInteractive\(/);
    expect(gameSource).not.toMatch(/private boardLocked/);
    expect(gameSource).not.toMatch(/private animation:/);
    expect(gameSource).not.toMatch(/private combatPlayback/);
  });
});
