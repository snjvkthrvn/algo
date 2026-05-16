import { describe, expect, it, vi } from 'vitest';
import { Player, PLAYER_GRID_STEP } from './Player';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 87,
          A: 65,
          S: 83,
          D: 68,
        },
      },
    },
  },
}));

type FakeKey = {
  isDown: boolean;
  timeDown: number;
};

type FakeBody = {
  velocity: { x: number; y: number };
  calls: { setOffset: number; setCollideWorldBounds: number; setVelocity: number; resets: Array<{ x: number; y: number }> };
  setSize: () => void;
  setOffset: () => void;
  setCollideWorldBounds: () => void;
  setVelocity: (x: number, y: number) => void;
  reset: (x: number, y: number) => void;
};

type FakeDisplayObject = {
  x: number;
  y: number;
  setStrokeStyle: () => FakeDisplayObject;
  setPosition: (x: number, y: number) => FakeDisplayObject;
  setDepth: (depth: number) => FakeDisplayObject;
};

type FakeSprite = {
  x: number;
  y: number;
  flipX: boolean;
  body: FakeBody;
  anims: { play: (key: string, ignoreIfPlaying?: boolean) => void };
  setDepth: () => FakeSprite;
  setScale: () => FakeSprite;
  setOrigin: (originX?: number, originY?: number) => FakeSprite;
  setFlipX: (flip: boolean) => FakeSprite;
  setPosition: (x: number, y: number) => FakeSprite;
  destroy: () => void;
};

type FakeContainer = {
  x: number;
  y: number;
  body: FakeBody;
  add: (_child: unknown) => FakeContainer;
  setPosition: (x: number, y: number) => FakeContainer;
  destroy: () => void;
};

function createKey(): FakeKey {
  return { isDown: false, timeDown: 0 };
}

function createDisplayObject(y = 0): FakeDisplayObject {
  const object: FakeDisplayObject = {
    x: 0,
    y,
    setStrokeStyle: () => object,
    setPosition: (x: number, nextY: number) => {
      object.x = x;
      object.y = nextY;
      return object;
    },
    setDepth: (_depth: number) => object,
  };

  return object;
}

function createPlayer(canMoveTo: (position: { x: number; y: number }) => boolean = ({ x, y }) => x >= 0 && y >= 0) {
  const keys = {
    left: createKey(),
    right: createKey(),
    up: createKey(),
    down: createKey(),
    W: createKey(),
    A: createKey(),
    S: createKey(),
    D: createKey(),
  };

  const velocity = { x: 0, y: 0 };
  const calls = { setOffset: 0, setCollideWorldBounds: 0, setVelocity: 0, resets: [] as Array<{ x: number; y: number }> };
  const body: FakeBody = {
    velocity,
    calls,
    setSize: () => undefined,
    setOffset: () => {
      calls.setOffset += 1;
    },
    setCollideWorldBounds: () => {
      calls.setCollideWorldBounds += 1;
    },
    setVelocity: (x: number, y: number) => {
      calls.setVelocity += 1;
      velocity.x = x;
      velocity.y = y;
    },
    reset: (x: number, y: number) => {
      calls.resets.push({ x, y });
    },
  };

  const createContainer = (x: number, y: number): FakeContainer => {
    const container: FakeContainer = {
      x,
      y,
      body,
      add: () => container,
      setPosition: (nextX: number, nextY: number) => {
        container.x = nextX;
        container.y = nextY;
        return container;
      },
      destroy: () => undefined,
    };

    return container;
  };
  const spriteCalls: Array<{ x: number; y: number; key: string; frame?: number | string }> = [];
  const animationPlays: string[] = [];
  const animationCreates: string[] = [];
  const animationConfigs: Array<{
    key: string;
    frameRate?: number;
    repeat?: number;
    frames: Array<{ key: string; frame: number }>;
  }> = [];
  const tweenCalls: Array<{
    targets: FakeSprite;
    x: number;
    y: number;
    duration: number;
    onComplete?: () => void;
  }> = [];
  const createSprite = (x: number, y: number, key: string, frame?: number | string): FakeSprite => {
    spriteCalls.push({ x, y, key, frame });
    const sprite: FakeSprite = {
      x,
      y,
      flipX: false,
      body,
      anims: {
        play: (animationKey: string) => {
          animationPlays.push(animationKey);
        },
      },
      setDepth: () => sprite,
      setScale: () => sprite,
      setOrigin: () => sprite,
      setFlipX: (flip: boolean) => {
        sprite.flipX = flip;
        return sprite;
      },
      setPosition: (nextX: number, nextY: number) => {
        sprite.x = nextX;
        sprite.y = nextY;
        return sprite;
      },
      destroy: () => undefined,
    };
    return sprite;
  };

  const scene = {
    add: {
      container: createContainer,
      sprite: createSprite,
      ellipse: () => createDisplayObject(),
      rectangle: (_x: number, y: number) => createDisplayObject(y),
    },
    anims: {
      exists: () => false,
      create: (config: {
        key: string;
        frameRate?: number;
        repeat?: number;
        frames: Array<{ key: string; frame: number }>;
      }) => {
        animationCreates.push(config.key);
        animationConfigs.push(config);
        return config;
      },
      generateFrameNumbers: (_key: string, range: { start: number; end: number }) =>
        Array.from({ length: range.end - range.start + 1 }, (_, index) => ({
          key: 'prologue-sheet-player-walk',
          frame: range.start + index,
        })),
    },
    physics: {
      world: {
        enable: () => undefined,
      },
    },
    input: {
      keyboard: {
        createCursorKeys: () => ({
          left: keys.left,
          right: keys.right,
          up: keys.up,
          down: keys.down,
        }),
        addKey: (keyCode: number) => {
          const keyMap: Record<number, FakeKey> = {
            87: keys.W,
            65: keys.A,
            83: keys.S,
            68: keys.D,
          };
          return keyMap[keyCode];
        },
      },
    },
    tweens: {
      add: (config: {
        targets: FakeSprite;
        x: number;
        y: number;
        duration: number;
        onComplete?: () => void;
      }) => {
        tweenCalls.push(config);
        return { stop: () => undefined };
      },
    },
  };

  const player = new Player(scene as never, 100, 100, { canMoveTo });
  const sprite = (player as unknown as { sprite: FakeSprite }).sprite;

  const completeLatestStep = () => {
    const latest = tweenCalls[tweenCalls.length - 1];
    latest.targets.setPosition(latest.x, latest.y);
    latest.onComplete?.();
  };

  return { animationConfigs, animationCreates, animationPlays, body, completeLatestStep, keys, player, sprite, spriteCalls, tweenCalls };
}

describe('Player', () => {
  it('creates the player from the animated prologue player sheet', () => {
    const { animationCreates, animationPlays, spriteCalls } = createPlayer();

    expect(spriteCalls).toEqual([{ x: 100, y: 100, key: 'prologue-sheet-player-walk', frame: 0 }]);
    expect(animationCreates).toEqual([
      'player-idle-down',
      'player-idle-left',
      'player-idle-right',
      'player-idle-up',
      'player-walk-down',
      'player-walk-left',
      'player-walk-right',
      'player-walk-up',
    ]);
    expect(animationPlays[0]).toBe('player-idle-down');
  });

  it('creates eight-frame directional walk cycles that stay smooth across two tile steps', () => {
    const { animationConfigs } = createPlayer();
    const configByKey = new Map(animationConfigs.map((config) => [config.key, config]));

    expect(configByKey.get('player-idle-down')?.frames.map((frame) => frame.frame)).toEqual([0]);
    expect(configByKey.get('player-idle-left')?.frames.map((frame) => frame.frame)).toEqual([8]);
    expect(configByKey.get('player-idle-right')?.frames.map((frame) => frame.frame)).toEqual([16]);
    expect(configByKey.get('player-idle-up')?.frames.map((frame) => frame.frame)).toEqual([24]);

    expect(configByKey.get('player-walk-down')).toMatchObject({
      frameRate: 50,
      repeat: -1,
      frames: [
        { key: 'prologue-sheet-player-walk', frame: 0 },
        { key: 'prologue-sheet-player-walk', frame: 1 },
        { key: 'prologue-sheet-player-walk', frame: 2 },
        { key: 'prologue-sheet-player-walk', frame: 3 },
        { key: 'prologue-sheet-player-walk', frame: 4 },
        { key: 'prologue-sheet-player-walk', frame: 5 },
        { key: 'prologue-sheet-player-walk', frame: 6 },
        { key: 'prologue-sheet-player-walk', frame: 7 },
      ],
    });
    expect(configByKey.get('player-walk-left')?.frames.map((frame) => frame.frame)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(configByKey.get('player-walk-right')?.frames.map((frame) => frame.frame)).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
    expect(configByKey.get('player-walk-up')?.frames.map((frame) => frame.frame)).toEqual([24, 25, 26, 27, 28, 29, 30, 31]);
  });

  it('moves exactly one grid tile toward the newest horizontal input', () => {
    const { body, keys, player, tweenCalls } = createPlayer();

    keys.left.isDown = true;
    keys.left.timeDown = 10;
    keys.right.isDown = true;
    keys.right.timeDown = 20;

    player.update(0, 16.67);

    expect(tweenCalls).toHaveLength(1);
    expect(tweenCalls[0].x).toBe(100 + PLAYER_GRID_STEP);
    expect(tweenCalls[0].y).toBe(100);
    expect(body.velocity.x).toBe(0);
    expect(body.velocity.y).toBe(0);
    expect(player.getFacingDirection()).toBe('right');
  });

  it('keeps the idle animation facing the completed step direction', () => {
    const { animationPlays, completeLatestStep, keys, player } = createPlayer();

    keys.up.isDown = true;
    keys.up.timeDown = 10;

    player.update(0, 16.67);

    // Release the key before the step completes so that on settle, no input
    // remains and the player drops into the matching idle anim.
    keys.up.isDown = false;
    completeLatestStep();
    player.update(0, 16.67);

    expect(animationPlays[animationPlays.length - 1]).toBe('player-idle-up');
  });

  it('keeps the walk animation playing across chained steps so the cycle does not restart', () => {
    const { animationPlays, completeLatestStep, keys, player } = createPlayer();

    keys.right.isDown = true;
    keys.right.timeDown = 10;
    player.update(0, 16.67);

    // After the first step settles WITH input still held, the player must
    // remain in WALKING state. Re-resetting to idle here would replay the
    // walk anim from frame 0 every 120ms — the bug this test guards against.
    completeLatestStep();

    const lastAnim = animationPlays[animationPlays.length - 1];
    expect(lastAnim).toBe('player-walk-right');
  });

  it('does not start another tile step until the current step finishes', () => {
    const { completeLatestStep, keys, player, tweenCalls } = createPlayer();

    keys.right.isDown = true;
    keys.right.timeDown = 10;

    player.update(0, 16.67);
    player.update(0, 16.67);
    expect(tweenCalls).toHaveLength(1);

    completeLatestStep();
    player.update(0, 16.67);

    // JuiceSystem adds particle tweens on step complete; filter to movement tweens only
    const movementTweens = tweenCalls.filter((c: any) => typeof c.x === 'number' && (c.x === 100 + PLAYER_GRID_STEP || c.x === 100 + PLAYER_GRID_STEP * 2));
    expect(movementTweens.length).toBe(2);
    expect(movementTweens[1].x).toBe(100 + PLAYER_GRID_STEP * 2);
  });

  it('moves left one tile and keeps the sprite unflipped so the left-facing frames read correctly', () => {
    const { animationPlays, body, completeLatestStep, keys, player, sprite, tweenCalls } = createPlayer();

    keys.left.isDown = true;
    keys.left.timeDown = 10;

    player.update(0, 16.67);

    expect(tweenCalls).toHaveLength(1);
    expect(tweenCalls[0].x).toBe(100 - PLAYER_GRID_STEP);
    expect(tweenCalls[0].y).toBe(100);
    expect(body.velocity.x).toBe(0);
    expect(player.getFacingDirection()).toBe('left');
    expect(animationPlays[animationPlays.length - 1]).toBe('player-walk-left');
    expect(sprite.flipX).toBe(false);

    keys.left.isDown = false;
    completeLatestStep();
    player.update(0, 16.67);

    expect(animationPlays[animationPlays.length - 1]).toBe('player-idle-left');
    expect(sprite.flipX).toBe(false);
  });

  it('resets flipX when re-entering idle after any directional step', () => {
    const { completeLatestStep, keys, player, sprite } = createPlayer();

    // Simulate legacy code path leaving flipX set to true from a prior frame.
    sprite.flipX = true;

    keys.down.isDown = true;
    keys.down.timeDown = 5;
    player.update(0, 16.67);
    completeLatestStep();

    expect(sprite.flipX).toBe(false);
  });

  it('relies on Body.setSize auto-centering for alignment and does not override it with setOffset', () => {
    const { body } = createPlayer();

    expect(body.calls.setOffset).toBe(0);
  });

  it('does not configure world-bounds collision since movement is tween-driven, not physics-driven', () => {
    const { body } = createPlayer();

    expect(body.calls.setCollideWorldBounds).toBe(0);
  });

  it('does not touch body.velocity from update() because movement never sets a non-zero velocity', () => {
    const { body, completeLatestStep, keys, player } = createPlayer();
    const baselineVelocityCalls = body.calls.setVelocity;

    keys.right.isDown = true;
    keys.right.timeDown = 10;
    player.update(0, 16.67);
    completeLatestStep();
    player.update(0, 16.67);

    expect(body.calls.setVelocity).toBe(baselineVelocityCalls);
  });

  it('blocks a tile step when the target position is not walkable', () => {
    const { keys, player, tweenCalls } = createPlayer(({ x }) => x <= 100);

    keys.right.isDown = true;
    keys.right.timeDown = 10;
    player.update(0, 16.67);

    expect(tweenCalls).toHaveLength(0);
    expect(player.getPosition()).toEqual({ x: 100, y: 100 });
    expect(player.getFacingDirection()).toBe('right');
  });

  it('does not finish a partially completed step when movement is interrupted', () => {
    const { body, keys, player, sprite } = createPlayer();

    keys.right.isDown = true;
    keys.right.timeDown = 10;
    player.update(0, 16.67);

    sprite.setPosition(116, 100);
    player.freeze();

    expect(player.getPosition()).toEqual({ x: 116, y: 100 });
    expect(body.calls.resets[body.calls.resets.length - 1]).toEqual({ x: 116, y: 100 });
  });

  it('clears buffered input when movement is interrupted', () => {
    const { keys, player, sprite, tweenCalls } = createPlayer();

    keys.right.isDown = true;
    keys.right.timeDown = 10;
    player.update(0, 16.67);

    keys.down.isDown = true;
    keys.down.timeDown = 20;
    player.update(0, 16.67);

    keys.right.isDown = false;
    keys.down.isDown = false;
    sprite.setPosition(116, 100);

    player.freeze();
    player.unfreeze();
    player.update(0, 16.67);

    expect(tweenCalls).toHaveLength(1);
    expect(player.getPosition()).toEqual({ x: 116, y: 100 });
  });
});
