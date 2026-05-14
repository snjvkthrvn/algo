import { describe, expect, it } from 'vitest';
import {
  PROLOGUE_ANCHORS,
  isWithinAnchorProximity,
  proximityRadiusPixels,
} from './prologueAnchors';
import { isPointOnPrologueTileRoute } from './prologueTilemap';
import { PROLOGUE_CONFIG } from './prologue';
import { PROLOGUE_NPCS } from '../npcs/prologue_npcs';

describe('PROLOGUE_ANCHORS', () => {
  it('places every player-facing anchor on the walkable tilemap route', () => {
    for (const [key, anchor] of Object.entries(PROLOGUE_ANCHORS)) {
      expect(isPointOnPrologueTileRoute(anchor.position), key).toBe(true);
    }
  });

  it('is the single source NPC defaultPositions read from', () => {
    const positionsById = new Map(
      PROLOGUE_NPCS.map((npc) => [npc.id, npc.defaultPosition]),
    );

    expect(positionsById.get(PROLOGUE_ANCHORS.professorNode.id)).toEqual(
      PROLOGUE_ANCHORS.professorNode.position,
    );
    expect(positionsById.get(PROLOGUE_ANCHORS.runeKeeper.id)).toEqual(
      PROLOGUE_ANCHORS.runeKeeper.position,
    );
    expect(positionsById.get(PROLOGUE_ANCHORS.consoleKeeper.id)).toEqual(
      PROLOGUE_ANCHORS.consoleKeeper.position,
    );
  });

  it('is the single source PROLOGUE_CONFIG puzzles and exits read from', () => {
    const puzzlesById = new Map(
      PROLOGUE_CONFIG.puzzles.map((puzzle) => [puzzle.id, puzzle.position]),
    );
    expect(puzzlesById.get(PROLOGUE_ANCHORS.p0_1Trigger.id)).toEqual(
      PROLOGUE_ANCHORS.p0_1Trigger.position,
    );
    expect(puzzlesById.get(PROLOGUE_ANCHORS.p0_2Trigger.id)).toEqual(
      PROLOGUE_ANCHORS.p0_2Trigger.position,
    );

    const exitsById = new Map(
      PROLOGUE_CONFIG.exitPoints.map((exit) => [exit.id, exit.position]),
    );
    expect(exitsById.get(PROLOGUE_ANCHORS.bossGate.id)).toEqual(
      PROLOGUE_ANCHORS.bossGate.position,
    );
    expect(exitsById.get(PROLOGUE_ANCHORS.arrayGateway.id)).toEqual(
      PROLOGUE_ANCHORS.arrayGateway.position,
    );
  });

  it('reports proximity inside and outside the anchor radius', () => {
    const node = PROLOGUE_ANCHORS.professorNode;
    const r = proximityRadiusPixels(node);

    expect(isWithinAnchorProximity(node, node.position)).toBe(true);
    expect(isWithinAnchorProximity(node, { x: node.position.x - r + 4, y: node.position.y })).toBe(true);
    expect(isWithinAnchorProximity(node, { x: node.position.x - r - 4, y: node.position.y })).toBe(false);
  });
});
