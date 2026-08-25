import { describe, expect, it } from 'vitest';
import { rollEnemyWeapon } from './enemyWeapons';

describe('rollEnemyWeapon', () => {
  it('returns null on an unarmed roll for every armed enemy type', () => {
    const rng = () => 0;
    expect(rollEnemyWeapon('cryptGuard', rng)).toBeNull();
    expect(rollEnemyWeapon('skeletonWarrior', rng)).toBeNull();
    expect(rollEnemyWeapon('skeletonMage', rng)).toBeNull();
    expect(rollEnemyWeapon('necromancer', rng)).toBeNull();
    expect(rollEnemyWeapon('skeletonMinion', rng)).toBeNull();
    expect(rollEnemyWeapon('boneBrute', rng)).toBeNull();
  });

  it('picks the rarest pool entry when rng always returns close to 1', () => {
    const rng = () => 0.999;
    expect(rollEnemyWeapon('cryptGuard', rng)).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      attackBonus: 3,
    });
    expect(rollEnemyWeapon('skeletonWarrior', rng)).toMatchObject({
      weaponAssetKey: 'fantasyScythe',
      attackBonus: 5,
    });
    expect(rollEnemyWeapon('skeletonMage', rng)).toMatchObject({
      weaponAssetKey: 'fantasyWandB',
      attackBonus: 2,
    });
    expect(rollEnemyWeapon('necromancer', rng)).toMatchObject({
      weaponAssetKey: 'fantasyWandB',
      attackBonus: 2,
    });
    expect(rollEnemyWeapon('skeletonMinion', rng)).toMatchObject({
      weaponAssetKey: 'fantasyFistweaponCRight',
      offhandWeaponAssetKey: 'fantasyFistweaponCLeft',
      attackBonus: 2,
    });
    expect(rollEnemyWeapon('boneBrute', rng)).toMatchObject({
      weaponAssetKey: 'fantasyFistweaponCRight',
      offhandWeaponAssetKey: 'fantasyFistweaponCLeft',
      attackBonus: 3,
    });
  });

  it('mounts matching fist assets on both hands for A/B and distinct left/right for C', () => {
    const minionFistA = rollEnemyWeapon('skeletonMinion', () => 0.9);
    expect(minionFistA).toMatchObject({
      weaponAssetKey: 'fantasyFistweaponA',
      offhandWeaponAssetKey: 'fantasyFistweaponA',
      attackBonus: 1,
      defenceBonus: 0,
    });

    const minionFistC = rollEnemyWeapon('skeletonMinion', () => 0.999);
    expect(minionFistC).toMatchObject({
      weaponAssetKey: 'fantasyFistweaponCRight',
      offhandWeaponAssetKey: 'fantasyFistweaponCLeft',
      attackBonus: 2,
    });
    expect(minionFistC?.weaponAssetKey).not.toBe(minionFistC?.offhandWeaponAssetKey);
  });

  it('only rolls shields for crypt guard and tiers defence by shield size', () => {
    const cryptGuardRolls = (
      weaponRng: number,
      shieldChanceRng: number,
      shieldPickRng: number,
    ) => {
      let call = 0;
      return () => {
        call += 1;
        if (call === 1) {
          return weaponRng;
        }
        if (call === 2) {
          return shieldChanceRng;
        }
        return shieldPickRng;
      };
    };

    expect(
      rollEnemyWeapon('cryptGuard', cryptGuardRolls(0.999, 0.1, 0)),
    ).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      shieldAssetKey: 'shieldRound',
      defenceBonus: 2,
    });

    expect(
      rollEnemyWeapon('cryptGuard', cryptGuardRolls(0.999, 0.1, 0.999)),
    ).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      shieldAssetKey: 'fantasyShieldD',
      defenceBonus: 5,
    });

    expect(
      rollEnemyWeapon('cryptGuard', cryptGuardRolls(0.999, 0.5, 0.1)),
    ).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      defenceBonus: 0,
    });
    expect(
      rollEnemyWeapon('cryptGuard', cryptGuardRolls(0.999, 0.5, 0.1))
        ?.shieldAssetKey,
    ).toBeUndefined();

    expect(
      rollEnemyWeapon('skeletonWarrior', cryptGuardRolls(0.999, 0.1, 0))?.shieldAssetKey,
    ).toBeUndefined();
  });
});
