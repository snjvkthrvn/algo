/**
 * gymShowcase — drop-in art review shelf for the Movement Gym.
 *
 * Loads candidate art straight from an imagegen drop folder (no assets.ts
 * registration, no NPC scale-registry changes) and lines it up in the room
 * at game scale so new sprites can be judged against the player before
 * integration. Every placement is guarded on texture existence: if the drop
 * folder is absent the gym simply shows no shelf.
 */

import Phaser from 'phaser';
import { FONTS } from '../../config/constants';

const DROP_BASE = 'assets/visual_revamp/imagegen_drop_2026_06_10';

/** Keeper masters are 1254px; in-room display height ~96px (player is 64). */
const KEEPER_DISPLAY_HEIGHT = 96;
const CRATE_DISPLAY_SIZE = 48;
const STONE_FRAME = { width: 512, height: 768 };
const STONE_DISPLAY_HEIGHT = 40;

const DROP_CHARACTERS: ReadonlyArray<{ key: string; file: string; label: string }> = [
  { key: 'drop-sorting-farmer', file: 'characters/sorting_farmer.png', label: 'sorting farmer' },
  { key: 'drop-basket-keeper', file: 'characters/basket_keeper.png', label: 'basket keeper' },
  { key: 'drop-crop-sorter', file: 'characters/crop_sorter.png', label: 'crop sorter' },
  { key: 'drop-tile-worker', file: 'characters/tile_worker.png', label: 'tile worker' },
  { key: 'drop-mirror-walker', file: 'characters/mirror_walker.png', label: 'mirror walker' },
  { key: 'drop-bridge-keeper', file: 'characters/bridge_keeper.png', label: 'bridge keeper' },
  { key: 'drop-window-fisher', file: 'characters/window_fisher.png', label: 'window fisher' },
  { key: 'drop-current-rider', file: 'characters/current_rider.png', label: 'current rider' },
  { key: 'drop-hash-keeper', file: 'characters/hash_keeper.png', label: 'hash keeper' },
];

const DROP_CRATE = { key: 'drop-corrupted-crate', file: 'props/corrupted_crate.png' };
const DROP_STONES = {
  key: 'drop-index-stones',
  file: 'twin_rivers_index_stones/twin_rivers_index_stones.png',
};

/** Queue the drop assets. Missing files only log loader warnings. */
export function preloadDropShowcase(scene: Phaser.Scene): void {
  for (const c of DROP_CHARACTERS) {
    if (!scene.textures.exists(c.key)) scene.load.image(c.key, `${DROP_BASE}/${c.file}`);
  }
  if (!scene.textures.exists(DROP_CRATE.key)) {
    scene.load.image(DROP_CRATE.key, `${DROP_BASE}/${DROP_CRATE.file}`);
  }
  if (!scene.textures.exists(DROP_STONES.key)) {
    scene.load.spritesheet(DROP_STONES.key, `${DROP_BASE}/${DROP_STONES.file}`, {
      frameWidth: STONE_FRAME.width,
      frameHeight: STONE_FRAME.height,
    });
  }
}

/**
 * Place the shelf: keepers in a row along the north floor, crate row and
 * index stones beneath them. Returns how many pieces were placed.
 */
export function placeDropShowcase(
  scene: Phaser.Scene,
  origin: { x: number; y: number },
): number {
  let placed = 0;
  const spacing = 128;

  DROP_CHARACTERS.forEach((c, i) => {
    if (!scene.textures.exists(c.key)) return;
    const x = origin.x + i * spacing;
    const img = scene.add.image(x, origin.y, c.key).setDepth(4);
    img.setScale(KEEPER_DISPLAY_HEIGHT / img.height);
    scene.add
      .text(x, origin.y + KEEPER_DISPLAY_HEIGHT / 2 + 10, c.label, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#9fb8c8',
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    placed++;
  });

  if (scene.textures.exists(DROP_CRATE.key)) {
    const crate = scene.add
      .image(origin.x, origin.y + 160, DROP_CRATE.key)
      .setDepth(4);
    crate.setScale(CRATE_DISPLAY_SIZE / crate.height);
    scene.add
      .text(origin.x, origin.y + 160 + CRATE_DISPLAY_SIZE / 2 + 6, 'corrupted crate', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#9fb8c8',
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    placed++;
  }

  if (scene.textures.exists(DROP_STONES.key)) {
    for (let f = 0; f < 4; f++) {
      const stone = scene.add
        .image(origin.x + 160 + f * 56, origin.y + 160, DROP_STONES.key, f)
        .setDepth(4);
      stone.setScale(STONE_DISPLAY_HEIGHT / STONE_FRAME.height);
    }
    scene.add
      .text(origin.x + 160 + 1.5 * 56, origin.y + 160 + STONE_DISPLAY_HEIGHT / 2 + 6, 'index stones', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#9fb8c8',
      })
      .setOrigin(0.5, 0)
      .setDepth(4);
    placed++;
  }

  return placed;
}
