/**
 * Prologue puzzle rules from the visual prototype (pokemon_based_game_visuals).
 * Fixed sequence rounds and shard→console mapping for P0-1 / P0-2.
 */

export const SEQUENCE_ROUNDS = [
  ['rune-1', 'rune-2', 'rune-3'],
  ['rune-2', 'rune-4', 'rune-1', 'rune-5', 'rune-3'],
  ['rune-5', 'rune-1', 'rune-4', 'rune-2', 'rune-3', 'rune-6', 'rune-4'],
] as const;

export type RuneId = (typeof SEQUENCE_ROUNDS)[number][number];

export const SHARD_TARGETS = {
  triangle: 'red',
  diamond: 'blue',
  circle: 'green',
} as const;

export type ShardKind = keyof typeof SHARD_TARGETS;
export type ConsoleKind = (typeof SHARD_TARGETS)[ShardKind];

export function runeIdToTileIndex(id: string): number {
  const match = /^rune-(\d+)$/.exec(id);
  if (!match) return 0;
  return Math.max(0, Math.min(5, Number.parseInt(match[1], 10) - 1));
}

export function getShardTarget(shardId: string): ConsoleKind | null {
  if (shardId in SHARD_TARGETS) {
    return SHARD_TARGETS[shardId as ShardKind];
  }
  return null;
}
