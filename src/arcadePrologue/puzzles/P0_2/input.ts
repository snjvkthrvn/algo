import Phaser from 'phaser';

export type FlowInputHandlers = {
  onReplay: () => void;
  onToggleReduceMotion: () => void;
};

export function bindFlowInput(scene: Phaser.Scene, h: FlowInputHandlers): () => void {
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
