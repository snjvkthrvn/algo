/**
 * Lightweight generic object pool for Phaser entities.
 * Eliminates GC spikes on region transitions and puzzle spawns.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: (...args: any[]) => T;
  private readonly resetFn: (obj: T, ...args: any[]) => void;

  constructor(factory: (...args: any[]) => T, reset: (obj: T, ...args: any[]) => void) {
    this.factory = factory;
    this.resetFn = reset;
  }

  acquire(...args: any[]): T {
    const obj = this.pool.pop() ?? this.factory(...args);
    this.resetFn(obj, ...args);
    return obj;
  }

  release(obj: T): void {
    if (obj && 'setActive' in (obj as any)) {
      (obj as any).setActive(false).setVisible(false);
    }
    this.pool.push(obj);
  }

  clear(): void {
    this.pool.length = 0;
  }
}
