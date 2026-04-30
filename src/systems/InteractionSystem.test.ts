import { describe, expect, it, vi } from 'vitest';
import { InteractionSystem } from './InteractionSystem';

const prompts: Array<{ show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> }> = [];

vi.mock('../ui/InteractionPrompt', () => ({
  InteractionPrompt: class {
    show = vi.fn();
    hide = vi.fn();
    destroy = vi.fn();

    constructor() {
      prompts.push(this);
    }
  },
}));

describe('InteractionSystem', () => {
  it('suppresses prompts when prompt display is disabled', () => {
    prompts.length = 0;
    const scene = {
      input: {
        keyboard: {
          on: () => undefined,
        },
      },
    };
    const player = {
      getPosition: () => ({ x: 0, y: 0 }),
    };
    const npc = {
      getPosition: () => ({ x: 0, y: 0 }),
      setHighlighted: vi.fn(),
    };

    const system = new InteractionSystem(scene as never, player as never);
    system.addNPC(npc as never);
    system.update(false);

    expect(prompts[0].hide).toHaveBeenCalledOnce();
    expect(prompts[0].show).not.toHaveBeenCalled();
  });

  it('clears stale targets while disabled so the same key cannot interact', () => {
    prompts.length = 0;
    let onInteract: (() => void) | undefined;
    const scene = {
      input: {
        keyboard: {
          on: (_event: string, callback: () => void) => { onInteract = callback; },
          off: () => undefined,
        },
      },
    };
    const player = {
      getPosition: () => ({ x: 0, y: 0 }),
    };
    const npc = {
      getPosition: () => ({ x: 0, y: 0 }),
      getPromptOffsetY: () => -42,
      setHighlighted: vi.fn(),
    };
    const callback = vi.fn();

    const system = new InteractionSystem(scene as never, player as never);
    system.addNPC(npc as never);
    system.onInteract(callback);

    system.update(true);
    expect(system.getCurrentTarget()).not.toBeNull();

    system.update(false);
    onInteract?.();

    expect(system.getCurrentTarget()).toBeNull();
    expect(npc.setHighlighted).toHaveBeenLastCalledWith(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it('positions NPC prompts using the entity-provided offset so art-size changes stay in sync', () => {
    prompts.length = 0;
    const scene = {
      input: {
        keyboard: {
          on: () => undefined,
        },
      },
    };
    const player = {
      getPosition: () => ({ x: 100, y: 200 }),
    };
    const npc = {
      getPosition: () => ({ x: 100, y: 200 }),
      getPromptOffsetY: () => -42,
      setHighlighted: vi.fn(),
    };

    const system = new InteractionSystem(scene as never, player as never);
    system.addNPC(npc as never);
    system.update();

    expect(prompts[0].show).toHaveBeenCalledWith(100, 158, '[SPACE] Talk');
  });

  it('positions interactable object prompts using the entity-provided offset', () => {
    prompts.length = 0;
    const scene = {
      input: {
        keyboard: {
          on: () => undefined,
        },
      },
    };
    const player = {
      getPosition: () => ({ x: 100, y: 200 }),
    };
    const gate = {
      getPosition: () => ({ x: 100, y: 200 }),
      getPromptOffsetY: () => -58,
      setHighlighted: vi.fn(),
      config: { prompt: '[SPACE] Enter' },
    };

    const system = new InteractionSystem(scene as never, player as never);
    system.addObject(gate as never);
    system.update();

    expect(prompts[0].show).toHaveBeenCalledWith(100, 142, '[SPACE] Enter');
  });

  it('allows interaction from exactly one configured tile away', () => {
    prompts.length = 0;
    const scene = {
      input: {
        keyboard: {
          on: () => undefined,
        },
      },
    };
    const player = {
      getPosition: () => ({ x: 208, y: 384 }),
    };
    const gate = {
      getPosition: () => ({ x: 160, y: 384 }),
      getPromptOffsetY: () => -58,
      setHighlighted: vi.fn(),
      config: { prompt: '[SPACE] Return' },
    };

    const system = new InteractionSystem(scene as never, player as never);
    system.addObject(gate as never);
    system.update();

    expect(system.getCurrentTarget()?.target).toBe(gate);
    expect(prompts[0].show).toHaveBeenCalledWith(160, 326, '[SPACE] Return');
  });
});
