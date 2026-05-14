import { describe, expect, it } from 'vitest';
import {
  createInitialArray,
  accessByIndex,
  reorderArray,
  sequentialAccess,
  getFloatingHint,
  mutateAndFeedback,
  getShardTarget,
  getShardLookupEntries,
  createVisitProgram,
  executeVisitInstruction,
  getCurrentVisitInstruction,
  getProgramTraceLineIndex,
  getProgramTraceLines,
  runeIdToTileIndex,
  SEQUENCE_ROUNDS,
  ArrayPuzzleState,
} from './prologuePuzzleLogic';

describe('prologuePuzzleLogic - Array Intro', () => {
  describe('createInitialArray', () => {
    it('creates ordered sequence of runes for indexing practice', () => {
      const arr = createInitialArray();
      expect(arr).toEqual(['rune-1', 'rune-2', 'rune-3', 'rune-4']);
      expect(arr.length).toBe(4);
    });
  });

  describe('accessByIndex', () => {
    it('returns element at 0-based index and hint about indices starting at 0', () => {
      const state: ArrayPuzzleState = { array: ['a', 'b', 'c'], feedback: '' };
      const result = accessByIndex(state, 0);
      expect(result.value).toBe('a');
      expect(result.hint).toContain('indices start at 0');
    });

    it('provides immediate feedback on valid access', () => {
      const state: ArrayPuzzleState = { array: ['a', 'b'], feedback: '' };
      const result = accessByIndex(state, 1);
      expect(result.feedback).toContain('order matters');
    });
  });

  describe('reorderArray', () => {
    it('mutates array visually and emphasizes order', () => {
      const state: ArrayPuzzleState = { array: [1, 2, 3], feedback: '' };
      const newState = reorderArray(state, [2, 0, 1]);
      expect(newState.array).toEqual([3, 1, 2]);
      expect(newState.feedback).toContain('arrays hold sequences');
    });
  });

  describe('sequentialAccess', () => {
    it('flows through array sequentially for algorithm intro', () => {
      const state: ArrayPuzzleState = { array: ['x', 'y', 'z'], feedback: '' };
      const result = sequentialAccess(state);
      expect(result.visited).toEqual(['x', 'y', 'z']);
      expect(result.flowHint).toContain('Sequential access');
    });
  });

  describe('getFloatingHint', () => {
    it('returns educational floating hints', () => {
      expect(getFloatingHint('index')).toContain('indices start at 0');
      expect(getFloatingHint('order')).toContain('order matters');
      expect(getFloatingHint('sequence')).toContain('arrays hold sequences');
    });
  });

  describe('mutateAndFeedback', () => {
    it('provides visual mutation feedback immediately', () => {
      const state: ArrayPuzzleState = { array: ['p', 'q'], feedback: '' };
      const mutated = mutateAndFeedback(state, 'swap', 0, 1);
      expect(mutated.array).toEqual(['q', 'p']);
      expect(mutated.feedback).toBeTruthy();
    });
  });

  describe('sequence and console mappings', () => {
    it('maps rune ids to zero-based tile indexes for Follow the Path', () => {
      expect(SEQUENCE_ROUNDS).toHaveLength(3);
      expect(runeIdToTileIndex('hex_1')).toBe(0);
      expect(runeIdToTileIndex('hex_6')).toBe(5);
    });

    it('maps shard shapes to their console colors for Flow Consoles', () => {
      expect(getShardTarget('triangle')).toBe('red');
      expect(getShardTarget('diamond')).toBe('blue');
      expect(getShardTarget('circle')).toBe('green');
    });
  });

  describe('visible program-counter execution', () => {
    it('turns a rune sequence into visit instructions with zero-based tile indexes', () => {
      const program = createVisitProgram(['hex_2', 'hex_4', 'hex_1']);

      expect(program).toEqual([
        { op: 'visit', tileIndex: 1, label: 'visit(2)' },
        { op: 'visit', tileIndex: 3, label: 'visit(4)' },
        { op: 'visit', tileIndex: 0, label: 'visit(1)' },
      ]);
    });

    it('keeps pc stable on a wrong tile and advances only on the expected tile', () => {
      const program = createVisitProgram(['hex_2', 'hex_4']);

      expect(getCurrentVisitInstruction(program, 0)?.label).toBe('visit(2)');

      const wrong = executeVisitInstruction(program, 0, 0);
      expect(wrong).toEqual({
        correct: false,
        pc: 0,
        complete: false,
        expectedTileIndex: 1,
      });

      const right = executeVisitInstruction(program, 0, 1);
      expect(right).toEqual({
        correct: true,
        pc: 1,
        complete: false,
        expectedTileIndex: 1,
      });

      const finished = executeVisitInstruction(program, 1, 3);
      expect(finished).toEqual({
        correct: true,
        pc: 2,
        complete: true,
        expectedTileIndex: 3,
      });
    });

    it('provides trace lines and active trace indexes for the visible program', () => {
      const program = createVisitProgram(['hex_1', 'hex_3']);

      expect(getProgramTraceLines(program)).toEqual([
        'pc = 0',
        'while pc < program.length:',
        '  [0] visit(1)',
        '  [1] visit(3)',
        'done',
      ]);
      expect(getProgramTraceLineIndex(0, program.length)).toBe(2);
      expect(getProgramTraceLineIndex(1, program.length)).toBe(3);
      expect(getProgramTraceLineIndex(2, program.length)).toBe(4);
    });
  });

  describe('explicit shard lookup table', () => {
    it('exposes every shard-to-console row for Flow Consoles trace panels', () => {
      expect(getShardLookupEntries()).toEqual([
        { shard: 'triangle', console: 'red', traceLine: 'target[triangle] -> red' },
        { shard: 'diamond', console: 'blue', traceLine: 'target[diamond] -> blue' },
        { shard: 'circle', console: 'green', traceLine: 'target[circle] -> green' },
      ]);
    });
  });
});
