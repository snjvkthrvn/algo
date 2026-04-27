export const moveMenuSelection = (
  currentIndex: number,
  direction: -1 | 1,
  itemCount: number
): number => {
  if (itemCount <= 0) return 0;
  return (currentIndex + direction + itemCount) % itemCount;
};
