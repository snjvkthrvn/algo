import { describe, expect, it } from 'vitest';
import {
  buildBubbleSortPreview,
  buildCurrentRiderPreview,
  buildFixedWindowPreview,
  buildHashRoutingPreview,
  buildIndexingPreview,
  buildMirrorSerpentPreview,
  buildPointerBridgePreview,
  buildSentinelPreview,
  buildShufflerPreview,
  buildTwoSumPreview,
} from './puzzlePreviewLogic';

describe('puzzle preview logic', () => {
  it('predicts the exact bubble-sort swap result', () => {
    const preview = buildBubbleSortPreview({
      values: [1, 3, 2, 4],
      compareIndex: 1,
      swaps: 0,
      optimalSwaps: 1,
      lastAction: 'none',
    });

    expect(preview.state).toContain('i     = 1 (3 > 2)');
    expect(preview.next).toContain('KEY 2 -> arr = [1, 2, 3, 4]');
  });

  it('predicts an indexing lookup directly from the requested slot', () => {
    const preview = buildIndexingPreview({
      basketCount: 5,
      request: { item: 'rope', index: 3 },
      requestNumber: 1,
      totalRequests: 1,
    });

    expect(preview.state).toContain('target slot = 3');
    expect(preview.next).toBe('KEY 4 -> tools[3] = ROPE');
  });

  it('computes the hash bucket before the player routes the crop', () => {
    const preview = buildHashRoutingPreview({
      crop: { crop: 'WHEAT', letterIndex: 22 },
      bucketCount: 4,
      routed: 0,
      missed: 0,
      total: 4,
    });

    expect(preview.state).toContain('bucket = 22 % 4');
    expect(preview.next).toBe('KEY 3 -> bucket #2');
  });

  it('shows the two-sum complement and whether it is present', () => {
    const preview = buildTwoSumPreview({
      values: [1, 3, 5, 6, 8],
      target: 9,
      selectedValues: [3],
    });

    expect(preview.state).toContain('seen  = {3}');
    expect(preview.next).toContain('target - 3 = 6');
    expect(preview.next).toContain('Found 6');
  });

  it('forces the next pointer move from the current sum', () => {
    const preview = buildPointerBridgePreview({
      values: [1, 3, 5, 8, 11, 14, 18],
      target: 19,
      left: 0,
      right: 6,
    });

    expect(preview.state).toContain('sum   = 1 + 18 = 19');
    expect(preview.next).toBe('ENTER -> lock pair (1 + 18)');
  });

  it('predicts the next fixed-window slide result', () => {
    const preview = buildFixedWindowPreview({
      values: [2, 7, 1, 9, 4],
      windowSize: 3,
      start: 0,
      bestSeen: 10,
    });

    expect(preview.state).toContain('window = [2, 7, 1]');
    expect(preview.next).toBe('RIGHT -> window = [7, 1, 9], sum = 17');
  });

  it('predicts grow versus shrink for variable-window duplicate handling', () => {
    const preview = buildCurrentRiderPreview({
      letters: ['A', 'B', 'C', 'A'],
      left: 0,
      right: 3,
      bestLength: 3,
    });

    expect(preview.state).toContain('duplicate = yes');
    expect(preview.next).toBe('Q -> L = 1\nwindow = [B, C, A]');
  });

  it('summarizes the active Shuffler sub-puzzle and next pick', () => {
    const preview = buildShufflerPreview({
      phase: 'hash',
      crop: { crop: 'RICE', letterIndex: 17 },
      bucketCount: 4,
      roundNumber: 4,
      totalRounds: 4,
    });

    expect(preview.state).toContain('phase = hash');
    expect(preview.next).toBe('KEY 2 -> bucket #1');
  });

  it('combines Mirror Serpent phase invariants with the next prediction', () => {
    const preview = buildMirrorSerpentPreview({
      phase: 'reverse',
      values: [5, 2, 8, 4],
      target: [4, 8, 2, 5],
      left: 0,
      right: 3,
    });

    expect(preview.state).toContain('phase = reverse');
    expect(preview.next).toContain('SPACE -> arr = [4, 2, 8, 5]');
  });

  it('shows Sentinel phase and the next rule that can fire', () => {
    const preview = buildSentinelPreview({
      phase: 'flowing',
      altars: ['1,0', '2,1'],
      currentFork: '0,0',
      choices: ['1,0', '0,1'],
    });

    expect(preview.state).toContain('phase = flowing');
    expect(preview.next).toContain('Pick 1,0 or 0,1');
  });
});
