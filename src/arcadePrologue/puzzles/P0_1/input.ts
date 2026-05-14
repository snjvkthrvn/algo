import Phaser from 'phaser';

/**
 * Input plumbing: keyboard verbs + pointer pick/hover wiring.
 * Returns a teardown that removes every listener it added.
 */

export type InputHandlers = {
  onSteer: (dx: number, dy: number) => void;
  onPickWorld: (x: number, y: number) => void;
  onHoverWorld: (x: number, y: number) => void;
  onReplay: () => void;
  onToggleReduceMotion: () => void;
};

export function bindInput(scene: Phaser.Scene, h: InputHandlers): () => void {
  const keyboard = scene.input.keyboard!;
  const codes = Phaser.Input.Keyboard.KeyCodes;

  const keys = {
    r: keyboard.addKey(codes.R),
    m: keyboard.addKey(codes.M),
    w: keyboard.addKey(codes.W),
    s: keyboard.addKey(codes.S),
    a: keyboard.addKey(codes.A),
    d: keyboard.addKey(codes.D),
    up: keyboard.addKey(codes.UP),
    down: keyboard.addKey(codes.DOWN),
    left: keyboard.addKey(codes.LEFT),
    right: keyboard.addKey(codes.RIGHT),
  };

  const up = (): void => h.onSteer(0, -1);
  const down = (): void => h.onSteer(0, 1);
  const left = (): void => h.onSteer(-1, 0);
  const right = (): void => h.onSteer(1, 0);

  keys.r.on('down', h.onReplay);
  keys.m.on('down', h.onToggleReduceMotion);
  keys.w.on('down', up);
  keys.up.on('down', up);
  keys.s.on('down', down);
  keys.down.on('down', down);
  keys.a.on('down', left);
  keys.left.on('down', left);
  keys.d.on('down', right);
  keys.right.on('down', right);

  const onPointerDown = (p: Phaser.Input.Pointer): void => h.onPickWorld(p.worldX, p.worldY);
  const onPointerMove = (p: Phaser.Input.Pointer): void => h.onHoverWorld(p.worldX, p.worldY);
  scene.input.on('pointerdown', onPointerDown);
  scene.input.on('pointermove', onPointerMove);

  return (): void => {
    scene.input.off('pointerdown', onPointerDown);
    scene.input.off('pointermove', onPointerMove);
    Object.values(keys).forEach((k) => k.removeAllListeners());
  };
}
