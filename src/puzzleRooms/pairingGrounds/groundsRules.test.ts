import { describe, expect, it } from "vitest";
import { stoneIndexAt } from "./groundsRules";

describe("stoneIndexAt", () => {
  const centers = [
    { x: 100, y: 200 },
    { x: 200, y: 200 },
    { x: 100, y: 300 },
    { x: 200, y: 300 },
  ];

  it("returns the nearest stone within the radius", () => {
    expect(stoneIndexAt(105, 205, centers, 60)).toBe(0);
    expect(stoneIndexAt(195, 305, centers, 60)).toBe(3);
    expect(stoneIndexAt(160, 200, centers, 60)).toBe(1);
  });

  it("returns -1 when nothing is in reach", () => {
    expect(stoneIndexAt(400, 400, centers, 60)).toBe(-1);
    expect(stoneIndexAt(150, 250, centers, 20)).toBe(-1);
  });

  it("resolves exact ties to the lowest index", () => {
    expect(stoneIndexAt(150, 200, centers, 60)).toBe(0);
  });
});
