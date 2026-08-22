import { PLAYER_EVADE_MAX } from './config';
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

export interface LevelUpChoiceView {
  id: LevelUpChoice;
  title: string;
  description: string;
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
  reason?: 'noLevelUp';
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

export function buildLevelUpView(
  level: number,
  experience: number,
): LevelUpView {
  return {
    level,
    experience,
    nextLevelExperience: nextLevelExperience(experience),
    choices: LEVEL_UP_CHOICES.map((id) => ({
      id,
      title: LEVEL_UP_CATALOG[id].title,
      description: LEVEL_UP_CATALOG[id].description,
    })),
  };
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
