import { describe, expect, it } from 'vitest';
import { REGION_ORDER, REGIONS, SCENE_BY_REGION, SCENE_KEYS } from './constants';

describe('region and scene keys', () => {
  it('registers Array Plains as a real scene target', () => {
    expect(REGIONS.ARRAY_PLAINS).toBe('array_plains');
    expect(SCENE_KEYS.ARRAY_PLAINS).toBe('ArrayPlainsScene');
    expect(REGIONS.TWIN_RIVERS).toBe('twin_rivers');
    expect(SCENE_KEYS.TWIN_RIVERS).toBe('TwinRiversScene');
    expect(SCENE_KEYS.PUZZLE_TR_1).toBe('P2_1_MirrorWalk');
    expect(SCENE_KEYS.BOSS_MIRROR_SERPENT).toBe('Boss_MirrorSerpent');
    expect(SCENE_KEYS.PUZZLE_HH_1).toBe('P3_1_NameplateGates');
    expect(SCENE_KEYS.BOSS_ARCHIVIST).toBe('Boss_Archivist');
    expect(SCENE_KEYS.PUZZLE_SS_1).toBe('P4_1_ScrollStack');
    expect(SCENE_KEYS.BOSS_RECURSION).toBe('Boss_Recursion');
    expect(SCENE_KEYS.PUZZLE_QC_1).toBe('P5_1_FerryQueue');
    expect(SCENE_KEYS.BOSS_RECONCILER).toBe('Boss_Reconciler');
    expect(SCENE_KEYS.PUZZLE_TC_1).toBe('P6_1_RootWalk');
    expect(SCENE_KEYS.BOSS_PATTERN).toBe('Boss_Pattern');
    expect(SCENE_KEYS.PUZZLE_GN_1).toBe('P7_1_NodeLinks');
    expect(SCENE_KEYS.BOSS_ECHO).toBe('Boss_Echo');
    expect(SCENE_KEYS.PUZZLE_CORE_1).toBe('P8_1_EchoChamber');
    expect(SCENE_KEYS.BOSS_PROTOCOL_OMEGA).toBe('Boss_ProtocolOmega');
    expect(SCENE_KEYS.HASH_HIGHLANDS).toBe('HashHighlandsScene');
    expect(SCENE_KEYS.CORE).toBe('CoreScene');
  });

  it('maps saved region ids to Phaser scene keys for Continue', () => {
    for (const region of REGION_ORDER) {
      expect(SCENE_BY_REGION[region], region).toBeDefined();
    }
    expect(SCENE_BY_REGION[REGIONS.PROLOGUE]).toBe(SCENE_KEYS.PROLOGUE);
    expect(SCENE_BY_REGION[REGIONS.CORE]).toBe(SCENE_KEYS.CORE);
  });

  it('keeps the story region order routable through the generated visual regions', () => {
    expect(REGION_ORDER).toEqual([
      REGIONS.PROLOGUE,
      REGIONS.ARRAY_PLAINS,
      REGIONS.TWIN_RIVERS,
      REGIONS.HASH_HIGHLANDS,
      REGIONS.STACK_SPIRES,
      REGIONS.QUEUE_CANALS,
      REGIONS.TREE_CANOPY,
      REGIONS.GRAPH_NEXUS,
      REGIONS.CORE,
    ]);
  });
});
