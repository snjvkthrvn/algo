import { describe, expect, it } from 'vitest';
import { REGIONS } from '../config/constants';
import {
  REGION_PRESENTATION,
  getRegionPresentation,
  getRegionPresentationByTitle,
  getRegionProgress,
} from './regionPresentation';

describe('region presentation model', () => {
  it('covers the complete scripted game route in order', () => {
    expect(REGION_PRESENTATION.map((region) => region.id)).toEqual([
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

  it('resolves prologue by its in-game title and reports first-act progress', () => {
    const prologue = getRegionPresentationByTitle('Chamber of Flow');

    expect(prologue?.id).toBe(REGIONS.PROLOGUE);
    expect(getRegionProgress(prologue?.id)).toEqual({
      current: 1,
      total: REGION_PRESENTATION.length,
      label: '1/9',
    });
  });

  it('uses the same presentation metadata for saved-region ids and titles', () => {
    const byId = getRegionPresentation(REGIONS.GRAPH_NEXUS);
    const byTitle = getRegionPresentationByTitle('Graph Nexus');

    expect(byTitle).toBe(byId);
    expect(byId?.journeyRole).toContain('graphs');
    expect(getRegionProgress(REGIONS.GRAPH_NEXUS).label).toBe('8/9');
  });

  it('falls back safely for unknown names', () => {
    expect(getRegionPresentationByTitle('Unknown Region')).toBeUndefined();
    expect(getRegionProgress('unknown')).toEqual({
      current: 0,
      total: REGION_PRESENTATION.length,
      label: '?/9',
    });
  });
});
