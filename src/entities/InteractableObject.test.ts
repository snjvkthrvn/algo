import { describe, expect, it } from 'vitest';
import { InteractableObject } from './InteractableObject';

describe('InteractableObject', () => {
  it('renders sprite-backed gates and swaps frames by visual state', () => {
    const spriteCalls: Array<{ x: number; y: number; key: string; frame: number }> = [];
    const frames: number[] = [];
    const bodyCalls = { setOffset: 0 };
    const scene = {
      add: {
        sprite: (x: number, y: number, key: string, frame: number) => {
          spriteCalls.push({ x, y, key, frame });
          const sprite = {
            x,
            y,
            body: {
              setSize: () => undefined,
              setOffset: () => {
                bodyCalls.setOffset += 1;
              },
              setImmovable: () => undefined,
            },
            setDepth: () => sprite,
            setScale: () => sprite,
            setFrame: (nextFrame: number) => {
              frames.push(nextFrame);
              return sprite;
            },
            destroy: () => undefined,
          };
          return sprite;
        },
        graphics: () => ({
          setPosition() {
            return this;
          },
          setDepth() {
            return this;
          },
          setAlpha() {
            return this;
          },
          fillStyle: () => undefined,
          fillCircle: () => undefined,
          destroy: () => undefined,
        }),
      },
      physics: { world: { enable: () => undefined } },
      tweens: { add: () => undefined },
    };

    const gate = new InteractableObject(scene as never, {
      id: 'boss_gate',
      type: 'gate',
      x: 1830,
      y: 395,
      spriteKey: 'prologue-gates',
      frameByState: { locked: 4, unlocked: 6 },
      initialState: 'locked',
    });
    gate.setVisualState('unlocked');

    expect(spriteCalls).toEqual([{ x: 1830, y: 395, key: 'prologue-gates', frame: 4 }]);
    expect(frames).toEqual([6]);
    expect(bodyCalls.setOffset).toBe(0);
  });

  it('renders image-backed interactables and swaps textures by visual state', () => {
    const imageCalls: Array<{ x: number; y: number; key: string }> = [];
    const textureChanges: string[] = [];
    const imageBodyCalls = { setOffset: 0 };
    const scene = {
      add: {
        image: (x: number, y: number, key: string) => {
          imageCalls.push({ x, y, key });
          const image = {
            x,
            y,
            body: {
              setSize: () => undefined,
              setOffset: () => {
                imageBodyCalls.setOffset += 1;
              },
              setImmovable: () => undefined,
            },
            setDepth: () => image,
            setScale: () => image,
            setTexture: (nextKey: string) => {
              textureChanges.push(nextKey);
              return image;
            },
            destroy: () => undefined,
          };
          return image;
        },
        graphics: () => ({
          setPosition() {
            return this;
          },
          setDepth() {
            return this;
          },
          setAlpha() {
            return this;
          },
          fillStyle: () => undefined,
          fillCircle: () => undefined,
          destroy: () => undefined,
        }),
      },
      physics: { world: { enable: () => undefined } },
      tweens: { add: () => undefined },
    };

    const portal = new InteractableObject(scene as never, {
      id: 'gateway',
      type: 'portal',
      x: 2000,
      y: 395,
      imageByState: {
        locked: 'prologue-rework-array-portal-locked',
        unlocked: 'prologue-rework-array-portal-active',
      },
      initialState: 'locked',
      imageScale: 0.9,
    });
    portal.setVisualState('unlocked');

    expect(imageCalls).toEqual([{ x: 2000, y: 395, key: 'prologue-rework-array-portal-locked' }]);
    expect(textureChanges).toEqual(['prologue-rework-array-portal-active']);
    expect(imageBodyCalls.setOffset).toBe(0);

    // Prompt offset is derived from the image's display height so swapping
    // textures or rescaling doesn't break prompt placement.
    (portal as unknown as { sprite: { displayHeight: number } }).sprite.displayHeight = 87;
    expect(portal.getPromptOffsetY()).toBe(-(87 / 2 + 14));
  });
});
