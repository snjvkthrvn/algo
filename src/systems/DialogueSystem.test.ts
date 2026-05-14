import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  },
}));

vi.mock('../ui/DialogueBox', () => ({
  DialogueBox: class {
    show = vi.fn();
    hide = vi.fn();
    advance = vi.fn().mockReturnValue(true);
    isVisible = vi.fn().mockReturnValue(false);
    destroy = vi.fn();
  },
}));

const { DialogueSystem } = await import('./DialogueSystem');
type DialogueTree = import('../data/types').DialogueTree;

type FakeScene = {
  time: { now: number; delayedCall: ReturnType<typeof vi.fn> };
  input: {
    keyboard: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  events: { once: ReturnType<typeof vi.fn> };
  cameras: { main: { width: number; height: number } };
  add: { container: ReturnType<typeof vi.fn> };
  __keyHandlers: Record<string, () => void>;
};

const buildScene = (): FakeScene => {
  const keyHandlers: Record<string, () => void> = {};
  const scene: FakeScene = {
    time: {
      now: 1000,
      delayedCall: vi.fn(),
    },
    input: {
      keyboard: {
        on: vi.fn(((event: string, cb: () => void) => {
          keyHandlers[event] = cb;
        }) as never),
        off: vi.fn(),
      },
      on: vi.fn(),
      off: vi.fn(),
    },
    events: { once: vi.fn() },
    cameras: { main: { width: 1280, height: 720 } },
    add: {
      container: vi.fn().mockReturnValue({
        setDepth: () => ({ setScrollFactor: () => ({ destroy: vi.fn(), add: vi.fn() }) }),
      }),
    },
    __keyHandlers: keyHandlers,
  };
  return scene;
};

const singleNodeTree = (text: string): DialogueTree => ({
  startNodeId: 'n1',
  nodes: [{ id: 'n1', speaker: 'Guide', text }],
});

describe('DialogueSystem opening race', () => {
  let scene: FakeScene;
  let system: InstanceType<typeof DialogueSystem>;

  beforeEach(() => {
    scene = buildScene();
    system = new DialogueSystem(scene as never);
  });

  it('ignores SPACE that fires within the opening cooldown window', () => {
    system.startDialogue(singleNodeTree('hello world'), 'guide');
    const dialogueBox = (system as unknown as { dialogueBox: { advance: ReturnType<typeof vi.fn> } }).dialogueBox;
    dialogueBox.advance.mockClear();

    // Same-frame SPACE press from InteractionSystem fall-through
    scene.__keyHandlers['keydown-SPACE']();

    expect(dialogueBox.advance).not.toHaveBeenCalled();
  });

  it('honors SPACE again after the cooldown elapses', () => {
    system.startDialogue(singleNodeTree('hello world'), 'guide');
    const dialogueBox = (system as unknown as { dialogueBox: { advance: ReturnType<typeof vi.fn> } }).dialogueBox;
    dialogueBox.advance.mockClear();

    scene.time.now += 250;
    scene.__keyHandlers['keydown-SPACE']();

    expect(dialogueBox.advance).toHaveBeenCalledTimes(1);
  });

  it('ends the current dialogue (invoking onEnd) before starting a replacement', () => {
    const onEndFirst = vi.fn();
    const onEndSecond = vi.fn();
    system.startDialogue(singleNodeTree('first'), 'npc_a', onEndFirst);
    system.startDialogue(singleNodeTree('second'), 'npc_b', onEndSecond);

    expect(onEndFirst).toHaveBeenCalledTimes(1);
    expect(onEndSecond).not.toHaveBeenCalled();
  });
});
