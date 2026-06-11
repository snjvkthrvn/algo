/**
 * gymShowcase — drop-in art review shelf for the Movement Gym.
 *
 * Loads candidate art straight from an imagegen drop folder (no assets.ts
 * registration, no NPC scale-registry changes) and lines it up in the room
 * at game scale so new sprites can be judged against the player before
 * integration. Every placement is guarded on texture existence: if the drop
 * folder is absent the gym simply shows no shelf.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";

const DROP_BASE = "assets/visual_revamp/imagegen_drop_2026_06_10";

/**
 * Targets are BODY heights in world px, matched to where each piece will
 * actually live in-game, so the shelf previews true integration size:
 * - keepers: player-matched — the player displays at 64px (256px frame x
 *   0.25) with ~71% body fill → ~45px body, and the shelf shows keepers at
 *   that same body height for a like-for-like comparison.
 * - crate: BruteForceActor tile (54x42).
 * - stones: Twin Rivers overworld index stones (48px squares).
 * Masters are 1254px squares; bodies fill ~80% of the frame (measured),
 * stones ~49% of their 768px frame.
 */
const KEEPER_BODY_TARGET = 45;
const KEEPER_BODY_FRACTION = 0.8;
const CRATE_BODY_TARGET = 42;
const CRATE_BODY_FRACTION = 0.64;
const STONE_FRAME = { width: 512, height: 768 };
const STONE_BODY_TARGET = 48;
const STONE_BODY_FRACTION = 0.49;

const DROP_CHARACTERS: ReadonlyArray<{
  key: string;
  file: string;
  label: string;
}> = [
  {
    key: "drop-sorting-farmer",
    file: "characters/sorting_farmer.png",
    label: "sorting farmer",
  },
  {
    key: "drop-basket-keeper",
    file: "characters/basket_keeper.png",
    label: "basket keeper",
  },
  {
    key: "drop-crop-sorter",
    file: "characters/crop_sorter.png",
    label: "crop sorter",
  },
  {
    key: "drop-tile-worker",
    file: "characters/tile_worker.png",
    label: "tile worker",
  },
  {
    key: "drop-mirror-walker",
    file: "characters/mirror_walker.png",
    label: "mirror walker",
  },
  {
    key: "drop-bridge-keeper",
    file: "characters/bridge_keeper.png",
    label: "bridge keeper",
  },
  {
    key: "drop-window-fisher",
    file: "characters/window_fisher.png",
    label: "window fisher",
  },
  {
    key: "drop-current-rider",
    file: "characters/current_rider.png",
    label: "current rider",
  },
  {
    key: "drop-hash-keeper",
    file: "characters/hash_keeper.png",
    label: "hash keeper",
  },
];

const DROP_CRATE = {
  key: "drop-corrupted-crate",
  file: "props/corrupted_crate.png",
};
const DROP_STONES = {
  key: "drop-index-stones",
  file: "twin_rivers_index_stones/twin_rivers_index_stones.png",
};

/** Queue the drop assets. Missing files only log loader warnings. */
export function preloadDropShowcase(scene: Phaser.Scene): void {
  for (const c of DROP_CHARACTERS) {
    if (!scene.textures.exists(c.key))
      scene.load.image(c.key, `${DROP_BASE}/${c.file}`);
  }
  if (!scene.textures.exists(DROP_CRATE.key)) {
    scene.load.image(DROP_CRATE.key, `${DROP_BASE}/${DROP_CRATE.file}`);
  }
  if (!scene.textures.exists(DROP_STONES.key)) {
    scene.load.spritesheet(
      DROP_STONES.key,
      `${DROP_BASE}/${DROP_STONES.file}`,
      {
        frameWidth: STONE_FRAME.width,
        frameHeight: STONE_FRAME.height,
      },
    );
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
  const spacing = 192;
  const keeperHeight = KEEPER_BODY_TARGET / KEEPER_BODY_FRACTION;
  const label = (x: number, y: number, text: string) =>
    scene.add
      .text(x, y, text, {
        fontSize: "8px",
        fontFamily: FONTS.RETRO,
        color: "#9fb8c8",
      })
      .setOrigin(0.5, 0)
      .setDepth(4);

  DROP_CHARACTERS.forEach((c, i) => {
    if (!scene.textures.exists(c.key)) return;
    const x = origin.x + i * spacing;
    const img = scene.add.image(x, origin.y, c.key).setDepth(4);
    img.setScale(keeperHeight / img.height);
    label(x, origin.y + KEEPER_BODY_TARGET / 2 + 12, c.label);
    placed++;
  });

  const rowY = origin.y + 240;
  if (scene.textures.exists(DROP_CRATE.key)) {
    const crateHeight = CRATE_BODY_TARGET / CRATE_BODY_FRACTION;
    // Offset west of interior collision block 1 (x 640-767) so the crate
    // sits on open floor.
    const crateX = origin.x - 160;
    const crate = scene.add.image(crateX, rowY, DROP_CRATE.key).setDepth(4);
    crate.setScale(crateHeight / crate.height);
    label(crateX, rowY + CRATE_BODY_TARGET / 2 + 8, "corrupted crate");
    placed++;
  }

  if (scene.textures.exists(DROP_STONES.key)) {
    const stoneHeight = STONE_BODY_TARGET / STONE_BODY_FRACTION;
    for (let f = 0; f < 4; f++) {
      const stone = scene.add
        .image(origin.x + 160 + f * 64, rowY, DROP_STONES.key, f)
        .setDepth(4);
      stone.setScale(stoneHeight / STONE_FRAME.height);
    }
    label(
      origin.x + 160 + 1.5 * 64,
      rowY + STONE_BODY_TARGET / 2 + 8,
      "index stones",
    );
    placed++;
  }

  return placed;
}
