import { describe, expect, it } from 'vitest';
import { REGIONS, SCENE_KEYS } from '../../config/constants';
import {
  FUTURE_REGION_ROUTE_RECTS,
  FUTURE_REGION_SCENE_CONFIGS,
  isPointOnFutureRegionRoute,
} from './futureRegions';

describe('future region visual configs', () => {
  it('defines a playable scene config for every post-Twin-Rivers region', () => {
    const futureRegions = [
      { region: REGIONS.HASH_HIGHLANDS, sceneKey: SCENE_KEYS.HASH_HIGHLANDS },
      { region: REGIONS.STACK_SPIRES, sceneKey: SCENE_KEYS.STACK_SPIRES },
      { region: REGIONS.QUEUE_CANALS, sceneKey: SCENE_KEYS.QUEUE_CANALS },
      { region: REGIONS.TREE_CANOPY, sceneKey: SCENE_KEYS.TREE_CANOPY },
      { region: REGIONS.GRAPH_NEXUS, sceneKey: SCENE_KEYS.GRAPH_NEXUS },
      { region: REGIONS.CORE, sceneKey: SCENE_KEYS.CORE },
    ];

    for (const { region, sceneKey } of futureRegions) {
      expect(FUTURE_REGION_SCENE_CONFIGS[sceneKey], region).toMatchObject({
        sceneKey,
        regionId: region,
        backgroundKey: expect.stringMatching(/^visual-revamp-/),
      });
    }
  });

  it('keeps portal anchors and guide clearings on the shared walkable route', () => {
    expect(FUTURE_REGION_ROUTE_RECTS.map((rect) => rect.id)).toEqual([
      'entry_lane',
      'main_span',
      'upper_overlook',
      'lower_clearing',
      'exit_lane',
    ]);

    for (const point of [
      { x: 112, y: 448 },
      { x: 960, y: 336 },
      { x: 960, y: 536 },
      { x: 1784, y: 416 },
    ]) {
      expect(isPointOnFutureRegionRoute(point), `${point.x},${point.y}`).toBe(true);
    }
  });
});
