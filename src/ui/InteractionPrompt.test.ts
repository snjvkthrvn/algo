import { describe, expect, it } from 'vitest';
import { INTERACTION_PROMPT_WIDTH, InteractionPrompt } from './InteractionPrompt';

const makeContainer = () => {
  const c = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    children: [] as unknown[],
    setDepth() {
      return c;
    },
    setVisible(visible: boolean) {
      c.visible = visible;
      return c;
    },
    setPosition(x: number, y: number) {
      c.x = x;
      c.y = y;
      return c;
    },
    setScale(scale: number) {
      c.scaleX = scale;
      c.scaleY = scale;
      return c;
    },
    add(child: unknown) {
      c.children.push(child);
      return c;
    },
    destroy: () => undefined,
  };
  return c;
};

describe('InteractionPrompt', () => {
  it('is wide enough for the longest production portal prompt', () => {
    expect(INTERACTION_PROMPT_WIDTH).toBeGreaterThanOrEqual(288);
  });

  it('keeps the world anchor separate from the bobbing tween target', () => {
    const containers: ReturnType<typeof makeContainer>[] = [];
    const graphicsCalls: string[] = [];
    const tweenTargets: unknown[] = [];

    const makeGraphics = () => {
      const g: Record<string, unknown> = {};
      const noop = (label: string) => {
        return () => {
          graphicsCalls.push(label);
          return g;
        };
      };
      g.fillStyle = noop('fillStyle');
      g.fillRect = noop('fillRect');
      g.lineStyle = noop('lineStyle');
      g.strokeRect = noop('strokeRect');
      g.setDepth = () => g;
      g.setScrollFactor = () => g;
      return g;
    };

    const scene = {
      add: {
        container: () => {
          const container = makeContainer();
          containers.push(container);
          return container;
        },
        graphics: () => makeGraphics(),
        text: () => ({
          setOrigin() {
            return this;
          },
          setText: () => undefined,
        }),
      },
      tweens: {
        add: (config: { targets: unknown }) => {
          tweenTargets.push(config.targets);
        },
      },
      cameras: {
        main: {
          zoom: 2,
          worldView: { left: 0, right: 1200, top: 0, bottom: 720 },
        },
      },
    };

    const prompt = new InteractionPrompt(scene as never);
    prompt.show(900, 385);

    // The prompt anchors exactly where asked — entities are the single source
    // of truth for how far above themselves the prompt should float.
    expect(containers[0].x).toBe(900);
    expect(containers[0].y).toBe(385);
    expect(graphicsCalls).toContain('fillRect');
    expect(graphicsCalls).toContain('strokeRect');
    expect(tweenTargets[0]).not.toBe(containers[0]);
    expect(containers[0].children).toContain(tweenTargets[0]);
  });

  it('keeps prompts inside the visible camera view at gameplay zoom', () => {
    const containers: ReturnType<typeof makeContainer>[] = [];

    const scene = {
      add: {
        container: () => {
          const container = makeContainer();
          containers.push(container);
          return container;
        },
        graphics: () => ({
          fillStyle: () => undefined,
          fillRect: () => undefined,
          lineStyle: () => undefined,
          strokeRect: () => undefined,
          setDepth() {
            return this;
          },
          setScrollFactor() {
            return this;
          },
        }),
        text: () => ({
          setOrigin() {
            return this;
          },
          setText: () => undefined,
        }),
      },
      tweens: { add: () => undefined },
      cameras: {
        main: {
          zoom: 2,
          worldView: { left: 0, right: 640, top: 0, bottom: 360 },
        },
      },
    };

    const prompt = new InteractionPrompt(scene as never);
    prompt.show(20, 40, '[SPACE] Return');

    expect(containers[0].scaleX).toBe(0.5);
    expect(containers[0].x).toBeGreaterThan(20);
  });
});
