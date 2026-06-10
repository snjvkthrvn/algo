import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string): string =>
  readFileSync(resolve(__dirname, rel), "utf8");

describe("movement gym registration", () => {
  it("is registered in gameConfig", () => {
    const cfg = read("../../config/gameConfig.ts");
    // Quote-agnostic: the repo formatter may rewrite quote style.
    expect(cfg).toMatch(
      /import \{ MovementGymScene \} from .\.\.\/scenes\/dev\/MovementGymScene.;/,
    );
    expect(cfg).toContain("MovementGymScene,");
  });

  it("is listed in the debug scene select", () => {
    expect(read("../DebugSelectScene.ts")).toContain("SCENE_KEYS.MOVEMENT_GYM");
  });

  it("uses the registered scene key", () => {
    expect(read("./MovementGymScene.ts")).toContain("SCENE_KEYS.MOVEMENT_GYM");
  });
});
