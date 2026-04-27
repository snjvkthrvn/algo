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
});
