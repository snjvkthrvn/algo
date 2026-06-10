# Algorithmia — North Star (2026-06-09)

This document records the game's true vision, elicited explicitly after 3-4 months of
build drift. **When any other document, audit, test, or existing code conflicts with
this file, this file wins.** The script (`docs/story/game_script.md`) remains narrative
canon; this file governs what kind of game gets built around it.

## The game in one sentence

Pokemon Red/Blue's structure, Stardew Valley's visual warmth, Zelda-shrine puzzle depth —
a world that *is* data structures, where you feel every algorithm before anyone names it.

## Binding decisions

### 1. Scope: three regions, nothing else
Prologue, Array Plains, and Twin Rivers are the entire production game. Regions 4-9 stay
beta-gated behind the Twin Rivers portal. No production effort goes past Twin Rivers.

### 2. Core loop: a living world AND great puzzle rooms
Both halves matter and neither substitutes for the other:
- **The overworld is a place you play, not travel.** Full rebuild of the three regions:
  real tile-based maps with multiple routes, secrets, optional micro-encounters, NPCs that
  move and react (not `type: 'sign'` text dispensers), and traversal unlocks tied to
  mastered algorithms (the script's HM parallel — sorting fixes bridges, hashing opens
  keyed doors). The corridor `ROUTE_RECTS` overworlds are what's being replaced.
- **Every puzzle is an embodied action room** at the rebuilt-Prologue (`arcadePrologue`)
  standard: you move a character in a space and the algorithm happens through your body.
  No framed UI minigames, no choice cards, no HINT/EXIT button chrome in production scope.

### 3. Teaching: radical FEEL → NAME
The script's hardest rule is law: *the player never reads about an algorithm before
experiencing it.*
- **Cut** the mandatory post-puzzle ConceptBridge lecture (five tabs + quiz).
- **Cut** pre-puzzle concept lectures from keepers. Keepers set the scene and the stakes;
  they do not explain the mechanic.
- After a solve: a character names what you just did in one or two lines, Bit demos it,
  the Codex updates silently. That's the whole bridge.

### 4. Two audiences, world-first layering
- The never-coded beginner wins every on-screen conflict: **the playable game never shows
  code.** Wonder is the product.
- The CS student / interview-prepper is served by an **optional, genuinely deep Codex**:
  real pattern names, pseudocode, complexity, LeetCode mapping — opened by choice, never
  forced, never homework.

### 5. Visual anchor: Stardew Valley, alone
Every screenshot is measured against one question: *could this be mistaken for a Stardew
Valley region?* Warm, dense, hand-crafted pixel scenes full of ambient life. The four
confirmed wounds this anchors against:
1. **Nothing coheres** — AI backdrops, procedural sprites, and UI panels currently read as
   three different games. One art direction, enforced everywhere.
2. **Unreadable at a glance** — walkable space, interactive objects, and goals must be
   instantly legible from the art itself.
3. **Looks like a web app** — panels, buttons, and toasts must melt into diegetic
   presentation. If it could be a website widget, it's wrong.
4. **Dead and stiff** — idle life everywhere: wind, animals, NPC motion, Bit behavior,
   weighty interactions. A paused screenshot should still look alive.

### 6. Tone: serene wonder
The opening register is curiosity and warmth, not pressure. Pressure timers bolted onto
Array Plains puzzles conflict with this and get revisited. Urgency belongs to bosses,
escalating late — not to first contact with a concept.

## What survives the rebuild

- `docs/story/game_script.md` — the script was always right; the build drifted, not the vision.
- Core systems: `GameStateManager`, `EventBus`, `ProgressionSystem`, `SaveLoadManager`,
  `AudioManager`, `A11yManager`.
- The `arcadePrologue` componentized architecture — it is the puzzle pattern, not the exception.
- The imagegen asset pipeline and `src/config/assets.ts` manifest discipline.
- The Playwright visual harness (its checkpoints will need rebuilding alongside scenes).

## Why this document exists

Three months of sessions each optimized a measurable local bar — "juice", "cohesion",
"production-ready" — because that bar was written down and the vision wasn't. Audits dated
before 2026-06-09 (`puzzle-audit.md`, `production_quality_cohesion_findings.md`,
`agent_progress.md`) are historical record, not direction. Check new work against this
file first.
