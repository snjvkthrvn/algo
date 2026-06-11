import { describe, expect, it } from "vitest";
import { PATH_ROUNDS } from "../puzzles/P0_1/pathRounds";
import { FLOW_ROUNDS } from "../puzzles/P0_2/rounds";
import { flowPar, litanyPar, pathPar } from "./prologuePar";

describe("prologuePar", () => {
  it("path par is the total hops of every chant (2+4+6+8)", () => {
    expect(pathPar(PATH_ROUNDS)).toBe(20);
  });

  it("flow par is one pulse per console round", () => {
    expect(flowPar(FLOW_ROUNDS)).toBe(4);
  });

  it("litany par is a single perfect pass", () => {
    expect(litanyPar()).toBe(1);
  });

  it("does not mutate the round data", () => {
    const snapshot = JSON.stringify(PATH_ROUNDS);
    pathPar(PATH_ROUNDS);
    expect(JSON.stringify(PATH_ROUNDS)).toBe(snapshot);
  });
});
