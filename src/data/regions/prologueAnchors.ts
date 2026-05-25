/**
 * Prologue presentation data layer.
 *
 * Single source of truth for the symbolic locations the player visits in the
 * Chamber of Flow. NPC placement, puzzle triggers, exit gates, route landmark
 * art, and proximity-driven story beats all read coordinates from here so the
 * walkable mask, visible route, and script triggers cannot drift apart.
 *
 * The walkable-mask invariant is enforced by `prologue.test.ts` — every anchor
 * position must lie on a `PROLOGUE_ROUTE_RECTS` rectangle.
 */

import { PROLOGUE_TILE_SIZE } from './prologueTilemap';

export interface PrologueAnchor {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
  /** Player-facing label used by the contextual HUD objective line. */
  readonly objectiveLabel?: string;
  /** Tiles of slack around `position` that count as "the player is here." */
  readonly proximityRadiusTiles?: number;
}

const tiles = (n: number): number => n * PROLOGUE_TILE_SIZE;

export const PROLOGUE_ANCHORS = {
  spawn: {
    id: 'spawn',
    position: { x: 320, y: 400 },
  },
  centralHub: {
    id: 'central_hub',
    position: { x: 900, y: 395 },
  },
  professorNode: {
    id: 'professor_node',
    position: { x: 900, y: 395 },
    objectiveLabel: 'Speak with Professor Node',
    proximityRadiusTiles: 3,
  },
  runeKeeper: {
    id: 'rune_keeper',
    position: { x: 900, y: 165 },
    objectiveLabel: 'Find the Rune Keeper',
  },
  consoleKeeper: {
    id: 'console_keeper',
    position: { x: 900, y: 625 },
    objectiveLabel: 'Find the Console Keeper',
  },
  p0_1Trigger: {
    id: 'p0_1',
    position: { x: 900, y: 135 },
  },
  p0_2Trigger: {
    id: 'p0_2',
    position: { x: 900, y: 650 },
  },
  bossGate: {
    id: 'boss_gate',
    position: { x: 1830, y: 395 },
    objectiveLabel: 'Approach the Sentinel Gate',
  },
  arrayGateway: {
    id: 'array_plains_gateway',
    position: { x: 2000, y: 395 },
    objectiveLabel: 'Step through the Gateway',
  },
  // Watcher stands inside the gate_courtyard (cols 53-67, rows 9-15), off
  // to the north of the main travel line between bossGate and arrayGateway.
  // Position picked so the player walks past them naturally on the way out
  // of the Prologue without any detour. Constrained to the walkable
  // tilemap route — the prologueAnchors.test.ts invariant enforces this.
  watcherCliff: {
    id: 'watcher_cliff',
    position: { x: 1808, y: 320 },
    objectiveLabel: 'Approach the Watcher',
    proximityRadiusTiles: 4,
  },
} as const satisfies Record<string, PrologueAnchor>;

export type PrologueAnchorId = keyof typeof PROLOGUE_ANCHORS;

export const proximityRadiusPixels = (anchor: PrologueAnchor): number =>
  tiles(anchor.proximityRadiusTiles ?? 3);

export const isWithinAnchorProximity = (
  anchor: PrologueAnchor,
  point: { x: number; y: number },
): boolean => {
  const r = proximityRadiusPixels(anchor);
  const dx = point.x - anchor.position.x;
  const dy = point.y - anchor.position.y;
  return dx * dx + dy * dy <= r * r;
};
