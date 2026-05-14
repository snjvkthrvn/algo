# Algorithmia: The Path of Logic

A browser-based narrative puzzle game where players learn algorithmic thinking by solving logic challenges in a world shaped by code.

Built with **Phaser 3** · **TypeScript** · **Vite**

---

## What it is

Algorithmia is an educational RPG in the style of classic Game Boy adventures. Players explore regions of a digital world, meet NPCs who teach programming concepts, and prove their understanding through puzzle encounters.

Each puzzle maps to a real algorithm or data structure idea. Completing a puzzle unlocks the **Concept Bridge** — a reflection screen that names the concept and reinforces the lesson. Solved concepts are recorded in the **Codex**.

### The Journey

The game spans 9 fully playable regions, starting from the basics of sequential flow and concluding with complex dynamic programming:

- **Prologue — Chamber of Flow**: The starting region: floating platforms and “algorithms still running in the dark.” (Sequences, Mapping)
- **Array Plains**: Order & Collections (Sorting, Indexing, Hashing, Two Sum)
- **Twin Rivers**: Dual Traversal (Two Pointers, Sliding Window)
- **Hash Highlands**: Instant Knowledge (Hash Maps, Frequency, Memoization)
- **Stack Spires**: Depth & Limits (Stacks, Recursion, Backtracking)
- **Queue Canals**: Order & Fairness (Queues, BFS, Priority)
- **Tree Canopy**: Hierarchy & Balance (BSTs, DFS)
- **Graph Nexus**: Connections (Graphs, Pathfinding, Cycles)
- **The Core**: The Final Answer (Dynamic Programming, Synthesis)

Each region introduces concepts through environmental exploration, puzzle encounters with dynamic educational animations, and a culminating Boss challenge.

Key characters: **Professor Node** (mentor), **Bit** (companion that grows as you learn), **Glitch** (rival between lessons).

Full narrative script: [`docs/story/game_script.md`](docs/story/game_script.md).

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
npm run dev        # http://localhost:3000 (see vite.config.ts)
npm run test       # Vitest watch
npm run test:run   # Vitest single run
npm run test:browsers:prod  # build + production browser smoke matrix
npm run build      # tsc + vite build → dist/
```

Copy `.env.example` to `.env.local` if you use optional dev-only integrations (see below).

Playwright is configured to start or reuse the dev server (`playwright.config.ts`):

```bash
npm run test:visual
```

---

## OpenAI integration (secure setup)

Secrets must **not** use the `VITE_` prefix. In Vite, `import.meta.env.VITE_*` is inlined into the client bundle — any secret there can be read from deployed JavaScript.

**Do**

- Put `OPENAI_API_KEY` in `.env.local` (gitignored).
- Call OpenAI from the app only via the **dev-server proxy** at paths under `/api/openai/` (see `src/api/openAiProxyFetch.ts`). The proxy adds `Authorization` in Node; the key is not embedded in the bundle.

**Do not**

- Use the OpenAI client in the browser with `dangerouslyAllowBrowser: true`.
- Put API keys in any `VITE_*` variable.

**Production:** static hosting and `vite preview` do not run the dev proxy. Use a small backend or serverless function that holds `OPENAI_API_KEY` in the provider’s secret store.

---

## Project layout

```
src/
  config/        # asset keys, game config, constants
  core/          # audio, game state, events, save/load, transitions
  data/          # dialogue, puzzles, regions, codex
  entities/      # Player, companions, NPCs, interactables
  input/         # keyboard / menu navigation
  prologue/      # prologue script state, flow rules, bounds
  scenes/        # Phaser scenes (menu, prologue, puzzles, codex, …)
  systems/       # dialogue, HUD, progression, renderers
  ui/            # panels, prompts, buttons
  utils/         # helpers
public/assets/   # art and audio
tests/           # Playwright specs and reference screenshots
docs/            # story and design notes
```

---

## Architecture notes

**Progression** is flag-driven. `ProgressionSystem` reacts to puzzle completion via `EventBus`; `PrologueScene` uses `prologueScriptState` to queue cutscenes, gates, and Glitch encounters.

**Audio:** BGM uses Phaser file playback; many SFX are procedural via `AudioManager.playTone()` (Web Audio).

**Puzzles** extend `BasePuzzleScene` for shared chrome, scoring, and handoff to `ConceptBridgeScene`.

**Saving** uses `localStorage` through `SaveLoadManager`.

---

## Tests

```bash
npm run test:run
npm run test:browsers:prod
```

Vitest covers core systems, prologue data, puzzle logic, UI helpers, and related modules. Playwright covers visual/regression flows against the running game.

Deployment and browser-support runbooks live in [`docs/deployment.md`](docs/deployment.md) and [`docs/browser-support.md`](docs/browser-support.md).

---

## License

MIT — see [`LICENSE`](LICENSE).

## Privacy and credits

- [`PRIVACY.md`](PRIVACY.md) — what data the game collects (nothing leaves your browser in v1.0).
- [`CREDITS.md`](CREDITS.md) — open-source dependencies, AI tooling used during development, and visual inspirations.
