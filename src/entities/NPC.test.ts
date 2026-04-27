import { describe, expect, it } from 'vitest';
import { NPCType, type NPCConfig } from '../data/types';
import { NPC } from './NPC';

const baseConfig: NPCConfig = {
  id: 'professor_node',
  name: 'Professor Node',
  type: NPCType.MENTOR,
  spriteKey: 'prologue-sheet-npc-idle',
  idleFrames: [0, 1, 2, 3],
  defaultPosition: { x: 900, y: 395 },
  dialogue: { startNodeId: 'start', nodes: [{ id: 'start', speaker: 'Professor Node', text: 'Hello' }] },
};

describe('NPC', () => {
  const createScene = () => {
    const spriteCalls: Array<{ x: number; y: number; key: string; frame?: number | string }> = [];
    const frameNumberCalls: Array<{ key: string; frames: number[] }> = [];
    const animationCreates: Array<{ key: string; frames: unknown[] }> = [];
    const bodyCalls = { setOffset: 0, setImmovable: 0 };
    const scene = {
      add: {
        sprite: (x: number, y: number, key: string, frame?: number | string) => {
          spriteCalls.push({ x, y, key, frame });
          const sprite = {
            x,
            y,
            body: {
              setSize: () => undefined,
              setOffset: () => {
                bodyCalls.setOffset += 1;
              },
              setImmovable: () => {
                bodyCalls.setImmovable += 1;
              },
            },
            anims: { play: () => undefined },
            setDepth: () => sprite,
            setScale: () => sprite,
            destroy: () => undefined,
          };
          return sprite;
        },
        graphics: () => ({
          setAlpha() {
            return this;
          },
          setDepth() {
            return this;
          },
          setPosition() {
            return this;
          },
          clear: () => undefined,
          fillStyle: () => undefined,
          fillCircle: () => undefined,
          destroy: () => undefined,
        }),
        text: () => ({
          setOrigin() {
            return this;
          },
          setDepth() {
            return this;
          },
          setVisible: () => undefined,
          destroy: () => undefined,
        }),
      },
      anims: {
        exists: () => false,
        generateFrameNumbers: (key: string, config: { frames: number[] }) => {
          frameNumberCalls.push({ key, frames: config.frames });
          return config.frames.map((frame) => ({ key, frame, duration: 0 }));
        },
        create: (config: { key: string; frames: unknown[] }) => {
          animationCreates.push(config);
          return config;
        },
      },
      physics: {
        world: {
          enable: () => undefined,
        },
      },
      tweens: {
        add: () => undefined,
      },
    };
    return { scene, spriteCalls, frameNumberCalls, animationCreates, bodyCalls };
  };

  it('renders configured prologue NPCs from animated sheet frames', () => {
    const { scene, spriteCalls, frameNumberCalls, animationCreates } = createScene();

    new NPC(scene as never, baseConfig);

    expect(spriteCalls).toEqual([{ x: 900, y: 395, key: 'prologue-sheet-npc-idle', frame: 0 }]);
    expect(frameNumberCalls).toEqual([{ key: 'prologue-sheet-npc-idle', frames: [0, 1, 2, 3] }]);
    expect(animationCreates.map((entry) => entry.key)).toEqual(['professor_node-idle']);
  });

  it('relies on Body.setSize auto-centering and does not override it with setOffset', () => {
    const { scene, bodyCalls } = createScene();

    new NPC(scene as never, baseConfig);

    expect(bodyCalls.setOffset).toBe(0);
  });

  it('derives prompt offset from the sprite display height so art rescaling keeps prompts aligned', () => {
    const { scene } = createScene();
    const npc = new NPC(scene as never, baseConfig);
    // Fake sprite has no displayHeight, so the container-fallback offset applies.
    // Fallback is intentionally tall enough to clear a typical NPC silhouette.
    expect(npc.getPromptOffsetY()).toBeLessThan(0);
    expect(npc.getPromptOffsetY()).toBeGreaterThanOrEqual(-80);

    // With a real displayHeight, the offset matches "half the height plus padding".
    (npc as unknown as { sprite: { displayHeight: number } }).sprite.displayHeight = 56;
    expect(npc.getPromptOffsetY()).toBe(-(56 / 2 + 14));
  });
});
