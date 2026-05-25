import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Phaser.Scene to a no-op constructor so the abstract class can be
// instantiated via a concrete test subclass without booting a real Game.
vi.mock('phaser', () => ({
  default: {
    Scene: class {
      add: unknown;
      cameras: unknown;
      time: unknown;
      scene: unknown;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      constructor(_config?: unknown) {}
    },
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  },
}));

// TransitionManager is referenced by playEntranceFade / openCodex / startPuzzle.
const fadeIn = vi.fn();
const fade = vi.fn();
const pixelDissolve = vi.fn();
vi.mock('../core/TransitionManager', () => ({
  TransitionManager: { fadeIn, fade, pixelDissolve },
}));

// gameState.setPlayerPosition is called by init() when a spawn override is given.
const setPlayerPosition = vi.fn();
vi.mock('../core/GameStateManager', () => ({
  gameState: { setPlayerPosition },
}));

// CAMERA_TUNING constants — values don't matter, just that they're passed through.
vi.mock('../config/constants', () => ({
  CAMERA_TUNING: { ZOOM: 2, FOLLOW_LERP: 0.5, DEADZONE_WIDTH: 100, DEADZONE_HEIGHT: 100 },
  SCENE_KEYS: { CODEX: 'codex' },
}));

vi.mock('../config/assets', () => ({
  OVERWORLD_PLAYER_SPRITE_ASSETS: [],
}));

const { BaseOverworldScene } = await import('./BaseOverworldScene');

class TestableOverworld extends BaseOverworldScene {
  protected getRegionImageAssets() {
    return [];
  }
}

// Helper to relax `protected` access and stub Phaser surface in tests
// without polluting the production class signatures. We strip the real
// Phaser-typed fields with Omit before re-declaring them as test stubs,
// otherwise the intersection would require our stubs to satisfy the full
// Phaser.Time.Clock / Cameras.Scene2D / Scenes.SceneManager interfaces.
type ProbedScene = Omit<TestableOverworld, 'cameras' | 'time' | 'scene'> & {
  dialogueSystem: { isDialogueActive(): boolean; startDialogue?: (...args: unknown[]) => void };
  player: { sprite: unknown };
  cameras: { main: Record<string, ReturnType<typeof vi.fn>> };
  time: { now: number };
  scene: { key: string };
  interactionEnabledTime: number;
  canOpenOverlay(): boolean;
  handleInteract(entry: unknown): void;
  showFieldNote(speaker: string, body: string | string[]): void;
  setupOverworldCamera(w: number, h: number): void;
  playEntranceFade(durationMs?: number): void;
  init(data: { spawnX?: number; spawnY?: number }): void;
};

const buildInstance = (): ProbedScene => {
  fadeIn.mockClear();
  fade.mockClear();
  pixelDissolve.mockClear();
  setPlayerPosition.mockClear();
  return new TestableOverworld() as unknown as ProbedScene;
};

describe('BaseOverworldScene', () => {
  describe('canOpenOverlay', () => {
    let scene: ProbedScene;
    beforeEach(() => {
      scene = buildInstance();
    });

    it('returns true when no dialogueSystem is wired yet (e.g. very early in create())', () => {
      // dialogueSystem is left undefined intentionally
      expect(scene.canOpenOverlay()).toBe(true);
    });

    it('returns true when dialogue is not active', () => {
      scene.dialogueSystem = { isDialogueActive: () => false };
      expect(scene.canOpenOverlay()).toBe(true);
    });

    it('returns false when dialogue is active', () => {
      scene.dialogueSystem = { isDialogueActive: () => true };
      expect(scene.canOpenOverlay()).toBe(false);
    });
  });

  describe('handleInteract', () => {
    let scene: ProbedScene;
    let onInteract: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scene = buildInstance();
      onInteract = vi.fn();
      scene.dialogueSystem = { isDialogueActive: () => false };
    });

    it('invokes the object configs onInteract handler when overlay is allowed', () => {
      scene.handleInteract({
        type: 'object',
        target: { config: { onInteract } },
      });
      expect(onInteract).toHaveBeenCalledOnce();
    });

    it('does not invoke onInteract while dialogue is open (the canOpenOverlay gate)', () => {
      scene.dialogueSystem = { isDialogueActive: () => true };
      scene.handleInteract({
        type: 'object',
        target: { config: { onInteract } },
      });
      expect(onInteract).not.toHaveBeenCalled();
    });

    it('ignores entries that are not object type (npc dispatch lives elsewhere)', () => {
      scene.handleInteract({
        type: 'npc',
        target: { config: { onInteract } },
      });
      expect(onInteract).not.toHaveBeenCalled();
    });
  });

  describe('showFieldNote', () => {
    let scene: ProbedScene;
    let startDialogue: ReturnType<typeof vi.fn>;
    let isDialogueActive: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scene = buildInstance();
      startDialogue = vi.fn();
      isDialogueActive = vi.fn().mockReturnValue(false);
      scene.dialogueSystem = { isDialogueActive, startDialogue };
    });

    it('builds a single-node dialogue tree and routes it through DialogueSystem', () => {
      scene.showFieldNote('Array Guide', 'Slot 0 has one address and one value.');
      expect(startDialogue).toHaveBeenCalledOnce();

      const [tree, npcId] = startDialogue.mock.calls[0] as [
        { startNodeId: string; nodes: Array<{ id: string; speaker: string; text: string }> },
        string,
      ];
      expect(tree.startNodeId).toBe('note');
      expect(tree.nodes).toHaveLength(1);
      expect(tree.nodes[0]).toMatchObject({
        id: 'note',
        speaker: 'Array Guide',
        text: 'Slot 0 has one address and one value.',
      });
      // npcId carries the speaker so DialogueSystem dedupes back-to-back notes
      // from the same source without suppressing different speakers.
      expect(npcId).toBe('field_array_guide');
    });

    it('no-ops when dialogue is already open (no nested dialogues)', () => {
      isDialogueActive.mockReturnValue(true);
      scene.showFieldNote('Guide', 'should not show');
      expect(startDialogue).not.toHaveBeenCalled();
    });
  });

  describe('setupOverworldCamera', () => {
    it('threads world size + tuning constants into the four camera setup calls', () => {
      const scene = buildInstance();
      const camera = {
        setBounds: vi.fn(),
        setZoom: vi.fn(),
        startFollow: vi.fn(),
        setDeadzone: vi.fn(),
      };
      scene.cameras = { main: camera };
      scene.player = { sprite: { x: 0, y: 0 } };

      scene.setupOverworldCamera(1920, 1080);

      expect(camera.setBounds).toHaveBeenCalledWith(0, 0, 1920, 1080);
      expect(camera.setZoom).toHaveBeenCalledWith(2);
      expect(camera.startFollow).toHaveBeenCalledWith(scene.player.sprite, true, 0.5, 0.5);
      expect(camera.setDeadzone).toHaveBeenCalledWith(100, 100);
    });
  });

  describe('playEntranceFade', () => {
    it('triggers a fade and pins interaction-cooldown to fade duration', () => {
      const scene = buildInstance();
      scene.time = { now: 1000 };
      scene.playEntranceFade(700);
      expect(fadeIn).toHaveBeenCalledOnce();
      expect(fadeIn.mock.calls[0][1]).toBe(700);
      expect(scene.interactionEnabledTime).toBe(1700);
    });

    it('defaults to 700ms when no explicit duration is given', () => {
      const scene = buildInstance();
      scene.time = { now: 2500 };
      scene.playEntranceFade();
      expect(fadeIn.mock.calls[0][1]).toBe(700);
      expect(scene.interactionEnabledTime).toBe(3200);
    });
  });

  describe('init', () => {
    it('forwards portal spawn overrides to gameState.setPlayerPosition', () => {
      const scene = buildInstance();
      scene.init({ spawnX: 512, spawnY: 256 });
      expect(setPlayerPosition).toHaveBeenCalledWith(512, 256);
    });

    it('leaves player position untouched when no spawn override is passed', () => {
      const scene = buildInstance();
      scene.init({});
      expect(setPlayerPosition).not.toHaveBeenCalled();
    });

    it('requires both coordinates to apply an override (partial spec is ignored)', () => {
      const scene = buildInstance();
      scene.init({ spawnX: 100 });
      expect(setPlayerPosition).not.toHaveBeenCalled();
    });
  });
});
