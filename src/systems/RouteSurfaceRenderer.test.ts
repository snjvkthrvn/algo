import { describe, expect, it } from 'vitest';
import {
  ROUTE_SURFACE_STYLES,
  getRouteMaterialCrop,
  type RouteSurfaceKind,
} from './RouteSurfaceRenderer';

describe('RouteSurfaceRenderer material crops', () => {
  it('maps the generated 4x2 route material sheet to stable biome crops', () => {
    expect(getRouteMaterialCrop(1536, 1024, ROUTE_SURFACE_STYLES.field.materialIndex)).toEqual({
      x: 0,
      y: 0,
      width: 384,
      height: 512,
    });

    expect(getRouteMaterialCrop(1536, 1024, ROUTE_SURFACE_STYLES.core.materialIndex)).toEqual({
      x: 1152,
      y: 512,
      width: 384,
      height: 512,
    });
  });

  it('defines every gameplay region material used by overworld scenes', () => {
    const expectedKinds: RouteSurfaceKind[] = [
      'field',
      'river',
      'highland',
      'spire',
      'canal',
      'root',
      'graph',
      'core',
    ];

    expect(Object.keys(ROUTE_SURFACE_STYLES)).toEqual(expectedKinds);
    for (const kind of expectedKinds) {
      expect(ROUTE_SURFACE_STYLES[kind].materialIndex).toBeGreaterThanOrEqual(0);
      expect(ROUTE_SURFACE_STYLES[kind].materialIndex).toBeLessThan(8);
    }
  });
});
