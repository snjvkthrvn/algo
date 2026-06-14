/**
 * Twin Rivers puzzle barrel.
 *
 * Every Twin Rivers encounter is now an embodied chamber room in its own
 * file (the player walks inside the puzzle and operates pointers/windows by
 * hand — docs/VISION.md §3-4; no pseudocode or state panels during play).
 * This file retains its name only so gameConfig scene registration and the
 * region wiring keep importing from one place; it re-exports the four rooms
 * and the finale boss.
 */

export { P2_1_MirrorWalk } from "./P2_1_MirrorWalk";
export { P2_2_PointerBridge } from "./P2_2_PointerBridge";
export { P2_3_FixedWindowDock } from "./P2_3_FixedWindowDock";
export { P2_4_CurrentRider } from "./P2_4_CurrentRider";
export { Boss_MirrorSerpent } from "./Boss_MirrorSerpent";
