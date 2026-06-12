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
  it("maps the displayed D/J two-sum controls to the forced pointer moves", () => {
    const source = readFileSync(scenePath, "utf8");

    expect(source).toMatch(
      /private handleD\(\): void \{[\s\S]*this\.advanceTwoSumLeft\(1\)/,
    );
    expect(source).toMatch(
      /private handleJ\(\): void \{[\s\S]*this\.retreatTwoSumRight\(-1\)/,
    );
    expect(source).toContain("Sum too small - press D.");
    expect(source).toContain("private reverseCompleting = false;");
    expect(source).toMatch(
      /if \(this\.reverseCompleting \|\| this\.phase !== ['"]reverse['"]\) return;/,
    );
  });
});
