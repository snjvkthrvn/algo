# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start Vite dev server on :3000 with hot reload
npm run build         # TypeScript check + Vite production build → dist/
npm run test          # Vitest in watch mode (unit tests only)
npm run test:run      # Vitest single-run (unit tests)
npm run test:visual   # Playwright screenshot audit (requires dev server running)
```

Run a single unit test file:
```bash
npx vitest run src/core/EventBus.test.ts
```

Run a single Playwright test by title:
```bash
npx playwright test --grep "prologue region card"
```

View Playwright HTML report after a run:
```bash
npx playwright show-report
```

OpenAI proxy: add `OPENAI_API_KEY=<key>` to `.env.local` (no `VITE_` prefix — it never enters the bundle). The Vite dev server proxies `/api/openai → https://api.openai.com`. In production, that route must be hosted server-side.

## Architecture

**Algorithmia: The Path of Logic** is a Phaser 3 educational game teaching CS algorithms through 9 themed regions, each with 4 puzzles + a boss fight.

### Scene pipeline

All scenes are registered in `src/config/gameConfig.ts`. The launch order:

```
BootScene → CRTScene (overlay, always running) → MenuScene → PrologueScene
  → overworld region scenes (ArrayPlainsScene, TwinRiversScene, …)
    → puzzle scenes (P0_1_FollowThePath, P1_1_BubbleSort, …)
      → ConceptBridgeScene → back to overworld
  → EndGameScene (final conclusion after The Core)
```

`CRTScene` runs in parallel with all other scenes (Phaser scene layering) as a scanline overlay. `PauseOverlayScene` can be invoked from any playable region to access resume, settings, or return to title flows.

Puzzle scenes extend `BasePuzzleScene` (`src/scenes/puzzles/BasePuzzleScene.ts`), which provides the retro frame, hint/exit buttons, star rating, keyboard shortcuts (Esc/H/R), and the `onPuzzleComplete → ConceptBridgeScene` flow. All later regions use `ScriptedChoiceScene` which provides the shared choice puzzle shell.

### State & events

- **`gameState`** (`src/core/GameStateManager.ts`) — single source of truth singleton. Never mutate `GameState` directly; always go through its methods.
- **`eventBus`** (`src/core/EventBus.ts`) — typed pub/sub for decoupled cross-scene communication. All event name constants live in `GameEvents`.
- **`progressionSystem`** (`src/systems/ProgressionSystem.ts`) — imported once in `main.ts` to register its EventBus listener. It listens to `PUZZLE_COMPLETE` and gates unlock logic (boss gates, region unlocks, Bit evolution).
- **`saveLoadManager`** (`src/core/SaveLoadManager.ts`) — persists `GameState` to `localStorage` key `algorithmia_save_v1`.

### Region → puzzle → concept bridge flow

1. Overworld scene detects player entering a puzzle trigger zone.
2. Overworld calls `scene.start(PUZZLE_SCENE_KEY, { returnScene, puzzleData })`.
3. Puzzle scene extends `BasePuzzleScene`; calls `onPuzzleComplete(stars)` when solved.
4. `BasePuzzleScene.onPuzzleComplete` saves the result via `gameState.setPuzzleResult`, then transitions to `ConceptBridgeScene`.
5. `ConceptBridgeScene` shows 5 sections (story recap → pattern reveal → pseudocode → mini-forge → codex unlock) sourced from `src/data/dialogue/concept_bridge_content.ts`.
6. On exit, it returns to `returnScene` (the overworld).

### Visual design rules

Game Boy 4-color palette with pixel-art rendering (all assets loaded with `pixelArt: true`, `antialias: false`, `roundPixels: true`):

| Token | Hex | Role |
|---|---|---|
| `COLORS.TEXT_DARK` / `COLORS.ERROR` | `#081820` | Primary text, darkest |
| `COLORS.WARNING` | `#346856` | Medium dark |
| `COLORS.SUCCESS` / `COLORS.TEXT_MUTED` | `#88c070` | Accent, success |
| `COLORS.TEXT_LIGHT` / `COLORS.FRAME_BG` | `#e0f8d0` | Panel fill, lightest |
| `COLORS.CYAN_GLOW` | `#06b6d4` | Interactive state only |

- Cyan (`CYAN_GLOW`) is reserved for interactive highlights — don't use it for decorative fills.
- All UI panel chrome goes through `drawPanel()` (`src/ui/panel.ts`) so borders stay 1-pixel sharp.
- Positions must snap to 8-pixel grid for crisp rendering.

### Key systems

- **`JuiceSystem`** (`src/systems/JuiceSystem.ts`) — stateless particle/feedback utilities. Call from any scene: `JuiceSystem.correctBurst`, `wrongBurst`, `screenFlash`, `cameraShake`, etc.
- **`TransitionManager`** (`src/core/TransitionManager.ts`) — scene transitions: `swirl`, `fade`, `flash`, `pixelDissolve`. Use `pixelDissolve` to exit a puzzle back to overworld.
- **`HUDManager`** (`src/systems/HUDManager.ts`) — region name badge + progress display. Instantiated per overworld scene.
- **`A11yManager`** (`src/core/A11yManager.ts`) — pipes game messages to an offscreen `aria-live` region. Call `a11yManager.announce(text, assertive)` whenever showing feedback.
- **`AudioManager`** (`src/core/AudioManager.ts`) — call `audioManager.setScene(this)` in every scene's `create()` before playing sounds.

### Asset system

All asset keys and paths are declared in `src/config/assets.ts`. Assets are preloaded in `BootScene`. Use the exported key objects (`VISUAL_REVAMP_KEYS`, `PROLOGUE_REWORK_KEYS`, etc.) rather than raw strings.

### Tests

Unit tests (`src/**/*.test.ts`) run in Node via Vitest. They test pure logic (puzzle rules, state management, progression gates) — no DOM or canvas required. Visual/integration tests (`tests/prologue-visual.spec.ts`) use Playwright against the live dev server and capture screenshots to `tests/screenshots/`.

Playwright tests inject scene jumps via `window.__PHASER_GAME__.scene.start(...)` to reach deep states without replaying the full game. RAF throttling in headless Chromium means all `waitForTimeout` values use a ~1.8× multiplier over nominal game-time durations.

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the `gemini` command:

**Examples:**

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/** Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/** @tests/** Analyze test coverage for the source code"
```

**Current directory and subdirectories:**
```bash
gemini -p "@** Give me an overview of this entire project"
```

Or use the `--all_files` flag:
```bash
gemini --all_files -p "Analyze the project structure and dependencies"
```

### Implementation Verification Examples

**Check if a feature is implemented:**
```bash
gemini -p "@src/** @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
```

**Verify authentication implementation:**
```bash
gemini -p "@src/** @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
```

**Check for specific patterns:**
```bash
gemini -p "@src/** Are there any React hooks that handle WebSocket connections? List them with file paths"
```

**Verify error handling:**
```bash
gemini -p "@src/** @src/api/openAiProxyFetch.ts Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"
```

**Check for rate limiting:**
```bash
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
```

**Verify caching strategy:**
```bash
gemini -p "@src/** @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"
```

**Check for specific security measures:**
```bash
gemini -p "@src/** @src/api/openAiProxyFetch.ts Are SQL injection protections implemented? Show how user inputs are sanitized"
```

**Verify test coverage for features:**
```bash
gemini -p "@src/payment/ @tests/** Is the payment processing module fully tested? List all test cases"
```

### When to Use Gemini CLI

Use `gemini -p` when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

### Important Notes

- Paths in `@` syntax are relative to your current working directory when invoking `gemini`
- The CLI will include file contents directly in the context
- No need for `--yolo` flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Codex's context
- When checking implementations, be specific about what you're looking for to get accurate results
