export type FlowConsoleShape = 'triangle' | 'diamond' | 'circle';
export type FlowConsoleStripes = 'single' | 'double' | 'triple';
export type FlowConsoleColor = 'red' | 'blue' | 'green';

export const FLOW_CONSOLE_CANON = [
  {
    id: 'triangle_double_red',
    shape: 'triangle',
    stripes: 'double',
    colorName: 'red',
    colorValue: 0xef4444,
  },
  {
    id: 'diamond_single_blue',
    shape: 'diamond',
    stripes: 'single',
    colorName: 'blue',
    colorValue: 0x3b82f6,
  },
  {
    id: 'circle_triple_green',
    shape: 'circle',
    stripes: 'triple',
    colorName: 'green',
    colorValue: 0x22c55e,
  },
] as const;

export function getFlowConsoleKey(input: {
  shape: FlowConsoleShape;
  stripes: FlowConsoleStripes;
}): string {
  return `${input.shape}_${input.stripes}`;
}

export function isCorrectFlowConsoleMatch(
  shard: { shape: FlowConsoleShape; stripes: FlowConsoleStripes },
  target: (typeof FLOW_CONSOLE_CANON)[number],
): boolean {
  return shard.shape === target.shape && shard.stripes === target.stripes;
}
