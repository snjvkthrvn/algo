import Phaser from 'phaser';

/**
 * Free-roam input plumbing for the Flow Consoles puzzle.
 *
 *   readDirection()         — polled each tick; returns normalized {dx, dy} of held keys.
 *   onInteract              — discrete 'down' callback on E / Space (pickup / place).
 *   onToggleReduceMotion    — discrete 'down' callback on M.
 *
 * Returns:
 *   { sample, unbind } — call sample() in scene.update; unbind() in shutdown.
 */

export type FlowInputHandlers = {
  onInteract: () => void;
  onToggleReduceMotion: () => void;
};

export type FlowInputSampler = {
  sample: () => { dx: number; dy: number };
  unbind: () => void;
};

export function bindFlowInput(scene: Phaser.Scene, h: FlowInputHandlers): FlowInputSampler {
  const kb = scene.input.keyboard!;
  const codes = Phaser.Input.Keyboard.KeyCodes;

  const keys = {
    w: kb.addKey(codes.W),
    a: kb.addKey(codes.A),
    s: kb.addKey(codes.S),
    d: kb.addKey(codes.D),
    up: kb.addKey(codes.UP),
    down: kb.addKey(codes.DOWN),
    left: kb.addKey(codes.LEFT),
    right: kb.addKey(codes.RIGHT),
    e: kb.addKey(codes.E),
    space: kb.addKey(codes.SPACE),
    m: kb.addKey(codes.M),
  };

  keys.e.on('down', h.onInteract);
  keys.space.on('down', h.onInteract);
  keys.m.on('down', h.onToggleReduceMotion);

  function sample(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    if (keys.a.isDown || keys.left.isDown) dx -= 1;
    if (keys.d.isDown || keys.right.isDown) dx += 1;
    if (keys.w.isDown || keys.up.isDown) dy -= 1;
    if (keys.s.isDown || keys.down.isDown) dy += 1;
    // Normalize diagonals so the player isn't sqrt(2)x faster diagonally
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  function unbind(): void {
    Object.values(keys).forEach((k) => k.removeAllListeners());
  }

  return { sample, unbind };
}
