# KayKit asset manifest

All assets in this manifest come from **The Complete KayKit Collection v6.1**
by Kay Lousberg and are released under **CC0 1.0**. Attribution is optional;
the project credits KayKit in the main README. Original `.blend` files remain in
the purchased source library and are never copied into this repository.

Source paths below are relative to the collection root. Where Blender export was
needed, Blender 5.2 LTS produced self-contained GLBs with referenced PNG textures
embedded. The Dungeon wall and torch files were packaged directly from KayKit's
supplied glTF, BIN, and PNG files without changing their geometry or materials.
No target uses Draco or KTX compression.

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

## Enemies

The active Skeleton files were already project-local exports when this manifest
was introduced. They retain the KayKit meshes and compatible `Rig_Medium` rig,
but differ byte-for-byte from the pack's supplied GLBs.

| Target under `public/models/` | Exact KayKit source lineage | Runtime status |
|---|---|---|
| `enemies/kaykit/Skeleton_Minion.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Minion.blend` and `characters/gltf/Skeleton_Minion.glb` | Active `skeletonMinion` |
| `enemies/kaykit/Skeleton_Rogue.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Rogue.blend` and `characters/gltf/Skeleton_Rogue.glb` | Active `cryptGuard` |
| `enemies/kaykit/Skeleton_Warrior.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Warrior.blend` and `characters/gltf/Skeleton_Warrior.glb` | Active `boneBrute` |
| `enemies/kaykit/Skeleton_Mage.glb` | `KayKit Skeletons 1.1/SOURCE/Skeleton_Mage.blend` and `characters/gltf/Skeleton_Mage.glb` | Active normal ranged enemy |
| `enemies/kaykit/Necromancer.glb` | `KayKit Skeletons 1.1/characters/gltf/Necromancer.glb` | Active late-game elite |

## Rig_Medium animation bundles

Every target is copied from the same filename under
`KayKit Character Animations 1.1/Animations/gltf/Rig_Medium/`.

| Target filename | Runtime status |
|---|---|
| `Rig_Medium_General.glb` | Active: idle, hit, death, pickup, use item |
| `Rig_Medium_MovementBasic.glb` | Active: walking |
| `Rig_Medium_CombatMelee.glb` | Active: varied 1H, 2H, unarmed attacks and Knight block |
| `Rig_Medium_Special.glb` | Active: skeleton idle, walk, death, spawn, taunt, resurrection |
| `Rig_Medium_CombatRanged.glb` | Active lazy load: Ranger, Mage, Skeleton Mage, Necromancer |
| `Rig_Medium_MovementAdvanced.glb` | Reserved |
| `Rig_Medium_Simulation.glb` | Reserved |

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
| `arrow_bow.glb` | Active pooled Ranger bow projectile |
| `arrow_bow_bundle.glb` | Reserved |
| `arrow_crossbow.glb` | Active pooled Ranger crossbow projectile |
| `arrow_crossbow_bundle.glb` | Reserved |
| `axe_1handed.glb` | Active Rogue Sharpened tier |
| `bow.glb` | Reserved |
| `crossbow_1handed.glb` | Active Ranger Sharpened tier 1 |
| `crossbow_2handed.glb` | Active Ranger Sharpened tier 2+ |
| `druid_staff.glb` | Reserved Druid equipment |
| `quiver.glb` | Reserved; current Ranger model has an integrated quiver |
| `shield_badge_color.glb` | Active Knight Armoured tier |
| `shield_round.glb` | Active Knight Armoured tier |
| `shield_round_barbarian.glb` | Active Knight Armoured tier |
| `shield_round_color.glb` | Active Knight Armoured tier |
| `shield_spikes.glb` | Active Knight Armoured tier |
| `shield_spikes_color.glb` | Active Knight Armoured tier |
| `shield_square.glb` | Active Knight Armoured tier |
| `shield_square_color.glb` | Active Knight Armoured tier |
| `spellbook_closed.glb` | Active Mage Sharpened tier 1 |
| `spellbook_open.glb` | Active Mage Sharpened tier 2+ |
| `sword_2handed.glb` | Active Barbarian Sharpened tier 1 |
| `sword_2handed_color.glb` | Active Barbarian Sharpened tier 2+ |
| `wand.glb` | Active Mage Sharpened tier 1+ |

## Collectibles

Each potion target was exported from the matching `.gltf` and `.bin` under
`KayKit Adventurers 2.0/Assets/gltf/`, embedding the referenced
`druid_texture.png`. The editable source remains in the purchased KayKit
library.

| Target under `items/kaykit/` | Runtime status |
|---|---|
| `potion_small_red.glb` | Active pooled health pickup |
| `potion_medium_red.glb` | Reserved future healing tier; not loaded |
| `potion_large_red.glb` | Reserved future healing tier; not loaded |

## Deliberately not retained

The runtime copies of `Engineer.glb`, `engineer_Wrench.glb`, `smokebomb.glb`,
and `Rig_Medium_Tools.glb` were removed by project selection. Their original
KayKit source assets remain unchanged in the Complete Collection.

## Dungeon environment

Each target came from the matching `.gltf` and `.bin` under
`KayKit Dungeon Pack 1.1/Assets/gltf/`, embedding `dungeon_texture.png`. Floor
and trap targets were exported through Blender; wall and torch targets were
losslessly packaged into GLB because their supplied transforms and hierarchy
were already suitable. The editable source remains
`KayKit Dungeon Pack 1.1/Source/Dungeon_Asset_Pack_1.1_Source.blend`.

| Target under `environment/kaykit/dungeon/` | Exact KayKit source | Operation | Runtime status |
|---|---|---|---|
| `floor_tile_large.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_tile_large.gltf` | Blender export; embedded texture | Active geometric base floor, scaled to one logical cell |
| `floor_wood_large.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_wood_large.gltf` | Blender export; embedded texture | Active Merchant/safe-tile floor |
| `floor_tile_big_spikes.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_tile_big_spikes.gltf` | Blender export; embedded texture and preserved `spikes` node | Active Alarm/Trip floor; its separate `spikes` node is animated at runtime |
| `floor_tile_small.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_tile_small.gltf` | Blender export; embedded texture | Retained previous base-floor export; not loaded by the current runtime |
| `floor_tile_small_broken_A.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_tile_small_broken_A.gltf` | Blender export; embedded texture | Retained previous broken-floor export; not loaded by the current runtime |
| `floor_tile_small_broken_B.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/floor_tile_small_broken_B.gltf` | Blender export; embedded texture | Retained previous broken-floor export; not loaded by the current runtime |
| `walls/wall.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall.gltf` | Direct GLB packaging; embedded texture | Active common side-wall section |
| `walls/wall_cracked.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_cracked.gltf` | Direct GLB packaging; embedded texture | Active uncommon damaged section |
| `walls/wall_window_closed.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_window_closed.gltf` | Direct GLB packaging; embedded texture | Active uncommon closed-window section |
| `walls/wall_gated.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_gated.gltf` | Direct GLB packaging; embedded texture | Active rare barred section |
| `walls/wall_archedwindow_gated.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_archedwindow_gated.gltf` | Direct GLB packaging; embedded texture | Active rare arched barred section |
| `walls/wall_shelves.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_shelves.gltf` | Direct GLB packaging; embedded texture | Active rare decorative shelf section |
| `walls/wall_inset.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_inset.gltf` | Direct GLB packaging; embedded texture | Active rare inset section |
| `walls/wall_scaffold.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_scaffold.gltf` | Direct GLB packaging; embedded texture | Active rare scaffold section |
| `walls/wall_window_closed_scaffold.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_window_closed_scaffold.gltf` | Direct GLB packaging; embedded texture | Active rare window/scaffold section |
| `walls/wall_open_scaffold.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/wall_open_scaffold.gltf` | Direct GLB packaging; embedded texture | Reserved future doorway/frame; not registered or loaded |
| `props/torch_mounted.glb` | `KayKit Dungeon Pack 1.1/Assets/gltf/torch_mounted.gltf` | Direct GLB packaging; embedded texture | Active mount every seven rows, alternating sides; runtime adds a pooled emissive glow and shadowless warm point light |
