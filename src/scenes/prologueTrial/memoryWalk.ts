/**
 * memoryWalk — pure gauntlet state for the Echo Causeway trial.
 *
 * Three legs of rune causeway cross a void chasm. Each leg lights its safe
 * path (watch), dims, and the player walks it from memory (walk). Wrong
 * field tiles crumble permanently — the floor is the scoreboard; the cost
 * economy is total graded steps vs par (VISION §3/§6: no timer, no fail).
 * Pure data + functions, no Phaser, immutable updates only.
 */

export type TileXY = { readonly tx: number; readonly ty: number };

export interface TrialLeg {
  /** Causeway field (inclusive tile rect) spanning this chasm band. */
  readonly field: { x0: number; y0: number; x1: number; y1: number };
  /** The safe path, in walk order, south to north. */
  readonly path: ReadonlyArray<TileXY>;
}

export type TrialPhase = "idle" | "watch" | "walk" | "cleared";

export interface TrialState {
  readonly phase: TrialPhase;
  readonly legIndex: number;
  /** Next safe path index the player must step on. */
  readonly stepIndex: number;
  /** Total graded causeway steps (the ledger count). */
  readonly steps: number;
  readonly crumbled: ReadonlyArray<TileXY>;
}

export type StepVerdict =
  | "safe"
  | "crumble"
  | "legCleared"
  | "allCleared"
  | "ignore";

export const TRIAL_LEGS: ReadonlyArray<TrialLeg> = [
  {
    field: { x0: 17, y0: 16, x1: 21, y1: 19 },
    path: [
      { tx: 19, ty: 19 },
      { tx: 19, ty: 18 },
      { tx: 19, ty: 17 },
      { tx: 19, ty: 16 },
    ],
  },
  {
    field: { x0: 17, y0: 10, x1: 21, y1: 13 },
    path: [
      { tx: 18, ty: 13 },
      { tx: 18, ty: 12 },
      { tx: 19, ty: 12 },
      { tx: 19, ty: 11 },
      { tx: 20, ty: 11 },
      { tx: 20, ty: 10 },
    ],
  },
  {
    field: { x0: 17, y0: 4, x1: 21, y1: 7 },
    path: [
      { tx: 17, ty: 7 },
      { tx: 18, ty: 7 },
      { tx: 18, ty: 6 },
      { tx: 19, ty: 6 },
      { tx: 19, ty: 5 },
      { tx: 20, ty: 5 },
      { tx: 20, ty: 4 },
      { tx: 21, ty: 4 },
    ],
  },
];

export function trialPar(): number {
  return TRIAL_LEGS.reduce((sum, leg) => sum + leg.path.length, 0);
}

export function initialTrialState(): TrialState {
  return { phase: "idle", legIndex: 0, stepIndex: 0, steps: 0, crumbled: [] };
}

export function isFieldTile(leg: TrialLeg, tx: number, ty: number): boolean {
  return (
    tx >= leg.field.x0 &&
    tx <= leg.field.x1 &&
    ty >= leg.field.y0 &&
    ty <= leg.field.y1
  );
}

export function beginWatch(state: TrialState): TrialState {
  return { ...state, phase: "watch" };
}

export function beginWalk(state: TrialState): TrialState {
  return { ...state, phase: "walk", stepIndex: 0 };
}

/** Grade the player entering tile (tx, ty). Pure — returns a new state. */
export function gradeStep(
  state: TrialState,
  tx: number,
  ty: number,
): { state: TrialState; verdict: StepVerdict } {
  const leg = TRIAL_LEGS[state.legIndex];
  if (state.phase !== "walk" || !leg || !isFieldTile(leg, tx, ty)) {
    return { state, verdict: "ignore" };
  }
  const expected = leg.path[state.stepIndex];
  if (expected && expected.tx === tx && expected.ty === ty) {
    const nextIndex = state.stepIndex + 1;
    const steps = state.steps + 1;
    if (nextIndex < leg.path.length) {
      return {
        state: { ...state, stepIndex: nextIndex, steps },
        verdict: "safe",
      };
    }
    const lastLeg = state.legIndex + 1 >= TRIAL_LEGS.length;
    return {
      state: {
        ...state,
        steps,
        stepIndex: 0,
        legIndex: state.legIndex + 1,
        phase: lastLeg ? "cleared" : "idle",
      },
      verdict: lastLeg ? "allCleared" : "legCleared",
    };
  }
  // Already-cleared safe tiles of THIS leg (walking back) don't re-grade.
  const onEarlierSafe = leg.path
    .slice(0, state.stepIndex)
    .some((p) => p.tx === tx && p.ty === ty);
  if (onEarlierSafe) return { state, verdict: "ignore" };
  return {
    state: {
      ...state,
      steps: state.steps + 1,
      stepIndex: 0,
      crumbled: [...state.crumbled, { tx, ty }],
    },
    verdict: "crumble",
  };
}
