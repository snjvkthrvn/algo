import { describe, expect, it } from "vitest";
import { bridgeZoneAt } from "./bridgeRules";

describe("bridgeZoneAt", () => {
  // Left buoy at x=300, right at x=700 → lock midzone at 500.
  it("picks the nearest zone within reach", () => {
    expect(bridgeZoneAt(310, 300, 700, 60)).toBe("left");
    expect(bridgeZoneAt(690, 300, 700, 60)).toBe("right");
    expect(bridgeZoneAt(505, 300, 700, 60)).toBe("lock");
  });

  it("returns null when nothing is in reach", () => {
    expect(bridgeZoneAt(80, 300, 700, 60)).toBe(null);
    expect(bridgeZoneAt(400, 300, 700, 40)).toBe(null);
  });

  it("disables the lock zone when the buoys stand adjacent", () => {
    // Buoys 70px apart: the midzone overlaps both — locking is ambiguous,
    // so proximity to a buoy wins and the midpoint yields null.
    expect(bridgeZoneAt(335, 300, 370, 30)).toBe(null);
    expect(bridgeZoneAt(305, 300, 370, 30)).toBe("left");
  });
});
