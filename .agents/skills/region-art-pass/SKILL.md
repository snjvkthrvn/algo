---
name: region-art-pass
description: |
  Run a marketing-grade art-quality pass on one or more game regions. Audits every visible asset
  for cohesion + AI tells + pixel-art purity, regenerates the weakest assets via codex+imagegen with
  reference-anchored prompts, wires the new assets into the manifest, and verifies build + tests
  green. Use when a region needs visual production polish, when the user asks to "audit the art" or
  "make the region production-ready", or when adding a new region whose art needs to cohere with
  the existing visual language. Delegates wide reads + image-batch critique to Gemini; delegates
  generation + auto-wiring to codex exec.
when_to_use: |
  - User asks to make a region "production-ready", "marketing-grade", or "screenshot-worthy"
  - Visual cohesion across regions feels broken ("doesn't look like the same game")
  - New region needs art generated + wired to match the existing visual language
  - Asset audit / regen + rewire across many files (10+ assets)
---

# Region Art Pass — Marketing-Grade Production Workflow

This skill captures the workflow used to take the first three Algorithmia regions (Prologue, Array Plains, Twin Rivers) to a marketing-grade visual production bar. It's designed to be repeatable for later regions (Hash Highlands, Stack Spires, Queue Canals, Tree Canopy, Graph Nexus, Core).

**Tools used heavily:**
- `gemini --skip-trust -m gemini-3.1-pro-preview` — text surveys + multimodal image critique (1M context, multimodal vision)
- `codex exec --skip-git-repo-check --sandbox workspace-write --cd <project>` — image generation via imagegen skill, plus auto-wiring of `assets.ts` and tests

**Tools used sparingly:**
- `Read` tool — only when about to Edit a specific file, never for image batch viewing (Gemini multimodal is faster)

---

## ⚠️ Phase 0 — Screenshot the current state FIRST (MANDATORY)

**Do this BEFORE Phase 1.** This step was added retroactively after a costly mistake: the first iteration of this skill audited and regenerated ISOLATED assets, then declared "production-ready" — but the in-context game still looked bad because the actual scenes render visuals procedurally in code (Phaser graphics primitives) and the regenerated backdrops were buried.

```bash
npm run dev &           # start dev server (background; reused by Playwright)
sleep 8                 # wait for Vite to start
npm run test:visual     # runs Playwright; screenshots land in tests/screenshots/
```

Then view representative screenshots IN-CONTEXT via `Read` tool. Critical ones to check:
- Each region's overworld with the player on it
- Each puzzle's actual playable layout
- Each NPC dialogue you've wired
- Each boss arena

**The screenshot is the source of truth, not the isolated asset.** If a region's puzzle looks bad in-context but the backdrop asset looks good in isolation, the problem is in the SCENE RENDERING CODE (e.g., `RegionBackdrop.ts`), not the asset. Don't regenerate art when code is the bug.

## Phase 1 — Inventory (Gemini text survey)

Dispatch ONE Gemini call surveying `src/config/assets.ts` to catalog every art asset for the target region(s).

```bash
gemini --skip-trust -m gemini-3.1-pro-preview -p "@src/config/assets.ts

Structured inventory of all art assets for [REGION_NAME]. Organize by:
- CHARACTERS (player, NPCs, antagonists, companions)
- ENVIRONMENT (backdrops, terrain, tiles, atmospheric layers)
- OBJECTS (interactables, puzzle props, gates, portals)
- UI (frames, panels, badges, prompts)
- PARTICLES/FX (sparks, glows, motes)

For each asset:
- Asset key (e.g. VISUAL_REVAMP_KEYS.X)
- File path
- Type (single image vs spritesheet with frameWidth/frameHeight)
- One-line description of usage

Flag:
- DUPLICATES (overlapping subject matter)
- ORPHANS (registered but unreferenced)
- MISSING (obvious gaps — NPCs without sprites, regions without tilesets)
- LEGACY (deprecated paths)
" 2>&1 | tee .tmp/audit_phase1_inventory.txt
```

**Why Phase 1 matters:** identifies GAPS (missing NPC sprites) and DUPLICATES (legacy vs current keys) before regen. The skill's later phases reference this inventory.

---

## Phase 2 — Multimodal Visual Audit (Gemini batch image critique)

**This is the load-bearing phase.** Pass every PNG path for the region in a single Gemini call. Gemini 3.1 Pro is multimodal — it can view dozens of images at once and produce cross-asset critique. Do NOT view images individually via Read tool first; that wastes wall time and context.

```bash
gemini --skip-trust -m gemini-3.1-pro-preview -p "@public/assets/visual_revamp/characters/asset1.png @public/assets/visual_revamp/regions/asset2.png [...30-60 paths...]

BRUTALLY CRITICAL VISUAL AUDIT. Standard: top-tier indie pixel art (Stardew Valley, Hollow Knight, Hyper Light Drifter, Sea of Stars, Octopath Traveler). Score harshly. Don't be generous.

For EACH asset:
1. Region + one-line description
2. Score (1-5, 5=marketing-grade):
   - PIXEL_ART_PURITY (hard edges, no AA smudges, no painterly fuzz, no AI smooth gradients)
   - PALETTE_DISCIPLINE (limited consistent palette, no muddy choices)
   - SILHOUETTE_READABILITY (identifiable at 64px thumbnail)
   - ANIMATION_COMPLETENESS (for sheets) / implied-motion (for singles)
   - AI_TELLS (5=no artifacts; 1=obvious AI: asymmetric details, hallucinated text, anatomy errors, generic anime face, smoothed gradients, weird repeats, soulless eyes)
3. ONE specific failure mode (e.g. 'left foot has 7 toes', 'palette has 4 unmotivated near-greys', 'sky gradient too smooth — reads painted')
4. Regen priority: P0 (must) / P1 (should) / P2 (could) / KEEP (don't touch)

Synthesize:
A. CROSS-REGION COHESION — do these read as one game? same pixel density? harmonious palettes? consistent character scale? puzzle backdrops vs overworld backdrops feel same-game?
B. TOP 8 P0 REGENS — the worst marketing-grade blockers
C. SURPRISES — unexpectedly GOOD assets to use as STYLE TARGETS for regens
D. THE 'AI LOOK' SCAN — where AI origin is most visible

Output structured markdown. Be specific. Quote pixel details. This drives a regen sprint.
" 2>&1 | tee .tmp/audit_phase2_visual.txt
```

**Key audit rubric Gemini uses (worth reproducing in prompt):**
1. Pixel-art purity (hard 1:1 edges, no AA)
2. Palette discipline (limited, consistent)
3. Silhouette readability at thumbnail
4. Animation completeness
5. Cross-region cohesion
6. Detail consistency (no mixed resolutions)
7. AI tells (asymmetry, hallucinated text, anatomy errors)
8. Storytelling fit (does art match script tone?)
9. Edge-pixel handling (no fringy halos)
10. Lighting consistency

---

## Phase 3 — Synthesize Critique into Regen List

From Gemini's audit, build a prioritized regen list. Use the **P0/P1/P2** ranking Gemini emits.

**Typical P0 categories:**
- Player sprite (face mush = "AI slop" tell)
- Region backdrops (painted vs pixel-art mix)
- Boss-gate or similar high-visibility objects (impossible geometry tells AI)
- UI dialogue boxes (mushy circuit-line tell)
- Missing NPCs (gaps from Phase 1 inventory)

**Gold-standard anchors usually identified:**
- Character portraits that scored well (these become STYLE TARGETS for new gens)
- Simple UI elements (cyan double-border style)
- The smallest, simplest assets (often the cleanest)

---

## Phase 4 — Generation Sprint (codex exec + imagegen)

Dispatch generations in parallel batches (3-8 at a time) as background processes. Each generation takes 1-3 minutes; parallel batching collapses ~30 generations into 30-45 min wall time instead of 90+.

### Prompt template (this is what works)

Save each prompt to `.tmp/imagegen_<asset>_prompt.txt` then invoke codex exec:

```bash
codex exec --skip-git-repo-check --sandbox workspace-write --cd "/d/algo" "$(cat .tmp/imagegen_<asset>_prompt.txt)" 2>&1 | tee .tmp/imagegen_<asset>_log.txt | tail -8
```

**Run in background** via Bash `run_in_background: true`. Track via task IDs; notifications come on completion.

### Prompt structure that consistently produces marketing-grade output

```
Use the imagegen skill to produce a new MARKETING-GRADE [asset description] for Algorithmia.
The existing [old asset] has been audited as "[quote audit failure]". Replace with deliberate
hand-pixel work.

=== STYLE ANCHOR — MATCH THIS EXACTLY ===
[Reference asset path(s) — the gold-standard from Phase 3]
[Brief explanation of what makes the anchor good]

REFERENCE IMAGES (please study):
- D:\algo\public\assets\<gold_standard_1>.png (style + pixel-density anchor)
- D:\algo\public\assets\<gold_standard_2>.png (palette/tone reference)
- D:\algo\public\assets\<old_failing_asset>.png (the BAD one to REPLACE — failures: <quoted audit text>)

=== OUTPUT FILE (EXACT) ===
- Save to: D:\algo\public\assets\<dir>\<asset>_v<N>.png
- Final image dimensions: WIDTH x HEIGHT
- Transparent background outside subject (alpha 0 only, no near-transparent halo)
- True pixel art, hard edges only

=== [DOMAIN-SPECIFIC DESIGN BRIEF] ===
[For character: per script reference, voice, props they carry, palette per region]
[For environment: composition, what's in each quadrant, perspective lock]
[For UI: 9-slice friendliness, symmetry requirement, palette]

PALETTE — TIGHTLY LIMITED:
[Sample 12-18 hex values, MAX color count specified]

=== ABSOLUTE PROHIBITIONS — these will fail the asset ===
- NO soft brush, NO airbrush, NO Gaussian-blur lighting
- NO anti-aliased edges (every pixel boundary is a hard step between two solid colors)
- NO sub-pixel rendering, NO half-pixel offsets
- NO motion blur, NO speed lines
- NO smooth color gradients — all shading via 2-3 deliberate dither tones per material
- NO color count above [N]
- NO anti-aliased outline (silhouette outline must be exactly 1 pixel wide)
[For characters: NO asymmetric features, NO hallucinated face details, NO baked text]
[For UI: NO ornate scrollwork, NO over-detailed circuitry]
[For environments: NO mixed perspective, NO painted/airbrushed textures]

=== TECHNICAL CONSTRAINTS ===
- Transparent alpha background (or OPAQUE if it's a backdrop)
- Dimensions match reference
- [If sheet: frame size + layout]
- Pixel density must match [gold-standard asset]
- Designed for [native render scale]

After saving, verify the file dimensions are exactly [W]x[H] and report:
- on-disk file size in bytes
- unique color count
- [For sheets: row/frame mirror verification]
- [For UI: symmetric corner pixel-diff count]
```

### Why this prompt structure works

1. **Names the failure** — Gemini's audit critique becomes the "what to avoid" guide for codex
2. **Reference images** — codex's imagegen anchors against existing-good assets
3. **Explicit prohibitions list** — the same AI-tell categories that the audit penalized
4. **Quantified palette/color limits** — forces deliberate pixel placement
5. **Self-verification ask** — codex reports dimensions + color count + symmetry after generation, catching prompt violations before you Read the asset
6. **Codex auto-wires `assets.ts` + `assets.test.ts`** — after generation, codex runs the build + tests itself when the asset has a clear "replace v1 with v2" path. This means many regens come back already wired and verified.

### Batching strategy

Dispatch in **batches of 3-4 parallel jobs**, not all at once. Reasons:
- Codex+imagegen may have rate limits at high parallelism
- Early results (3-4) show whether prompt template is landing; iterate before flooding more requests
- 14-17 jobs total is manageable; 30+ may queue or error

Pattern:
1. Batch 1: most visible (player sprite, primary UI) — 3 jobs
2. Batch 2: region-defining (backdrops, terrain) — 3 jobs
3. Batch 3: missing NPCs — 4-8 jobs
4. Batch 4: remaining P0 fixes — 3-4 jobs

Each batch dispatched as `run_in_background: true`. Wait for notifications. Audit each result with Read tool (multimodal Gemini is good for AUDIT, single-asset critique via Read is fine for individual confirmation).

---

## Phase 4.5 — Verify scene rendering doesn't bury your backdrops

**Critical check often skipped.** Phaser scenes can render visuals procedurally via `Graphics` primitives that draw ON TOP of (or instead of) static texture backdrops. A common failure mode in this project:

- `BasePuzzleScene.createPuzzleUI` previously had `if (getRegionBackdrop()) { skip static texture; render RegionBackdrop }` — these were MUTUALLY EXCLUSIVE.
- AP/TR puzzles returned `getRegionBackdrop()` non-null → `RegionBackdrop.buildArrayPlains()` ran → procedural cartoon windmill+barn+grass rendered → static texture (the regenerated backdrop) was never loaded.
- The fix: rewrite `createPuzzleUI` to ALWAYS render the static backdrop as base layer, layer RegionBackdrop on top for ambient MOTION ONLY (drifting dust, swaying wheat — no scenery).
- `RegionBackdrop.buildArrayPlains` was stripped from 200 lines of cartoon scenery (sky, sun, hills, windmill, barn, fence, wheat tiles) down to ~25 lines of dust motes + shimmer.

Pattern: if Playwright screenshots show your new backdrop is buried, look for procedural rendering layered ON TOP. Strip the procedural static scenery; keep only motion/particle layers.

## Phase 5 — Wire + Verify

After all generations land:

### 5a. Wire v2 path swaps

Codex auto-wires many but not all. Check `src/config/assets.ts` for any path still pointing at `_v1.png` where a `_v2.png` now exists. Edit to swap.

### 5b. Add new asset keys

For NPC sprites or other new categories Gemini's audit flagged as MISSING:

```typescript
// In VISUAL_REVAMP_KEYS:
SORTING_FARMER: 'visual-revamp-sorting-farmer',
// ...

// In VISUAL_REVAMP_IMAGE_ASSETS:
{ key: VISUAL_REVAMP_KEYS.SORTING_FARMER, path: `${VISUAL_REVAMP_BASE}/characters/sorting_farmer_v1.png` },
```

Also update `src/config/assets.test.ts` to include the new key in the deep-equality check.

### 5c. Wire art into dialogue/scene usage

For NPC portraits, hook into the speaker→portrait map in the relevant UI layer (e.g., `BasePuzzleScene.showNameItBeat` has a `NAME_IT_PORTRAIT_MAP` const). Add a line per new speaker:

```typescript
'Sorting Farmer': VISUAL_REVAMP_KEYS.SORTING_FARMER,
```

Keep the map at module scope in the UI layer, **not** on the `RoundLesson` data interface — keeps data files free of asset plumbing.

### 5d. Verify

```bash
npm run build  # TS check + Vite build
npm run test:run  # Vitest single-run
```

Expect 311+ tests passing. If a test fails, it's almost always the assets test enforcing manifest contracts — update the deep-equality assertion in `assets.test.ts` to match new keys/paths.

---

## Lessons learned (Algorithmia-specific, captured 2026-05-17)

### What worked
- **Gemini multimodal audit was the highest-leverage step.** A single Gemini call critiquing 50 PNGs in parallel gave a more coherent cross-asset critique than 50 individual Read tool views would have. Critique referenced specific pixel details ("the chains clip into each other") that proved actionable in regen prompts.
- **Quoting the audit's failure verbatim in the regen prompt.** Codex+imagegen avoided the failure when explicitly told what NOT to do.
- **Existing portraits as gold standards.** The portraits Gemini scored highly (Rune Keeper, Professor Node) became the reference anchors that brought new NPCs into stylistic coherence.
- **Codex auto-wiring.** Codex agents (when generating an asset with a clear "replace X" relationship) updated `assets.ts`, `assets.test.ts`, and ran tests on their own. Saved 5-10 minutes of manual wiring per asset.

### What to watch for
- **AI-tell #1: soft-brush glow.** This was the single most destructive cross-asset issue. Always explicitly forbid in prompt.
- **AI-tell #2: mixed perspective.** Some assets were isometric, others top-down, mid-painting. Lock perspective per region in the prompt.
- **AI-tell #3: hallucinated UI text / glyphs.** When asking for rune patterns or numerals, demand "deliberate pixel glyphs (3x5 pixels max), NOT painted numerals".
- **AI-tell #4: anatomy errors.** When generating character sheets, require face features to be "IDENTICAL across all frames" so AI doesn't drift.

### Asset path conventions in this project
- `assets/prologue_rework/` — single static images for the prologue overhaul
- `assets/prologue_sheets/` — animated spritesheets (frameWidth/frameHeight, must live under this path; enforced by test)
- `assets/visual_revamp/` — newer assets used across regions (characters, regions, puzzles, props, UI)
- `assets/array_plains/`, `assets/twin_rivers/` — older region-specific assets (some superseded by visual_revamp)

### Codex exec invocation that works in this project
```bash
codex exec --skip-git-repo-check --sandbox workspace-write --cd "/d/algo" "$(cat .tmp/<prompt>.txt)"
```
- `--skip-git-repo-check` — required for headless
- `--sandbox workspace-write` — allows writing assets + editing source files
- `--cd "/d/algo"` — root the codex agent at project root

### When NOT to use this skill
- Single asset touchup (just Read + describe to codex inline)
- Polish on already-good assets (no marketing-grade audit needed)
- Code-only changes (use Gemini for surveys, don't invoke codex+imagegen)

---

## Quick-start (for a new region)

```
1. Inventory:      gemini -p "@src/config/assets.ts <region inventory ask>" → .tmp/audit_phase1.txt
2. Visual audit:   gemini -p "@<30 asset PNGs> <brutal audit ask>" → .tmp/audit_phase2.txt
3. Build regen list from Phase 2 P0/P1/P2 verdict
4. Write codex prompts to .tmp/imagegen_*_prompt.txt (one per asset)
5. Dispatch in parallel batches of 3-4 via `codex exec ... &` in background
6. Wait for notifications; view each result via Read; mark A/B/C grade
7. Wire any unwired v2 paths in assets.ts; add new NPC keys; update assets.test.ts
8. Update NAME_IT_PORTRAIT_MAP in BasePuzzleScene for any new speakers
9. npm run build && npm run test:run
10. Done — region production-ready.
```

Expected wall time per region: **2-3 hours** (mostly waiting on parallel codex generations). Actual hands-on edit time: ~30-45 min.
