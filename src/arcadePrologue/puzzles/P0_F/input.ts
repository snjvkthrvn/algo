import Phaser from 'phaser';

export type LitanyInputHandlers = {
  onReplay: () => void;
  onToggleReduceMotion: () => void;
};

export function bindLitanyInput(
  scene: Phaser.Scene,
  h: LitanyInputHandlers,
): () => void {
  const kb = scene.input.keyboard!;
  const codes = Phaser.Input.Keyboard.KeyCodes;
  const r = kb.addKey(codes.R);
  const m = kb.addKey(codes.M);
  r.on('down', h.onReplay);
  m.on('down', h.onToggleReduceMotion);
  return (): void => {
    r.removeAllListeners();
    m.removeAllListeners();
  };
}
