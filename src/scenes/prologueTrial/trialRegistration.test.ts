import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string): string =>
  readFileSync(resolve(__dirname, rel), "utf8");

describe("echo causeway registration", () => {
  it("is registered in gameConfig", () => {
    const cfg = read("../../config/gameConfig.ts");
    // Quote-agnostic: the repo formatter may rewrite quote style.
    expect(cfg).toMatch(
      /import \{ PrologueTrialScene \} from .\.\.\/scenes\/prologueTrial\/PrologueTrialScene.;/,
    );
    expect(cfg).toContain("PrologueTrialScene,");
  });

  it("is listed in the debug select and the warp whitelist", () => {
    expect(read("../DebugSelectScene.ts")).toContain(
      "SCENE_KEYS.PROLOGUE_TRIAL",
    );
    expect(read("../dev/sceneWarp.ts")).toContain("SCENE_KEYS.PROLOGUE_TRIAL");
  });

  it("uses the registered scene key", () => {
    expect(read("./PrologueTrialScene.ts")).toContain(
      "SCENE_KEYS.PROLOGUE_TRIAL",
    );
  });
});
