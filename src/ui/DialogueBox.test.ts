import { describe, expect, it } from 'vitest';
import { DialogueBox } from './DialogueBox';

const stub = (extra: Record<string, unknown> = {}) => {
  const obj: Record<string, unknown> = { visible: false, ...extra };
  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return () => proxy;
    },
  });
  return proxy;
};

const trackingGraphics = (graphicsCalls: string[]) => {
  const obj: Record<string, unknown> = {};
  const proxy = new Proxy(obj, {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      const name = String(prop);
      const fn = () => {
        graphicsCalls.push(name);
        return proxy;
      };
      target[name] = fn;
      return fn;
    },
  });
  return proxy;
};

describe('DialogueBox', () => {
  it('draws a primitive panel and a portrait frame', () => {
    const imageCalls: Array<{ x: number; y: number; key: string }> = [];
    const graphicsCalls: string[] = [];

    const scene = {
      cameras: { main: { width: 1280, height: 720 } },
      add: {
        container: () => stub({ add: () => undefined, destroy: () => undefined }),
        image: (x: number, y: number, key: string) => {
          imageCalls.push({ x, y, key });
          return stub();
        },
        graphics: () => trackingGraphics(graphicsCalls),
        text: () => stub({ setVisible: () => undefined }),
      },
      tweens: { add: () => undefined },
    };

    new DialogueBox(scene as never);

    expect(imageCalls.some((call) => call.key === 'prologue-ui-portrait_active')).toBe(true);
    expect(graphicsCalls).toContain('fillRect');
    expect(graphicsCalls).toContain('strokeRect');
  });
});
