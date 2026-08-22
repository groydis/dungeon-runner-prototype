# KayKit asset manifest

All assets in this manifest come from **The Complete KayKit Collection v6.1**
by Kay Lousberg and are released under **CC0 1.0**. Attribution is optional;
the project credits KayKit in the main README. Original `.blend` files remain in
the purchased source library and are never copied into this repository.

Source paths below are relative to the collection root. Blender exports were
made with Blender 5.2 LTS as self-contained GLBs, with referenced PNG textures
embedded and without Draco or KTX compression.

## Characters

| Target under `public/models/` | Exact source | Operation | Runtime status |
|---|---|---|---|
| `players/kaykit/Rogue_Hooded.glb` | `KayKit Adventurers 2.0/Characters/gltf/Rogue_Hooded.glb` | Supplied GLB | Active `rogue` |
| `players/kaykit/Ranger.glb` | `KayKit Adventurers 2.0/Characters/gltf/Ranger.glb` | Supplied GLB | Active `ranger` |
| `players/kaykit/Mage.glb` | `KayKit Adventurers 2.0/Characters/gltf/Mage.glb` | Supplied GLB | Active `mage` |
| `players/kaykit/Knight.glb` | `KayKit Adventurers 2.0/Characters/gltf/Knight.glb` | Supplied GLB | Active `knight` |
| `players/kaykit/Barbarian.glb` | `KayKit Adventurers 2.0/Characters/gltf/Barbarian.glb` | Supplied GLB | Active `barbarian` |
| `players/kaykit/Rogue.glb` | `KayKit Adventurers 2.0/Characters/gltf/Rogue.glb` | Supplied GLB | Reserved unhooded variant |
| `players/kaykit/Druid.glb` | `KayKit Adventurers 2.0/Characters/gltf/Druid.glb` | Supplied GLB | Reserved future class |
| `players/kaykit/Engineer.glb` | `KayKit Adventurers 2.0/Characters/gltf/Engineer.glb` | Supplied GLB | Reserved future class |

## Enemies

The active Skeleton files were already project-local exports when this manifest
was introduced. They retain the KayKit meshes and compatible `Rig_Medium` rig,
but differ byte-for-byte from the pack's supplied GLBs.

| Target under `public/models/` | Exact KayKit source lineage | Runtime status |
|---|---|---|
| `enemies/kaykit/Skeleton_Minion.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Minion.blend` and `characters/gltf/Skeleton_Minion.glb` | Active `caveRat` stand-in |
| `enemies/kaykit/Skeleton_Rogue.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Rogue.blend` and `characters/gltf/Skeleton_Rogue.glb` | Active `cryptGuard` |
| `enemies/kaykit/Skeleton_Warrior.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Warrior.blend` and `characters/gltf/Skeleton_Warrior.glb` | Active `boneBrute` |
| `enemies/kaykit/Skeleton_Mage.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Mage.blend` and `characters/gltf/Skeleton_Mage.glb` | Reserved future enemy |
| `enemies/kaykit/Necromancer.glb` | `KayKit Skeletons 1.1/characters/gltf/Necromancer.glb` | Reserved supplied GLB |

## Rig_Medium animation bundles

Every target is copied from the same filename under
`KayKit Character Animations 1.1/Animations/gltf/Rig_Medium/`.

| Target filename | Runtime status |
|---|---|
| `Rig_Medium_General.glb` | Active: idle, hit, death |
| `Rig_Medium_MovementBasic.glb` | Active: walking |
| `Rig_Medium_CombatMelee.glb` | Active: 1H, 2H, unarmed attacks |
| `Rig_Medium_Special.glb` | Active: skeleton idle, walk, death |
| `Rig_Medium_CombatRanged.glb` | Reserved: bow and magic |
| `Rig_Medium_MovementAdvanced.glb` | Reserved |
| `Rig_Medium_Simulation.glb` | Reserved |
| `Rig_Medium_Tools.glb` | Reserved |

All targets live under `players/kaykit/animations/`. The duplicate legacy copies
formerly under `enemies/kaykit/animations/` were removed.

## Equipment

Each target below was exported from
`KayKit Adventurers 2.0/Assets/gltf/<name>.gltf` plus its referenced `.bin` and
class texture. The common editable source is
`KayKit Adventurers 2.0/SOURCE/Adventurers_Accessories.blend`.

| Target under `players/kaykit/weapons/` | Runtime status |
|---|---|
| `dagger.glb` | Active Rogue right hand |
| `bow_withString.glb` | Active Ranger right hand |
| `staff.glb` | Active Mage right hand |
| `sword_1handed.glb` | Active Knight right hand |
| `shield_badge.glb` | Active Knight left hand |
| `axe_2handed.glb` | Active Barbarian right hand |
| `arrow_bow.glb` | Reserved |
| `arrow_bow_bundle.glb` | Reserved |
| `arrow_crossbow.glb` | Reserved |
| `arrow_crossbow_bundle.glb` | Reserved |
| `axe_1handed.glb` | Reserved |
| `bow.glb` | Reserved |
| `crossbow_1handed.glb` | Reserved |
| `crossbow_2handed.glb` | Reserved |
| `druid_staff.glb` | Reserved Druid equipment |
| `engineer_Wrench.glb` | Reserved Engineer equipment |
| `quiver.glb` | Reserved; current Ranger model has an integrated quiver |
| `shield_badge_color.glb` | Reserved |
| `shield_round.glb` | Reserved |
| `shield_round_barbarian.glb` | Reserved |
| `shield_round_color.glb` | Reserved |
| `shield_spikes.glb` | Reserved |
| `shield_spikes_color.glb` | Reserved |
| `shield_square.glb` | Reserved |
| `shield_square_color.glb` | Reserved |
| `smokebomb.glb` | Reserved |
| `spellbook_closed.glb` | Reserved |
| `spellbook_open.glb` | Reserved |
| `sword_2handed.glb` | Reserved |
| `sword_2handed_color.glb` | Reserved |
| `wand.glb` | Reserved |

## Dungeon environment

Each target was exported from the matching `.gltf` and `.bin` under
`KayKit Dungeon Pack 1.1/Assets/gltf/`, embedding `dungeon_texture.png`. The
editable source remains
`KayKit Dungeon Pack 1.1/Source/Dungeon_Asset_Pack_1.1_Source.blend`.

| Target under `environment/kaykit/dungeon/` | Runtime status |
|---|---|
| `floor_tile_small.glb` | Active base floor |
| `floor_tile_small_broken_A.glb` | Active deterministic variant |
| `floor_tile_small_broken_B.glb` | Active deterministic variant |
