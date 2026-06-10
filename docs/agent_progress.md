# Gameplay & Mechanics Audit - Progress Tracker

This document tracks the implementation of the recommended gameplay and mechanics expansions to *Algorithmia: The Path of Logic*. Other agents can use this file to pick up where the previous work left off.

## Current Goals
1. **Rival Encounters**: Introduce timed or turn-limited mechanics to boss battles against the "Glitch" character to add urgency and test algorithmic mastery under pressure.
2. **Overworld Puzzles**: Add light environmental puzzles (e.g., stepping on buttons in a specific sequence governed by a DFS traversal) to blend the overworld exploration with algorithmic themes.
3. **Cognitive Accessibility (Multi-language Pseudocode)**: Update the `ConceptBridgeScene`'s Pseudocode section to support multiple programming languages (e.g., Python, JavaScript, C++) instead of just abstract pseudocode, allowing players to map concepts to their existing knowledge.

## Progress
- [x] Initial Gameplay & Mechanics Audit completed.
- [x] Created `agent_progress.md` file for handoff.
- [x] **Multi-language Pseudocode**: Implemented in `ConceptBridgeScene.ts` and `concept_bridge_content.ts`.
- [x] **Rival Encounters**: Added a phase timer and timeout penalties to `Boss_Shuffler.ts`.
- [x] **Puzzle Upgrades**: Added scaling pressure timers to all Array Plains puzzles (`P1_1_BubbleSort`, `P1_2_BasketIndexing`, `P1_3_HashHopper`, `P1_4_TwoSum`) and the Prologue's `Boss_Sentinel`.
- [x] **Overworld Puzzles**: Added an environmental sequence puzzle to the `ArrayPlainsScene` where the player must traverse tiles in the correct index order.

## Next Steps
- All current gameplay & mechanics audit expansions are complete. Future first-three-region work must preserve the action-room puzzle bar: direct board controls, keyboard/mouse/gamepad parity, smooth object motion, imagegen-backed room art registered in `src/config/assets.ts`, and connected arena feedback through `PuzzleKinetics`/`emitPuzzleActionPulse`.
- Do not regress Prologue, Array Plains, or Twin Rivers into static choice cards. Algorithm rules should be embodied as mechanics: swaps move objects, pointers walk, windows slide, hashes route to buckets, and failures visibly rebound or misroute.

---

## Critical Full-Game Audit Run - 2026-05-06

### User Request
The current game is not meeting the intended quality bar. Run tests and audits from Prologue through The Core, be extremely critical, fix concrete issues, and keep this document as the shared handoff log for other agents.

### Operating Rules For Agents
- Do not guess from screenshots alone. Tie each fix to a failing test, a browser-visible defect, or a code-level invariant.
- Use `npm.cmd` on this Windows workspace.
- Keep `tests/prologue-visual.spec.ts` as the end-to-end route harness from menu through `Protocol Omega`.
- Record every command run here with result and any follow-up.
- Do not delete local QA capture folders unless explicitly asked. They are useful comparison artifacts.

### Current Branch And Baseline
- Branch: `audit-ui-fixes`
- Last pushed commit before this audit: `b25ffe6 feat: polish grounded regions and title resume flow`
- Local untracked artifacts at audit start: `art_sources/visual_revamp/...`, `qa_*`, `docs/puzzle-audit.md`, and this log file.

### Critical Audit Checklist
- [ ] Build and Vitest baseline.
- [ ] Full browser route baseline from Prologue to The Core.
- [ ] Browser console and page error audit during route.
- [ ] Region-by-region visual quality audit: Prologue, Array Plains, Twin Rivers, Hash Highlands, Stack Spires, Queue Canals, Tree Canopy, Graph Nexus, The Core.
- [ ] Puzzle UX audit: P0, Array Plains, later ScriptedChoiceScene-derived puzzles, final Core.
- [ ] Text fit and overlap audit.
- [ ] Save/continue/escape flow audit.
- [ ] Fix verified defects with tests or browser repro.

### Command Log
- `npm.cmd run build` - passed. Vite warning: main chunk is larger than 500 kB after minification.
- `npm.cmd run test:run` - passed: 39 test files, 200 tests. Expected stderr from `SaveLoadManager` invalid-save tests is still present.
- `git status --short --branch` - branch is clean against `origin/audit-ui-fixes` except local untracked audit/source artifacts.
- `npx.cmd playwright test tests/prologue-visual.spec.ts` - passed: 64 browser route tests in 9.6 minutes. This proves route viability, not product quality.

### Baseline Findings
- Automated route coverage is strong enough to keep the game running from Prologue to The Core.
- Passing route tests are too permissive: they mostly confirm scenes render and screenshots are captured. They do not reject shallow puzzle design, repeated layouts, weak feedback, or uninteresting later-region mechanics.
- Highest risk area is product quality, not crash stability.

---

## Educational Animations and UX - 2026-05-09

### Goal
Deepen the mechanics inside the scripted choice scenes by adding educational visualizations, particles, and animations.

### Progress
- [x] **Future Regions**: Created basic future-proof animation hooks for extensibility.
- [x] **Graph Nexus**: Added node and edge highlights along with pathfinding visualizations.
- [x] **Queue Canals**: Added FIFO flow particles and enq/deq visual feedback to reinforce order preservation.
- [x] **Tree Canopy**: Added BST insert/delete animations and depth hints to teach tree balance.
- [x] **Stack Spires**: Implemented LIFO animations, visual stack height tweening, and particles via `JuiceSystem`. Added undo reverse animations.
- [x] **UI Polish**: Resolved ChoiceButton borders and HUDManager UI elements.
