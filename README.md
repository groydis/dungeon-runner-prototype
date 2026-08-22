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
- Adjacent lane (same row) = a 50/50 chance to slip past, or a future Surprise Attack fight.
- Combat math and the Surprise Attack bonus are not implemented yet; the HUD reports the outcome.

The intended target is mobile browsers and thin native wrappers, so the prototype favours simple geometry, a recycled mesh pool, touch-first input, and a capped pixel ratio.

## Current prototype scope

Included:

- A 3-column grid with about 8 visible rows
- Click / tap selection via raycasting
- Smooth lane-change, hop, and board-scroll animation
- Row recycling: the row that leaves the screen is reused as the new far row
- A demo Cave Rat a few rows ahead in the centre lane
- Cardinal-plus encounters: front-on fight, evade, or Surprise Attack context
- A minimal HUD (title, distance, instruction, encounter line)
- Responsive full-screen layout for phone and desktop

Not included:

- Combat math, stats, loot, traps, doors, shops
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

To force the adjacent-lane pass result while testing, open `/?avoid=1` (always evade) or `/?avoid=0` (always Surprise Attack combat).

## Controls

There is no keyboard movement.

- **Tap or click** one of the three glowing tiles in the next row.
- Left tile = forward-left, centre = forward, right = forward-right.
- Input is locked for the duration of the step animation and any encounter feedback.

Selection uses pointer events and a Three.js raycaster against invisible hit planes on the highlighted tiles, so the same path works for mouse and touch.

## Project structure

```text
src/
  main.ts                 Entry point: canvas + game loop bootstrap
  game/
    Game.ts               Orchestration, animation, HUD
    GameState.ts          Turn state, monster entities, row generation
    Grid.ts               Logical 3-wide sliding tile window
    Tile.ts               Cell coordinates + content type
    Monster.ts            Stable monster entity (id, name, row, col, resolved)
    encounters.ts         Cardinal-plus encounter rules and injectable avoidance rolls
    Player.ts             Logical lane / row position
    InputController.ts    Pointer + raycast picking
    config.ts             Shared grid and timing constants
  rendering/
    SceneManager.ts       Scene, lights, recycled row meshes
    CameraController.ts   Elevated follow camera
  styles/
    main.css              Full-viewport + safe-area HUD
public/                   Static assets
```

Game rules live under `src/game`. Meshes, cameras, and materials live under `src/rendering`. Rendering code reads tile content and encounter *events* in order to show placeholders and short feedback; it does not decide combat, avoidance, or movement legality.

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

Monsters are game entities with a stable `id`, `name`, `row`, `col`, and `encounterResolved` flag. They sit on a world row ahead of the player. A monster attacks only from the four orthogonal tiles around it:

```text
       [ x ]
  [ x ][ o ][ x ]
       [ x ]
```

Diagonals do not engage. `GameState.resolveMonsterEncountersAfterMove()` runs after each successful step and resolves each eligible monster exactly once.

Encounter events carry the context future combat will need:

```ts
type CombatApproach = 'frontOn' | 'surprise';

type EncounterEvent =
  | { kind: 'combat'; approach: CombatApproach; monster: Monster }
  | { kind: 'evade'; monster: Monster };
```

- **Same lane** (tile in front of or behind the monster) — `{ kind: 'combat', approach: 'frontOn' }`. This is a normal fight. HUD: `A Cave Rat blocks your path! Combat will resolve here later.`
- **Same row, adjacent lane** — one 50/50 avoidance roll (`rollAvoidance()`).
  - Success: `{ kind: 'evade' }`. HUD: `You slip past the Cave Rat.`
  - Failure: `{ kind: 'combat', approach: 'surprise' }`. The player chose to go around and still entered a fight, so later combat should grant a Surprise Attack advantage. HUD: `You catch the Cave Rat off guard! Surprise attack — combat will resolve here later.`

In every case the monster is marked resolved and removed from its tile so it cannot roll again. Combat stats and the actual Surprise Attack bonus are **not implemented yet**; the event only preserves the approach.

To test the two pass outcomes without relying on luck, append a query string (no on-screen debug UI):

- `http://localhost:5173/?avoid=1` — always evade
- `http://localhost:5173/?avoid=0` — always Surprise Attack combat

A straight walk down the centre lane puts you on the tile in front of the Cave Rat (distance 3) and starts a fight. Restart and walk a side lane until you come alongside it to exercise the pass roll.

## Intended next steps

- **Combat resolution** — replace the HUD hook with turn-resolution combat. Use `approach: 'surprise'` to grant the player a Surprise Attack bonus; `frontOn` is a normal fight.
- **Smarter avoidance** — replace the flat 50/50 with stealth / awareness versus monster detection.
- **Stats** — HP, attack, armour, and a compact mobile sheet that does not fight the 3D view.
- **Loot** — gold, consumables, and item tiles that can appear in generated rows.
- **Procedural biomes** — replace the empty-row factory with themed tables (crypt, cavern, ruins) that pick monsters, traps, doors, shops, and dressing.
- **GLB models** — swap the capsule / sphere / box placeholders for lightweight mobile-friendly meshes, still driven by the same tile content types.
- **Mobile optimisation** — bake lights or use cheaper materials, atlas textures, object pooling for VFX, and a settings toggle for pixel ratio / effects.

## License

Private prototype. Add a license before publishing.
