import { type CombatApproach } from './encounters';
import { type CombatStats } from './Combatant';

export const MAX_COMBAT_ROUNDS = 24;

export interface CombatLogEntry {
  attacker: 'player' | 'monster';
  target: 'player' | 'monster';
  damage: number;
  /** Portion of `damage` attributed to a weapon attack bonus (display-only). */
  bonusDamage: number;
  isSurpriseStrike: boolean;
  targetHealthAfter: number;
}

export interface CombatResult {
  approach: CombatApproach;
  monsterId: string;
  monsterName: string;
  log: CombatLogEntry[];
  winner: 'player' | 'monster';
  playerHealthAfter: number;
}

export function calculateDamage(attack: number, defence: number): number {
  return Math.max(1, attack - defence);
}

export function calculateSurpriseDamage(attack: number, defence: number): number {
  return Math.ceil(calculateDamage(attack, defence) * 1.5);
}

/**
 * Resolves a whole fight immediately. Does not mutate the supplied stats.
 */
export function resolveAutomaticCombat(
  player: CombatStats,
  monster: CombatStats,
  approach: CombatApproach,
  identity: { id: string; name: string },
  maxRounds: number = MAX_COMBAT_ROUNDS,
  monsterAttackBonus: number = 0,
  playerAttackBonus: number = 0,
): CombatResult {
  let playerHealth = Math.max(0, player.health);
  let monsterHealth = Math.max(0, monster.health);
  const log: CombatLogEntry[] = [];

  const strike = (
    attacker: 'player' | 'monster',
    surprise: boolean,
  ): void => {
    const attack = attacker === 'player' ? player.attack : monster.attack;
    const defence = attacker === 'player' ? monster.defence : player.defence;
    const damage = surprise
      ? calculateSurpriseDamage(attack, defence)
      : calculateDamage(attack, defence);
    const attackBonus =
      attacker === 'player' ? playerAttackBonus : monsterAttackBonus;
    const bonusDamage = Math.max(0, Math.min(attackBonus, damage - 1));

    if (attacker === 'player') {
      monsterHealth = Math.max(0, monsterHealth - damage);
      log.push({
        attacker,
        target: 'monster',
        damage,
        bonusDamage,
        isSurpriseStrike: surprise,
        targetHealthAfter: monsterHealth,
      });
      return;
    }

    playerHealth = Math.max(0, playerHealth - damage);
    log.push({
      attacker,
      target: 'player',
      damage,
      bonusDamage,
      isSurpriseStrike: false,
      targetHealthAfter: playerHealth,
    });
  };

  if (playerHealth <= 0) {
    return finish(approach, identity, log, playerHealth, 'monster');
  }
  if (monsterHealth <= 0) {
    return finish(approach, identity, log, playerHealth, 'player');
  }

  strike('player', approach === 'surprise');

  let rounds = 0;
  while (playerHealth > 0 && monsterHealth > 0 && rounds < maxRounds) {
    rounds += 1;
    strike('monster', false);
    if (playerHealth <= 0 || monsterHealth <= 0) {
      break;
    }
    strike('player', false);
  }

  const winner = monsterHealth <= 0 && playerHealth > 0 ? 'player' : 'monster';
  return finish(approach, identity, log, playerHealth, winner);
}

function finish(
  approach: CombatApproach,
  identity: { id: string; name: string },
  log: CombatLogEntry[],
  playerHealthAfter: number,
  winner: 'player' | 'monster',
): CombatResult {
  return {
    approach,
    monsterId: identity.id,
    monsterName: identity.name,
    log,
    winner,
    playerHealthAfter,
  };
}
