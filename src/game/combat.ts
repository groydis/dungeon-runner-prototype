import { clamp, type CombatStats, type DamageChannel } from './Combatant';
import { type CombatApproach } from './encounters';

export const MAX_COMBAT_ROUNDS = 24;
export interface CombatLogEntry {
  attacker: 'player' | 'monster'; target: 'player' | 'monster'; damage: number;
  bonusDamage: number; isSurpriseStrike: boolean; isCritical?: boolean; isExtraStrike?: boolean;
  damageChannel?: DamageChannel; targetHealthAfter: number;
}
export interface CombatResult {
  approach: CombatApproach; monsterId: string; monsterName: string; log: CombatLogEntry[];
  winner: 'player' | 'monster'; playerHealthAfter: number;
}

/** Smooth mitigation keeps every Power increase useful while Armor/Ward never grant immunity. */
export function calculateDamage(power: number, rating: number, pierce = 0): number {
  const effectiveRating = Math.round(Math.max(0, rating) * (1 - clamp(pierce, 0, 40) / 100));
  return Math.max(1, Math.round(Math.max(0, power) * 12 / (12 + effectiveRating)));
}
export function calculateSurpriseDamage(power: number, rating: number, pierce = 0): number {
  return Math.max(1, Math.round(calculateDamage(power, rating, pierce) * 1.25));
}

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
  let playerStrikeIndex = 0;
  let firstIncoming = true;
  const log: CombatLogEntry[] = [];

  const playerStrike = (extra = false): void => {
    if (playerHealth <= 0 || monsterHealth <= 0) return;
    const opening = playerStrikeIndex === 0;
    const bloodied = playerHealth <= player.maxHealth / 2;
    const power = player.attack * (opening ? player.openingDamageMultiplier : 1) * (bloodied ? player.bloodiedMultiplier : 1);
    const pierce = player.pierce + (opening ? player.openingPierce : 0);
    const rating = player.damageChannel === 'arcane' ? monster.ward : monster.armor;
    const critical = deterministicPercent(identity.id, 'player-crit', playerStrikeIndex) < player.critChance;
    let damage = calculateDamage(power, rating, pierce);
    if (critical) damage = Math.max(1, Math.round(damage * 1.5));
    monsterHealth = Math.max(0, monsterHealth - damage);
    log.push({ attacker: 'player', target: 'monster', damage,
      bonusDamage: Math.max(0, Math.min(playerAttackBonus, damage - 1)),
      isSurpriseStrike: false, isCritical: critical, isExtraStrike: extra,
      damageChannel: player.damageChannel, targetHealthAfter: monsterHealth });
    playerStrikeIndex += 1;
    if (!extra && monsterHealth > 0 && deterministicPercent(identity.id, 'player-extra', playerStrikeIndex) < player.extraStrikeChance) {
      playerStrike(true);
    }
  };

  const monsterStrike = (surprise: boolean): void => {
    if (playerHealth <= 0 || monsterHealth <= 0) return;
    const rating = monster.damageChannel === 'arcane' ? player.ward : player.armor;
    let damage = surprise
      ? calculateSurpriseDamage(monster.attack, rating, monster.pierce)
      : calculateDamage(monster.attack, rating, monster.pierce);
    if (firstIncoming && player.firstIncomingReduction > 0) {
      damage = Math.max(1, Math.round(damage * (1 - player.firstIncomingReduction / 100)));
    }
    firstIncoming = false;
    playerHealth = Math.max(0, playerHealth - damage);
    log.push({ attacker: 'monster', target: 'player', damage,
      bonusDamage: Math.max(0, Math.min(monsterAttackBonus, damage - 1)),
      isSurpriseStrike: surprise, damageChannel: monster.damageChannel,
      targetHealthAfter: playerHealth });
  };

  if (playerHealth <= 0) return finish(approach, identity, log, playerHealth, 'monster');
  if (monsterHealth <= 0) return finish(approach, identity, log, playerHealth, 'player');

  let rounds = 0;
  if (approach === 'surprise') monsterStrike(true);
  while (playerHealth > 0 && monsterHealth > 0 && rounds < maxRounds) {
    rounds += 1;
    playerStrike();
    if (playerHealth <= 0 || monsterHealth <= 0) break;
    monsterStrike(false);
  }
  const winner = monsterHealth <= 0 && playerHealth > 0 ? 'player' : 'monster';
  return finish(approach, identity, log, playerHealth, winner);
}

function deterministicPercent(identity: string, label: string, strike: number): number {
  let hash = 2166136261;
  const text = `${identity}:${label}:${strike}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
function finish(approach: CombatApproach, identity: { id: string; name: string }, log: CombatLogEntry[], playerHealthAfter: number, winner: 'player' | 'monster'): CombatResult {
  return { approach, monsterId: identity.id, monsterName: identity.name, log, winner, playerHealthAfter };
}
