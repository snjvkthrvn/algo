import { describe, expect, it } from 'vitest';
import {
  IMAGE_ASSETS,
  ARRAY_PLAINS_IMAGE_ASSETS,
  ARRAY_PLAINS_KEYS,
  PROLOGUE_SHEET_KEYS,
  PROLOGUE_SHEET_SPRITE_ASSETS,
  PROLOGUE_REWORK_IMAGE_ASSETS,
  PROLOGUE_REWORK_KEYS,
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

    expect(sheets.get(PROLOGUE_SHEET_KEYS.PLAYER)).toBe('assets/prologue_sheets/characters/imagegen_player_walk_v2.png');
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
