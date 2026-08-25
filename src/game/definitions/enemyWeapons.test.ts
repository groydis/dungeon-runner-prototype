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

  it('only rolls shields for crypt guard', () => {
    let call = 0;
    const weaponThenShield: () => number = () => {
      call += 1;
      if (call === 1) {
        return 0.999;
      }
      if (call === 2) {
        return 0;
      }
      return 0;
    };
    expect(rollEnemyWeapon('cryptGuard', weaponThenShield)).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      shieldAssetKey: 'shieldBadge',
      defenceBonus: 1,
    });

    call = 0;
    const shieldBlocked: () => number = () => {
      call += 1;
      if (call === 1) {
        return 0.999;
      }
      return 0.5;
    };
    expect(rollEnemyWeapon('cryptGuard', shieldBlocked)).toMatchObject({
      weaponAssetKey: 'fantasyAxeC',
      defenceBonus: 0,
    });
    expect(
      rollEnemyWeapon('cryptGuard', shieldBlocked)?.shieldAssetKey,
    ).toBeUndefined();

    call = 0;
    expect(
      rollEnemyWeapon('skeletonWarrior', () => {
        call += 1;
        return call === 1 ? 0.999 : 0;
      })?.shieldAssetKey,
    ).toBeUndefined();
  });
});
