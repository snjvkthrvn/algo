import { describe, expect, it } from "vitest";
import { axialKey } from "../puzzles/hexLayout";
import { buildOutMap, forkKeySet } from "../puzzles/P0_2/flow";
import { FLOW_ROUNDS } from "../puzzles/P0_2/rounds";
import { LITANY_ROUND } from "../puzzles/P0_F/rounds";
import { altarsSatisfied, altarKeys } from "../puzzles/P0_F/flow";
import { forkChoicesAlong, routeThrough } from "./flowRoute";

/** Re-run the reactive pulse's traversal rules with a fixed choice map. */
function simulate(
  outMap: Map<string, string[]>,
  forkKeys: Set<string>,
  choices: Map<string, string>,
  source: string,
  sink: string,
): string[] {
  const visited = [source];
  let current = source;
  for (let guard = 0; guard < 64 && current !== sink; guard++) {
    const outs = outMap.get(current) ?? [];
    expect(outs.length).toBeGreaterThan(0);
    const next =
      outs.length === 1 || !forkKeys.has(current)
        ? outs[0]!
        : choices.get(current)!;
    expect(next).toBeDefined();
    visited.push(next);
    current = next;
  }
  expect(current).toBe(sink);
  return visited;
}

describe("flowRoute", () => {
  it("routes every console round to its sink", () => {
    for (const round of FLOW_ROUNDS) {
      const outMap = buildOutMap(round);
      const source = axialKey(round.source.q, round.source.r);
      const sink = axialKey(round.sink.q, round.sink.r);
      const route = routeThrough(outMap, source, sink);
      expect(route).not.toBeNull();
      const choices = forkChoicesAlong(route!, forkKeySet(round));
      simulate(outMap, forkKeySet(round), choices, source, sink);
    }
  });

  it("routes the litany through both altars in order", () => {
    const outMap = buildOutMap(LITANY_ROUND);
    const source = axialKey(LITANY_ROUND.source.q, LITANY_ROUND.source.r);
    const sink = axialKey(LITANY_ROUND.sink.q, LITANY_ROUND.sink.r);
    const route = routeThrough(outMap, source, sink, altarKeys(LITANY_ROUND));
    expect(route).not.toBeNull();
    const choices = forkChoicesAlong(route!, forkKeySet(LITANY_ROUND));
    const visited = simulate(
      outMap,
      forkKeySet(LITANY_ROUND),
      choices,
      source,
      sink,
    );
    expect(altarsSatisfied(LITANY_ROUND, visited)).toBe(true);
  });

  it("returns null when no route exists", () => {
    const outMap = new Map<string, string[]>([["a", ["b"]]]);
    expect(routeThrough(outMap, "a", "z")).toBeNull();
  });

  it("does not mutate the out map", () => {
    const outMap = buildOutMap(FLOW_ROUNDS[0]!);
    const snapshot = JSON.stringify([...outMap.entries()]);
    routeThrough(
      outMap,
      axialKey(FLOW_ROUNDS[0]!.source.q, FLOW_ROUNDS[0]!.source.r),
      axialKey(FLOW_ROUNDS[0]!.sink.q, FLOW_ROUNDS[0]!.sink.r),
    );
    expect(JSON.stringify([...outMap.entries()])).toBe(snapshot);
  });
});
