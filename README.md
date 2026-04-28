# Algorithmia: The Path of Logic

A browser-based narrative puzzle game where players learn algorithmic thinking by solving logic challenges in a world shaped by code.

Built with **Phaser 3** · **TypeScript** · **Vite**

---

## What it is

Algorithmia is an educational RPG in the style of classic Game Boy adventures. Players explore regions of a digital world, meet NPCs who teach them programming concepts, and prove their understanding through puzzle encounters.

Each puzzle is a direct metaphor for a real algorithm or data structure. Completing a puzzle unlocks the **Concept Bridge** — a post-puzzle reflection screen that names the concept, shows its pseudocode, and lets the player forge their own understanding in a mini-challenge. Solved concepts are recorded in the **Codex**.

### Prologue — Chamber of Flow

The starting region. A void-like space of floating platforms and ancient algorithms still running in the dark.

| Encounter | Concept |
|---|---|
| **P0-1: Follow the Path** | Sequential processing — memorize and repeat a rune sequence |
| **P0-2: Flow Consoles** | Key-value mapping — match shards to consoles by shape and colour |
| **Boss: The Sentinel** | Combined recall — multi-phase sequence and pattern test |

Key characters: **Professor Node** (mentor), **Bit** (companion spark that grows as you learn), **Glitch** (rival who appears between lessons).

---

## Tech stack

| | |
|---|---|
| Runtime | Phaser 3.80 |
| Language | TypeScript 5.6 |
| Bundler | Vite 5.4 |
| Unit tests | Vitest 1.6 |
| Visual tests | Playwright 1.59 |

---

## Dev setup

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run test       # vitest watch mode
npm run test:run   # vitest single run
npm run build      # tsc + vite build → dist/
```

Visual (Playwright) tests require the dev server to be running:

```bash
npm run dev &
npm run test:visual
```

---

## Project layout

```
src/
  config/        # asset manifest, game config, constants
  core/          # AudioManager, GameStateManager, EventBus, SaveLoad, Transitions
  data/          # types, dialogue, puzzle configs, region data, codex entries
  entities/      # Player, BitCompanion, GlitchRival, NPC, InteractableObject
  input/         # keyboard menu nav, number-key commands
  prologue/      # prologue-specific: script state, flow console canon, platform bounds
  scenes/        # Phaser scenes (Boot, Menu, Prologue, puzzles, ConceptBridge, Codex)
  systems/       # DialogueSystem, HUDManager, ProgressionSystem, tilemap renderers
  ui/            # panel, dialogue box, interaction prompt, buttons
  utils/         # color helpers, math, camera utilities
public/assets/   # sprites, tilesets, environment art
tests/           # Playwright visual specs and baseline screenshots
docs/            # design docs, story script
```

---

## Architecture notes

**Progression** is flag-based. `ProgressionSystem` listens to `PUZZLE_COMPLETE` events on the `EventBus` and sets flags on `GameStateManager`. `PrologueScene` reads pending beats from `prologueScriptState` on each update tick and triggers cutscenes, gate unlocks, or Glitch encounters accordingly.

**Audio** is split: background music uses Phaser's sound system (file-based, crossfaded); SFX are procedural tones generated via the Web Audio API through `AudioManager.playTone()`. Only `prologue-bgm` requires an actual audio file — all puzzle feedback is synthesized.

**Puzzles** share a `BasePuzzleScene` that handles common layout, the completion sequence, and routing to `ConceptBridgeScene`. Each puzzle only implements its own mechanics.

**Saving** uses `localStorage` via `SaveLoadManager`. The menu's Continue option only appears when a save exists.

---

## Running tests

```bash
npm run test:run   # 129 unit tests, all passing
```

Coverage areas: GameStateManager, EventBus, SaveLoadManager, Player, NPC, InteractableObject, MenuNavigation, NumberKeyCommand, DialogueBox, InteractionPrompt, prologue region data, puzzle logic, tilemap/route renderers, prologueScriptState, sentinel rules, camera tuning, ProgressionSystem, asset manifest, flowConsoleCanon.
