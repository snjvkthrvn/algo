# Algorithmia Production Quality Cohesion Findings

Date: 2026-04-30
Repo: `D:\algo`

## Current Pass Completed

This file began as a diagnosis. It now also records the first cohesion implementation slice so future agents do not repeat discovery.

- Added a generated title panorama to replace the plain starfield-only title read.
- Added generated prologue puzzle-room backdrops for Follow the Path and Flow Consoles.
- Replaced the generic sci-fi puzzle frame language with light GameBoy-style panels and contained toast messages in `BasePuzzleScene`.
- Added generated Array Plains encounter backdrops for Sorting Shed, Indexing Barn, Grain Hopper, Pairing Grounds, and Shuffler Domain.
- Reworked AP-1/AP-2/AP-3/AP-4/boss puzzle controls toward physical regional objects instead of generic terminal rectangles.
- Reworked Array Plains route art and collision points so the first route, puzzle stops, and return gateway align with visible map features.
- Added Twin Rivers route art, route-aligned puzzle stops, shared two-pointer choice puzzle scenes, and generated encounter backdrops for Mirror Walk, Pointer Bridge, Fixed Window Dock, Current Rider, and Mirror Serpent.
- Added Hash Highlands route art, route-aligned puzzle stops, shared hash-map choice puzzle scenes, generated encounter backdrops for Nameplate Gates, Frequency Forge, Anagram Gardens, Cache Cavern, and The Archivist.
- Added Stack Spires route art, route-aligned puzzle stops, shared stack/recursion choice puzzle scenes, generated encounter backdrops for Scroll Stack, Mirror Staircase, Maze of Forks, Tower of Memory, and The Recursion.
- Added Queue Canals route art, route-aligned puzzle stops, queue/BFS/priority/scheduling choice puzzle scenes, generated encounter backdrops for Ferry Dock, Ripple Map, Priority Dock, Scheduler Lottery, and The Reconciler.
- Added Tree Canopy route art, route-aligned puzzle stops, tree traversal/BST/DFS/balance choice puzzle scenes, generated encounter backdrops for The First Fork, Sorted Grove, The Deep Root, The Bent Bough, and The Pattern.
- Added Graph Nexus route art, route-aligned puzzle stops, graph/shortest-path/cycle/components choice puzzle scenes, generated encounter backdrops for Bridge Map, Courier Dilemma, Cycle Bazaar, Island Census, and The Echo. The Graph Nexus route was regenerated after screenshot review so the entry spawn stands on a real platform.
- Added The Core route art, route-aligned puzzle stops, dynamic-programming/final-synthesis choice puzzle scenes, generated encounter backdrops for Echo Chamber, Weighted Staircase, Grand Archive, Hall of Patterns, and Protocol Omega.
- Added `ScriptedChoiceScene` so the final four regions share one production puzzle shell while still using region-specific Bit motifs and backdrops.
- Added visual checkpoints `17` through `63` in `tests/prologue-visual.spec.ts` for every Array Plains through Core route, puzzle, and boss encounter layout.
- Fixed the shared choice-button pattern so options no longer reveal the correct answer through a different pre-click border.

Runtime assets added in this pass:

- `public/assets/visual_revamp/title/title_panorama_v1.png`
- `public/assets/visual_revamp/ui/puzzle_encounter_frame_v2.png`
- `public/assets/visual_revamp/regions/array_plains_grounded_v1.png`
- `public/assets/visual_revamp/puzzles/rune_memory_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/flow_consoles_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/sorting_shed_backdrop_v2.png`
- `public/assets/visual_revamp/puzzles/indexing_barn_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/grain_hopper_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/pairing_grounds_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/shuffler_domain_backdrop_v1.png`
- `public/assets/visual_revamp/regions/twin_rivers_grounded_v1.png`
- `public/assets/visual_revamp/puzzles/twin_mirror_walk_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/twin_pointer_bridge_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/twin_fixed_window_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/twin_variable_window_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/mirror_serpent_backdrop_v1.png`
- `public/assets/visual_revamp/regions/hash_highlands_grounded_v1.png`
- `public/assets/visual_revamp/puzzles/hash_nameplate_gates_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/hash_frequency_forge_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/hash_anagram_gardens_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/hash_cache_cavern_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/hash_archivist_backdrop_v1.png`
- `public/assets/visual_revamp/regions/stack_spires_route_v1.png`
- `public/assets/visual_revamp/puzzles/stack_scroll_stack_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/stack_mirror_staircase_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/stack_maze_of_forks_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/stack_tower_of_memory_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/stack_recursion_backdrop_v1.png`
- `public/assets/visual_revamp/regions/queue_canals_route_v1.png`
- `public/assets/visual_revamp/puzzles/queue_ferry_dock_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/queue_ripple_map_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/queue_priority_dock_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/queue_scheduler_lottery_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/queue_reconciler_backdrop_v1.png`
- `public/assets/visual_revamp/regions/tree_canopy_route_v1.png`
- `public/assets/visual_revamp/puzzles/tree_first_fork_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/tree_sorted_grove_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/tree_deep_root_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/tree_bent_bough_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/tree_pattern_backdrop_v1.png`
- `public/assets/visual_revamp/regions/graph_nexus_grounded_v1.png`
- `public/assets/visual_revamp/puzzles/graph_bridge_map_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/graph_courier_dilemma_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/graph_cycle_bazaar_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/graph_island_census_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/graph_echo_backdrop_v1.png`
- `public/assets/visual_revamp/regions/core_grounded_v1.png`
- `public/assets/visual_revamp/puzzles/core_echo_chamber_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/core_weighted_staircase_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/core_grand_archive_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/core_hall_of_patterns_backdrop_v1.png`
- `public/assets/visual_revamp/puzzles/core_protocol_omega_backdrop_v1.png`

Source/provenance copies live under `art_sources/visual_revamp/replacements/`.

## Goal

Make Algorithmia feel like one coherent indie-quality retro 2D RPG, not a set of unrelated prototype screens. The north star is the script in `docs/story/game_script.md`: Pokemon-inspired exploration, Bit as the starter-like companion, Glitch as the rival, route/gym-like regions, and puzzles that feel like lived world encounters before they become explicit algorithm lessons.

## Current Diagnosis

The game now has a cohesive production grammar across the full scripted region order. It is deployment-prep ready at the route/encounter/visual-audit level, but later production passes can still deepen moment-to-moment puzzle mechanics and story scenes.

- The script says "Pokemon Red/Blue, but algorithms." The current runtime now supports that grammar from Prologue through The Core.
- The prologue is closest to the target because it uses a walkable tile route, small sprites, scripted mentor/rival beats, and a readable camera scale.
- Array Plains, Twin Rivers, Hash Highlands, Stack Spires, Queue Canals, Tree Canopy, Graph Nexus, and The Core now use region-specific route art and encounter-room backdrops. Their walkable lanes and puzzle stops are visible enough for screenshot-scale play.
- The old dark crystalline puzzle frame is no longer the dominant puzzle language. `BasePuzzleScene` now defaults to light GameBoy-style panels with contained messages and region backdrops.
- Bit is visible in the choice scenes through region-specific motifs: queue, cache, stack, tree, graph, and core lattice. A future pass should push Bit from "indicator" toward a true teaching companion with reactions and state changes.
- Queue Canals, Tree Canopy, Graph Nexus, and The Core are no longer scenic placeholders. They have generated route art, encounter gates, progression locks, puzzle/boss scenes, and visual checkpoints.

## Script Source Of Truth

`docs/story/game_script.md` defines the intended build order and emotional grammar:

1. Prologue / Chamber of Flow - waking, Professor Node, Watcher warning, sequence puzzle, mapping puzzle, Sentinel boss.
2. Array Plains - arrays, bubble sort, indexing, hashing, Two Sum, Shuffler boss.
3. Twin Rivers - two pointers, convergence, fixed sliding window, variable window, Mirror Serpent boss.
4. Hash Highlands - hash maps, frequency counting, anagrams, memoization, Archivist boss.
5. Stack Spires - stacks, recursion, backtracking, depth, Recursion boss.
6. Queue Canals - queues, BFS, priority queues, scheduling, Reconciler boss.
7. Tree Canopy - tree traversal, BSTs, DFS, balance, Pattern boss.
8. Graph Nexus - graph basics, shortest path, cycle detection, components, Echo boss.
9. The Core - dynamic programming and final synthesis, Protocol Omega, three endings.

The important pattern is FEEL -> NAME. The player should perform and understand the behavior in the world first. The algorithm name should land after the lived interaction, usually through the Concept Bridge or Codex.

## Production Quality Bar

Every region should pass these checks:

- At screenshot scale, it immediately reads as a top-down retro RPG route, not a background painting.
- Walkable paths are visible from the art itself. Collision lanes should align with obvious roads, bridges, rows, docks, stairs, or platforms.
- The player, Bit, NPCs, portals, props, labels, panels, and puzzle UI share one pixel-art scale and one palette family.
- Region puzzles use local materials. Array Plains should use crates, tiles, crop rows, baskets, hoppers, and field markers. Twin Rivers should use banks, bridges, boats, nets, current gates, and paired markers.
- Puzzle scenes should feel like focused "encounter arenas" from the same world, not detached terminal overlays.
- UI chrome should use the existing GameBoy-like panel language in `.impeccable.md`: light panel fill, dark frame, integer pixel borders, limited palette, no glassy sci-fi dashboard look.
- Bit must visibly teach. Each puzzle needs a small Bit hint/react state, not only text hints.

## Highest Impact Fixes

1. Replace the puzzle backdrop/frame.
   - Current asset: `public/assets/prologue_rework/ui/puzzle_chamber_frame.png`.
   - Status: implemented as `public/assets/visual_revamp/ui/puzzle_encounter_frame_v2.png` plus per-region generated encounter backdrops.

2. Make Array Plains feel walkable and game-like.
   - Current files: `src/scenes/ArrayPlainsScene.ts`, `src/data/regions/arrayPlains.ts`, `public/assets/visual_revamp/regions/legacy/array_plains.png`.
   - Status: implemented as `public/assets/visual_revamp/regions/array_plains_grounded_v1.png` with matching route rects and puzzle stops.

3. Bring puzzle UI into the same visual language.
   - Current files: `src/scenes/puzzles/BasePuzzleScene.ts`, `src/scenes/puzzles/P1_1_BubbleSort.ts`, `P1_2_BasketIndexing.ts`, `P1_3_HashHopper.ts`, `P1_4_TwoSum.ts`, `Boss_Shuffler.ts`.
   - Status: implemented from Prologue through The Core. The last four regions use `ScriptedChoiceScene` to keep the puzzle shell consistent.

4. Use imagegen for project-bound raster assets, then copy final files into `public/assets/...`.
   - Never reference assets only from `C:\Users\kathi\.codex\generated_images`.
   - Keep `art_sources/visual_revamp/...` as source/provenance and wire runtime assets through `src/config/assets.ts`.

## Immediate Implementation Direction

The current production slice covers the title, prologue puzzle rooms, Array Plains, Twin Rivers, Hash Highlands, Stack Spires, Queue Canals, Tree Canopy, Graph Nexus, and The Core. Next agents should continue from this grammar instead of restarting:

1. Deepen mechanics inside the scripted choice scenes only when there is a specific gameplay target; do not replace the whole shell casually. *(Update 2026-05-09: Significant progress made here with educational animations added to Stack Spires, Queue Canals, Tree Canopy, and Graph Nexus).*
2. Add story/NPC beats for Queue Canals through The Core if the next production pass focuses on narrative continuity.
3. Keep every new or revised region tied to visible collision lanes and a browser screenshot checkpoint.
4. Add deeper interactive tests only when a puzzle gains state beyond simple choice rounds.

Do not add more scenic region backgrounds without matching collision/readability work. The art must explain where the player can walk.

## Useful Current Files

- `docs/story/game_script.md` - canonical game script and region order.
- `.impeccable.md` - visual direction: GameBoy-mythic, focused, literate.
- `src/config/assets.ts` - asset manifest for all runtime images.
- `src/scenes/prologue/PrologueScene.ts` - closest current scene to the desired RPG feel.
- `src/scenes/ArrayPlainsScene.ts` - first non-prologue region and best production slice target.
- `src/scenes/TwinRiversScene.ts` - second production route with region-specific puzzle stops.
- `src/scenes/FutureRegionScene.ts` - shared future-region shell; now supports configured encounter stops, boss locks, and next-region gates for all later regions.
- `src/scenes/puzzles/ScriptedChoiceScene.ts` - shared choice puzzle shell for Queue Canals, Tree Canopy, Graph Nexus, and The Core.
- `src/scenes/puzzles/StackSpiresChoiceScenes.ts` - current stack/recursion encounter pattern.
- `src/scenes/puzzles/BasePuzzleScene.ts` - shared puzzle chrome that needs the biggest cohesion fix.
- `src/scenes/puzzles/TwinRiversChoiceScenes.ts` - current two-pointer encounter pattern.
- `src/scenes/puzzles/HashHighlandsChoiceScenes.ts` - current hash-map encounter pattern.
- `src/scenes/puzzles/QueueCanalsChoiceScenes.ts` - queue/BFS/priority/scheduling encounter scenes.
- `src/scenes/puzzles/TreeCanopyChoiceScenes.ts` - tree traversal/BST/DFS/balance encounter scenes.
- `src/scenes/puzzles/GraphNexusChoiceScenes.ts` - graph/shortest-path/cycle/components encounter scenes.
- `src/scenes/puzzles/CoreChoiceScenes.ts` - dynamic-programming/final-synthesis encounter scenes.
- `tests/prologue-visual.spec.ts` - visual audit harness and screenshot path.
- `tests/screenshots/17-ap1-sorting-shed-layout.png` through `tests/screenshots/63-protocol-omega-layout.png` - current evidence for the production region pass.

## Asset Prompt Direction

Use built-in `imagegen` by default. Generate project-bound assets, inspect them, then move/copy final picks into the workspace.

Shared style constraints for new assets:

- Top-down 2D pixel-art RPG, Pokemon GBA/NDS inspired but original.
- Tile-readable, gameplay-first, clear walkable paths.
- Limited palette, crisp edges, no text, no watermark.
- Do not make the asset a modern sci-fi dashboard.
- Match 1280x720 or 1920x720 runtime composition depending on scene use.

Completed prompt set:

1. Queue Canals route backdrop: top-down pixel RPG canal city, visible dock lanes, first-in ferry queue, BFS locks, priority harbor, scheduler board, boss canal gate, no embedded labels.
2. Queue puzzle encounter backdrops: FIFO ferry dock, BFS wave lock chamber, priority quay, scheduling office, Reconciler boss arena.
3. Tree Canopy route and encounters: binary forks, sorted grove, deep root, bent bough, Pattern arena.
4. Graph Nexus route and encounters: bridge map, weighted courier routes, cycle bazaar, island census, Echo arena. The route was regenerated once to fix left-entry spawn readability.
5. The Core route and encounters: echo chamber, weighted staircase, grand archive, hall of patterns, Protocol Omega arena.
6. Keep prompts gameplay-first: visible walkable routes, clear arenas, no readable text baked into the image, no modern sci-fi dashboard.

## Definition Of Done For The Next Agent

- A new findings/goal doc exists at this file path.
- Weak raster assets are replaced or versioned, not left only in the Codex generated-image cache.
- Puzzle UI no longer looks like a separate sci-fi terminal product through The Core.
- Array Plains through The Core and their puzzle/boss screenshots look like the same game.
- `npm.cmd run build` passes.
- `npm.cmd run test:run` passes.
- A visual screenshot pass produces current evidence for menu, prologue puzzles, Array Plains, Twin Rivers, Hash Highlands, Stack Spires, Queue Canals, Tree Canopy, Graph Nexus, The Core, and their encounter scenes.

## Latest Verification

- Focused new-region unit pass: `npm.cmd run test:run -- src/data/puzzles/queueCanalsPuzzleLogic.test.ts src/data/puzzles/treeCanopyPuzzleLogic.test.ts src/data/puzzles/graphNexusPuzzleLogic.test.ts src/data/puzzles/corePuzzleLogic.test.ts src/data/regions/futureRegions.test.ts src/config/constants.test.ts` passed: 6 files, 23 tests.
- Full unit pass: `npm.cmd run test:run` passed: 36 files, 185 tests.
- `npm.cmd run build` passed; Vite reports the existing large bundle warning.
- Focused new-region screenshot pass: `npx.cmd playwright test tests/prologue-visual.spec.ts --grep "40 -|...|63 -" --reporter=list --workers=1` passed: 24 visual checkpoints.
- Focused Graph Nexus spawn correction: `npx.cmd playwright test tests/prologue-visual.spec.ts --grep "52 - Graph Nexus" --reporter=list --workers=1` passed after regenerating `graph_nexus_route_v1.png`.
- Full visual pass: `npx.cmd playwright test tests/prologue-visual.spec.ts --reporter=list --workers=1` passed: 63 visual checkpoints.
