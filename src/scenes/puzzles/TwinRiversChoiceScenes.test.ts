import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scenePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "TwinRiversChoiceScenes.ts",
);

describe("Mirror Crossing controls", () => {
  const crossingPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "P2_1_MirrorWalk.ts",
  );

  it("trades facing pairs in any order through the mirror twin", () => {
    const source = readFileSync(crossingPath, "utf8");

    // The chamber rebuild: player + mirror twin, free pair choice, wasted
    // trades splash instead of being refused, and no dictation chrome.
    expect(source).toContain("this.ledger = recordTrade(this.ledger);");
    expect(source).toContain("mirrorSlot(slot, n)");
    expect(source).toContain("this.rack.splash(slot);");
    expect(source).toContain("isReversed(this.values, this.startValues)");

    // The QTE-era chrome must never come back.
    expect(source).not.toMatch(/arr\[|L = L|R = R - 1|NextMoveHint/);
    expect(source).not.toMatch(/must retreat|Swap the mirrored values first/);
    expect(source).not.toMatch(/swappedThisPair|leftAdvancedThisPair/);
  });

  it("stays out of the choice-scene barrel except as a re-export", () => {
    const barrel = readFileSync(scenePath, "utf8");
    expect(barrel).toContain(
      'export { P2_1_MirrorWalk } from "./P2_1_MirrorWalk";',
    );
    expect(barrel).not.toContain("class P2_1_MirrorWalk extends");
  });
});

describe("Mirror Serpent controls", () => {
  const serpentPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "Boss_MirrorSerpent.ts",
  );

  it("plays the three river verbs through the rooms' own kits", () => {
    const source = readFileSync(serpentPath, "utf8");

    // Phase kits, not a fresh boss mechanic.
    expect(source).toContain("new CrateRack(");
    expect(source).toContain("new PostLine(");
    expect(source).toContain("new BasketRow(");

    // Telegraphed sabotage scored 1:1 into par — never blamed on the player.
    expect(source).toContain("await this.serpent.windUp(");
    expect(source).toContain("this.untrades++");
    expect(source).toContain("this.pushes++");
    expect(source).toContain("this.swaps++");
    expect(source).toContain(
      "serpentPar(this.untrades, this.pushes, this.swaps)",
    );

    // The QTE-era forced-pointer controls and triple-tell chrome are gone.
    expect(source).not.toMatch(/advanceTwoSumLeft|retreatTwoSumRight/);
    expect(source).not.toMatch(/serpentBanner|statusText|detailText/);
    expect(source).not.toMatch(/RiverRow|handleSerpentRowPress/);
  });

  it("stays out of the choice-scene barrel except as a re-export", () => {
    const barrel = readFileSync(scenePath, "utf8");
    expect(barrel).toContain(
      'export { Boss_MirrorSerpent } from "./Boss_MirrorSerpent";',
    );
    expect(barrel).not.toContain("class Boss_MirrorSerpent extends");
  });
});
