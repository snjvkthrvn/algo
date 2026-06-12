import { describe, expect, it } from "vitest";
import { TRIAL_LEGS, isFieldTile } from "./memoryWalk";
import {
  TRIAL_COLS,
  TRIAL_ROWS,
  TRIAL_TILE,
  bandAt,
  pickTrialTile,
} from "./trialTiles";

describe("trialTiles", () => {
  it("rings the room with rim tiles", () => {
    expect(pickTrialTile(0, 0)).toBe(TRIAL_TILE.RIM_TL);
    expect(pickTrialTile(TRIAL_COLS - 1, 0)).toBe(TRIAL_TILE.RIM_TR);
    expect(pickTrialTile(0, TRIAL_ROWS - 1)).toBe(TRIAL_TILE.RIM_BL);
    expect(pickTrialTile(20, 0)).toBe(TRIAL_TILE.RIM_TOP);
    expect(pickTrialTile(0, 11)).toBe(TRIAL_TILE.RIM_LEFT);
  });

  it("classifies bands: platforms, islets, chasms", () => {
    expect(bandAt(2)).toBe("exit");
    expect(bandAt(5)).toBe("chasm");
    expect(bandAt(8)).toBe("islet");
    expect(bandAt(12)).toBe("chasm");
    expect(bandAt(15)).toBe("islet");
    expect(bandAt(17)).toBe("chasm");
    expect(bandAt(21)).toBe("entry");
  });

  it("paints void under chasm tiles, including causeway slots", () => {
    const frame = pickTrialTile(19, 18); // leg-1 path tile — static layer is void
    expect([TRIAL_TILE.VOID_A, TRIAL_TILE.VOID_STARS]).toContain(frame);
    expect(isFieldTile(TRIAL_LEGS[0]!, 19, 18)).toBe(true);
  });

  it("paints stone on platforms and islets", () => {
    const stone = [
      TRIAL_TILE.FLOOR_A,
      TRIAL_TILE.FLOOR_B,
      TRIAL_TILE.FLOOR_ETCHED,
      TRIAL_TILE.FLOOR_WORN,
      TRIAL_TILE.GLYPH_DECOR,
      TRIAL_TILE.ISLE_TOP,
      TRIAL_TILE.ISLE_BOTTOM,
    ];
    expect(stone).toContain(pickTrialTile(10, 21));
    expect(stone).toContain(pickTrialTile(20, 8));
  });

  it("is deterministic", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickTrialTile(7, 14)).toBe(pickTrialTile(7, 14));
    }
  });
});
