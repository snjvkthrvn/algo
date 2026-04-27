import { describe, expect, it } from 'vitest';
import {
  SENTINEL_SCRIPT_PHASES,
  getNextSentinelPhase,
  shouldSkipConceptBridge,
} from './sentinelScriptRules';

describe('sentinelScriptRules', () => {
  it('uses the script-faithful phase order', () => {
    expect(SENTINEL_SCRIPT_PHASES.map((phase) => phase.id)).toEqual([
      'sequence_test',
      'mapping_test',
      'combined_test',
      'victory',
    ]);
  });

  it('skips Concept Bridge for the prologue boss return handoff', () => {
    expect(shouldSkipConceptBridge('boss_sentinel')).toBe(true);
    expect(shouldSkipConceptBridge('p0_1')).toBe(false);
  });

  it('advances linearly through the authored Sentinel phases', () => {
    expect(getNextSentinelPhase('sequence_test')).toBe('mapping_test');
    expect(getNextSentinelPhase('mapping_test')).toBe('combined_test');
    expect(getNextSentinelPhase('combined_test')).toBe('victory');
  });

  it('keeps the boss handoff focused on the Sentinel and not a third concept bridge', () => {
    expect(shouldSkipConceptBridge('boss_sentinel')).toBe(true);
    expect(SENTINEL_SCRIPT_PHASES[0].title).toContain('Sequence');
    expect(SENTINEL_SCRIPT_PHASES[1].title).toContain('Mapping');
    expect(SENTINEL_SCRIPT_PHASES[2].title).toContain('Combined');
  });
});
