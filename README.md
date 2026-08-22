# Dungeon Runner

A mobile-first, tile-based dungeon roguelite prototype. The playfield is a three-lane “highway” seen from a slightly elevated 3D view. You are not free to roam: every turn you advance exactly one row, and you may shift at most one lane sideways.

This repository is a working visual skeleton, not a complete game. It is built with **Vite**, **TypeScript**, and **Three.js** (no React).

## Game concept

You start in the centre lane at the near end of the board. Tapping a highlighted tile steps you into that lane and advances the dungeon by exactly one row. The player stays visually near the bottom of the screen; the world scrolls toward the camera.

Rows ahead can hold monsters, loot, hazards, doors, shops, and later biome decoration. In this prototype:

- Floor tiles are simple dark stone boxes.
- The player is a green capsule.
- Rows can contain empty lanes, Cave Rats, Crypt Guards, Bone Brutes, gold, or health potions.
- A monster can attack from the four cardinal tiles around it, not from diagonals.
- Same lane (in front or behind) = a normal front-on fight.
- Adjacent lane (same row) = a 50/50 chance to slip past, or a Surprise Attack fight.
- Combat is automatic and plays in place. There is no battle screen.
- Gold can be spent at a rare Travelling Merchant for run-only upgrades.
- The loop is: choose a lane, fight or evade, collect gold or potions, spend gold at a Merchant, survive.

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
- Cardinal-plus encounters: front-on fight, evade, or Surprise Attack
- Automatic combat with a short playback of each hit
- HUD with distance, gold, attack, HP text/bar, and status
- A rare Travelling Merchant shop overlay
- Death overlay and in-place Restart Run
- Responsive full-screen layout for phone and desktop

Not included:

- Equipment, levelling, crits, unique enemy abilities, or an inventory screen
- Traps, doors, random shop stock, or meta progression
- Authored biomes beyond the current weights
- GLB characters or environment art
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

- `/?avoid=1` — always evade a side pass
- `/?avoid=0` — always Surprise Attack combat on a side pass
- `/?fatal=1` — testing override: Cave Rat **attack** is raised on top of `ENEMY_DEFINITIONS`, enough to kill the player
- `/?seed=123` — seeded row generation, including Merchant lanes and enemy-type picks; Restart Run replays the same content sequence

## Controls

There is no keyboard movement and no combat input.

- **Tap or click** a glowing tile in the next row. You always advance exactly one row.
- You may move at most one lane sideways per step:
  - Left lane → left or centre
  - Centre lane → left, centre, or right
  - Right lane → centre or right
- A two-lane jump (left ↔ right) is illegal. Tiles occupied by enemies are also illegal.
- Only legal destinations glow and can be tapped.
- Input is locked during the step animation, while combat or evade feedback plays, and while a Merchant shop is open.
- After death, use **Restart Run**. The page does not reload.

Selection uses pointer events and a Three.js raycaster against invisible hit planes on the highlighted tiles, so the same path works for mouse and touch.

## Project structure

```text
src/
  main.ts                 Entry point: canvas + game loop bootstrap
  game/
    Game.ts               Animation, input, and view/render orchestration
    GameState.ts          Single-run aggregate and turn resolution
    Grid.ts               Logical 3-wide sliding tile window
    Tile.ts               Cell coordinates + content type
    Monster.ts            Run-specific enemy instance
    Collectible.ts        Gold and potion entities
    Merchant.ts           Shop entity, used/purchased state
    shop.ts               Offers, eligibility, gold spend, and shop views
    Player.ts             Position, gold, and run-scoped combat stats
    Combatant.ts          Combat stat types and player starting values
    combat.ts             Pure automatic-combat resolver and log
    encounters.ts         Cardinal-plus rules and avoidance rolls
    rowGeneration.ts      Weighted row recipes and safety rules
    random.ts             Seeded RNG for generation only
    InputController.ts    Pointer + raycast picking
    config.ts             Shared grid and timing constants
    definitions/
      enemies.ts          Authoritative enemy names, base stats, render keys
      encounterPools.ts   Distance-based enemy-type weights
  ui/
    HudView.ts            Distance, gold, attack, HP, status
    GameOverView.ts       Death overlay and Restart Run
    ShopOverlayView.ts    Merchant overlay
  rendering/
    SceneManager.ts       Scene, lights, recycled row meshes, hit FX
    CameraController.ts   Elevated follow camera
  styles/
    main.css              Full-viewport HUD, shop, and game-over overlays
public/                   Static assets
```

## Architecture

This is a hybrid OOP / data-driven layout, not an ECS or event-bus design.

- **GameState** is the single-run aggregate. It owns grid, entities, shop session, and rule flags (`runOver`, status, distance). Entity maps stay private. Invalid actions such as moving after death, while a shop is open, or into a bad lane are rejected. High-level methods: `resolveCompletedMove()`, `buyShopOffer()`, `createCombatResult()`, `finishCombat()`, `getHudSnapshot()`.
- **Game.ts** owns animation and input-lock state. It tells `SceneManager` whether destination tiles are interactive. It does not store that flag on `GameState`.
- **Domain objects** (`Player`, `Monster`, `Collectible`, `Merchant`) own their own state transitions: movement, gold, healing, damage, collection, and Merchant purchases.
- **Pure rule modules** (`combat.ts`, `encounters.ts`, `rowGeneration.ts`, `shop.ts`) stay function-based. Combat still resolves immediately into an ordered log; `GameState` applies that log one entry at a time so playback can update HP per hit.
- **UI views** under `src/ui` update HTML only. They render `ShopView` / HUD snapshots and do not import Three.js or mutate `GameState` internals.
- **SceneManager** remains rendering-only. It receives `{ interactive }` from `Game.ts` and does not read animation flags from `GameState`.
- **Enemy definitions** in `src/game/definitions/enemies.ts` are the only source of enemy type, display name, base stats, and render key. Row recipes include `enemyType`. Distance pools in `encounterPools.ts` choose that type. `?fatal=1` is a test override of Cave Rat attack only.

Game rules stay under `src/game`. Meshes, cameras, and materials stay under `src/rendering`.

## Tests

```bash
npm test
npm run test:watch
```

Unit tests cover combat, encounters, seeded row generation, player gold/healing, Merchant purchases, enemy definitions, distance pools, and `resolveCompletedMove()` validity/order. They use injected RNG, avoidance rolls, and stat factories. They do not exercise WebGL or browser animation.

`build` type-checks with `tsc --noEmit`, then bundles with Vite.

## Tile and grid model

Each board cell is a logical `Tile`:

- `row` — world row index. `0` is the starting row; values increase as the dungeon extends forward.
- `col` — lane index: `0` left, `1` centre, `2` right.
- `content.type` — `empty` | `monster` | `gold` | `potion` | `shop` | plus unused future types.

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
4. Collect eligible cardinal-plus encounters (combat is not played back here)

A tile never holds loot, a shop, and a monster together. Shop rows are otherwise empty, so a Merchant and a fight cannot share a step. If both a pickup and an encounter happen in one step (loot in one lane, rat beside it), the pickup is applied first; an encounter then overwrites the status line.

## Procedural row content

`src/game/rowGeneration.ts` builds a 3-lane recipe. Rendering only shows whatever the recipe produced.

Safety guarantees:

- Rows `0..3` are empty. The first three moves are therefore safe.
- Row `4` always has the demo Cave Rat in the centre lane so front-on and side-pass combat stay easy to test.
- Merchant rows never appear in `0..4`.
- From row `5` onward, each row is rolled from early prototype weights unless a Merchant is due:
  - 45% all empty
  - 25% one monster
  - 15% one gold
  - 10% one potion
  - 5% one monster + one loot item (gold or potion, 50/50)
- The monster on a monster or monster-plus-loot row is then chosen from the distance pool:
  - Rows `5–19`: 100% Cave Rat
  - Rows `20–39`: 75% Cave Rat, 25% Crypt Guard
  - Rows `40+`: 50% Cave Rat, 35% Crypt Guard, 15% Bone Brute
- All three enemies use the same encounter and combat rules. Only stats and placeholder look differ.
- Every generated row has at least one empty lane. There is never a three-wide monster wall.
- At most one monster and at most one collectible per row.
- Two entities never share a tile.

Merchant rows override those weights on a fixed cadence (`SHOP_ROW_INTERVAL = 14`):

- First shop at row `14`, then every 14 rows: `28`, `42`, `56`, …
- Exactly one Merchant in a randomly chosen lane; the other two lanes are empty
- No monster, gold, potion, or other content on that row

`?seed=<number>` seeds **row generation only** (Mulberry32), including Merchant lanes and enemy-type rolls. Combat, avoidance, and `Math.random` elsewhere are unchanged. Without `?seed`, generation uses `Math.random`. Restart Run rebuilds the RNG from the same seed, so `?seed=123` always replays the same row sequence, Merchant lanes, and enemy types.

Gold and potions:

- Gold starts at `0`. Landing on gold adds `1` and removes the item: `You found 1 gold.`
- A potion heals `4` HP, capped at max HP, and is consumed even at full health.
  - Heal: `You drink a potion and restore [N] HP.`
  - Full: `You find a potion, but are already at full health.`
- Pickup meshes pop/fade in place and do not block extra input time. Recycled row meshes reset so collected items cannot reappear.

## Travelling Merchant

Landing on a Merchant tile pauses the run and opens a centred shop overlay. The shop is not consumed just by opening it. Board input stays locked until **Leave**.

Each Merchant may be used once. After Leave, the Merchant is marked used and removed from the board. Movement then continues from that tile. Returning in normal forward play is impossible; leftover state still treats a used Merchant as empty.

Opening the shop does not spend gold. Offers are fixed for this prototype and last only for the current run:

| Offer | Cost | Effect |
|---|---:|---|
| Field dressing | 1 gold | Restore 5 HP, capped at maximum HP |
| Sharpen weapon | 3 gold | +1 player attack for the rest of this run |
| Leave | 0 gold | Close the shop and continue |

Rules:

- Purchase buttons disable when the player cannot afford the offer, already bought it at this Merchant, or field dressing would heal 0 HP (already at full health).
- A successful purchase deducts gold and applies the effect immediately. The overlay stays open so the other offer can still be bought.
- Field dressing never takes gold for zero healing.
- Attack upgrades persist until Restart Run, which restores base attack (`5`).
- Shop costs, eligibility, and stat changes live in `src/game/shop.ts`. Rendering only shows the resulting view.

Death or Restart Run while the shop is open closes the overlay and clears shop state. Restart Run restores an untouched fresh run: gold, purchases, attack upgrades, merchant entities, and meshes.

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
- **Same row, adjacent lane** — one 50/50 roll
  - success: `{ kind: 'evade' }` — monster is removed, no health change
  - failure: `{ kind: 'combat', approach: 'surprise' }`

## Combat

Starting stats:

|            | HP | Attack | Defence |
|------------|----|--------|---------|
| Player     | 20 | 5      | 1       |
| Cave Rat   | 8  | 3      | 0       |
| Crypt Guard | 12 | 4      | 1       |
| Bone Brute | 20 | 6      | 1       |

Each monster is spawned from `ENEMY_DEFINITIONS` and gets a fresh stats clone. Placeholder meshes differ by `renderKey` (`caveRat` small red sphere, `cryptGuard` tall blue-grey capsule, `boneBrute` larger orange block). Unique abilities and GLB models are still future work. Damage is:

```text
damage = Math.max(1, attacker.attack - defender.defence)
```

`resolveAutomaticCombat()` in `src/game/combat.ts` is a pure function. It returns an ordered log; `GameState` then applies that log.

**Front-on:** the player strikes first, then the monster, then they alternate until one reaches 0 HP. The player can take damage.

**Surprise Attack:** the player still strikes first, but the opening hit is `Math.ceil(normalDamage * 1.5)` and is marked `isSurpriseStrike`. If the monster lives, the rest of the fight is the same player-then-monster alternation. That 150% opener is the only Surprise Attack bonus for now.

A Cave Rat has 8 HP and 0 defence, so a normal player hit deals 5 and a surprise opener deals 8. A front-on rat usually gets one counterattack (2 damage) before dying. A surprise opener kills it immediately.

The fight is resolved immediately in game logic. The renderer then plays each log entry for about 300 ms:

- Player hit: player lunges, monster recoils/flashes
- Monster hit: monster lunges, player recoils/flashes
- Surprise strike: a stronger gold lunge/flash
- HP text and bar update after every entry

Outcomes:

- Player wins: `You defeated the [enemy name].` Movement unlocks.
- Player dies: `You were killed by the [enemy name].` Input locks and the overlay appears.
- Evade: `You slip past the [enemy name].` No combat, no HP change.

## Death and restart

On death the board stops. Distance is preserved. No further rows or encounters are generated.

The overlay shows:

- YOU DIED
- final distance
- Restart Run

Restart Run resets player stats (including attack), gold, position, distance, monsters, collectibles, merchants, open shop state, generation RNG, grid, meshes, and status without reloading the page. The game-over overlay sits above the Merchant overlay if both would otherwise be visible.

## Intended next steps

- Equipment, levelling, crits, and unique enemy abilities
- Use `approach: 'surprise'` for further combat advantages beyond the 150% opener
- Smarter avoidance than a flat 50/50
- More shop stock, defence upgrades, or meta progression; more loot kinds
- Traps, doors, and authored biomes
- GLB models
- Mobile optimisation (pixel-ratio toggle, cheaper materials, VFX pooling)

## License

Private prototype. Add a license before publishing.
