export const numberKeyToIndex = (key: string, itemCount: number): number | null => {
  const keyNumber = Number.parseInt(key, 10);
  if (!Number.isInteger(keyNumber)) return null;
  if (keyNumber < 1 || keyNumber > itemCount) return null;
  return keyNumber - 1;
};
