export type FlowConsoleShape = 'triangle' | 'diamond' | 'circle';
export type FlowConsoleColor = 'red' | 'blue' | 'green';

export const FLOW_CONSOLE_CANON = [
  {
    id: 'triangle_red',
    shape: 'triangle' as FlowConsoleShape,
    colorName: 'red' as FlowConsoleColor,
    colorValue: 0xef4444,
  },
  {
    id: 'diamond_blue',
    shape: 'diamond' as FlowConsoleShape,
    colorName: 'blue' as FlowConsoleColor,
    colorValue: 0x3b82f6,
  },
  {
    id: 'circle_green',
    shape: 'circle' as FlowConsoleShape,
    colorName: 'green' as FlowConsoleColor,
    colorValue: 0x22c55e,
  },
] as const;
