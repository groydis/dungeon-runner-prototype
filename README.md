# Dungeon Runner

A mobile-first, tile-based dungeon roguelite prototype. The playfield is a three-lane “highway” seen from a slightly elevated 3D view. You are not free to roam: every turn you advance exactly one row, and you may shift at most one lane sideways.

This repository is a working visual skeleton, not a complete game. It is built with **Vite**, **TypeScript**, and **Three.js** (no React).

## Game concept

You choose a class on launch, then start in the centre lane at the near end of the board. Tapping a highlighted tile steps you into that lane and advances the dungeon by exactly one row. The player stays visually near the bottom of the screen; the world scrolls toward the camera.

Rows ahead can hold monsters, loot, hazards, doors, shops, and later biome decoration. In this prototype:

- Floor tiles are simple dark stone boxes.
- The player is a KayKit Adventurers GLB for the selected class, with the old green capsule as a loading/failure fallback. Ranger holds a visual-only KayKit dagger; it does not change combat.
- Rows can contain empty lanes, Cave Rats, Crypt Guards, Bone Brutes, gold, health potions, or Alarm Traps. Those three enemies use KayKit Skeleton models (Minion / Rogue / Warrior) with the old placeholders as a loading fallback.
- A monster can attack from the four cardinal tiles around it, not from diagonals.
- Same lane (in front or behind) = a normal front-on fight.
- Adjacent lane (same row) = roll Evade vs that enemy’s Perception to slip past, or take a Surprise Attack.
- Combat is automatic and plays in place. There is no battle screen.
- Gold can be spent at a rare Travelling Merchant for run-only upgrades.
- Combat wins grant run-scoped XP. Crossing a threshold pauses the board for a level-up choice.
- An Alarm Trap does not deal damage. It pulls the closest visible enemy one legal tile closer.
- The loop is: choose a lane, fight or evade, collect gold or potions, trip alarms, spend gold at a Merchant, pick level-up rewards, survive.

The intended target is mobile browsers and thin native wrappers, so the prototype favours simple geometry, a recycled mesh pool, touch-first input, and a capped pixel ratio.

## Current prototype scope

Included:

- A 3-column grid with about 8 visible rows
- Click / tap selection via raycasting
- Smooth lane-change, hop, and board-scroll animation
- Row recycling: the row that leaves the screen is reused as the new far row
- A demo Cave Rat after a 3-row safe opening, then weighted procedural rows
- Distance-scaled enemy pools (Cave Rat, Crypt Guard, Bone Brute)
- Gold and potion pickups with run-scoped gold and healing
- Alarm Traps from row 8 that pull one visible enemy closer
- Cardinal-plus encounters: front-on fight, evade, or Surprise Attack
- Automatic combat with a short playback of each hit
- Five player classes that set starting HP, attack, defence, and Evade
- A **Choose Your Class** overlay on launch; board input stays locked until a class is selected
- HUD with class name (`CLASS: Rogue`), distance, level, XP, gold, attack, evade (`EVA: 6`, no `%`), HP text/bar, and status
- Run-scoped XP and a four-choice level-up overlay
- A rare Travelling Merchant shop overlay
- Universal run caps shared by Merchant upgrades and level-up rewards
- Death overlay; Restart Run returns to class selection without reloading the page
- Responsive full-screen layout for phone and desktop

Not included:

- Gameplay equipment, skill trees, crits, unique enemy abilities, or an inventory screen
- Damaging traps, extra trap kinds, doors, random shop stock, or meta progression
- Authored biomes beyond the current weights
- Environment art beyond the current simple tiles
- Sound, saves, accounts, or networking

## Install and run

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`). The dev server binds to `0.0.0.0`, so you can also load it from a phone on the same network.

Production build and local preview:

```bash
npm run build
npm run preview
```

`build` type-checks with `tsc --noEmit`, then bundles with Vite.

Query-string helpers (no on-screen debug UI):

- `/?avoid=1` — testing override: always evade a side pass, ignoring Evade and Perception
- `/?avoid=0` — testing override: always Surprise Attack combat on a side pass, ignoring Evade and Perception
- `/?fatal=1` — testing override: Cave Rat **attack** is raised on top of `ENEMY_DEFINITIONS`, enough to kill the player
- `/?seed=123` — seeded row generation plus separate drop and evade streams; after you select the same class again, the same choices replay the same layouts, drops, and evade rolls. Choosing a class does not consume those streams.

## Controls

There is no keyboard movement and no combat input.

- On launch, **Choose Your Class** lists all five classes with flavour text, a compact `HP / ATK / DEF / EVA` line, and a Select button. The board, highlights, shops, and level-ups stay locked until you pick one.
- **Tap or click** a glowing tile in the next row. You always advance exactly one row.
- You may move at most one lane sideways per step:
  - Left lane → left or centre
  - Centre lane → left, centre, or right
  - Right lane → centre or right
- A two-lane jump (left ↔ right) is illegal. Tiles occupied by enemies are also illegal.
- Only legal destinations glow and can be tapped.
- Input is locked before class selection, during the step animation, trap/enemy-advance playback, combat or evade feedback, while a level-up choice is open, and while a Merchant shop is open.
- After death, use **Restart Run**. That clears the prior run and returns to **Choose Your Class**. The page does not reload, and there is no “same class” shortcut.

Selection uses pointer events and a Three.js raycaster against invisible hit planes on the highlighted tiles, so the same path works for mouse and touch.

## Project structure

```text
src/
  main.ts                 Entry point: canvas + game loop bootstrap
  game/
    Game.ts               Animation, input, and view/render orchestration
    GameState.ts          Single-run aggregate and public rule boundary
    RunWorld.ts           Grid, recipes, entities, and board snapshots
    BoardSnapshot.ts      Immutable board/read models for rendering
    Grid.ts               Logical 3-wide sliding tile window
    Tile.ts               Internal cell coordinates + content type
    Monster.ts            Run-specific enemy instance
    Collectible.ts        Gold and potion entities
    Trap.ts               Alarm Trap entity and consume state
    alarm.ts              Closest-enemy pick and one-tile advance
    Merchant.ts           Shop entity, used/purchased state
    shop.ts               Stat-upgrade offers, escalating prices, and shop views
    progression.ts        Cumulative XP thresholds and level progress
    levelUp.ts            Level-up choices, views, and Player applications
    Player.ts             Position, gold, XP, class, and run-scoped combat stats
    Combatant.ts          Combat stat types and combat-math fixtures
    combat.ts             Pure automatic-combat resolver and log
    encounters.ts         Cardinal-plus rules and avoidance rolls
    rowGeneration.ts      Weighted row recipes and safety rules
    random.ts             Isolated generation, drop, and Evade streams
    InputController.ts    Pointer + raycast picking
    config.ts             Shared grid and timing constants
    definitions/
      classes.ts          Authoritative class names, copy, starting stats, and render keys
      enemies.ts          Authoritative enemy names, base stats, XP, render keys
      encounterPools.ts   Distance-based enemy-type weights
  ui/
    HudView.ts            Class, distance, level, XP, gold, attack, evade, HP, status
    ClassSelectionView.ts Choose Your Class overlay
    GameOverView.ts       Death overlay and Restart Run
    ShopOverlayView.ts    Merchant overlay
    LevelUpOverlayView.ts Level-up overlay
  rendering/
    SceneManager.ts       Scene, lights, recycled row meshes, player/hit FX
    playerAssets.ts       KayKit player GLB URLs
    playerEquipment.ts    Ranger visual-only KayKit dagger loadout
    enemyAssets.ts        KayKit Skeleton enemy GLB URLs and per-model fits
    rigMediumAnimations.ts Shared Rig_Medium clip loader/cache
    CameraController.ts   Elevated follow camera
  styles/
    main.css              Full-viewport HUD, class-select, shop, level-up, and game-over overlays
public/                   Static assets
```

## Architecture

This is a hybrid OOP / data-driven layout, not an ECS or event-bus design.

- **GameState** is the sole public run mutation boundary. Live `Player` and `Monster` instances stay private. Callers read frozen `PlayerSnapshot`, `BoardSnapshot`, HUD, and encounter views, and mutate only through typed GameState actions. Until `selectClass()` runs, movement throws `Cannot move before a class is selected`, player/board reads are empty or null, and shop APIs return a typed `noClass` result.
- **RunWorld** is private to GameState. It owns the mutable board: Grid, recipes, entity maps, tile materialisation, prepare/prune, lookups, alarm movement, world reset, and snapshot construction.
- **Frozen read models** (`BoardSnapshot`, `PlayerSnapshot`, `EncounterMonsterView`) cross into UI, animation, and rendering. Combat playback correlates with entities by immutable target id; it never receives a live Monster.
- **Game.ts** owns overlay order, animation, and input-lock state. It shows **Choose Your Class** on launch and after Restart Run, then asks GameState for a board snapshot and tells `SceneManager` whether the board is interactive. It does not store that flag on `GameState`. It consumes `finishCombat()`’s typed drop and level-up result so drop-spawn playback can finish before a level-up overlay opens.
- **Domain objects** (`Player`, `Monster`, `Collectible`, `Trap`, `Merchant`) own their own state transitions: movement, gold, XP, healing, evade, damage, collection, trap consume, and Merchant purchases.
- **Pure rule modules** (`combat.ts`, `encounters.ts`, `alarm.ts`, `rowGeneration.ts`, `shop.ts`, `progression.ts`, `levelUp.ts`) stay function-based. Combat still resolves immediately into an ordered log; `GameState` applies that log one entry at a time so playback can update HP per hit.
- **UI views** under `src/ui` update HTML only. They render class-selection / `ShopView` / `LevelUpView` / HUD snapshots and do not import Three.js or mutate `GameState` internals. Class starting stats are not duplicated in views.
- **Class and enemy definitions** are deeply frozen static records. `Player.definition` and `Monster.definition` expose those read-only records; live combat stats are cloned onto instances. `?fatal=1` still overrides Cave Rat attack on top of the immutable base.
- **SceneManager** remains rendering-only. It consumes board snapshots, encounter views, and one-shot FX results. It does not import `GameState`, `Player`, `Monster`, or `RunWorld`.
- **Player presentation** uses KayKit Adventurers GLBs. Class definitions own a `renderKey`; frozen `PlayerSnapshot` / `BoardSnapshot` expose that key. `playerAssets.ts` maps keys to model URLs. Ranger currently shows a visual-only KayKit dagger from `playerEquipment.ts`, parented to `handslot.r`. Equipment does not yet alter gameplay. Shared clips provide idle, walk, hit, and death. Models never change class rules or GameState.
- **Enemy presentation** uses KayKit Skeleton GLBs for Cave Rat, Crypt Guard, and Bone Brute. `enemyAssets.ts` maps existing enemy render keys to model URLs. Placeholders remain as loading/failure fallbacks. Rendering stays presentation-only.
- **Shared Rig_Medium animations** live in `rigMediumAnimations.ts`. Player and enemy rendering reuse one clip cache (`Idle_A`, `Walking_A`, `Hit_A`, `Death_A`). Enemies walk only during Alarm Trap slides, not during ordinary player movement.

Game rules stay under `src/game`. Meshes, cameras, and materials stay under `src/rendering`.

## Tests

```bash
npm test
npm run test:watch
```

Unit tests cover combat, encounters, seeded row generation, Alarm Trap targeting and consumption, enemy drops, XP and level-up choices, player classes and class selection, player gold/healing, Merchant purchases, immutable definitions and board snapshots, enemy definitions, distance pools, and `resolveCompletedMove()` validity/order. They use an injected class (`ranger` when a neutral setup is needed), RNG, avoidance rolls, recipe factories, and stat factories. They do not exercise WebGL or browser animation.

`build` type-checks with `tsc --noEmit`, then bundles with Vite.

## Tile and grid model

Each board cell is a logical `Tile`:

- `row` — world row index. `0` is the starting row; values increase as the dungeon extends forward.
- `col` — lane index: `0` left, `1` centre, `2` right.
- `content.type` — `empty` | `monster` | `gold` | `potion` | `shop` | `trap` | plus unused future types.

`Grid` stores rows in a map and creates them on demand through a factory. After each step it prunes rows more than a couple of indexes behind the player so a long run does not grow forever.

A destination is legal only when it is the next row, at most one lane away, and not occupied by an enemy. That rule lives in `GameState.isForwardTile()`. Rendering highlights and raycast picks only those tiles. You fight or slip past monsters from adjacent cardinal tiles; you cannot step onto their square.

World layout (rendering only):

- X = lane (`(col - 1) * tilePitch`)
- Z = forward is negative Z
- The player mesh stays near `z = 0` while tiles scroll in +Z

## Scrolling and row generation

1. The scene keeps a fixed pool of row groups (`VISIBLE_ROWS + 2`).
2. On a valid tap, game state locks input and starts a short ease-out animation:
   - player X interpolates to the chosen lane
   - player Y hops once
   - every pooled row shifts by one tile pitch toward the camera
3. When the animation finishes, `GameState.resolveCompletedMove()` commits the legal step, prepares/prunes rows, and returns the game-side result.
4. `SceneManager` rebinds only the row that just left the bottom of the screen and assigns it to the new far index. Other row meshes keep their logical rows.
5. The player mesh stays in the lower part of the frame; the camera is mostly static, with a small nudge on each step.

`resolveCompletedMove()` keeps this order:

1. Commit the move and generate/prune rows
2. Resolve a landed gold or potion pickup
3. Open a Merchant if the landed tile is a shop
4. Trigger a landed Alarm Trap, if present, and resolve one enemy advance
5. Collect eligible cardinal-plus encounters (combat is not played back here)

A tile never holds loot, a shop, a trap, and a monster together. Shop rows are otherwise empty, so a Merchant opening never also pulls an enemy. If a pickup or Alarm Trap and an encounter happen in one step, the earlier status is applied first; an encounter then overwrites the status line.

## Procedural row content

`src/game/rowGeneration.ts` builds a 3-lane recipe. Rendering only shows whatever the recipe produced.

Safety guarantees:

- Rows `0..3` are empty. The first three moves are therefore safe.
- Row `4` always has the demo Cave Rat in the centre lane so front-on and side-pass combat stay easy to test.
- Merchant rows never appear in `0..4`.
- Rows `5–7` use the early weights (still no traps) unless a Merchant is due:
  - 45% all empty
  - 25% one monster
  - 15% one gold
  - 10% one potion
  - 5% one monster + one loot item (gold or potion, 50/50)
- From row `8` onward, non-Merchant rows use:
  - 35% all empty
  - 25% one monster
  - 15% one gold
  - 10% one potion
  - 5% one monster + one loot item
  - 5% one Alarm Trap
  - 5% one monster + one Alarm Trap
- The monster on a monster, monster-plus-loot, or monster-plus-trap row is then chosen from the distance pool:
  - Rows `5–19`: 100% Cave Rat
  - Rows `20–39`: 75% Cave Rat, 25% Crypt Guard
  - Rows `40+`: 50% Cave Rat, 35% Crypt Guard, 15% Bone Brute
- All three enemies use the same encounter and combat rules and the same first-version drop table. Only stats and placeholder look differ.
- Every generated row has at least one empty lane. There is never a three-wide monster wall.
- At most one monster, at most one collectible, and at most one trap per row.
- Two entities never share a tile.

Merchant rows override those weights on a fixed cadence (`SHOP_ROW_INTERVAL = 14`):

- First shop at row `14`, then every 14 rows: `28`, `42`, `56`, …
- Exactly one Merchant in a randomly chosen lane; the other two lanes are empty
- No monster, gold, potion, trap, or other content on that row

`?seed=<number>` seeds **row generation** (Mulberry32), including Merchant lanes, trap lanes, and enemy-type rolls. Enemy drops and side-pass evade rolls use **separate** Mulberry32 streams from the same seed (`DROP_RNG_SEED_SALT`, `EVADE_RNG_SEED_SALT`), so neither can change later layouts. `?avoid=1` / `?avoid=0` bypass the evade stream. Combat hit resolution is still deterministic from stats. Without `?seed`, generation, drops, and evade all use `Math.random`. Restart Run rebuilds every stream from the same seed.

Gold and potions:

- Gold starts at `0`. Landing on gold adds `1` and removes the item: `You found 1 gold.`
- A potion heals `4` HP, capped at max HP, and is consumed even at full health.
  - Heal: `You drink a potion and restore [N] HP.`
  - Full: `You find a potion, but are already at full health.`
- Pickup meshes pop/fade in place and do not block extra input time. Recycled row meshes reset so collected items cannot reappear.
- Defeated enemies can drop gold or a potion onto their cleared tile. The drop is a normal collectible and is **not** granted automatically. You only receive it by landing on that tile later.

## Enemy drops

All three current enemies share this drop table (defined on `EnemyDefinition`, not in GameState or rendering):

| Result | Weight |
|---|---:|
| No drop | 60% |
| Gold | 25% |
| Potion | 15% |

A drop is rolled only after a player combat victory, once the monster is removed. Evade, death, Alarm Trap movement, and other removals never roll.

The item stays on the defeated enemy’s tile:

- Front-on kills leave loot on the tile directly ahead, so the next step can collect it.
- A Surprise Attack in an adjacent lane may leave loot behind as the board advances. That is intentional: front-on fights cost more health but can clear a path to loot.

Status keeps the existing victory line and appends a short drop note when something appears:

- `You defeated the Cave Rat. It drops 1 gold.`
- `You defeated the Crypt Guard. It drops a potion.`

The renderer plays a short pop/landing glow on the pooled gold or potion mesh. Board input stays locked until that spawn effect finishes. Later pickups still use the existing collect fade.

## Alarm Trap

Alarm Traps appear from row `8`. They deal no damage in this version.

Landing on one:

1. Consumes the trap.
2. Selects the closest unresolved living enemy in the logical visible window (current player row through the last pooled row, `ROW_POOL_SIZE`).
3. That enemy attempts exactly one cardinal step that reduces Manhattan distance to the player.
4. Vertical toward the player is tried first; a horizontal step toward the player’s lane is the fallback.
5. The enemy may enter gold, potion, or Alarm Trap tiles and immediately crush them. It gains no gold, healing, buff, or extra alarm pull.
6. Merchant/shop tiles are impassable. An enemy cannot enter, consume, or destroy a Merchant.
7. The enemy may step onto the player’s tile. It cannot leave the three lanes, move diagonally, or step onto another enemy.
8. After the optional advance, the existing cardinal-plus encounter rules run immediately.

Closest-enemy ties are deterministic: lower Manhattan, then lower row distance, then lower column distance, then stable enemy id. If no eligible enemy is visible, the trap still disappears: `You trigger an Alarm Trap… but nothing answers.`

Status examples:

- `Alarm Trap! The Crypt Guard closes in.`
- `Alarm Trap! The Bone Brute closes in and crushes a potion.`

The renderer plays a short trap flash, then a one-tile enemy slide, then any combat/evade FX. Board input stays locked until that sequence finishes.

## Player classes

Classes are starting stats and presentation only. They do not add spells, bows, crits, blocking, rage, or inventory. Ranger currently shows a visual-only KayKit dagger in the right hand; equipment does not yet alter gameplay.

| ID | Class | Max HP | ATK | DEF | EVA | Playstyle |
|---|---|---:|---:|---:|---:|---|
| `rogue` | Rogue | 18 | 5 | 1 | 6 | Nimble survivor with the best chance to slip past threats. |
| `ranger` | Ranger | 20 | 6 | 1 | 3 | Flexible fighter with reliable early damage. |
| `mage` | Mage | 16 | 8 | 0 | 2 | Fragile but devastating without needing magic abilities yet. |
| `knight` | Knight | 26 | 4 | 3 | 0 | Armoured and dependable under sustained damage. |
| `barbarian` | Barbarian | 28 | 7 | 0 | 0 | Huge health and damage, with no defensive tricks. |

`src/game/definitions/classes.ts` is the only source of those packages. Restarting a run with the same class restores that class’s original bases, level 1, 0 XP, 0 gold, and starting Evade. Selecting a different class starts a clean run: no leftover XP, gold, Merchant prices, pending level-ups, entities, or RNG state.

**Choose Your Class** appears on first launch and after Restart Run. Until a class is selected, the board has no legal highlights and `GameState` rejects movement.

Universal run caps (Merchant purchases and level-up rewards share these):

| Stat | Cap |
|---|---:|
| Max HP | 35 |
| Attack | 15 |
| Defence | 10 |
| Evade | 20 |

Merchant upgrades still grant +1. Level-up Vitality / Sharpened / Armoured still grant +1. Evasive still grants +5, but stops at 20. A choice that would grant +0 is disabled. Vitality still raises max HP only and does not heal current HP.

## Travelling Merchant

Landing on a Merchant tile pauses the run and opens a centred shop overlay. The shop is not consumed just by opening it. Board input stays locked until **Leave**.

Each Merchant may be used once. After Leave, the Merchant is marked used and removed from the board. Movement then continues from that tile. Returning in normal forward play is impossible; leftover state still treats a used Merchant as empty.

Opening the shop does not spend gold. Each visit offers the same four run-scoped stat upgrades. A purchase adds exactly `+1` to that stat. Each stat has its own escalating price track: only that stat’s next price increases by 1 gold. Prices persist for the run, not for a single Merchant visit.

| Offer | Effect | Cap | First price |
|---|---|---:|---:|
| Vitality | +1 max HP; current HP is unchanged | 35 | 2 |
| Sharpened | +1 attack | 15 | 3 |
| Armoured | +1 defence | 10 | 3 |
| Evasive | +1 Evade | 20 | 2 |
| Leave | Close the shop and continue | — | 0 |

Example Attack prices: `3 → 4 → 5 → …` until attack reaches 15. Example Evade prices: `2 → 3 → 4 → …` until Evade reaches its hard maximum of 20. Starting values come from the selected class, not from a single default package.

Rules:

- Purchase buttons disable when the player cannot afford the offer or that stat is already at its Merchant cap.
- Gold never becomes negative. Unaffordable and capped offers cannot be purchased.
- Vitality never heals current HP.
- EVA has a hard maximum of 20. Merchant Evasive and level-up Evasive both stop there.
- A successful purchase deducts gold and applies the effect immediately. The overlay stays open so other stats can still be bought.
- Shop costs, caps, eligibility, and stat changes live in `src/game/shop.ts`. Rendering only shows the resulting view.

Death or Restart Run while the shop is open closes the overlay and clears shop state. Restart Run then returns to class selection; the next class choice starts an untouched fresh run: gold, class base stats, Merchant prices and purchase counts, merchant entities, and meshes.

## Monster encounters

Monsters are game entities with a stable `id`, `name`, `row`, `col`, `encounterResolved` flag, and their own `stats`. A monster attacks only from the four orthogonal tiles around it:

```text
       [ x ]
  [ x ][ o ][ x ]
       [ x ]
```

Diagonals do nothing. After each successful step, `resolveCompletedMove()` finds eligible monsters. Events are unchanged:

```ts
type CombatApproach = 'frontOn' | 'surprise';

type EncounterEvent =
  | { kind: 'combat'; approach: CombatApproach; monster: Monster }
  | { kind: 'evade'; monster: Monster };
```

- **Same lane** (in front or behind) — `{ kind: 'combat', approach: 'frontOn' }`
- **Same row, adjacent lane** — roll Evade vs that enemy’s Perception
  - chance: `clamp(player.evade − enemy.perception, 0, 85)`
  - success: `{ kind: 'evade' }` — monster is removed, no health change
  - failure: `{ kind: 'combat', approach: 'surprise' }`
  - Status includes the chance used, e.g. `Evade chance: 16.`
  - `?avoid=1` / `?avoid=0` force the outcome for tests and ignore the formula.

## Combat

Starting stats:

|            | HP | Attack | Defence | Evade / Perception |
|------------|----|--------|---------|-------------------:|
| Player     | by class (see Player classes) | by class | by class | by class (hard max 20) |
| Cave Rat   | 8  | 3      | 0       | Perception 0% |
| Crypt Guard | 12 | 4      | 1       | Perception 5% |
| Bone Brute | 20 | 6      | 1       | Perception 10% |

Each monster is spawned from `ENEMY_DEFINITIONS` and gets a fresh stats clone. Placeholder meshes differ by `renderKey` (`caveRat` small red sphere, `cryptGuard` tall blue-grey capsule, `boneBrute` larger orange block). Unique abilities and GLB models are still future work. Damage is:

```text
damage = Math.max(1, attacker.attack - defender.defence)
```

`resolveAutomaticCombat()` in `src/game/combat.ts` is a pure function. It returns an ordered log; `GameState` then applies that log.

**Front-on:** the player strikes first, then the monster, then they alternate until one reaches 0 HP. The player can take damage.

**Surprise Attack:** the player still strikes first, but the opening hit is `Math.ceil(normalDamage * 1.5)` and is marked `isSurpriseStrike`. If the monster lives, the rest of the fight is the same player-then-monster alternation. That 150% opener is the only Surprise Attack bonus for now.

A Cave Rat has 8 HP and 0 defence. Damage therefore depends on the selected class’s attack (a Ranger hit deals 6; a Mage hit deals 8). A surprise opener is `Math.ceil(normalDamage * 1.5)`.

The fight is resolved immediately in game logic. The renderer then plays each log entry for about 300 ms:

- Player hit: player lunges, monster recoils/flashes
- Monster hit: monster lunges, player recoils/flashes
- Surprise strike: a stronger gold lunge/flash
- HP text and bar update after every entry

Outcomes:

- Player wins: `You defeated the [enemy name].` If a drop rolled, a short extra sentence is appended. The enemy’s XP is awarded once. Movement unlocks after drop-spawn playback, or after any level-up choice that followed it.
- Player dies: `You were killed by the [enemy name].` No XP. Input locks and the overlay appears.
- Evade: `You slip past the [enemy name]. Evade chance: [N].` No combat, no HP change, no XP.

## Progression

XP is run-scoped. The player starts each run at **level 1** with **0 XP**. Only a combat win awards XP; evade and death do not. XP values live on `EnemyDefinition` and do not consume the generation or drop RNG streams.

| Enemy | XP |
|---|---:|
| Cave Rat | 1 |
| Crypt Guard | 2 |
| Bone Brute | 4 |

Levels use cumulative thresholds. Append more rows to `LEVEL_XP_THRESHOLDS` to extend the cap.

| Reaching level | Total XP required |
|---|---:|
| 2 | 3 |
| 3 | 7 |
| 4 | 12 |
| 5 | 18 |
| 6 | 25 |

Crossing a threshold pauses the board and opens a level-up overlay. If one fight crosses several thresholds, only the first choice is shown; the next waits until that reward is picked. Choices are not Merchant offers and cannot be bought with gold.

| Choice | Effect |
|---|---|
| Vitality | +1 max HP; current HP is unchanged. Disabled at 35. |
| Sharpened | +1 attack. Disabled at 15. |
| Armoured | +1 defence. Disabled at 10. |
| Evasive | +5 Evade, hard maximum 20. Disabled at 20 (`Evade is already at maximum (20).`). |

A capped choice is not selectable and never grants +0. The overlay stays open so another available reward can still be chosen.

After a winning fight the playback order is: combat log, enemy removal and drop spawn, XP/HUD update, then the level-up overlay after the drop animation (or immediately if nothing dropped). Board input stays locked until a reward is chosen. Restarting a run with the same class restores level, XP, pending choices, and the four combat stats to that class’s bases. Restart Run after death returns to class selection instead.

## Death and restart

On death the board stops. Distance is preserved. No further rows or encounters are generated.

The overlay shows:

- YOU DIED
- final distance
- Restart Run

Restart Run clears the prior run and returns to **Choose Your Class** without reloading the page. Selecting any class then starts a clean run: class base stats, level 1, 0 XP, 0 gold, reset Merchant prices, no pending level-ups, and rebuilt generation / drop / evade streams. The game-over overlay sits above the level-up and Merchant overlays if they would otherwise be visible.

## Intended next steps

- Equipment, skill trees, crits, and unique enemy abilities
- Use `approach: 'surprise'` for further combat advantages beyond the 150% opener
- Further evade/perception tuning and more defined level thresholds
- More shop stock or meta progression; more loot kinds
- Damaging traps, more trap kinds, doors, and authored biomes
- Environment GLBs
- Mobile optimisation (pixel-ratio toggle, cheaper materials, VFX pooling)

## License

Private prototype. Add a license before publishing.

Player Adventurers, Skeleton enemies, and shared `Rig_Medium` animations are **KayKit** by [Kay Lousberg](https://kaylousberg.com), released as [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
