# Web stat overhaul

The web game now mirrors the native D&D-style rules while retaining every existing class weapon ladder and model.

## Core rules

- Attributes are **MIG**, **FIN**, **VIG**, and **WIL**, bounded from 8 to 20. Their modifier is `floor((score - 10) / 2)`.
- Every class starts from a 48-point attribute package and has one passive feature.
- Weapon Power is `base weapon Power + proficiency + scaling attribute modifier`. Proficiency rises to +3 at level 5 and +4 at level 9.
- Physical attacks test Armor; arcane attacks test Ward. Damage is `round(Power × 12 / (12 + effective defence))`, with a minimum of 1.
- Armor caps at 12, Ward at 12, critical chance at 35%, pierce at 40%, evade bonus at 30%, and extra-strike chance at 25%.
- A side encounter has a `clamp(20, 80, 50 + 5 × (FIN modifier - enemy awareness) + evade bonuses)` percent evade chance. Failed evades give the enemy a 25%-stronger opening strike. Successful evades award half XP, rounded down.

## Progression

- Level thresholds are 3, 7, 12, 18, 25, 35, 48, 64, and 84 XP.
- Each normal level offers three class-authored growth choices rather than unrestricted point allocation.
- Level 5 offers one of three class specializations. Level 10 offers specialization Mastery or Resilience.
- Claiming a level restores 20% of maximum HP. Attribute, defence, and percentage caps prevent runaway scaling.
- Enemies gain a rank every 20 rows after their introduction. Each rank adds 2 HP, 1 Power, awareness, and profile-specific Armor or Ward growth.

## Equipment and presentation

- Existing dagger, bow, staff, sword/shield, axe/hammer, and lorekeeper staff ladders are unchanged.
- Every purchased weapon tier adds 1 base Power. Rogue tiers also add Crit, ranger tiers add Pierce, lorekeeper tiers add Ward, and knight shield tiers add Armor.
- `BoldPixels.ttf` is bundled locally and applied to the site, game UI, HUD, shop, level choices, and canvas-rendered floating combat numbers.
