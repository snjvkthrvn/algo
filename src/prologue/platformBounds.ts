type PlatformRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

export function isOnWalkablePlatform(point: Point, platforms: PlatformRect[]): boolean {
  return platforms.some((platform) => (
    point.x >= platform.x &&
    point.x <= platform.x + platform.width &&
    point.y >= platform.y - 10 &&
    point.y <= platform.y + platform.height + 10
  ));
}

export function shouldRespawnFromVoid(point: Point, platforms: PlatformRect[]): boolean {
  return !isOnWalkablePlatform(point, platforms);
}
