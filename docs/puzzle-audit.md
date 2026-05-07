# Puzzle Overhaul Audit (2026-05-06)

**Goal of overhaul:** Make every puzzle feel production-ready: smooth animations, rich juice/feedback, consistent high-quality retro UI, active "play" feel rather than passive clicking, clear learning moments, delightful success/failure states. Match the new exploration smoothness (buffered steps, camera, scale 0.25, juice on land).

## All Puzzles Inventory

| Region | Puzzle ID / Scene | Type | Current State & Pain Points | Proposed Production Polish |
|--------|-------------------|------|-----------------------------|----------------------------|
| Prologue | P0_1_FollowThePath | Interactive (click path) | Basic path selection, minimal feedback | Staggered rune highlights, live step preview, satisfying click pop + tone, success path glow animation |
| Prologue | P0_2_FlowConsoles | Interactive (console select) | Console clicking, some animation | Live data flow viz on correct choice, particle on select, better failure state |
| Prologue | Boss_Sentinel | Choice + fusion | Scripted choices | Add phase transition animations, live shard fusion viz |
| Array Plains | P1_1_BubbleSort | Interactive (tile swap) | Good tile swap, timer | Add compare highlight, live pass visualization, step counter with juice, better time-out scramble anim |
| Array Plains | P1_2_BasketIndexing | Choice | Basic 4-choice | Live array index highlight on hover, animated selection, result explanation with code snippet pop |
| Array Plains | P1_3_HashHopper | Choice | Basic | Hash bucket viz with collision animation |
| Array Plains | P1_4_TwoSum | Choice | Basic | Live pair highlight on selection |
| Array Plains | Boss_Shuffler | Choice | Basic | Shuffle animation preview, multi-phase with juice |
| Twin Rivers | P2_1_MirrorWalk / P2_2_PointerBridge / P2_3_FixedWindowDock / P2_4_CurrentRider + Boss | Mostly ScriptedChoiceScene | Passive 4-choice with some dialogue | Make choices "live": hover shows mirror reflection / pointer movement / window state change in a side panel, animated selection with step-through |
| Hash Highlands | P3_* + Boss | Choice | Same | Frequency forge: animated bar fill on choice, anagram gardens: letter pop-in |
| Stack Spires | P4_* + Boss | Choice | Recursion heavy | Visual call stack build on choice, mirror staircase tween |
| Queue Canals | P5_* + Boss | Choice | Queue / priority | Ferry / harbor animation, scheduler lottery with weighted balls |
| Tree Canopy | P6_* + Boss | Choice | BST / DFS | Root-to-leaf path highlight, balance animation |
| Graph Nexus | P7_* + Boss | Choice | Graph algos | Live edge highlight, shortest path viz |
| Core | P8_* + Boss_ProtocolOmega | Choice + final | Echo chamber etc. | Grand archive book opening, pattern hall live matching |

**Key Patterns to Overhaul:**
- Most regions use `ScriptedChoiceScene` or `*ChoiceScenes` → these need a major UI/animation lift (hover previews, live viz, better typography/alignment, staggered reveals).
- Interactive ones (P0-1, P0-2, P1-1, P0-2) are stronger but need more juice and state viz.
- BasePuzzleScene frame + controls are solid but can be more animated (scanlines already there, add corner glow, success banner tween, etc.).
- No consistent "step simulator" or "live execution" feel across puzzles.
- Success = stars + codex, but the moment of success can be more celebratory (gold rain already exists, wire it everywhere).
- Failure needs better "try again" juice without feeling punishing.

**Next:** Use this audit to drive detailed per-puzzle tasks in the implementation plan. Start with BasePuzzleScene enhancements (Task 1), then choice base, then per-region interactive lifts.

**Production Ready Definition (for this overhaul):**
- Every interaction has tweened feedback (scale, glow, particles via JuiceSystem).
- No raw clicks without visual response < 50ms.
- Consistent 8px grid, retro fonts, COLORS tokens only.
- Clear "what just happened" + "why it matters" on every answer.
- Entrance/Exit animations feel intentional (not abrupt).
- All puzzles pass visual regression at high quality.

---

*Audit complete. Ready to implement.*