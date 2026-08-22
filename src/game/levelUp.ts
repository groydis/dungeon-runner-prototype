import {
  PLAYER_ATTACK_CAP,
  PLAYER_DEFENCE_CAP,
  PLAYER_EVADE_MAX,
  PLAYER_MAX_HEALTH_CAP,
} from './config';
import { type Player } from './Player';
import { nextLevelExperience } from './progression';

export type LevelUpChoice = 'vitality' | 'sharpened' | 'armoured' | 'evasive';

export const LEVEL_UP_CHOICES: readonly LevelUpChoice[] = [
  'vitality',
  'sharpened',
  'armoured',
  'evasive',
];

export const LEVEL_UP_VITALITY_MAX_HEALTH = 1;
export const LEVEL_UP_SHARPENED_ATTACK = 1;
export const LEVEL_UP_ARMOURED_DEFENCE = 1;
export const LEVEL_UP_EVASIVE_EVADE = 5;

export type LevelUpUnavailableReason = 'noLevelUp' | 'capped';

export interface LevelUpChoiceView {
  id: LevelUpChoice;
  title: string;
  description: string;
  available: boolean;
  reason?: Exclude<LevelUpUnavailableReason, 'noLevelUp'>;
  disabledReason?: string;
}

export interface LevelUpView {
  level: number;
  experience: number;
  nextLevelExperience: number | null;
  choices: LevelUpChoiceView[];
}

export interface LevelUpResult {
  success: boolean;
  choice?: LevelUpChoice;
  reason?: LevelUpUnavailableReason;
  maxHealthGained: number;
  attackGained: number;
  defenceGained: number;
  evadeGained: number;
  pendingRemaining: number;
  status: string;
}

export const LEVEL_UP_CATALOG: Record<
  LevelUpChoice,
  { title: string; description: string }
> = {
  vitality: {
    title: 'Vitality',
    description: `+${LEVEL_UP_VITALITY_MAX_HEALTH} max HP`,
  },
  sharpened: {
    title: 'Sharpened',
    description: `+${LEVEL_UP_SHARPENED_ATTACK} attack`,
  },
  armoured: {
    title: 'Armoured',
    description: `+${LEVEL_UP_ARMOURED_DEFENCE} defence`,
  },
  evasive: {
    title: 'Evasive',
    description: `+${LEVEL_UP_EVASIVE_EVADE} Evade (max ${PLAYER_EVADE_MAX})`,
  },
};

export interface LevelUpStatSnapshot {
  maxHealth: number;
  attack: number;
  defence: number;
  evade: number;
}

export const LEVEL_UP_CAPS: Record<LevelUpChoice, number> = {
  vitality: PLAYER_MAX_HEALTH_CAP,
  sharpened: PLAYER_ATTACK_CAP,
  armoured: PLAYER_DEFENCE_CAP,
  evasive: PLAYER_EVADE_MAX,
};

export const LEVEL_UP_CAPPED_REASONS: Record<LevelUpChoice, string> = {
  vitality: `Max HP is already at maximum (${PLAYER_MAX_HEALTH_CAP}).`,
  sharpened: `Attack is already at maximum (${PLAYER_ATTACK_CAP}).`,
  armoured: `Defence is already at maximum (${PLAYER_DEFENCE_CAP}).`,
  evasive: `Evade is already at maximum (${PLAYER_EVADE_MAX}).`,
};

export const LEVEL_UP_EVASIVE_CAPPED_REASON = LEVEL_UP_CAPPED_REASONS.evasive;

export function evaluateLevelUpChoice(
  choice: LevelUpChoice,
  stats: LevelUpStatSnapshot,
): { available: boolean; reason?: 'capped'; disabledReason?: string } {
  const current = currentLevelUpStat(choice, stats);
  if (current >= LEVEL_UP_CAPS[choice]) {
    return {
      available: false,
      reason: 'capped',
      disabledReason: LEVEL_UP_CAPPED_REASONS[choice],
    };
  }
  return { available: true };
}

export function buildLevelUpView(
  level: number,
  experience: number,
  stats: LevelUpStatSnapshot,
): LevelUpView {
  return {
    level,
    experience,
    nextLevelExperience: nextLevelExperience(experience),
    choices: LEVEL_UP_CHOICES.map((id) => {
      const evaluation = evaluateLevelUpChoice(id, stats);
      return {
        id,
        title: LEVEL_UP_CATALOG[id].title,
        description: LEVEL_UP_CATALOG[id].description,
        available: evaluation.available,
        reason: evaluation.reason,
        disabledReason: evaluation.disabledReason,
      };
    }),
  };
}

function currentLevelUpStat(
  choice: LevelUpChoice,
  stats: LevelUpStatSnapshot,
): number {
  if (choice === 'vitality') {
    return stats.maxHealth;
  }
  if (choice === 'sharpened') {
    return stats.attack;
  }
  if (choice === 'armoured') {
    return stats.defence;
  }
  return stats.evade;
}

export function applyLevelUpChoice(player: Player, choice: LevelUpChoice): {
  maxHealthGained: number;
  attackGained: number;
  defenceGained: number;
  evadeGained: number;
  status: string;
} {
  if (choice === 'vitality') {
    const maxHealthGained = player.increaseMaxHealth(LEVEL_UP_VITALITY_MAX_HEALTH);
    return {
      maxHealthGained,
      attackGained: 0,
      defenceGained: 0,
      evadeGained: 0,
      status: `Vitality: max HP is now ${player.stats.maxHealth}.`,
    };
  }
  if (choice === 'sharpened') {
    const attackGained = player.increaseAttack(LEVEL_UP_SHARPENED_ATTACK);
    return {
      maxHealthGained: 0,
      attackGained,
      defenceGained: 0,
      evadeGained: 0,
      status: `Sharpened: attack is now ${player.stats.attack}.`,
    };
  }
  if (choice === 'armoured') {
    const defenceGained = player.increaseDefence(LEVEL_UP_ARMOURED_DEFENCE);
    return {
      maxHealthGained: 0,
      attackGained: 0,
      defenceGained,
      evadeGained: 0,
      status: `Armoured: defence is now ${player.stats.defence}.`,
    };
  }
  const evadeGained = player.increaseEvade(LEVEL_UP_EVASIVE_EVADE);
  return {
    maxHealthGained: 0,
    attackGained: 0,
    defenceGained: 0,
    evadeGained,
    status: `Evasive: Evade is now ${player.evade}.`,
  };
}
