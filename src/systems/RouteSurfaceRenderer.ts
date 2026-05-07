import type Phaser from 'phaser';

export type RouteSurfaceKind =
  | 'field'
  | 'river'
  | 'highland'
  | 'spire'
  | 'canal'
  | 'root'
  | 'graph'
  | 'core';

export interface RouteSurfaceRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RouteSurfacePoint {
  x: number;
  y: number;
  radius?: number;
}

export interface RouteSurfaceStyle {
  materialIndex: number;
  surfaceColor: number;
  edgeColor: number;
  detailColor: number;
  pattern: 'stones' | 'planks' | 'flow' | 'roots' | 'circuit';
  textureAlpha: number;
}

export interface RouteMaterialCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MATERIAL_COLUMNS = 4;
const MATERIAL_ROWS = 2;
const MATERIAL_COUNT = MATERIAL_COLUMNS * MATERIAL_ROWS;

export const ROUTE_SURFACE_STYLES: Record<RouteSurfaceKind, RouteSurfaceStyle> = {
  field: {
    materialIndex: 0,
    surfaceColor: 0xcaa06a,
    edgeColor: 0xe0f8d0,
    detailColor: 0xfbbf24,
    pattern: 'stones',
    textureAlpha: 0.08,
  },
  river: {
    materialIndex: 1,
    surfaceColor: 0x8a5a2a,
    edgeColor: 0x9be8ff,
    detailColor: 0xfbbf24,
    pattern: 'planks',
    textureAlpha: 0.08,
  },
  highland: {
    materialIndex: 2,
    surfaceColor: 0x8f8065,
    edgeColor: 0xfbbf24,
    detailColor: 0x06b6d4,
    pattern: 'stones',
    textureAlpha: 0.08,
  },
  spire: {
    materialIndex: 3,
    surfaceColor: 0x9a8f82,
    edgeColor: 0x9be8ff,
    detailColor: 0xfbbf24,
    pattern: 'circuit',
    textureAlpha: 0.08,
  },
  canal: {
    materialIndex: 4,
    surfaceColor: 0x9a8a72,
    edgeColor: 0x5ab7d4,
    detailColor: 0xfbbf24,
    pattern: 'planks',
    textureAlpha: 0.08,
  },
  root: {
    materialIndex: 5,
    surfaceColor: 0x6b5837,
    edgeColor: 0x88c070,
    detailColor: 0x22c55e,
    pattern: 'roots',
    textureAlpha: 0.07,
  },
  graph: {
    materialIndex: 6,
    surfaceColor: 0x203457,
    edgeColor: 0x38bdf8,
    detailColor: 0xfbbf24,
    pattern: 'circuit',
    textureAlpha: 0.08,
  },
  core: {
    materialIndex: 7,
    surfaceColor: 0x242a30,
    edgeColor: 0xf97316,
    detailColor: 0x06b6d4,
    pattern: 'circuit',
    textureAlpha: 0.08,
  },
};

export const getRouteMaterialCrop = (
  textureWidth: number,
  textureHeight: number,
  materialIndex: number
): RouteMaterialCrop => {
  const normalizedIndex = ((materialIndex % MATERIAL_COUNT) + MATERIAL_COUNT) % MATERIAL_COUNT;
  const cellWidth = textureWidth / MATERIAL_COLUMNS;
  const cellHeight = textureHeight / MATERIAL_ROWS;
  const col = normalizedIndex % MATERIAL_COLUMNS;
  const row = Math.floor(normalizedIndex / MATERIAL_COLUMNS);

  return {
    x: col * cellWidth,
    y: row * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
};

export const renderRouteSurfaces = (
  scene: Phaser.Scene,
  rects: RouteSurfaceRect[],
  style: RouteSurfaceStyle,
  textureKey: string,
  depth = 0.82
): void => {
  const textureExists = scene.textures.exists(textureKey);
  const crop = textureExists ? resolveTextureCrop(scene, textureKey, style.materialIndex) : null;

  for (const rect of rects) {
    if (crop) {
      scene.add
        .image(rect.x + rect.width / 2, rect.y + rect.height / 2, textureKey)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDisplaySize(rect.width, rect.height)
        .setAlpha(style.textureAlpha)
        .setDepth(depth);
    }
  }

  const overlay = scene.add.graphics().setDepth(depth + 0.08);
  for (const rect of rects) {
    drawRouteBody(overlay, rect, style);
    drawRoutePattern(overlay, rect, style);
  }
};

export const renderRouteStopPads = (
  scene: Phaser.Scene,
  points: RouteSurfacePoint[],
  style: RouteSurfaceStyle,
  depth = 2.1
): void => {
  const pads = scene.add.graphics().setDepth(depth);

  for (const point of points) {
    const radius = point.radius ?? 42;
    pads.fillStyle(style.surfaceColor, 0.1);
    pads.fillEllipse(point.x, point.y + 8, radius * 1.15, radius * 0.48);
    pads.lineStyle(2, style.edgeColor, 0.18);
    pads.strokeEllipse(point.x, point.y + 8, radius * 1.15, radius * 0.48);
    pads.lineStyle(1, style.detailColor, 0.16);
    pads.strokeCircle(point.x, point.y + 8, Math.max(12, radius * 0.22));
  }
};

const resolveTextureCrop = (
  scene: Phaser.Scene,
  textureKey: string,
  materialIndex: number
): RouteMaterialCrop | null => {
  const texture = scene.textures.get(textureKey);
  const source = texture?.getSourceImage() as { width?: number; height?: number } | undefined;
  if (!source?.width || !source?.height) return null;
  return getRouteMaterialCrop(source.width, source.height, materialIndex);
};

const drawRouteBody = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  const radius = Math.min(22, Math.floor(Math.min(rect.width, rect.height) / 4));

  graphics.fillStyle(style.surfaceColor, 0.025);
  graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, radius);
  graphics.lineStyle(2, style.edgeColor, 0.12);
  graphics.strokeRoundedRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2, radius);
  graphics.lineStyle(1, 0x081820, 0.08);
  graphics.strokeRoundedRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12, Math.max(6, radius - 4));
};

const drawRoutePattern = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  if (style.pattern === 'planks') {
    drawPlanks(graphics, rect, style);
    return;
  }
  if (style.pattern === 'flow') {
    drawFlow(graphics, rect, style);
    return;
  }
  if (style.pattern === 'roots') {
    drawRoots(graphics, rect, style);
    return;
  }
  if (style.pattern === 'circuit') {
    drawCircuit(graphics, rect, style);
    return;
  }
  drawStones(graphics, rect, style);
};

const drawStones = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  graphics.lineStyle(1, style.detailColor, 0.08);
  const centerY = rect.y + rect.height / 2;
  for (let x = rect.x + 34; x < rect.x + rect.width - 20; x += 62) {
    graphics.strokeCircle(x, centerY + ((Math.floor(x) / 62) % 2 === 0 ? -16 : 16), 8);
  }
};

const drawPlanks = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  graphics.lineStyle(2, 0x081820, 0.08);
  for (let x = rect.x + 34; x < rect.x + rect.width - 18; x += 56) {
    graphics.beginPath();
    graphics.moveTo(x, rect.y + 12);
    graphics.lineTo(x + 8, rect.y + rect.height - 12);
    graphics.strokePath();
  }
  graphics.lineStyle(1, style.detailColor, 0.1);
  graphics.beginPath();
  graphics.moveTo(rect.x + 18, rect.y + rect.height / 2);
  graphics.lineTo(rect.x + rect.width - 18, rect.y + rect.height / 2);
  graphics.strokePath();
};

const drawFlow = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  graphics.lineStyle(2, style.detailColor, 0.08);
  for (let x = rect.x + 26; x < rect.x + rect.width - 36; x += 88) {
    const y = rect.y + rect.height / 2;
    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(x + 28, y - 8);
    graphics.lineTo(x + 56, y);
    graphics.strokePath();
  }
};

const drawRoots = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  graphics.lineStyle(2, style.detailColor, 0.08);
  for (let x = rect.x + 28; x < rect.x + rect.width - 32; x += 92) {
    const y = rect.y + rect.height / 2;
    graphics.beginPath();
    graphics.moveTo(x, y + 18);
    graphics.lineTo(x + 22, y + 2);
    graphics.lineTo(x + 52, y + 14);
    graphics.lineTo(x + 74, y - 8);
    graphics.strokePath();
  }
};

const drawCircuit = (
  graphics: Phaser.GameObjects.Graphics,
  rect: RouteSurfaceRect,
  style: RouteSurfaceStyle
): void => {
  const centerY = rect.y + rect.height / 2;
  graphics.lineStyle(2, style.detailColor, 0.11);
  graphics.beginPath();
  graphics.moveTo(rect.x + 24, centerY);
  graphics.lineTo(rect.x + rect.width - 24, centerY);
  graphics.strokePath();

  for (let x = rect.x + 64; x < rect.x + rect.width - 32; x += 136) {
    graphics.fillStyle(style.detailColor, 0.1);
    graphics.fillCircle(x, centerY, 5);
    graphics.lineStyle(1, style.detailColor, 0.1);
    graphics.strokeCircle(x, centerY, 13);
  }
};
