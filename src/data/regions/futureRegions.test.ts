import { describe, expect, it } from 'vitest';
import { REGIONS, SCENE_KEYS } from '../../config/constants';
import {
  CORE_REGION_ROUTE_RECTS,
  FUTURE_REGION_ROUTE_RECTS,
  FUTURE_REGION_SCENE_CONFIGS,
  type FutureRegionSceneConfig,
  isFutureRegionStepWalkable,
  isPointOnFutureRegionRoute,
} from './futureRegions';

const isPointOnConfiguredRoute = (
  config: FutureRegionSceneConfig,
  point: { x: number; y: number }
): boolean => isPointOnFutureRegionRoute(point, 0, config.routeRects ?? FUTURE_REGION_ROUTE_RECTS);

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
        routeSurface: expect.any(String),
      });
    }
  });

  it('assigns a grounded route material to every generated region', () => {
    expect(Object.fromEntries(
      Object.entries(FUTURE_REGION_SCENE_CONFIGS).map(([sceneKey, config]) => [sceneKey, config.routeSurface])
    )).toEqual({
      [SCENE_KEYS.HASH_HIGHLANDS]: 'highland',
      [SCENE_KEYS.STACK_SPIRES]: 'spire',
      [SCENE_KEYS.QUEUE_CANALS]: 'canal',
      [SCENE_KEYS.TREE_CANOPY]: 'root',
      [SCENE_KEYS.GRAPH_NEXUS]: 'graph',
      [SCENE_KEYS.CORE]: 'core',
    });
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
      { x: 960, y: 416 },
      { x: 1784, y: 416 },
    ]) {
      expect(isPointOnFutureRegionRoute(point), `${point.x},${point.y}`).toBe(true);
    }
  });

  it('places Hash Highlands encounters on readable walkable stops', () => {
    const config = FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.HASH_HIGHLANDS];

    expect(config.backgroundKey).toBe('visual-revamp-hash-highlands-bg');
    expect(config.next?.requiresPuzzleId).toBe('boss_archivist');
    expect(config.encounters?.map((encounter) => encounter.id)).toEqual([
      'hh_1',
      'hh_2',
      'hh_3',
      'hh_4',
      'boss_archivist',
    ]);

    for (const encounter of config.encounters ?? []) {
      expect(isPointOnConfiguredRoute(config, encounter.position), encounter.id).toBe(true);
    }
  });

  it('places Stack Spires encounters on readable walkable stops', () => {
    const config = FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.STACK_SPIRES];

    expect(config.backgroundKey).toBe('visual-revamp-stack-spires-bg');
    expect(config.next?.requiresPuzzleId).toBe('boss_recursion');
    expect(config.encounters?.map((encounter) => encounter.id)).toEqual([
      'ss_1',
      'ss_2',
      'ss_3',
      'ss_4',
      'boss_recursion',
    ]);

    for (const encounter of config.encounters ?? []) {
      expect(isPointOnConfiguredRoute(config, encounter.position), encounter.id).toBe(true);
    }
  });

  it.each([
    {
      sceneKey: SCENE_KEYS.QUEUE_CANALS,
      backgroundKey: 'visual-revamp-queue-canals-bg',
      gate: 'boss_reconciler',
      encounters: ['qc_1', 'qc_2', 'qc_3', 'qc_4', 'boss_reconciler'],
    },
    {
      sceneKey: SCENE_KEYS.TREE_CANOPY,
      backgroundKey: 'visual-revamp-tree-canopy-bg',
      gate: 'boss_pattern',
      encounters: ['tc_1', 'tc_2', 'tc_3', 'tc_4', 'boss_pattern'],
    },
    {
      sceneKey: SCENE_KEYS.GRAPH_NEXUS,
      backgroundKey: 'visual-revamp-graph-nexus-bg',
      gate: 'boss_echo',
      encounters: ['gn_1', 'gn_2', 'gn_3', 'gn_4', 'boss_echo'],
    },
  ])('places $sceneKey encounters on readable walkable stops', ({ sceneKey, backgroundKey, gate, encounters }) => {
    const config = FUTURE_REGION_SCENE_CONFIGS[sceneKey];

    expect(config.backgroundKey).toBe(backgroundKey);
    expect(config.next?.requiresPuzzleId).toBe(gate);
    expect(config.encounters?.map((encounter) => encounter.id)).toEqual(encounters);

    for (const encounter of config.encounters ?? []) {
      expect(isPointOnConfiguredRoute(config, encounter.position), encounter.id).toBe(true);
    }
  });

  it('places The Core encounters on readable walkable stops without a next region', () => {
    const config = FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.CORE];

    expect(config.backgroundKey).toBe('visual-revamp-core-bg');
    expect(config.next).toBeUndefined();
    expect(config.routeRects).toBe(CORE_REGION_ROUTE_RECTS);
    expect(config.routeRects?.map((rect) => rect.id)).toEqual([
      'entry_plaza',
      'left_bridge',
      'left_terminal_pad',
      'center_bridge_left',
      'upper_platform',
      'central_hub',
      'lower_lift',
      'lower_terminal',
      'center_bridge_right',
      'final_approach',
      'final_dais',
    ]);
    expect(config.shrinePosition).toEqual({ x: 1024, y: 584 });
    expect(isPointOnConfiguredRoute(config, config.shrinePosition!)).toBe(true);
    expect(isPointOnConfiguredRoute(config, { x: 960, y: 512 }), 'Core lower lift approach').toBe(true);
    expect(config.encounters?.map((encounter) => encounter.id)).toEqual([
      'core_1',
      'core_2',
      'core_3',
      'core_4',
      'boss_protocol_omega',
    ]);

    for (const encounter of config.encounters ?? []) {
      expect(isPointOnConfiguredRoute(config, encounter.position), encounter.id).toBe(true);
    }

    expect(isPointOnConfiguredRoute(config, { x: 192, y: 448 }), 'Core entry spawn').toBe(true);
    expect(isPointOnConfiguredRoute(config, { x: 1712, y: 416 }), 'Core final approach').toBe(true);
    expect(isFutureRegionStepWalkable(
      { x: 640, y: 488 },
      [],
      0,
      config.routeRects
    )).toBe(false);
  });

  it('keeps object footprints blocked while adjacent route tiles remain usable', () => {
    expect(isFutureRegionStepWalkable(
      { x: 544, y: 416 },
      [{ x: 544, y: 416 }]
    )).toBe(false);

    expect(isFutureRegionStepWalkable(
      { x: 576, y: 416 },
      [{ x: 544, y: 416 }]
    )).toBe(true);

    expect(isFutureRegionStepWalkable(
      { x: 512, y: 608 },
      []
    )).toBe(false);
  });
});
