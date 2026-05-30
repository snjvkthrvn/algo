import { describe, expect, it } from 'vitest';
import {
  IMAGE_ASSETS,
  BOOT_IMAGE_ASSETS,
  BOOT_SPRITE_ASSETS,
  PROLOGUE_SCENE_IMAGE_ASSETS,
  PROLOGUE_SCENE_SPRITE_ASSETS,
  OVERWORLD_PLAYER_SPRITE_ASSETS,
  ARRAY_PLAINS_SCENE_IMAGE_ASSETS,
  TWIN_RIVERS_SCENE_IMAGE_ASSETS,
  ARRAY_PLAINS_IMAGE_ASSETS,
  ARRAY_PLAINS_KEYS,
  TWIN_RIVERS_IMAGE_ASSETS,
  TWIN_RIVERS_KEYS,
  VISUAL_REVAMP_IMAGE_ASSETS,
  VISUAL_REVAMP_KEYS,
  PROLOGUE_SHEET_KEYS,
  PROLOGUE_SHEET_SPRITE_ASSETS,
  PROLOGUE_REWORK_IMAGE_ASSETS,
  PROLOGUE_REWORK_KEYS,
  P0_1_PUZZLE_ASSETS,
  P0_1_PUZZLE_KEYS,
  SPRITE_ASSETS,
  TILEMAP_ASSETS,
} from './assets';

describe('prologue rework asset manifest', () => {
  it('registers every required Route In The Void image key', () => {
    expect(PROLOGUE_REWORK_KEYS).toEqual({
      VOID_BG: 'prologue-rework-void-bg',
      AWAKENING_PLATFORM: 'prologue-rework-awakening-platform',
      ROUTE_BRIDGE: 'prologue-rework-route-bridge',
      CENTRAL_HUB: 'prologue-rework-central-hub',
      RUNE_BRANCH: 'prologue-rework-rune-branch',
      CONSOLE_BRANCH: 'prologue-rework-console-branch',
      GATE_COURTYARD: 'prologue-rework-gate-courtyard',
      SPAWN_SHRINE: 'prologue-rework-spawn-shrine',
      CENTRAL_HUB_SHRINE: 'prologue-rework-central-hub-shrine',
      MOTE: 'prologue-rework-mote',
      PLAYER: 'prologue-rework-player',
      PROFESSOR_NODE: 'prologue-rework-professor-node',
      RUNE_KEEPER: 'prologue-rework-rune-keeper',
      CONSOLE_KEEPER: 'prologue-rework-console-keeper',
      GLITCH: 'prologue-rework-glitch',
      BIT_SPARK: 'prologue-rework-bit-spark',
      WATCHER: 'prologue-rework-watcher',
      BOSS_GATE_LOCKED: 'prologue-rework-boss-gate-locked',
      BOSS_GATE_OPEN: 'prologue-rework-boss-gate-open',
      ARRAY_PORTAL_LOCKED: 'prologue-rework-array-portal-locked',
      ARRAY_PORTAL_ACTIVE: 'prologue-rework-array-portal-active',
      RUNE_TILES: 'prologue-rework-rune-tiles',
      FLOW_CONSOLES: 'prologue-rework-flow-consoles',
      FLOW_CONSOLE_DAMAGED: 'prologue-rework-flow-console-damaged',
      ROUTE_BRIDGE_BROKEN: 'prologue-rework-route-bridge-broken',
      PUZZLE_CHAMBER_FRAME: 'prologue-rework-puzzle-chamber-frame',
      DIALOGUE_BOX: 'prologue-rework-dialogue-box',
      PROMPT: 'prologue-rework-prompt',
    });
  });

  it('loads rework images from assets/prologue_rework', () => {
    expect(PROLOGUE_REWORK_IMAGE_ASSETS).toHaveLength(Object.keys(PROLOGUE_REWORK_KEYS).length);

    for (const asset of PROLOGUE_REWORK_IMAGE_ASSETS) {
      expect(asset.path).toMatch(/^assets\/prologue_rework\//);
      expect(asset.path.endsWith('.png')).toBe(true);
    }
  });

  it('includes the rework images in the global image preload list', () => {
    const loadedKeys = new Set(IMAGE_ASSETS.map((asset) => asset.key));

    for (const key of Object.values(PROLOGUE_REWORK_KEYS)) {
      expect(loadedKeys.has(key), key).toBe(true);
    }
  });
});

describe('prologue spritesheet manifest', () => {
  it('registers the new tilemap and animated sheet keys', () => {
    expect(PROLOGUE_SHEET_KEYS).toEqual({
      ROUTE_TILESET: 'prologue-sheet-route-tileset',
      PLAYER: 'prologue-sheet-player-walk',
      NPCS: 'prologue-sheet-npc-idle',
      COMPANIONS: 'prologue-sheet-companions',
      OBJECTS: 'prologue-sheet-objects',
      UI: 'prologue-sheet-ui',
      GLITCH_ATTACK: 'prologue-sheet-glitch-attack',
    });
  });

  it('loads prologue sheets as spritesheets with fixed frame sizes', () => {
    expect(PROLOGUE_SHEET_SPRITE_ASSETS).toHaveLength(Object.keys(PROLOGUE_SHEET_KEYS).length);

    for (const asset of PROLOGUE_SHEET_SPRITE_ASSETS) {
      expect(asset.path).toMatch(/^assets\/prologue_sheets\//);
      expect(asset.path.endsWith('.png')).toBe(true);
      const expectedFrameSize = asset.key === PROLOGUE_SHEET_KEYS.ROUTE_TILESET ? 32 : 256;
      expect(asset.frameWidth, asset.key).toBe(expectedFrameSize);
      expect(asset.frameHeight, asset.key).toBe(expectedFrameSize);
    }
  });

  it('uses a native 32px route tileset for batched overworld rendering', () => {
    const routeTileset = PROLOGUE_SHEET_SPRITE_ASSETS.find((asset) => asset.key === PROLOGUE_SHEET_KEYS.ROUTE_TILESET);

    expect(routeTileset).toMatchObject({
      path: 'assets/prologue_sheets/environment/prologue_route_tileset_v3.png',
      frameWidth: 32,
      frameHeight: 32,
    });
  });

  it('uses imagegen-derived field sheets for the playable prologue cast', () => {
    const sheets = new Map(PROLOGUE_SHEET_SPRITE_ASSETS.map((asset) => [asset.key, asset.path]));

    expect(sheets.get(PROLOGUE_SHEET_KEYS.PLAYER)).toBe('assets/prologue_sheets/characters/imagegen_player_walk_smooth_v7.png');
    expect(sheets.get(PROLOGUE_SHEET_KEYS.NPCS)).toBe('assets/prologue_sheets/characters/imagegen_npc_idle.png');
  });

  it('includes prologue sheets in the global spritesheet preload list', () => {
    const loadedKeys = new Set(SPRITE_ASSETS.map((asset) => asset.key));

    for (const key of Object.values(PROLOGUE_SHEET_KEYS)) {
      expect(loadedKeys.has(key), key).toBe(true);
    }
  });
});

describe('prologue tile terrain assets', () => {
  it('does not register an external TMJ background map for the restored terrain route', () => {
    expect(TILEMAP_ASSETS).toEqual([]);
  });
});

describe('P0-1 isometric puzzle asset manifest', () => {
  it('registers the arena, void, and rune tile assets used by the combined P0-1 scene', () => {
    expect(P0_1_PUZZLE_KEYS).toEqual({
      COSMIC_VOID: 'p0-1-cosmic-void',
      STONE_ARENA: 'p0-1-stone-arena',
      RUNE_TILES: 'p0-1-rune-tiles',
    });

    expect(P0_1_PUZZLE_ASSETS).toEqual([
      { key: P0_1_PUZZLE_KEYS.COSMIC_VOID, path: 'assets/visual_revamp/puzzles/p0_1/cosmic_void.png' },
      { key: P0_1_PUZZLE_KEYS.STONE_ARENA, path: 'assets/visual_revamp/puzzles/p0_1/stone_arena.png' },
      {
        key: P0_1_PUZZLE_KEYS.RUNE_TILES,
        path: 'assets/visual_revamp/puzzles/p0_1/rune_tiles.png',
        frameWidth: 512,
        frameHeight: 512,
      },
    ]);
  });

  it('keeps heavy P0-1 art out of BootScene and available for scene-level loading', () => {
    const globalKeys = new Set(IMAGE_ASSETS.map((asset) => asset.key));
    const bootKeys = new Set(BOOT_IMAGE_ASSETS.map((asset) => asset.key));

    for (const key of Object.values(P0_1_PUZZLE_KEYS)) {
      expect(globalKeys.has(key), key).toBe(true);
      expect(bootKeys.has(key), key).toBe(false);
    }
  });
});

describe('array plains asset manifest', () => {
  it('registers the starter field background image', () => {
    expect(ARRAY_PLAINS_KEYS).toEqual({
      FIELD_BACKGROUND: 'array-plains-field-background',
    });

    expect(ARRAY_PLAINS_IMAGE_ASSETS).toEqual([
      {
        key: ARRAY_PLAINS_KEYS.FIELD_BACKGROUND,
        path: 'assets/array_plains/environment/array_plains_field.png',
      },
    ]);
  });

  it('includes Array Plains images in the global preload list', () => {
    const loadedKeys = new Set(IMAGE_ASSETS.map((asset) => asset.key));

    for (const key of Object.values(ARRAY_PLAINS_KEYS)) {
      expect(loadedKeys.has(key), key).toBe(true);
    }
  });
});

describe('visual revamp asset manifest', () => {
  it('uses the generated v2 world-map panorama for the title screen', () => {
    const assetPaths = new Map(VISUAL_REVAMP_IMAGE_ASSETS.map((asset) => [asset.key, asset.path]));

    expect(assetPaths.get(VISUAL_REVAMP_KEYS.TITLE_BG)).toBe('assets/visual_revamp/title/title_first_three_overhaul_v1.png');
  });

  it('uses grounded imagegen region backgrounds for every post-prologue overworld', () => {
    const assetPaths = new Map(VISUAL_REVAMP_IMAGE_ASSETS.map((asset) => [asset.key, asset.path]));

    expect(assetPaths.get(VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG)).toBe('assets/visual_revamp/regions/array_plains_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG)).toBe('assets/visual_revamp/regions/twin_rivers_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG)).toBe('assets/visual_revamp/regions/hash_highlands_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.STACK_SPIRES_BG)).toBe('assets/visual_revamp/regions/stack_spires_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG)).toBe('assets/visual_revamp/regions/queue_canals_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.TREE_CANOPY_BG)).toBe('assets/visual_revamp/regions/tree_canopy_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG)).toBe('assets/visual_revamp/regions/graph_nexus_grounded_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.CORE_BG)).toBe('assets/visual_revamp/regions/core_grounded_v1.png');
  });

  it('registers the imagegen-derived grounded route material atlas', () => {
    expect(VISUAL_REVAMP_KEYS.ROUTE_MATERIALS).toBe('visual-revamp-route-materials');
    expect(VISUAL_REVAMP_IMAGE_ASSETS).toContainEqual({
      key: VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
      path: 'assets/visual_revamp/regions/grounded_route_material_reference.png',
    });
  });

  it('uses regenerated imagegen backdrops for the prologue arcade puzzle suite', () => {
    const assetPaths = new Map(VISUAL_REVAMP_IMAGE_ASSETS.map((asset) => [asset.key, asset.path]));

    expect(assetPaths.get(VISUAL_REVAMP_KEYS.PUZZLE_RUNE_MEMORY_BG)).toBe('assets/visual_revamp/puzzles/rune_memory_backdrop_v1.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.PUZZLE_FLOW_CONSOLES_BG)).toBe('assets/visual_revamp/puzzles/flow_consoles_backdrop_v2.png');
    expect(assetPaths.get(VISUAL_REVAMP_KEYS.PUZZLE_LITANY_TRIAL_BG)).toBe('assets/visual_revamp/puzzles/litany_trial_backdrop_v1.png');
  });

  it('registers the full-region visual asset set', () => {
    // VISUAL_REVAMP_KEYS is partitioned across two registries: most are
    // single-image assets (VISUAL_REVAMP_IMAGE_ASSETS), and a small set of
    // animated region props live in SPRITE_ASSETS via REGION_PROP_SPRITE_ASSETS.
    // Together they must cover every key exactly once.
    const imageKeys = new Set(VISUAL_REVAMP_IMAGE_ASSETS.map((asset) => asset.key));
    const spriteKeys = new Set(SPRITE_ASSETS.map((asset) => asset.key));
    const visualKeys = new Set(Object.values(VISUAL_REVAMP_KEYS));
    expect(imageKeys.size + [...spriteKeys].filter((k) => visualKeys.has(k as never)).length).toBe(visualKeys.size);

    for (const asset of VISUAL_REVAMP_IMAGE_ASSETS) {
      expect(asset.path).toMatch(/^assets\/visual_revamp\//);
      expect(asset.path.endsWith('.png')).toBe(true);
    }
  });

  it('includes visual revamp images in the global preload list', () => {
    // Visual-revamp keys are loaded as either images or spritesheets — both
    // count as "preloaded somewhere", so we union the two registries.
    const loadedKeys = new Set([
      ...IMAGE_ASSETS.map((asset) => asset.key),
      ...SPRITE_ASSETS.map((asset) => asset.key),
    ]);

    for (const key of Object.values(VISUAL_REVAMP_KEYS)) {
      expect(loadedKeys.has(key), key).toBe(true);
    }
  });

  it('keeps the boot preload scoped to menu-critical assets only', () => {
    const bootKeys = new Set(BOOT_IMAGE_ASSETS.map((asset) => asset.key));

    expect(bootKeys.has(VISUAL_REVAMP_KEYS.TITLE_BG)).toBe(true);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.PROLOGUE_BG)).toBe(false);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG)).toBe(false);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG)).toBe(false);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.STACK_SPIRES_BG)).toBe(false);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG)).toBe(false);
    expect(bootKeys.has(VISUAL_REVAMP_KEYS.PUZZLE_CORE_PROTOCOL_OMEGA_BG)).toBe(false);
    expect(BOOT_SPRITE_ASSETS).toEqual([]);
    expect(BOOT_IMAGE_ASSETS.length).toBeLessThan(10);
  });

  it('moves overworld and puzzle art into scene-level preload bundles', () => {
    const prologueImageKeys = new Set(PROLOGUE_SCENE_IMAGE_ASSETS.map((asset) => asset.key));
    const prologueSpriteKeys = new Set(PROLOGUE_SCENE_SPRITE_ASSETS.map((asset) => asset.key));
    const playerSpriteKeys = new Set(OVERWORLD_PLAYER_SPRITE_ASSETS.map((asset) => asset.key));
    const arrayKeys = new Set(ARRAY_PLAINS_SCENE_IMAGE_ASSETS.map((asset) => asset.key));
    const twinKeys = new Set(TWIN_RIVERS_SCENE_IMAGE_ASSETS.map((asset) => asset.key));

    expect(prologueImageKeys.has(VISUAL_REVAMP_KEYS.PROLOGUE_BG)).toBe(true);
    expect(prologueImageKeys.has(VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED)).toBe(true);
    expect(prologueSpriteKeys.has(PROLOGUE_SHEET_KEYS.ROUTE_TILESET)).toBe(true);
    expect(prologueSpriteKeys.has(PROLOGUE_SHEET_KEYS.PLAYER)).toBe(true);
    expect(prologueSpriteKeys.has(PROLOGUE_SHEET_KEYS.COMPANIONS)).toBe(true);
    expect(prologueSpriteKeys.has(PROLOGUE_SHEET_KEYS.NPCS)).toBe(false);
    expect(playerSpriteKeys).toEqual(new Set([PROLOGUE_SHEET_KEYS.PLAYER]));
    expect(arrayKeys.has(VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG)).toBe(true);
    expect(arrayKeys.has(VISUAL_REVAMP_KEYS.PUZZLE_SHUFFLER_DOMAIN_BG)).toBe(false);
    expect(twinKeys.has(VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG)).toBe(true);
    expect(twinKeys.has(VISUAL_REVAMP_KEYS.PUZZLE_MIRROR_SERPENT_BG)).toBe(false);
  });
});

describe('twin rivers asset manifest', () => {
  it('registers the generated river background image', () => {
    expect(TWIN_RIVERS_KEYS).toEqual({
      FIELD_BACKGROUND: 'twin-rivers-field-background',
    });

    expect(TWIN_RIVERS_IMAGE_ASSETS).toEqual([
      {
        key: TWIN_RIVERS_KEYS.FIELD_BACKGROUND,
        path: 'assets/twin_rivers/environment/twin_rivers_field.png',
      },
    ]);
  });

  it('includes Twin Rivers images in the global preload list', () => {
    const loadedKeys = new Set(IMAGE_ASSETS.map((asset) => asset.key));

    for (const key of Object.values(TWIN_RIVERS_KEYS)) {
      expect(loadedKeys.has(key), key).toBe(true);
    }
  });
});
