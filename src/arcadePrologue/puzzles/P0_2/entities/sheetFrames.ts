import type { ShardSymbol, ShardTint } from '../rounds';
import { P0_2_PUZZLE_KEYS } from '../../../../config/assets';

/**
 * Maps a (tint, symbol) pair to a sheet + frame index.
 *
 * Two console sheets and two shard sheets cover all combinations used by the
 * three rounds. Any combination not in the map returns null and the entity
 * falls back to its procedural renderer.
 */

type SheetRef = { sheet: 'primary' | 'extra'; frame: number };

const COMBO_TO_REF: Record<string, SheetRef> = {
  // Primary sheet (R1)
  'red:peak':     { sheet: 'primary', frame: 0 },
  'blue:diamond': { sheet: 'primary', frame: 1 },
  'green:lines':  { sheet: 'primary', frame: 2 },
  // Extra sheet (R2 + R3)
  'violet:star':  { sheet: 'extra', frame: 0 },
  'amber:wave':   { sheet: 'extra', frame: 1 },
  'blue:lines':   { sheet: 'extra', frame: 2 },
};

export type SpriteResolution = {
  textureKey: string;
  frame: number;
};

export function resolveConsoleSprite(
  tint: ShardTint,
  symbol: ShardSymbol,
): SpriteResolution | null {
  const ref = COMBO_TO_REF[`${tint}:${symbol}`];
  if (!ref) return null;
  return {
    textureKey:
      ref.sheet === 'primary'
        ? P0_2_PUZZLE_KEYS.CONSOLES_SHEET
        : P0_2_PUZZLE_KEYS.CONSOLES_EXTRA,
    frame: ref.frame,
  };
}

export function resolveShardSprite(
  tint: ShardTint,
  symbol: ShardSymbol,
): SpriteResolution | null {
  const ref = COMBO_TO_REF[`${tint}:${symbol}`];
  if (!ref) return null;
  return {
    textureKey:
      ref.sheet === 'primary'
        ? P0_2_PUZZLE_KEYS.SHARDS_SHEET
        : P0_2_PUZZLE_KEYS.SHARDS_EXTRA,
    frame: ref.frame,
  };
}
