/**
 * BasePuzzleScene - Abstract puzzle UI framework.
 * Provides retro frame, buttons, star rating, metrics, hint lifecycle.
 * Preserved and enhanced from original 485-line implementation.
 */

import { COLORS, COLOR_HEX, FONTS, SCENE_KEYS } from '../../config/constants';
import { getImageAssetPath, PROLOGUE_REWORK_KEYS, VISUAL_REVAMP_KEYS } from '../../config/assets';
import { colorToHex } from '../../utils/colors';
import { createRetroButton, updateButtonText, disableButton } from '../../ui/RetroButton';
import { showStarRating } from '../../ui/StarRating';
import { drawPanel } from '../../ui/panel';
import { audioManager } from '../../core/AudioManager';
import { gameState } from '../../core/GameStateManager';
import { TransitionManager } from '../../core/TransitionManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { a11yManager } from '../../core/A11yManager';
import type { ConceptBridgeData } from '../../data/types';
import { PARCHMENT_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import { RegionBackdrop, type RegionBackdropId, type RegionBackdropOptions } from '../../ui/RegionBackdrop';
import { GLITCH_FAILURE_TAUNTS } from '../../data/dialogue/glitch_dialogue';
import { PuzzleCursor } from '../../ui/PuzzleCursor';
import { PuzzleKinetics, type PuzzleActionKind } from '../../ui/PuzzleKinetics';

/**
 * Module-scope so it survives scene.restart() — Phaser destroys the Scene
 * instance on restart, so any state we want to carry into the rebuilt
 * scene has to live above the instance. Cleared once the rebuilt scene
 * picks it up. The audit flagged that "the world goes silent on failure"
 * was a real problem; this is the smallest possible "world reacts" hook.
 */
let pendingFailureTaunt: string | null = null;

export abstract class BasePuzzleScene extends Phaser.Scene {
  // UI Elements
  protected uiContainer!: Phaser.GameObjects.Container;
  protected puzzleFrame!: Phaser.GameObjects.Graphics;
  protected titleText!: Phaser.GameObjects.Text;
  protected instructionText!: Phaser.GameObjects.Text;
  protected hintButton!: Phaser.GameObjects.Container;
  protected exitButton!: Phaser.GameObjects.Container;
  protected starContainer!: Phaser.GameObjects.Container;
  protected puzzleCursor!: PuzzleCursor;
  private puzzleKinetics: PuzzleKinetics | null = null;

  // Puzzle State
  protected puzzleId: string = '';
  protected puzzleName: string = '';
  protected puzzleDescription: string = '';
  protected attempts: number = 0;
  protected startTime: number = 0;
  protected hintsUsed: number = 0;
  protected maxHints: number = 3;
  protected returnScene: string = SCENE_KEYS.PROLOGUE;

  private exitConfirmUntil = 0;
  private isExitingPuzzle = false;
  private readonly onPuzzleEsc = () => this.requestExitPuzzle();
  private readonly onPuzzleH = () => this.showHint();
  private readonly onPuzzleR = () => this.restartPuzzle();

  constructor(config: { key: string }) {
    super(config);
  }

  init(data: {
    returnScene?: string;
    puzzleData?: Record<string, unknown>;
    previousAttempts?: number;
    previousHintsUsed?: number;
  }): void {
    this.returnScene = data.returnScene || SCENE_KEYS.PROLOGUE;
    this.startTime = Date.now();
    this.attempts = data.previousAttempts || 0;
    this.hintsUsed = data.previousHintsUsed || 0;
  }

  create(): void {
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
    // Fade in via tween overlay
    const { width: fw, height: fh } = this.cameras.main;
    const fadeIn = this.add.rectangle(0, 0, fw, fh, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 300,
      onComplete: () => fadeIn.destroy(),
    });

    audioManager.setScene(this);
    this.createPuzzleUI();
    this.puzzleCursor = new PuzzleCursor(this);
    this.setupKeyboardShortcuts();

    // Float a queued Glitch failure taunt above the puzzle frame, after
    // the fade-in clears (~300ms) so the text reads on a settled scene
    // instead of mid-fade. No-op when no taunt is queued.
    this.time.delayedCall(380, () => this.maybeShowFailureTaunt());
  }

  preload(): void {
    const imageKeys = [
      this.getPuzzleBackdropKey(),
      VISUAL_REVAMP_KEYS.PUZZLE_FRAME,
      PROLOGUE_REWORK_KEYS.PUZZLE_CHAMBER_FRAME,
      // Diegetic lesson-card backgrounds (NineSlice). Loaded for every puzzle
      // so showLessonCard() can render the region-themed in-world card.
      VISUAL_REVAMP_KEYS.LESSON_CARD_AP,
      VISUAL_REVAMP_KEYS.LESSON_CARD_TR,
    ].filter((key): key is string => Boolean(key));

    for (const key of imageKeys) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) this.load.image(key, path);
    }
  }

  protected createPuzzleUI(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0, 0).setDepth(-30);

    // Round-3 art-pass fix: ALWAYS render the static pixel-art backdrop as the
    // base layer. The earlier "static OR procedural (XOR)" toggle forced a
    // choice between the painted region texture (great) and the procedural
    // graphics (greybox cartoon). The clean answer is additive: paint the
    // real backdrop, then overlay particles for life. See the round-3 audit
    // (.tmp/audit_round3_phase2_visual.txt) for screenshots showing the
    // before-state — "MS Paint" / "literal solid blocks of color" / score 1.
    const backdropKey = this.getPuzzleBackdropKey();
    const resolvedBackdropKey = backdropKey && this.textures.exists(backdropKey)
      ? backdropKey
      : PROLOGUE_REWORK_KEYS.PUZZLE_CHAMBER_FRAME;
    const hasBackdrop = this.textures.exists(resolvedBackdropKey);

    if (hasBackdrop) {
      this.add
        .image(width / 2, height / 2, resolvedBackdropKey)
        .setDisplaySize(width, height)
        .setDepth(-29);
    } else {
      this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1)
        .setOrigin(0, 0)
        .setDepth(-28);
    }

    // Round-6 atmospheric treatment — push the painted backdrop BACK so the
    // central playfield becomes the focal layer. Without this the bright,
    // busy region art competes with the gameplay tiles/cards and the screen
    // reads as "backdrop + foreground stickers." See applyBackdropTreatment.
    this.applyBackdropTreatment(width, height);

    this.uiContainer = this.add.container(0, 0);

    // Region-themed procedural backdrop — now strictly an additive PARTICLE
    // overlay (motes, shimmer, river caustics) sitting ON TOP of the static
    // backdrop. The build* functions in RegionBackdrop were stripped to
    // motion-only as part of this same round-3 fix; they no longer paint
    // sky/sun/hills/windmill/barn/wheat (those come from the static texture).
    const region = this.getRegionBackdrop();
    if (region) {
      new RegionBackdrop(this, region.id, region.options);
      this.puzzleKinetics = new PuzzleKinetics(this, {
        themeId: this.getPuzzleTheme().id,
        width,
        height,
      });
    }

    this.createPuzzleFrame(width, height);
    this.createTitleArea(width);
    this.createControlButtons(width);
    this.createStarRatingContainer(width);
    this.addStatusIndicator(width, height);
    this.createPuzzleControlsStrip(width, height);
  }

  /**
   * Atmospheric backdrop treatment (Round-6). The painted region backdrops
   * render at full brightness/detail, so foreground gameplay sat on them like
   * stickers. Two cheap layers fix the depth read:
   *   1. A flat, region-tinted darken over the whole backdrop — pushes it back
   *      a uniform notch (warm-dark for the farm, cool-dark for the river,
   *      cosmic for the void).
   *   2. A shared radial vignette (transparent centre → dark edges) that funnels
   *      the eye to the central playfield and softly frames the scene.
   * Both are theme-driven; later regions set the alphas to 0 (no-op) since they
   * don't paint a region backdrop. The darken sits just above the backdrop
   * image (-27); the vignette sits above the particle haze (-7) so even the
   * drifting motes/leaves dim toward the corners for one cohesive image.
   */
  protected applyBackdropTreatment(width: number, height: number): void {
    const theme = this.getPuzzleTheme();

    if (theme.backdropDarkenAlpha > 0) {
      this.add
        .rectangle(0, 0, width, height, theme.backdropDarken, theme.backdropDarkenAlpha)
        .setOrigin(0, 0)
        .setDepth(-27)
        .setScrollFactor(0);
    }

    if (theme.backdropVignetteAlpha > 0) {
      const key = this.ensureVignetteTexture(width, height);
      if (key) {
        this.add
          .image(width / 2, height / 2, key)
          .setDisplaySize(width, height)
          .setDepth(-7)
          .setAlpha(theme.backdropVignetteAlpha)
          .setScrollFactor(0);
      }
    }
  }

  /**
   * Lazily build a soft radial-gradient vignette texture (transparent centre,
   * dark edges) once and reuse it across scenes/restarts. Canvas-2D radial
   * gradients give a far smoother falloff than stacking Graphics rings, and the
   * single shared neutral-dark texture is tinted per-region by the flat darken
   * layer rather than by re-baking the texture. Returns null if the renderer
   * refuses the canvas texture (defensive — never observed in practice).
   */
  private ensureVignetteTexture(width: number, height: number): string | null {
    const key = 'puzzle-vignette';
    if (this.textures.exists(key)) return key;

    const canvasTex = this.textures.createCanvas(key, width, height);
    if (!canvasTex) return null;

    const ctx = canvasTex.getContext();
    const cx = width / 2;
    const cy = height / 2;
    const inner = Math.min(width, height) * 0.30;
    const outer = Math.hypot(width, height) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(6,8,16,0)');
    grad.addColorStop(0.62, 'rgba(6,8,16,0.22)');
    grad.addColorStop(1, 'rgba(5,7,14,0.60)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    canvasTex.refresh();

    return key;
  }

  /** Bottom bar — matches overworld legend; M mute is registered on the CRT overlay scene. */
  protected createPuzzleControlsStrip(width: number, height: number): void {
    // Round-5 chrome unification — keyboard-hint strip palette now comes
    // from the active theme. Lets the AP strip read as a carved wooden
    // beam and the TR strip read as a river-stone slab, instead of every
    // region sharing the same cyan-and-gold tech bar.
    const theme = this.getPuzzleTheme();
    const stripW = Math.min(width - 96, 760);
    const stripH = 32;
    drawPanel(this, width / 2 - stripW / 2, height - stripH - 8, stripW, stripH, {
      depth: 4999,
      fill: theme.hudHintStripFill,
      frame: theme.hudHintStripFrame,
      inner: theme.hudHintStripInner,
      alpha: 0.78,
      shadow: true,
      shadowAlpha: 0.22,
      accent: theme.hudHintStripAccent,
      accentSide: 'top',
    });

    this.add
      .text(
        width / 2,
        height - 16,
        'SPACE: ACT   H: HINT   R: RESTART   ESC: EXIT   M: MUTE',
        {
          fontSize: '8px',
          fontFamily: FONTS.RETRO,
          color: COLOR_HEX.TEXT_LIGHT,
        },
      )
      .setOrigin(0.5, 1)
      .setAlpha(0.9)
      .setDepth(5000)
      .setScrollFactor(0);
  }

  protected getPuzzleBackdropKey(): string | null {
    // Region-aware default: when a puzzle has opted into a region backdrop
    // (via getRegionBackdrop()), use that region's painted texture as the
    // static base layer. Subclasses can still override to pick a different
    // texture (e.g., a puzzle-specific painted backdrop).
    const region = this.getRegionBackdrop();
    switch (region?.id) {
      case 'prologue':     return VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG;
      case 'array-plains': return VISUAL_REVAMP_KEYS.PUZZLE_ARRAY_ACTION_ARENA_BG;
      case 'twin-rivers':  return VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG;
      default:             return VISUAL_REVAMP_KEYS.PUZZLE_FRAME;
    }
  }

  /**
   * Diegetic label for the puzzle-frame eyebrow (replaces the engineering
   * "PUZZLE MODULE" wording). Defaults are region-aware: Array Plains shows
   * "FARMSTEAD", Twin Rivers shows "RIVERSIDE", etc. Children can override
   * for puzzle-specific copy. The intent is that nothing on the puzzle
   * screen reads as "software UI" — every label should sound like it
   * belongs in the world the player is currently inhabiting.
   */
  protected getModuleLabel(): string {
    const region = this.getRegionBackdrop();
    switch (region?.id) {
      case 'prologue': return 'CHAMBER';
      case 'array-plains': return 'FARMSTEAD';
      case 'twin-rivers': return 'RIVERSIDE';
      default: return 'TRIAL';
    }
  }

  /** Status-dot label, shortened from "MODULE READY" — the dot itself is
   *  the indicator; the word just confirms state. */
  protected getReadyLabel(): string {
    return 'READY';
  }

  /**
   * Opt a puzzle into the region-themed procedural backdrop. Returning a non
   * null value here skips the static `getPuzzleBackdropKey()` image and paints
   * the animated region scene (drifting stars / swaying wheat / flowing rivers)
   * for the full puzzle surface.
   *
   * Used by the three production regions: prologue, array-plains, twin-rivers.
   */
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return null;
  }

  protected getPuzzleFrameFillAlpha(): number {
    return this.getPuzzleTheme().frameFillAlpha;
  }

  /** Override to use a different chrome palette (e.g., the prologue chamber). */
  protected getPuzzleTheme(): PuzzleTheme {
    return PARCHMENT_PUZZLE_THEME;
  }

  /**
   * Themed in-world status readout (Round-6.5 de-sticker).
   *
   * The per-region status / round lines were `add.text` with a flat bright
   * mint `backgroundColor: '#e0f8d0'` and an empty-string start. A Phaser Text
   * paints its `backgroundColor` padding box even with no glyphs, so before the
   * first `refresh*()` they rendered as a naked pale square floating over the
   * painted backdrop ("looks like a kid just put things together"). Even once
   * populated, the bright mint chip clashed with the dark vignetted scenes.
   *
   * This builds the readout as backgroundless light text with a dark outline
   * instead: legible over any backdrop, consistent with the floating subtitle /
   * keybind texts, and — crucially — invisible when empty, because a stroke
   * paints nothing without glyphs. One idiom, every region, so it flows.
   */
  protected createStatusReadout(
    x: number,
    y: number,
    opts: { fontSize?: number; font?: string } = {},
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, '', {
        fontSize: `${opts.fontSize ?? 12}px`,
        fontFamily: opts.font ?? FONTS.MONO,
        color: '#eaf6f2',
        stroke: '#06141c',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  protected createPuzzleFrame(width: number, height: number): void {
    const theme = this.getPuzzleTheme();
    const padding = 40;
    const frameWidth = width - padding * 2;
    const frameHeight = height - padding * 2;

    this.puzzleFrame = this.add.graphics();

    const fillAlpha = this.getPuzzleFrameFillAlpha();

    // Shadow — tracks the fill alpha so that puzzles opting into a fully
    // transparent frame (region-themed puzzles) don't leave a stray dark slab
    // floating over the procedural backdrop.
    if (fillAlpha > 0) {
      this.puzzleFrame.fillStyle(0x000000, 0.5);
      this.puzzleFrame.fillRoundedRect(padding + 4, padding + 4, frameWidth, frameHeight, 8);

      this.puzzleFrame.fillStyle(theme.frameFill, fillAlpha);
      this.puzzleFrame.fillRoundedRect(padding, padding, frameWidth, frameHeight, 8);
    }

    // Outer border
    this.puzzleFrame.lineStyle(3, theme.frameOuterStroke, theme.frameOuterStrokeAlpha);
    this.puzzleFrame.strokeRoundedRect(padding, padding, frameWidth, frameHeight, 8);

    // Inner border
    this.puzzleFrame.lineStyle(1, theme.frameInnerStroke, theme.frameInnerStrokeAlpha);
    this.puzzleFrame.strokeRoundedRect(padding + 6, padding + 6, frameWidth - 12, frameHeight - 12, 6);

    this.puzzleFrame.setAlpha(0);
    this.uiContainer.add(this.puzzleFrame);

    // CRT scanlines — added before title/buttons so they render underneath.
    this.addScanlines(width, height, padding);

    // Decorative line grows from center outward after frame fades in.
    const lineY = padding + 70;
    const lineRect = this.add.rectangle(width / 2, lineY, frameWidth - 240, 2, 0x346856, 0.5);
    lineRect.setScale(0, 1);
    this.uiContainer.add(lineRect);

    // Frame fade-in
    this.tweens.add({
      targets: this.puzzleFrame,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
    });

    // Line grows after frame is visible
    this.tweens.add({
      targets: lineRect,
      scaleX: 1,
      duration: 500,
      delay: 280,
      ease: 'Power3.easeOut',
    });

    // Corner accents snap in after the frame settles
    this.time.delayedCall(200, () => this.addCornerAccents(width, height, padding));

    // Production polish: subtle living pulse on the frame to make the puzzle chamber feel alive
    this.tweens.add({
      targets: this.puzzleFrame,
      alpha: 0.92,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 600,
    });
  }

  private addScanlines(width: number, height: number, padding: number): void {
    const theme = this.getPuzzleTheme();
    const g = this.add.graphics();
    g.fillStyle(0x000000, theme.scanlineAlpha);
    for (let scanY = padding + 2; scanY < height - padding; scanY += 4) {
      g.fillRect(padding + 1, scanY, width - padding * 2 - 2, 1);
    }
    g.setAlpha(0);
    this.uiContainer.add(g);
    this.tweens.add({ targets: g, alpha: 1, duration: 400, delay: 300, ease: 'Power1' });
  }

  private addCornerAccents(width: number, height: number, padding: number): void {
    const accent = this.getPuzzleTheme().cornerAccent;
    const arm = 22;
    const corners: { x: number; y: number; hDir: number; vDir: number }[] = [
      { x: padding, y: padding, hDir: 1, vDir: 1 },
      { x: width - padding, y: padding, hDir: -1, vDir: 1 },
      { x: padding, y: height - padding, hDir: 1, vDir: -1 },
      { x: width - padding, y: height - padding, hDir: -1, vDir: -1 },
    ];
    corners.forEach(({ x, y, hDir, vDir }, i) => {
      const g = this.add.graphics();
      g.lineStyle(3, accent, 1);
      g.beginPath();
      g.moveTo(x + hDir * arm, y);
      g.lineTo(x, y);
      g.lineTo(x, y + vDir * arm);
      g.strokePath();
      g.setAlpha(0);
      this.uiContainer.add(g);
      this.tweens.add({ targets: g, alpha: 1, duration: 180, delay: i * 70, ease: 'Power2.easeOut' });
    });
  }

  protected createTitleArea(width: number): void {
    const theme = this.getPuzzleTheme();
    const titlePanelW = Math.min(width - 240, 760);
    const titlePanelX = Math.round(width / 2 - titlePanelW / 2);

    this.titleText = this.add.text(width / 2, 70, this.puzzleName, {
      fontSize: '20px',
      fontFamily: FONTS.RETRO,
      color: theme.titleColor,
      stroke: theme.titleStroke,
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Instruction text uses the theme's body color so contrast holds on either
    // the cream parchment surface or the dark chamber surface.
    this.instructionText = this.add.text(width / 2 - 64, 112, this.puzzleDescription, {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: theme.bodyColor,
      align: 'center',
      wordWrap: { width: titlePanelW - 80, useAdvancedWrap: true },
    }).setOrigin(0.5).setAlpha(0);

    const titlePanel = drawPanel(this, titlePanelX, 48, titlePanelW, 90, {
      depth: 0,
      fill: theme.titlePanelFill,
      frame: theme.titlePanelFrame,
      inner: theme.titlePanelInner,
      alpha: theme.titlePanelAlpha,
      shadow: true,
      shadowAlpha: 0.24,
      // Round-5: was always COLORS.CYAN_GLOW — now theme-aware so the title
      // banner's top edge matches the active region's accent colour.
      accent: theme.titlePanelAccent,
      accentSide: 'top',
    });
    titlePanel.setAlpha(0);

    const moduleLabel = this.add.text(titlePanelX + 20, 60, this.getModuleLabel(), {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: theme.id === 'chamber' ? COLOR_HEX.CYAN_GLOW : COLOR_HEX.WARNING,
    }).setOrigin(0, 0).setAlpha(0);

    // Engineering ID (e.g. "AP_1", "TR_3") — useful for QA / dev navigation
    // but breaks the fiction for players. Gate behind import.meta.env.DEV so
    // it stays visible in dev builds and disappears from production.
    const idLabel = this.add.text(
      titlePanelX + titlePanelW - 20,
      60,
      import.meta.env.DEV ? this.puzzleId.toUpperCase() : '',
      {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: theme.id === 'chamber' ? COLOR_HEX.TEXT_MUTED : COLOR_HEX.WARNING,
      },
    ).setOrigin(1, 0).setAlpha(0);

    this.uiContainer.add([titlePanel, moduleLabel, idLabel, this.titleText, this.instructionText]);

    // Glitch-reveal the title after the frame starts fading in.
    this.time.delayedCall(180, () => this.glitchReveal(this.titleText, theme.titleColor));

    this.tweens.add({
      targets: [titlePanel, moduleLabel, idLabel],
      alpha: 1,
      duration: 260,
      delay: 120,
      ease: 'Power2',
    });

    // Instruction slides in after title settles.
    this.tweens.add({
      targets: this.instructionText,
      x: width / 2,
      alpha: 1,
      duration: 380,
      delay: 520,
      ease: 'Power2.easeOut',
    });
  }

  private glitchReveal(text: Phaser.GameObjects.Text, finalColor: string): void {
    const glitchColors = ['#06b6d4', '#8b5cf6', '#ff44aa', '#ffffff'];
    let tick = 0;
    const totalTicks = 14;
    this.time.addEvent({
      delay: 40,
      repeat: totalTicks,
      callback: () => {
        tick++;
        text.setAlpha(tick % 2 === 0 ? 0.9 : 0.1);
        text.setColor(glitchColors[tick % glitchColors.length]);
        if (tick >= totalTicks) {
          text.setAlpha(1);
          text.setColor(finalColor);
        }
      },
    });
  }

  protected createControlButtons(width: number): void {
    // Round-5 chrome unification — exit + hint buttons now use the active
    // theme's HUD colours instead of always-cyan-gold. AP gets brass+barn-red,
    // TR gets cyan+weathered-wood, Prologue gets purple+navy.
    const theme = this.getPuzzleTheme();
    this.exitButton = createRetroButton(
      this, width - 88, 60, 'EXIT', theme.hudExitButton, () => this.exitPuzzle(), 112
    );
    // Hint cost surfaced in the button text — the audit flagged that
    // "hoarding hints vs burning hints" was an opaque choice. Including
    // "-1★" in the label makes the trade-off legible at the moment of
    // decision, not retroactive at the star-rating screen.
    this.hintButton = createRetroButton(
      this, 96, 60, `HINT -1★ (${this.maxHints - this.hintsUsed})`, theme.hudHintButton, () => this.showHint(), 152
    );

    this.exitButton.setScale(0);
    this.hintButton.setScale(0);
    this.uiContainer.add([this.exitButton, this.hintButton]);
    this.ignorePuzzleCursor(this.exitButton);
    this.ignorePuzzleCursor(this.hintButton);

    // Spring in from scale 0 with staggered delay.
    this.tweens.add({ targets: this.exitButton, scale: 1, duration: 280, delay: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.hintButton, scale: 1, duration: 280, delay: 500, ease: 'Back.easeOut' });

    // Exit button pulses as a persistent warning cue.
    this.tweens.add({
      targets: this.exitButton,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 900,
    });
  }

  protected addStatusIndicator(width: number, _height: number): void {
    // Round-5 chrome unification — READY badge palette now comes from the
    // active theme. The prior hardcoded cyan-bordered glow looked like
    // sci-fi UI welded onto every region. With theme-aware colours, AP gets
    // a wooden plaque, TR gets a stone tablet, Prologue keeps cosmic cyan.
    const theme = this.getPuzzleTheme();
    const padding = 40;
    const panelW = 160;
    const panelH = 30;
    const panelX = width - padding - panelW - 8;
    const panelY = padding + 4;
    const dotX = panelX + 18;
    const dotY = panelY + panelH / 2;

    const panel = drawPanel(this, panelX, panelY, panelW, panelH, {
      depth: 0,
      fill: theme.hudStatusFill,
      frame: theme.hudStatusFrame,
      inner: theme.hudStatusInner,
      alpha: 0.84,
      shadow: true,
      shadowAlpha: 0.18,
    });
    const dot = this.add.circle(dotX, dotY, 4, theme.hudStatusDot);
    const label = this.add.text(dotX + 12, dotY, this.getReadyLabel(), {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
    }).setOrigin(0, 0.5);

    panel.setAlpha(0);
    dot.setAlpha(0);
    label.setAlpha(0);
    this.uiContainer.add([panel, dot, label]);

    this.tweens.add({ targets: [panel, dot, label], alpha: 1, duration: 300, delay: 600 });

    // Pulsing dot signals the puzzle module is active.
    this.tweens.add({
      targets: dot,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1000,
    });
  }

  protected createStarRatingContainer(width: number): void {
    this.starContainer = this.add.container(width / 2, 40);
    this.starContainer.setVisible(false);
    this.uiContainer.add(this.starContainer);
  }

  protected setupKeyboardShortcuts(): void {
    const kbd = this.input.keyboard;
    kbd?.on('keydown-ESC', this.onPuzzleEsc);
    kbd?.on('keydown-H', this.onPuzzleH);
    kbd?.on('keydown-R', this.onPuzzleR);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kbd?.off('keydown-ESC', this.onPuzzleEsc);
      kbd?.off('keydown-H', this.onPuzzleH);
      kbd?.off('keydown-R', this.onPuzzleR);
    });
  }

  protected setPuzzleCursorTargets(targets: readonly Phaser.GameObjects.GameObject[], preferredIndex = 0): void {
    this.puzzleCursor?.setTargets(targets, preferredIndex);
  }

  protected clearPuzzleCursorTargets(): void {
    this.puzzleCursor?.clearTargets();
  }

  emitPuzzleActionPulse(x: number, y: number, kind: PuzzleActionKind = 'neutral'): void {
    this.puzzleKinetics?.pulseAt(x, y, kind);
  }

  private ignorePuzzleCursor(object: Phaser.GameObjects.GameObject): void {
    const target = object as Phaser.GameObjects.GameObject & {
      getData?: (key: string) => unknown;
      setData?: (key: string, value: unknown) => Phaser.GameObjects.GameObject;
    };
    target.setData?.('puzzleCursorIgnore', true);
    (target.getData?.('background') as Phaser.GameObjects.GameObject | undefined)?.setData('puzzleCursorIgnore', true);
  }

  protected showHint(): void {
    if (this.hintsUsed >= this.maxHints) {
      this.showMessage('No hints remaining!', COLORS.WARNING);
      return;
    }

    this.hintsUsed++;
    updateButtonText(this.hintButton, `HINT -1★ (${this.maxHints - this.hintsUsed})`);

    if (this.hintsUsed >= this.maxHints) {
      disableButton(this.hintButton);
    }

    // Using a hint breaks the zero-hint mastery streak. Mirror that the
    // restartPuzzle() path also resets — both signal "the player needed
    // help on this one", so neither counts as a clean solve.
    gameState.resetStreak();
    this.emitPuzzleActionPulse(96, 60, 'hint');
    this.displayHint(this.hintsUsed);
  }

  protected abstract displayHint(hintNumber: number): void;
  protected abstract getConceptName(): string;
  protected shouldSkipConceptBridge(): boolean {
    return false;
  }

  protected requestExitPuzzle(): void {
    const now = this.time.now;
    if (now > this.exitConfirmUntil) {
      this.exitConfirmUntil = now + 1600;
      audioManager.playTone(220, 100, 'square');
      this.showMessage('Press ESC again to exit puzzle.', COLORS.WARNING);
      return;
    }

    this.exitPuzzle();
  }

  protected exitPuzzle(): void {
    if (this.isExitingPuzzle) return;
    this.isExitingPuzzle = true;
    TransitionManager.pixelDissolve(this, this.returnScene);
  }

  protected restartPuzzle(): void {
    this.attempts++;
    // Restarting also breaks the mastery streak — a clean solve means
    // first-attempt + no hints.
    gameState.resetStreak();
    // Glitch heckles on restart — gated on (a) the player having met Glitch
    // (post P0_1, otherwise the taunt has no source) and (b) a randomness
    // factor so taunts feel like reactions, not a nag. The taunt is queued
    // to the next scene because this scene is about to be destroyed by
    // scene.restart() — see pendingFailureTaunt at the top of the file.
    if (this.shouldQueueFailureTaunt()) {
      pendingFailureTaunt = GLITCH_FAILURE_TAUNTS[
        Math.floor(Math.random() * GLITCH_FAILURE_TAUNTS.length)
      ];
    }
    this.scene.restart({
      returnScene: this.returnScene,
      previousAttempts: this.attempts,
      previousHintsUsed: this.hintsUsed,
    });
  }

  /**
   * True ~55% of the time once the player has met Glitch. The randomness
   * is the difference between "Glitch is heckling" (interesting) and
   * "Glitch heckles every restart" (annoying). 55% lands around "more
   * often than not" without becoming predictable.
   */
  private shouldQueueFailureTaunt(): boolean {
    if (!gameState.isPuzzleCompleted('p0_1')) return false;
    return Math.random() < 0.55;
  }

  /**
   * Visible mastery-streak indicator on puzzle complete. Always shows the
   * current streak (small, top-left). Crosses a milestone threshold (3, 5,
   * 10) and you get a celebration burst with the streak number called out
   * — the dopamine reward for sustained zero-hint play. Below the
   * threshold, this is just a quiet receipt.
   */
  protected showStreakIndicator(streak: number): void {
    const milestones = [3, 5, 10, 15, 20];
    const isMilestone = milestones.includes(streak);

    const chip = this.add
      .text(80, 110, `STREAK ×${streak}`, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: isMilestone ? '#fbbf24' : '#88c070',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9998)
      .setScrollFactor(0)
      .setAlpha(0);

    this.tweens.add({
      targets: chip,
      alpha: 1,
      y: 100,
      duration: 280,
      ease: 'Sine.easeOut',
    });

    if (isMilestone) {
      // Big celebration burst: gold rain + an extra correct burst at the
      // chip position. The streak number itself scales-bounces to make
      // sure the player sees the milestone-vs-routine distinction.
      const { width } = this.cameras.main;
      JuiceSystem.goldRain?.(this);
      JuiceSystem.correctBurst(this, width / 2, 200);
      audioManager.playCorrectTone?.();
      this.tweens.add({
        targets: chip,
        scale: { from: 1, to: 1.6 },
        duration: 320,
        yoyo: true,
        ease: 'Back.easeOut',
        delay: 280,
      });
      // Floating "MILESTONE" tag above the chip.
      const tag = this.add
        .text(80, 70, 'MILESTONE', {
          fontSize: '9px',
          fontFamily: FONTS.RETRO,
          color: '#fbbf24',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(9998)
        .setScrollFactor(0)
        .setAlpha(0);
      this.tweens.add({
        targets: tag,
        alpha: { from: 0, to: 1 },
        duration: 320,
        delay: 600,
        onComplete: () => {
          this.time.delayedCall(1800, () => {
            this.tweens.add({
              targets: tag,
              alpha: 0,
              duration: 400,
              onComplete: () => tag.destroy(),
            });
          });
        },
      });
      a11yManager.announce(`Mastery streak ${streak}. Milestone reached.`, true);
    } else {
      a11yManager.announce(`Mastery streak ${streak}.`, false);
    }
  }

  /**
   * Brief "Progress saved" floating receipt at the top-right corner. Fires
   * after setPuzzleResult triggers the autosave. The indicator is small
   * and corner-anchored so it doesn't compete with the star rating /
   * complete celebration in the center.
   */
  protected showSaveIndicator(): void {
    const { width } = this.cameras.main;
    const x = width - 80;
    const y = 110;
    const indicator = this.add
      .text(x, y, '✓ Progress saved', {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: '#88c070',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(9998)
      .setScrollFactor(0)
      .setAlpha(0);

    this.tweens.add({
      targets: indicator,
      alpha: { from: 0, to: 1 },
      y: y - 6,
      duration: 280,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(1800, () => {
          this.tweens.add({
            targets: indicator,
            alpha: 0,
            duration: 340,
            onComplete: () => indicator.destroy(),
          });
        });
      },
    });
    a11yManager.announce('Progress saved.', false);
  }

  /**
   * Pick up a queued Glitch failure taunt from the previous scene instance
   * and float it briefly at the top of the puzzle screen. Should be called
   * from create() after the puzzle UI is mounted (subclasses opt in by
   * calling this — keeping it explicit means a puzzle that doesn't want
   * the heckle, e.g. a tutorial round, can skip it).
   */
  protected maybeShowFailureTaunt(): void {
    if (!pendingFailureTaunt) return;
    const text = pendingFailureTaunt;
    pendingFailureTaunt = null;

    const { width } = this.cameras.main;
    const taunt = this.add.text(width / 2, 60, `Glitch: "${text}"`, {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#ff9494',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setDepth(9999).setScrollFactor(0).setAlpha(0);

    // Slide-down fade-in, hold for ~1.6s, slide-up fade-out + destroy.
    this.tweens.add({
      targets: taunt,
      alpha: { from: 0, to: 1 },
      y: 74,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: taunt,
            alpha: 0,
            y: 60,
            duration: 360,
            ease: 'Sine.easeIn',
            onComplete: () => taunt.destroy(),
          });
        });
      },
    });

    // Pipe through the a11y layer so screen-reader users hear the reaction.
    a11yManager.announce(`Glitch says: ${text}`, false);
  }

  protected onCorrectAnswer(explanation?: string): void {
    const { width, height } = this.cameras.main;
    JuiceSystem.correctBurst(this, width / 2, height / 2 - 40);
    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.08, 180);
    audioManager.playCorrectTone();
    if (explanation) {
      this.showMessage(explanation, COLORS.SUCCESS);
    } else {
      // showMessage owns the announce when explanation is provided; otherwise
      // the correct-answer juice is silent for screen-reader users.
      a11yManager.announce('Correct.', false);
    }
  }

  protected onWrongAnswer(message: string = 'Not quite. Try again.'): void {
    const { width, height } = this.cameras.main;
    JuiceSystem.wrongBurst(this, width / 2, height / 2);
    JuiceSystem.cameraShake(this, 60, 0.002);
    audioManager.playWrongTone?.();
    this.showMessage(message, COLORS.WARNING);
    this.attempts++;
  }

  protected onPuzzleComplete(stars: number): void {
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    const { width, height } = this.cameras.main;
    const alreadyCompleted = gameState.isPuzzleCompleted(this.puzzleId);

    showStarRating(this, this.starContainer, stars);
    this.showMessage('PUZZLE COMPLETE!', COLORS.SUCCESS);
    audioManager.playCorrectTone();

    this.emitPuzzleActionPulse(width / 2, height / 2, 'complete');
    JuiceSystem.cameraShake(this, 80, 0.003);
    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.10, 300);
    JuiceSystem.correctBurst(this, width / 2, height / 2);

    // Save result
    gameState.setPuzzleResult(this.puzzleId, {
      stars,
      time: timeSpent,
      attempts: this.attempts,
      hintsUsed: this.hintsUsed,
    });
    // Visible save confirmation — audit Minor #15 flagged "no visible
    // save-checkpoint indicator" as a real problem. setPuzzleResult
    // triggers the autosave; this is the player-facing receipt.
    this.showSaveIndicator();

    // Mastery streak: a "clean" solve is first-attempt + zero hints.
    // Anything else doesn't count; the streak is the patient-mastery
    // signal, not a "you finished the puzzle" signal. attempts==0 means
    // the player got it on the first try (restartPuzzle increments it
    // and also calls resetStreak, so we double-check here).
    const isCleanSolve = this.attempts === 0 && this.hintsUsed === 0 && !alreadyCompleted;
    if (isCleanSolve) {
      const newStreak = gameState.recordCleanSolve(stars);
      this.showStreakIndicator(newStreak);
    }

    if (this.shouldSkipConceptBridge()) {
      const { width: bw, height: bh } = this.cameras.main;
      const exitFade = this.add.rectangle(0, 0, bw, bh, 0x000000, 0).setOrigin(0).setDepth(10000);
      this.tweens.add({
        targets: exitFade,
        alpha: 1,
        duration: 500,
        delay: 1800,
        onComplete: () => {
          exitFade.destroy();
          this.scene.start(this.returnScene);
        },
      });
      return;
    }

    // Transition to ConceptBridge after a brief hold
    const fadeOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    this.tweens.add({
      targets: fadeOverlay,
      alpha: 1,
      duration: 500,
      delay: alreadyCompleted ? 800 : 1600,
      onComplete: () => {
        fadeOverlay.destroy();
        const bridgeData: ConceptBridgeData = {
          puzzleName: this.puzzleName,
          puzzleId: this.puzzleId,
          concept: this.getConceptName(),
          returnScene: this.returnScene,
          attempts: this.attempts,
          timeSpent: timeSpent,
          hintsUsed: this.hintsUsed,
          stars: stars,
        };
        this.scene.start(SCENE_KEYS.CONCEPT_BRIDGE, bridgeData);
      },
    });
  }

  protected showMessage(text: string, color: number = COLORS.TEXT_LIGHT): void {
    const { width, height } = this.cameras.main;
    const msgW = Math.min(width - 80, 560);
    const msgH = 56;
    const msgY = height / 2 - 20;

    a11yManager.announce(text, true);
    this.emitPuzzleActionPulse(
      width / 2,
      msgY,
      color === COLORS.WARNING
        ? 'wrong'
        : color === COLORS.GOLD_ACCENT
          ? 'hint'
          : color === COLORS.SUCCESS
            ? 'correct'
            : 'neutral',
    );

    const msgContainer = this.add.container(width / 2, msgY).setDepth(1000).setAlpha(0);

    const panel = drawPanel(this, -msgW / 2, -msgH / 2, msgW, msgH, {
      depth: 0,
      fill: COLORS.ERROR,
      frame: color,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 0.96,
      shadow: true,
      shadowAlpha: 0.28,
      accent: color,
    });

    const label = this.add.text(0, 0, text, {
      fontSize: '13px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      stroke: colorToHex(color),
      strokeThickness: 1,
      align: 'center',
      wordWrap: { width: msgW - 36 },
    }).setOrigin(0.5);

    msgContainer.add([panel, label]);

    this.tweens.add({ targets: msgContainer, alpha: 1, y: msgY - 4, duration: 160, ease: 'Power2.easeOut' });

    this.tweens.add({
      targets: msgContainer,
      alpha: 0,
      y: msgY - 12,
      duration: 180,
      ease: 'Power3.easeIn',
      delay: 1600,
      onComplete: () => msgContainer.destroy(),
    });
  }

  /**
   * STUB — original showNameItBeat implementation was lost during a session
   * revert (git checkout discarded uncommitted FEEL→NAME→USE pedagogical
   * work). Re-implement or restore from compiled dist before shipping.
   */
  protected async showNameItBeat(_beat: unknown): Promise<void> {
    return Promise.resolve();
  }

}
