import { describe, expect, it } from 'vitest';
import { InteractionPrompt } from './InteractionPrompt';

const makeContainer = () => {
  const c = {
    x: 0,
    y: 0,
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
    add(child: unknown) {
      c.children.push(child);
      return c;
    },
    destroy: () => undefined,
  };
  return c;
};

describe('InteractionPrompt', () => {
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
});
