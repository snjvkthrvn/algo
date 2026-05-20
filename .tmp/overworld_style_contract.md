# Overworld Style Contract — Pokemon Red / Game Boy 4-Color

Reference: **Pokemon Red/Blue (1996)** running on original Game Boy hardware (4 shades of green, 160×144 native).

Applies to all 3 production-region overworld backdrops:
- `prologue_chamber.png` → `prologue_chamber_v3.png` (2048×768 → 320×120 native)
- `array_plains_grounded_v2.png` → `array_plains_grounded_v3.png` (1920×1080 → 320×180 native)
- `twin_rivers_grounded_v2.png` → `twin_rivers_grounded_v3.png` (1920×1080 → 320×180 native)

All 3 generate at small native resolution → Phaser upscales 4× via `pixelArt:true`.

## Universal palette — APPLIES TO ALL 3 REGIONS

True Game Boy 4-color + 1 interactive accent. NO additional colors permitted.
```
#081820  darkest    (outlines, deep shadow, water depth, fence)
#346856  medium dark (stone, fence wood, deep grass, reed clumps)
#88c070  light/accent (grass tile, dominant outdoor surface)
#e0f8d0  lightest    (path light, cream, sand, sky-cream)
#06b6d4  cyan glow   (INTERACTIVE ELEMENTS ONLY — altar tops, glyphs)
```

That's it. Five hex values total. If imagegen produces any color outside this set, the asset fails the contract.

## Universal form rules — APPLY TO ALL 3 REGIONS

1. **Perspective**: Strict top-down (camera 90° straight down). NO isometric, NO 3/4 view, NO faux-depth perspective.
2. **Tile grid**: 16×16 logical-pixel tiles. Every terrain element snaps to the 16-pixel grid.
3. **Native generation resolution**: 320×180 (or 320×120 for Prologue cinematic). Will be upscaled 4× to 1280×720 game canvas.
4. **Shading philosophy**: 100% flat colors. Every pixel is one solid color. NO dithering for shading. Edge shadows = a single 1-pixel-wide line in the darkest color. NO gradients, NO airbrush, NO ambient occlusion fades.
5. **Outline rule**: Distinct map elements (trees, buildings, NPCs, altars) get a 1px-wide darker outline that snaps to the 16px grid.
6. **No baked text or UI** in the asset — labels and HUD render procedurally on top.
7. **Sparse decoration**: Pokemon Red routes were SPARSE. Few trees. Few rocks. Wide open path areas. Decoration only where it serves navigation.

## Per-region subject matter

### Prologue (Codex Sanctum / Awakening Grove) — 320×120 native (4:1.5 aspect)
A dark stone temple interior. Camera looks down at:
- Central cyan rune circle (the altar where the player wakes)
- 3-4 satellite stone platforms connected by stone-tile paths
- Surrounding void (#081820 fill) representing the unknowable outside
- Scattered cyan rune-lines etched into the stone floor
- A few crystal cluster props (1-2 max, no more)
Mood: "ancient digital temple", "first chamber the player wakes in"

Dominant color: `#346856` (medium-dark stone) with `#081820` void surround.

### Array Plains (Farm) — 320×180 native (16:9)
A daytime farm route. Top-down view of:
- Central crossroads (5-spoke radial path)
- 4 satellite puzzle stations at compass points — small altars with cyan tops
- Surrounding crop fields (rows of darker `#346856` stripes on `#88c070` grass)
- A few wooden fence segments outlining fields
- 1 barn/shed (simple rectangle with darker roof, far edge)
- 2-3 trees (simple darker green canopies)
- A small pond optional (water = `#346856`)
Mood: "Pokemon Route 1 farm version"

Dominant color: `#88c070` (grass) with `#a87b48`-equivalent — actually no, stay strict 5-color: dirt path uses `#346856` darker brown shade or stays as a 1px-wide outlined `#e0f8d0` cream path. Force 5-color discipline.

### Twin Rivers (Riverside) — 320×180 native (16:9)
A daytime water route. Top-down view of:
- Central island or stone arch over confluence
- 4 satellite docks with cyan altar tops at compass points
- Twin rivers flowing through the scene (water = `#346856` deep, `#88c070`-ish cyan only allowed on interactive altars so use `#e0f8d0` for shallow water highlights)
- Wooden bridges crossing rivers (planks pattern using `#e0f8d0` light over `#081820` dark)
- Sand/dock banks (`#e0f8d0` cream)
- Reed clumps along shore (`#346856`)
Mood: "Pokemon Route with river crossings"

Dominant color: `#88c070` (grass) and `#346856` (water).

## Absolute prohibitions

- NO smooth gradients (Pokemon Red had none)
- NO anti-aliased edges (every pixel is a hard step)
- NO drop shadows (use 1px outline instead)
- NO subpixel detail
- NO painted/airbrushed textures
- NO modern "indie pixel art" detail (Stardew Valley, Hyper Light Drifter — those are WRONG reference)
- NO mixed perspective (everything is straight top-down)
- NO NPC sprites larger than 16×16 in the overworld
- NO color count above 5 per region (4 GB greens + 1 cyan accent)
- NO additional accent colors — if you think you need a brown for dirt, use the existing GB family instead

## Self-verification ask (for codex)

After generation, report:
- Exact file dimensions (must be 320×180 or 320×120 for Prologue)
- Unique color count (must be ≤ 5)
- List the actual hex values found
- Confirm: every pixel is a hard color step (no AA, no gradient)
- Tile alignment: confirm all distinct map elements snap to 16-pixel grid
