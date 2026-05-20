import Phaser from 'phaser';
import { COLORS, TYPE } from '../tokens';
import type { GridPos } from '../isogrid';

/**
 * Left-side code-trace panel.
 *
 * Shows the round's path as an array with live progress:
 *   path[0]  •  ✓
 *   path[1]  ↑  ▶  ← player is here
 *   path[2]  →  ?
 *
 * Gives the puzzle explicit CS framing — the player is executing
 * a sequence by index, not just walking tiles.
 */

type Destroyable = { destroy(): void };

const MONO = '"Courier New", "Lucida Console", monospace';
const DEPTH = 65;

// Panel geometry
const PX = 16;
const PY = 210; // sits below the HUD panel (which ends ~y 204)
const PW = 260;
const HEADER_H = 38;
const ROW_H = 26;

function dirArrow(path: GridPos[], i: number): string {
  if (i === 0) return '*';
  const prev = path[i - 1]!;
  const curr = path[i]!;
  if (curr === prev) return 'R';
  if (curr.row > prev.row) return 'D';
  if (curr.row < prev.row) return 'U';
  if (curr.col > prev.col) return '>';
  return '<';
}

export type SequencePanel = {
  /** Call after every correct hop. hopIndex = current player path index. */
  update(hopIndex: number): void;
  destroy(): void;
};

export function createSequencePanel(scene: Phaser.Scene, path: GridPos[]): SequencePanel {
  const totalH = HEADER_H + path.length * ROW_H + 10;
  const objects: Destroyable[] = [];

  // Background
  const bg = scene.add.graphics().setDepth(DEPTH);
  bg.fillStyle(COLORS.surface.glass, 0.88);
  bg.fillRoundedRect(PX, PY, PW, totalH, 6);
  bg.lineStyle(1, COLORS.surface.line, 0.6);
  bg.strokeRoundedRect(PX, PY, PW, totalH, 6);
  objects.push(bg);

  // "SEQUENCE" eyebrow label
  const lbl = scene.add
    .text(PX + 12, PY + 11, 'SEQUENCE', {
      ...(TYPE.eyebrow as object),
      fontSize: '11px',
    } as Phaser.Types.GameObjects.Text.TextStyle)
    .setDepth(DEPTH + 1);
  objects.push(lbl);

  // Divider
  const div = scene.add.graphics().setDepth(DEPTH + 1);
  div.lineStyle(1, COLORS.surface.line, 0.4);
  div.lineBetween(PX + 8, PY + HEADER_H - 4, PX + PW - 8, PY + HEADER_H - 4);
  objects.push(div);

  // Precompute direction arrows
  const arrows = path.map((_, i) => dirArrow(path, i));

  // Row texts
  const rowTexts: Phaser.GameObjects.Text[] = [];
  const statusTexts: Phaser.GameObjects.Text[] = [];

  for (let i = 0; i < path.length; i++) {
    const ry = PY + HEADER_H + i * ROW_H + 2;

    const row = scene.add
      .text(PX + 12, ry, `path[${i}]  ${arrows[i]}`, {
        fontFamily: MONO,
        fontSize: '13px',
        color: COLORS.text.muted,
      })
      .setDepth(DEPTH + 1);
    rowTexts.push(row);
    objects.push(row);

    const status = scene.add
      .text(PX + PW - 26, ry, '?', {
        fontFamily: MONO,
        fontSize: '13px',
        color: COLORS.text.muted,
      })
      .setDepth(DEPTH + 1);
    statusTexts.push(status);
    objects.push(status);
  }

  function update(hopIndex: number): void {
    for (let i = 0; i < path.length; i++) {
      if (i < hopIndex) {
        rowTexts[i]!.setColor(COLORS.text.muted);
        statusTexts[i]!.setText('OK').setColor('#4ade80');
      } else if (i === hopIndex) {
        rowTexts[i]!.setColor(COLORS.text.primary);
        statusTexts[i]!.setText('>').setColor(COLORS.text.accent);
      } else {
        rowTexts[i]!.setColor(COLORS.text.muted);
        statusTexts[i]!.setText('?').setColor(COLORS.text.muted);
      }
    }
  }

  // Show initial state
  update(0);

  return {
    update,
    destroy: () => objects.forEach((o) => o.destroy()),
  };
}
