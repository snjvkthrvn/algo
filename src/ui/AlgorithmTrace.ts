/**
 * AlgorithmTrace - Side panel showing pseudocode with one line highlighted
 * at a time, and live variable bindings.
 *
 * Used by interactive puzzles to bridge the symbolic algorithm and the
 * physical action: when the player presses a key, the relevant pseudocode
 * line lights up so they see what their input *means* in algorithm terms.
 *
 * ## Live state bindings
 *
 * Each line may contain `{var}` placeholders. When the scene calls
 * `bindState({ var: value, … })`, every placeholder across every line is
 * substituted and the panel re-renders. This turns the trace from a static
 * sticker into a live debugger view — players see `a[i] = 4 > a[i+1] = 3`
 * not `a[i] > a[i+1]`, so the algorithm becomes a moment-by-moment
 * conversation between code and board.
 *
 * Backwards-compatible: lines without placeholders behave exactly as before.
 *
 * ## Multi-highlight
 *
 * `highlightLine(index)` still moves a single sliding highlight bar. For
 * puzzles where two lines fire together (e.g. sliding window's `s -= leaver`
 * and `s += arriver`), pass a [primary, secondary] pair to `highlightLines`.
 * The secondary line gets a dimmer accent.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { drawPanel } from './panel';

export interface AlgorithmTraceOptions {
  x: number;
  y: number;
  width: number;
  title: string;
  /**
   * Pseudocode lines. May contain `{var}` placeholders, replaced via
   * `bindState`. Use double-brace `{{var}}` for a literal `{var}`.
   */
  lines: string[];
}

/**
 * State map for placeholder substitution. Values are coerced to strings via
 * `String(value)`; `null` / `undefined` substitute as `—`.
 */
export type TraceState = Record<string, string | number | null | undefined>;

const MISSING_VALUE = '—';

export class AlgorithmTrace {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly templates: ReadonlyArray<string>;
  private readonly lineTexts: Phaser.GameObjects.Text[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private readonly secondaryHighlight: Phaser.GameObjects.Rectangle;
  private currentLine = -1;
  private currentSecondary = -1;
  private readonly lineHeight = 18;
  private readonly contentX: number;
  private readonly contentY: number;
  private state: TraceState = {};

  constructor(scene: Phaser.Scene, options: AlgorithmTraceOptions) {
    this.scene = scene;
    this.contentX = options.x + 14;
    this.contentY = options.y + 36;
    this.templates = options.lines;

    const panelHeight = 44 + options.lines.length * this.lineHeight + 16;
    this.panel = drawPanel(scene, options.x, options.y, options.width, panelHeight, {
      depth: 25,
      fill: 0x081820,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 0.92,
      shadow: true,
      accent: COLORS.CYAN_GLOW,
    });

    this.title = scene.add.text(options.x + 22, options.y + 12, options.title, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.CYAN_GLOW,
    }).setOrigin(0, 0).setDepth(26);

    // Primary highlight bar — slides to the active line.
    this.highlight = scene.add.rectangle(
      options.x + options.width / 2,
      this.contentY + this.lineHeight / 2 - 2,
      options.width - 24,
      this.lineHeight - 2,
      COLORS.CYAN_GLOW,
      0.22
    ).setOrigin(0.5).setDepth(26).setVisible(false);

    // Secondary highlight — for paired lines (e.g. window slide subtract +
    // window slide add fire together). Dimmer than primary.
    this.secondaryHighlight = scene.add.rectangle(
      options.x + options.width / 2,
      this.contentY + this.lineHeight / 2 - 2,
      options.width - 24,
      this.lineHeight - 2,
      COLORS.CYAN_GLOW,
      0.10
    ).setOrigin(0.5).setDepth(26).setVisible(false);

    options.lines.forEach((_, i) => {
      const text = scene.add.text(this.contentX, this.contentY + i * this.lineHeight, '', {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: COLOR_HEX.TEXT_MUTED,
      }).setOrigin(0, 0).setDepth(27);
      this.lineTexts.push(text);
    });

    this.rerender();
  }

  /** Highlight a specific line index. -1 clears the highlight. */
  highlightLine(index: number): void {
    this.highlightLines(index, -1);
  }

  /**
   * Highlight a primary and (optionally) secondary line. Useful for the
   * "two things happen at once" pattern in sliding-window puzzles.
   */
  highlightLines(primary: number, secondary: number): void {
    if (primary === this.currentLine && secondary === this.currentSecondary) return;
    this.currentLine = primary;
    this.currentSecondary = secondary;

    this.lineTexts.forEach((t, i) => {
      if (i === primary) t.setColor(COLOR_HEX.TEXT_LIGHT);
      else if (i === secondary) t.setColor(COLOR_HEX.CYAN_GLOW);
      else t.setColor(COLOR_HEX.TEXT_MUTED);
    });

    this.positionHighlight(this.highlight, primary);
    this.positionHighlight(this.secondaryHighlight, secondary);
  }

  /**
   * Bind named variables to values. Placeholders `{name}` in line templates
   * are replaced with the bound value. Undefined / null values render as `—`.
   * Calling with `{}` clears all bindings.
   *
   * Re-renders every line. Cheap — under 10 lines per panel.
   */
  bindState(state: TraceState): void {
    this.state = state;
    this.rerender();
  }

  /** Returns the current binding map (read-only snapshot). */
  getState(): Readonly<TraceState> {
    return this.state;
  }

  destroy(): void {
    this.panel.destroy();
    this.title.destroy();
    for (const t of this.lineTexts) t.destroy();
    this.lineTexts.length = 0;
    this.highlight.destroy();
    this.secondaryHighlight.destroy();
  }

  // ──────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────

  private positionHighlight(
    rect: Phaser.GameObjects.Rectangle,
    index: number,
  ): void {
    if (index < 0 || index >= this.lineTexts.length) {
      rect.setVisible(false);
      return;
    }
    const targetY = this.contentY + index * this.lineHeight + this.lineHeight / 2 - 2;
    rect.setVisible(true);
    this.scene.tweens.add({
      targets: rect,
      y: targetY,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  /** Re-substitute every template line and update its text object. */
  private rerender(): void {
    this.templates.forEach((template, i) => {
      const text = this.lineTexts[i];
      if (!text) return;
      text.setText(`${i + 1}. ${this.substitute(template)}`);
    });
  }

  /**
   * Replace `{var}` placeholders with bound values. Escape via `{{`/`}}` for
   * literal braces in templates that need them.
   */
  private substitute(template: string): string {
    // Two-pass: first protect escaped braces with a sentinel, then substitute.
    const PROTECT_OPEN = '';
    const PROTECT_CLOSE = '';
    const protect = template.replace(/\{\{/g, PROTECT_OPEN).replace(/\}\}/g, PROTECT_CLOSE);
    const substituted = protect.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, name) => {
      const value = this.state[name];
      if (value === undefined || value === null) return MISSING_VALUE;
      return String(value);
    });
    return substituted.replace(new RegExp(PROTECT_OPEN, 'g'), '{').replace(new RegExp(PROTECT_CLOSE, 'g'), '}');
  }
}
