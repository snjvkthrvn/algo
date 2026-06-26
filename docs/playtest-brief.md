# Playtest Brief — Algorithmia: The Path of Logic

> **Status (2026-06-26):** This brief describes the **current build**, which still
> has features [`VISION.md`](VISION.md) plans to cut — the post-puzzle ConceptBridge
> lecture and the puzzle live-preview side panel. Revise this brief after the VISION
> rebuild lands. Before sending to testers, fill the `<insert ...>` placeholders
> (deployed URL and feedback address) below.

Thank you for playtesting. The goal is to find anything that confuses, frustrates, breaks, or feels off **before** the public release. Honest negative feedback is more valuable than polite praise.

**Time commitment:** 30-45 minutes for the golden path, longer if you want to explore the beta regions.

**What you need:**

- A desktop or laptop browser (Chrome, Firefox, Safari, or Edge — current versions)
- A physical keyboard (the game is keyboard-first)
- Audio on, if possible

---

## Setup

1. Open the playtest URL: **`<insert deployed URL>`**
2. Wait for the title screen to assemble.
3. If you see a "DESKTOP RECOMMENDED" splash, you're on too small a screen — try a laptop or larger.

---

## The golden path (production scope)

Walk through these three regions in order. After each region, jot a note about what felt good and what felt off.

### Act 1 — Prologue: Chamber of Flow

1. From the title screen, pick **NEW GAME**.
2. Watch the boot cinematic. Note: does the "BOOTING WORLD" transition feel cinematic or sluggish?
3. Talk to **Professor Node** (the first NPC). Walk through the dialogue.
4. Find the **Rune Keeper** to the northwest. Solve the rune puzzle (P0_1 — Follow the Path).
5. Find the **Console Keeper** to the northeast. Solve the shard-matching puzzle (P0_2 — Flow Consoles).
   - **Glitch encounter:** A purple character appears mid-puzzle. Read the dialogue.
6. Pass through the boss gate. Defeat the **Sentinel**.
7. Walk through each post-puzzle **Concept Bridge**. Try pressing `[1]`, `[2]`, `[3]`, or `[4]` to answer the Mini-Forge question with the keyboard.

### Act 2 — Array Plains

1. After the Prologue, you arrive in Array Plains. Talk to the **Village Elder** near your spawn.
2. The Elder mentions "four farmers." Walk east; you'll see the four farmer NPCs near their respective puzzle shrines.
3. Talk to each farmer first, then enter their shrine:
   - **Sorting Farmer → Bubble Sort (AP_1)**
   - **Basket Keeper → Basket Indexing (AP_2)**
   - **Crop Sorter → Grain Hopper (AP_3)**
   - **Tile Worker → Pairing Grounds (AP_4)**
4. **Glitch returns:** After defeating the Sentinel, Glitch reappears in Array Plains — walk into them in the field to trigger the cameo.
5. With all four farmers helped, the **Shuffler Domain** opens at the east end. Enter and defeat the boss.
6. The **Twin Rivers gateway** unlocks. Cross.

### Act 3 — Twin Rivers

1. Talk to the **River Guide**.
2. Walk the **outside-in pointer sequence** on the index tiles (0 → 3 → 1 → 2).
3. Solve the four river trials:
   - **Mirror Walk (TR_1)** — keyboard-driven, uses `[SPACE]` to swap, `[D]` to move L, `[J]` to move R
   - **Pointer Bridge (TR_2)**
   - **Fixed Window Dock (TR_3)**
   - **Current Rider (TR_4)**
4. Challenge the **Mirror Serpent** boss.
5. After defeat, the **closure beat** should fire automatically: camera pans, cyan rings burst, River Guide gives a closing speech, "Thanks for playing this demo" appears.
6. Cross east to the **Hash Highlands gateway**. The **beta warning** modal appears the first time. Read it.

---

## What to watch for

### Onboarding (first 5 minutes)

- [ ] Did the prologue teach you the movement keys before you needed them?
- [ ] Did you understand `[SPACE]` was the interact key without being told twice?
- [ ] Did you discover `[ESC]` for pause and `[C]` for the Codex on your own?
- [ ] Did the first dialogue make you want to explore?
- [ ] Did the **live-preview side panel** (right side of each puzzle) help you?

### Puzzle clarity

- [ ] Was it always clear what the puzzle was asking?
- [ ] Did the hints (`[H]`) actually teach the concept, or just give the answer?
- [ ] Did you get stuck? Where? For how long?
- [ ] Did the Mini-Forge questions feel meaningful or rote?

### ConceptBridge (after each puzzle)

- [ ] Did the 6 sections read as a single arc or feel disconnected?
- [ ] Was the **Real-World Usage** section interesting? Surprising?
- [ ] Did you press `[1]`-`[4]` to answer the Mini-Forge, or did you only click?
- [ ] Did anything feel like a chore?

### Pacing

- [ ] At any point did the game feel too slow? Where?
- [ ] At any point did it feel too fast — like you missed something?
- [ ] Did the transitions between regions feel cinematic or cheap?

### Bugs / breaks

- [ ] Any visual glitch you couldn't explain? (Misaligned UI, text overflow, sprite in the wrong place)
- [ ] Any place you got stuck and had to refresh?
- [ ] Did saving + reloading bring you back to the right spot?
- [ ] Any audio that played at the wrong time or didn't play when it should?

### Tone

- [ ] Did the dialogue sound like real characters, or like a textbook?
- [ ] Were Bit and Glitch likable? Memorable?
- [ ] Did the **Village Elder** feel different from the **Rune Keeper** and **Console Keeper**? (They should — different voices.)
- [ ] Anything that sounded "wrong" for a game vs. a course?

### The closure beat

- [ ] Did the Twin Rivers ending feel like a real ending, or a placeholder?
- [ ] Was the "thanks for playing the demo" line the right call, or jarring?
- [ ] Did you want to go into the beta regions? Why or why not?

---

## After the golden path

If you have energy, try one or two of these:

- **Beta regions:** Walk past the gate. The world should keep working but expect rough edges. Stop and email/text me if anything crashes.
- **Replay a puzzle:** Go back through a shrine you've already cleared. Does the puzzle still work? Does the Concept Bridge feel different on second exposure?
- **The Codex (press `C`):** Browse the unlocked entries. Use `[UP]` / `[DOWN]` to switch between entries. Did the content match the puzzles you solved?
- **Start a New Game with a save present:** does the overwrite confirm make sense?

---

## Feedback questions

Please answer these in writing — even one-line answers are gold.

1. **What did the game do best?**

2. **What was the most frustrating moment?** (Be specific — which puzzle, which line, which transition?)

3. **What confused you the longest?** (Onboarding gap? Puzzle ambiguity? Visual cue?)

4. **What surprised you positively?** (A line, a transition, a puzzle moment)

5. **Did you learn anything?** (Even one concept — name it.)

6. **Would you recommend this to a friend learning CS?** Yes / no / depends. Why?

7. **At what point did you almost quit?** (If never, that's also useful — note when you considered it.)

8. **Anything that made you laugh, gasp, or smile?**

9. **Bugs encountered:** (List with reproduction steps if possible)

10. **One change that would have made the experience meaningfully better:**

---

## Reporting back

Please send your notes to **`<insert email or feedback form URL>`**. Screenshots and screen recordings are extra-helpful but not required.

Thank you. This kind of feedback is the difference between shipping something good and shipping something great.
