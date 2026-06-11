import Phaser from "phaser";
import { COLORS, s } from "../P0_1/tokens";
import { paintAtmosphere, type Atmosphere } from "../P0_1/visuals/atmosphere";
import { ensureRuneTexture } from "../P0_1/visuals/rune";
import { buildHud, type Hud } from "../P0_1/visuals/hud";
import { readReduceMotion, writeReduceMotion } from "../P0_1/prefs";
import { buildOutMap, forkKeySet } from "../P0_2/flow";
import { coordsOf, mountFlowBoard, type FlowBoard } from "../P0_2/board";
import { createEdges, type EdgeLayer } from "../P0_2/visuals/edges";
import { createMarkers, type Markers } from "../P0_2/visuals/markers";
import {
  clearHighlights,
  createPulse,
  highlightChoices,
  type Pulse,
} from "../P0_2/visuals/pulse";
import { deadEndShimmer } from "../P0_2/feedback";
import { bindDirectionalChoiceInput } from "../P0_2/input";
import { LITANY_ROUND, type LitanyRound } from "./rounds";
import { altarKeys, altarsSatisfied, missedAltarKeys } from "./flow";
import { LITANY_LABEL, type LitanyState } from "./state";
import { createAltars, type Altars } from "./visuals/altars";
import { createIntro, type Intro } from "./visuals/intro";
import { finalCascade } from "./feedback";
import { bindLitanyInput } from "./input";
import { GAME, PENALTIES, POINTS } from "../../game/state";
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from "../../game/algorithmiaIntegration";
import { scorePopup } from "../../ui/popups";
import { hexColorToNumber, sparkle } from "../../ui/particles";
import { comboMilestone } from "../../game/milestone";
import { SCENE_KEYS } from "../../../config/constants";
import { playBossEntryBanner } from "../../../ui/BossEntryBanner";
import { VISUAL_REVAMP_KEYS, getImageAssetPath } from "../../../config/assets";

const LITANY_TIMER_MS = 80000;
const LITANY_TIME_BONUS = 1200;
const LITANY_PERFECT_BONUS = 1800;
const DECISION_WINDOW_MS = 1100;
const PREPARE_BEAT_MS = 600;
const RETRY_BEAT_MS = 740;
const OUTRO_DELAY_MS = 720;

export class TheLitanyScene extends Phaser.Scene {
  private atmosphere!: Atmosphere;
  private hud!: Hud;
  private edges!: EdgeLayer;
  private markers!: Markers;
  private altars!: Altars;
  private pulse!: Pulse;
  private intro!: Intro;
  private board: FlowBoard | null = null;
  private round: LitanyRound | null = null;
  private outMap: Map<string, string[]> = new Map();
  private forks: Set<string> = new Set();
  private altarSet: Set<string> = new Set();
  private reduceMotion = false;
  private unbindInput?: () => void;
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SENTINEL });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  preload(): void {
    const backdropPath = getImageAssetPath(
      VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
    );
    if (
      backdropPath &&
      !this.textures.exists(VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG)
    ) {
      this.load.image(
        VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
        backdropPath,
      );
    }
    const figurePath = getImageAssetPath(
      VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE,
    );
    if (
      figurePath &&
      !this.textures.exists(VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE)
    ) {
      this.load.image(VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE, figurePath);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg.deep);
    this.startedAt = Date.now();
    this.reduceMotion = readReduceMotion();
    GAME.reset();
    GAME.setCurrentPuzzle(this.scene.key);
    if (!this.scene.isActive(PROLOGUE_RUN_UI_KEY))
      this.scene.launch(PROLOGUE_RUN_UI_KEY);
    this.scene.bringToTop(PROLOGUE_RUN_UI_KEY);

    this.atmosphere = paintAtmosphere(this);
    ensureRuneTexture(this);
    this.edges = createEdges(this);
    this.markers = createMarkers(this);
    this.altars = createAltars(this);
    this.pulse = createPulse(this);
    this.intro = createIntro(this);
    this.hud = buildHud(this, {
      eyebrow: "PROLOGUE FINALE  \u00b7  CONVERGENCE",
      footerHint:
        "Arrow / WASD toward a fork as the pulse arrives   \u00b7   [M] reduce motion",
    });
    // No SENTINEL PREVIEW side panel: it printed live routing state as a
    // text wall, and the playable game never shows code or debugger views
    // (docs/VISION.md §4). The deep layer lives in the Codex.

    // Boss entry banner — the audit flagged that bosses re-use puzzle chrome
    // and don't feel like capstones. The Sentinel gets a cyan accent because
    // it's the cosmic-prologue capstone (mystic register, matches the
    // chamber's cyan glow). Banner fires immediately on create — the boss
    // mechanic is still mounting underneath, but the visual overlay sells
    // the "this is the boss" moment.
    playBossEntryBanner(this, {
      bossName: "The Litany",
      regionTag: "Prologue finale",
      thesis: "Sequence and selection. Both rules at once.",
      accentColor: 0x22d3ee,
      onComplete: () => {
        // The Sentinel mechanic was already mounted under the banner — no
        // additional start step required. This callback is a hook for
        // future boss-only "begin combat" beats.
      },
    });

    // Visible Sentinel figure (Round 3 art-pass — the prior audit found the
    // Prologue boss was the only one without a hero figure on screen). The
    // Fractured Sentinel hovers at the top, slightly off-center, with a
    // gentle bob to suggest it's watching the player's choices. Cyan accent
    // ties it to the chamber's mandala glow. Lower alpha + low depth keep
    // it from competing with the hex-grid play surface.
    const sentinelFigureKey = VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE;
    if (this.textures.exists(sentinelFigureKey)) {
      const sentinelFigure = this.add
        .image(this.cameras.main.width / 2, s(110), sentinelFigureKey)
        .setOrigin(0.5, 0.5)
        .setScale(0.8)
        .setAlpha(0.78)
        .setDepth(4)
        .setScrollFactor(0);
      this.tweens.add({
        targets: sentinelFigure,
        y: s(104),
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      // Defensive: attempt a late-load if the boot preload missed it (e.g.
      // dev hot-reload). Silently no-op on failure — the rest of the boss
      // mechanic is independent of the figure being visible.
      const path = getImageAssetPath(sentinelFigureKey);
      if (path) {
        this.load.image(sentinelFigureKey, path);
        this.load.once("complete", () => {
          if (this.textures.exists(sentinelFigureKey)) {
            const sentinelFigure = this.add
              .image(this.cameras.main.width / 2, s(110), sentinelFigureKey)
              .setOrigin(0.5, 0.5)
              .setScale(0.8)
              .setAlpha(0.78)
              .setDepth(4)
              .setScrollFactor(0);
            this.tweens.add({
              targets: sentinelFigure,
              y: s(104),
              duration: 1800,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          }
        });
        this.load.start();
      }
    }

    this.unbindInput = bindLitanyInput(this, {
      onReplay: () => {},
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });

    const escape = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    escape?.on("down", this.exitToReturnScene, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      this.unbindInput?.();
    });

    void this.runFinale();
  }

  private async runFinale(): Promise<void> {
    this.mountFinale();
    this.setState("intro");
    await this.intro.show(
      "The Final Trial",
      "The Litany",
      "Steer the pulse through both altars \u2014 in order \u2014 to the sink.",
    );
    this.setState("preparing");
    await this.wait(PREPARE_BEAT_MS);
    GAME.startRound(LITANY_TIMER_MS);
    void this.firePulse();
  }

  private mountFinale(): void {
    this.round = LITANY_ROUND;
    this.hud.setRound(
      LITANY_ROUND.title,
      LITANY_ROUND.principle,
      LITANY_ROUND.teach,
    );
    this.board = mountFlowBoard(this, LITANY_ROUND);
    this.outMap = buildOutMap(LITANY_ROUND);
    this.forks = forkKeySet(LITANY_ROUND);
    this.altarSet = new Set(altarKeys(LITANY_ROUND));
    this.repaint();
  }

  private async firePulse(): Promise<void> {
    if (!this.board || !this.round) return;
    this.setState("flowing");

    const result = await this.pulse.fireReactive(this.board, {
      sourceKey: this.board.sourceKey,
      sinkKey: this.board.sinkKey,
      outMap: this.outMap,
      forkKeys: this.forks,
      decideAtFork: (current, choices) => this.decideAtFork(current, choices),
      onArrive: (key) => this.onArrive(key),
    });

    if (result.outcome !== "reached") {
      this.onFizzle(result.finalKey);
      return;
    }
    if (!altarsSatisfied(this.round, result.visited)) {
      this.onMissedAltars(result.visited);
      return;
    }
    await this.celebrate();
  }

  private async decideAtFork(
    current: string,
    choices: string[],
  ): Promise<string | null> {
    if (!this.board) return null;
    const rings = highlightChoices(this, this.board, choices);
    const handlers = new Map<string, () => void>();

    return new Promise<string | null>((resolve) => {
      let resolved = false;
      let unbindDirectional = (): void => {};
      const finish = (next: string | null): void => {
        if (resolved) return;
        resolved = true;
        handlers.forEach((handler, key) => {
          this.board?.glyphs.get(key)?.off("pointerdown", handler);
        });
        unbindDirectional();
        clearHighlights(this, rings);
        timer.remove();
        resolve(next);
      };

      const timer = this.time.delayedCall(DECISION_WINDOW_MS, () =>
        finish(null),
      );
      unbindDirectional = bindDirectionalChoiceInput(
        this,
        this.board!,
        current,
        choices,
        finish,
      );

      for (const key of choices) {
        const glyph = this.board?.glyphs.get(key);
        if (!glyph) continue;
        const handler = (): void => finish(key);
        handlers.set(key, handler);
        glyph.once("pointerdown", handler);
      }
    });
  }

  private onArrive(key: string): void {
    if (!this.board || !this.altarSet.has(key)) return;
    this.altars.chime(this.board, key);
    GAME.bumpCombo();
    const awarded = GAME.addScore(POINTS.altar, "altar");
    const at = coordsOf(this.board, key);
    scorePopup(this, at.x, at.y - s(30), `+${awarded}`);
    sparkle(this, at.x, at.y, { count: 10, color: 0xfde68a, spread: 36 });
    const milestone = comboMilestone(GAME.combo);
    if (milestone) {
      scorePopup(this, at.x, at.y - s(60), milestone.label, {
        color: milestone.color,
        size: 17,
        rise: 38,
        duration: 980,
      });
      sparkle(this, at.x, at.y, {
        count: 14,
        color: hexColorToNumber(milestone.color),
        spread: 46,
      });
    }
  }

  private onFizzle(finalKey: string): void {
    if (!this.board) return;
    deadEndShimmer(this, this.board, finalKey);
    GAME.recordMistake();
    GAME.losePoints(PENALTIES.pfDeadEnd);
    GAME.breakCombo();
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  private onMissedAltars(visited: string[]): void {
    if (!this.board || !this.round) return;
    const missed = missedAltarKeys(this.round, visited);
    this.altars.shimmerMissed(this.board, missed);
    GAME.recordMistake();
    GAME.losePoints(PENALTIES.pfMissedAltars);
    GAME.breakCombo();
    this.time.delayedCall(RETRY_BEAT_MS, () => void this.firePulse());
  }

  private async celebrate(): Promise<void> {
    if (!this.board) return;
    this.setState("cleared");
    const sinkAt = coordsOf(this.board, this.board.sinkKey);

    GAME.bumpCombo();
    const awarded = GAME.addScore(POINTS.finale, "finale");
    scorePopup(this, sinkAt.x, sinkAt.y - s(44), `+${awarded}  FINALE`, {
      color: "#fde68a",
      size: 18,
      rise: 38,
      duration: 1100,
    });
    sparkle(this, sinkAt.x, sinkAt.y, {
      count: 18,
      color: 0xfde68a,
      spread: 56,
      duration: 900,
    });

    const bonuses = GAME.endRound(LITANY_TIME_BONUS, LITANY_PERFECT_BONUS);
    let off = s(76);
    if (bonuses.timeBonus > 0) {
      scorePopup(
        this,
        sinkAt.x,
        sinkAt.y - off,
        `+${bonuses.timeBonus}  TIME`,
        {
          color: "#fde68a",
          size: 17,
          rise: 36,
          duration: 1200,
        },
      );
      off += s(28);
    }
    if (bonuses.wasPerfect && bonuses.perfectBonus > 0) {
      scorePopup(
        this,
        sinkAt.x,
        sinkAt.y - off,
        `+${bonuses.perfectBonus}  PERFECT!`,
        {
          color: "#a3e635",
          size: 18,
          rise: 42,
          duration: 1400,
        },
      );
      sparkle(this, sinkAt.x, sinkAt.y, {
        count: 20,
        color: 0xa3e635,
        spread: 64,
        duration: 1000,
      });
    }

    await finalCascade(this, sinkAt);
    this.hud.showSummary(
      "Heard. Sequence and selection \u2014 two pillars, one path.",
    );
    await this.wait(OUTRO_DELAY_MS);
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "boss_sentinel",
      puzzleName: "The Litany",
      concept: "Pattern Recognition + Authentication",
      returnScene: this.returnScene,
      startedAt: this.startedAt,
    });
  }

  onPuzzleComplete(stars = 3): void {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.unbindInput?.();
    completeAlgorithmiaPuzzle(this, {
      puzzleId: "boss_sentinel",
      puzzleName: "The Litany",
      concept: "Pattern Recognition + Authentication",
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      stars,
      delayMs: 0,
    });
  }

  private repaint(): void {
    if (!this.round || !this.board) return;
    this.edges.paint(this.round, this.board);
    this.markers.paint(this.round, this.board);
    this.altars.paint(this.round, this.board);
  }

  private setState(next: LitanyState): void {
    this.hud.setState(LITANY_LABEL[next] ?? "");
    if (next === "flowing") this.atmosphere.setMood("preview");
    else this.atmosphere.setMood("normal");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitToReturnScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY))
      this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }
}
