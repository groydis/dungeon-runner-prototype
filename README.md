# Dungeon Runner

A mobile-first, tile-based dungeon roguelite prototype. The playfield is a three-lane “highway” seen from a slightly elevated 3D view. You are not free to roam: every turn you choose one of three tiles immediately ahead, then the board scrolls forward one row.

This repository is a working visual skeleton, not a complete game. It is built with **Vite**, **TypeScript**, and **Three.js** (no React).

## Game concept

You start in the centre lane at the near end of the board. Tapping a highlighted tile steps you into that lane and advances the dungeon by exactly one row. The player stays visually near the bottom of the screen; the world scrolls toward the camera.

Rows ahead can hold monsters, loot, hazards, doors, shops, and later biome decoration. In this prototype:

- Floor tiles are simple dark stone boxes.
- The player is a green capsule.
- A single red Cave Rat sits a few rows ahead in the centre lane.
- A monster can attack from the four cardinal tiles around it, not from diagonals.
- Same lane (in front or behind) = a normal front-on fight.
- Adjacent lane (same row) = a 50/50 chance to slip past, or a Surprise Attack fight.
- Combat is automatic and plays in place. There is no battle screen.

The intended target is mobile browsers and thin native wrappers, so the prototype favours simple geometry, a recycled mesh pool, touch-first input, and a capped pixel ratio.

## Current prototype scope

Included:

- A 3-column grid with about 8 visible rows
- Click / tap selection via raycasting
- Smooth lane-change, hop, and board-scroll animation
- Row recycling: the row that leaves the screen is reused as the new far row
- A demo Cave Rat a few rows ahead in the centre lane
- Cardinal-plus encounters: front-on fight, evade, or Surprise Attack
- Automatic combat with a short playback of each hit
- HUD with distance, HP text/bar, and status
- Death overlay and in-place Restart Run
- Responsive full-screen layout for phone and desktop

Not included:

- Equipment, levelling, crits, healing, or enemy variety
- Loot, traps, doors, shops
- Procedural biomes or authored encounter tables
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
- `/?fatal=1` — demo Cave Rat hits hard enough to kill, for death/restart testing

## Controls

There is no keyboard movement and no combat input.

- **Tap or click** one of the three glowing tiles in the next row.
- Left tile = forward-left, centre = forward, right = forward-right.
- Input is locked during the step animation and while combat or evade feedback plays.
- After death, use **Restart Run**. The page does not reload.

Selection uses pointer events and a Three.js raycaster against invisible hit planes on the highlighted tiles, so the same path works for mouse and touch.

## Project structure

```text
src/
  main.ts                 Entry point: canvas + game loop bootstrap
  game/
    Game.ts               Orchestration, animation, HUD, restart
    GameState.ts          Turn state, health, monsters, row generation
    Grid.ts               Logical 3-wide sliding tile window
    Tile.ts               Cell coordinates + content type
    Monster.ts            Monster entity plus independent combat stats
    Player.ts             Logical lane / row and player stats
    Combatant.ts          Combat stat types and starting values
    combat.ts             Pure automatic-combat resolver and log
    encounters.ts         Cardinal-plus rules and avoidance rolls
    InputController.ts    Pointer + raycast picking
    config.ts             Shared grid and timing constants
  rendering/
    SceneManager.ts       Scene, lights, recycled row meshes, hit FX
    CameraController.ts   Elevated follow camera
  styles/
    main.css              Full-viewport HUD and game-over overlay
public/                   Static assets
```

Game rules live under `src/game`. Meshes, cameras, and materials live under `src/rendering`. Rendering plays combat-log entries; it does not calculate damage or decide winners.

## Tile and grid model

Each board cell is a logical `Tile`:

- `row` — world row index. `0` is the starting row; values increase as the dungeon extends forward.
- `col` — lane index: `0` left, `1` centre, `2` right.
- `content.type` — `empty` | `monster` | `loot` | `trap` | `door` | `shop` | `decoration`.

`Grid` stores rows in a map and creates them on demand through a factory. After each step it prunes rows more than a couple of indexes behind the player so a long run does not grow forever.

The player’s legal destinations are always the three tiles at `player.row + 1`. That rule stays in `GameState`, not in the scene graph.

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
3. When the animation finishes, `GameState.commitMove()` increments row, lane, and distance, then generates the next far row.
4. `SceneManager` rebinds only the row that just left the bottom of the screen and assigns it to the new far index. Other row meshes keep their logical rows.
5. The player mesh stays in the lower part of the frame; the camera is mostly static, with a small nudge on each step.

The demo Cave Rat is authored at row `4`, centre lane (`col 1`). Later, the tile factory in `GameState` is the place to plug in biome tables, encounter weights, and decoration.

## Monster encounters

Monsters are game entities with a stable `id`, `name`, `row`, `col`, `encounterResolved` flag, and their own `stats`. A monster attacks only from the four orthogonal tiles around it:

```text
       [ x ]
  [ x ][ o ][ x ]
       [ x ]
```

Diagonals do nothing. After each successful step, `resolveMonsterEncountersAfterMove()` finds eligible monsters. Events are unchanged:

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

|        | HP | Attack | Defence |
|--------|----|--------|---------|
| Player | 20 | 5      | 1       |
| Cave Rat | 8 | 3      | 0       |

Each Cave Rat gets a fresh stats object. Damage is:

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

- Player wins: `You defeated the Cave Rat.` Movement unlocks.
- Player dies: `You were killed by the Cave Rat.` Input locks and the overlay appears.
- Evade: `You slip past the Cave Rat.` No combat, no HP change.

## Death and restart

On death the board stops. Distance is preserved. No further rows or encounters are generated.

The overlay shows:

- YOU DIED
- final distance
- Restart Run

Restart Run resets player stats, position, distance, monsters, grid, meshes, and status without reloading the page.

## Intended next steps

- Equipment, levelling, crits, healing, and more enemy types
- Use `approach: 'surprise'` for further combat advantages beyond the 150% opener
- Smarter avoidance than a flat 50/50
- Loot, traps, doors, shops
- Procedural biomes
- GLB models
- Mobile optimisation (pixel-ratio toggle, cheaper materials, VFX pooling)

## License

Private prototype. Add a license before publishing.
