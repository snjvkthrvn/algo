import { describe, expect, it } from "vitest";
import {
  TRIAL_LEGS,
  beginWalk,
  beginWatch,
  gradeStep,
  initialTrialState,
  isFieldTile,
  trialPar,
} from "./memoryWalk";

describe("memoryWalk", () => {
  it("par is the total safe tiles across all legs (4+6+8)", () => {
    expect(trialPar()).toBe(18);
  });

  it("legs are 4-adjacent chains inside their fields", () => {
    for (const leg of TRIAL_LEGS) {
      for (let i = 1; i < leg.path.length; i++) {
        const a = leg.path[i - 1]!;
        const b = leg.path[i]!;
        expect(Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty)).toBe(1);
      }
      for (const p of leg.path) {
        expect(isFieldTile(leg, p.tx, p.ty)).toBe(true);
      }
    }
  });

  it("grades a clean leg: safe steps then legCleared, steps counted", () => {
    let state = beginWalk(beginWatch(initialTrialState()));
    const path = TRIAL_LEGS[0]!.path;
    for (let i = 0; i < path.length - 1; i++) {
      const r = gradeStep(state, path[i]!.tx, path[i]!.ty);
      expect(r.verdict).toBe("safe");
      state = r.state;
    }
    const last = gradeStep(state, path[3]!.tx, path[3]!.ty);
    expect(last.verdict).toBe("legCleared");
    expect(last.state.legIndex).toBe(1);
    expect(last.state.steps).toBe(4);
    expect(last.state.phase).toBe("idle");
  });

  it("a wrong field tile crumbles permanently and resets the leg cursor", () => {
    const state = beginWalk(beginWatch(initialTrialState()));
    const wrong = { tx: 17, ty: 19 }; // in leg-1 field, not on the path
    const r = gradeStep(state, wrong.tx, wrong.ty);
    expect(r.verdict).toBe("crumble");
    expect(r.state.crumbled).toContainEqual(wrong);
    expect(r.state.stepIndex).toBe(0);
    expect(r.state.steps).toBe(1);
  });

  it("ignores tiles outside the current leg's field or outside walk phase", () => {
    const idle = initialTrialState();
    expect(gradeStep(idle, 19, 19).verdict).toBe("ignore");
    const walking = beginWalk(beginWatch(initialTrialState()));
    expect(gradeStep(walking, 5, 20).verdict).toBe("ignore"); // entry platform
  });

  it("clearing the last leg reports allCleared", () => {
    let state = { ...beginWalk(beginWatch(initialTrialState())), legIndex: 2 };
    for (const p of TRIAL_LEGS[2]!.path.slice(0, -1)) {
      state = gradeStep(state, p.tx, p.ty).state;
    }
    const last = TRIAL_LEGS[2]!.path[7]!;
    expect(gradeStep(state, last.tx, last.ty).verdict).toBe("allCleared");
  });

  it("never mutates its input", () => {
    const state = beginWalk(beginWatch(initialTrialState()));
    const snapshot = JSON.stringify(state);
    gradeStep(state, 17, 19);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
