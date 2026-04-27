export type SentinelScriptPhase =
  | 'sequence_test'
  | 'mapping_test'
  | 'combined_test'
  | 'victory';

export const SENTINEL_SCRIPT_PHASES = [
  { id: 'sequence_test', title: 'Phase 1: The Sequence Test' },
  { id: 'mapping_test', title: 'Phase 2: The Mapping Test' },
  { id: 'combined_test', title: 'Phase 3: The Combined Test' },
  { id: 'victory', title: 'Authentication: VALID' },
] as const;

export function getNextSentinelPhase(
  current: Exclude<SentinelScriptPhase, 'victory'>,
): SentinelScriptPhase {
  if (current === 'sequence_test') return 'mapping_test';
  if (current === 'mapping_test') return 'combined_test';
  return 'victory';
}

export function shouldSkipConceptBridge(puzzleId: string): boolean {
  return puzzleId === 'boss_sentinel';
}
