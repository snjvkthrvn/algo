import type Phaser from 'phaser';

/**
 * Bake a static frame grid into ONE RenderTexture (the gym pattern:
 * thousands of tiles collapse into a single GameObject at depth 0).
 * Shared by the Array Plains and Twin Rivers overworld scenes.
 */
export function bakeTileLayer(
  scene: Phaser.Scene,
  textureKey: string,
  frames: number[][],
  tileSize: number
): Phaser.GameObjects.RenderTexture {
  const rows = frames.length;
  const cols = frames[0]?.length ?? 0;
  const rt = scene.add
    .renderTexture(0, 0, cols * tileSize, rows * tileSize)
    .setOrigin(0, 0)
    .setDepth(0);
  rt.beginDraw();
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      rt.batchDrawFrame(textureKey, frames[ty][tx], tx * tileSize, ty * tileSize);
    }
  }
  rt.endDraw();
  return rt;
}
