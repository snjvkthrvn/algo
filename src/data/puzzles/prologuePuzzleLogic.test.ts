import { describe, expect, it } from 'vitest';
import {
  createInitialArray,
  accessByIndex,
  reorderArray,
  sequentialAccess,
  getFloatingHint,
  mutateAndFeedback,
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
});
