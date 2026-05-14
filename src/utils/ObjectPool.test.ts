import { describe, expect, it } from 'vitest';
import { ObjectPool } from './ObjectPool';

describe('ObjectPool', () => {
  it('passes acquire arguments to the factory for objects that need construction data', () => {
    const constructedWith: string[] = [];
    const pool = new ObjectPool<{ value: string }>(
      ((value: string) => {
        constructedWith.push(value);
        return { value };
      }) as () => { value: string },
      (obj, value: string) => {
        obj.value = value;
      }
    );

    const created = pool.acquire('first');
    expect(created.value).toBe('first');
    expect(constructedWith).toEqual(['first']);

    pool.release(created);
    const reused = pool.acquire('second');

    expect(reused).toBe(created);
    expect(reused.value).toBe('second');
    expect(constructedWith).toEqual(['first']);
  });
});
