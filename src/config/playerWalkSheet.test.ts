/**
 * Guards the player walk spritesheet against inconsistent generated art.
 *
 * Regression: imagegen_player_walk_smooth_v9.png shipped a right-facing row
 * whose body stopped ~36px above the ground line of the other three rows,
 * with a detached dust speck below — walking right made the player shrink
 * and float. Player.ts slices this sheet as 4 rows (down/left/right/up) of
 * eight 256x256 frames and never flips, so every row must stand on the same
 * ground line.
 */

import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROLOGUE_SHEET_SPRITE_ASSETS, PROLOGUE_SHEET_KEYS } from "./assets";

const FRAME_SIZE = 256;
const DIRECTION_ROWS = ["down", "left", "right", "up"] as const;
const ALPHA_THRESHOLD = 32;
/** Max allowed spread (px) between the body ground lines of the 4 rows. */
const GROUND_LINE_TOLERANCE_PX = 6;

interface DecodedPng {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  pixels: Uint8Array;
}

/** Minimal decoder for 8-bit RGBA non-interlaced PNGs (what our sheets are). */
function decodePng(buffer: Buffer): DecodedPng {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((byte, i) => {
    if (buffer[i] !== byte) throw new Error("Not a PNG file");
  });

  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];
  let offset = 8;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;

    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      const bitDepth = buffer[dataStart + 8];
      const colorType = buffer[dataStart + 9];
      const interlace = buffer[dataStart + 12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(
          `Unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}); expected 8-bit RGBA non-interlaced`,
        );
      }
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataStart + length));
    } else if (type === "IEND") {
      break;
    }

    offset = dataStart + length + 4; // skip data + CRC
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = new Uint8Array(width * height * bytesPerPixel);

  const paeth = (a: number, b: number, c: number): number => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const outStart = y * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rowStart + x];
      const left =
        x >= bytesPerPixel ? pixels[outStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[outStart - stride + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? pixels[outStart - stride + x - bytesPerPixel]
          : 0;

      let value: number;
      switch (filter) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + left;
          break;
        case 2:
          value = rawByte + up;
          break;
        case 3:
          value = rawByte + ((left + up) >> 1);
          break;
        case 4:
          value = rawByte + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`Unknown PNG filter type ${filter} on row ${y}`);
      }
      pixels[outStart + x] = value & 0xff;
    }
  }

  return { width, height, pixels };
}

function alphaAt(png: DecodedPng, x: number, y: number): number {
  return png.pixels[(y * png.width + x) * 4 + 3];
}

/**
 * Bottom y (within the frame) of the largest contiguous vertical run of
 * opaque rows — the character's body, ignoring detached specks.
 */
function bodyBottom(png: DecodedPng, frameX: number, frameY: number): number {
  const opaqueRows: boolean[] = [];
  for (let y = 0; y < FRAME_SIZE; y++) {
    let opaque = false;
    for (let x = 0; x < FRAME_SIZE; x++) {
      if (alphaAt(png, frameX + x, frameY + y) > ALPHA_THRESHOLD) {
        opaque = true;
        break;
      }
    }
    opaqueRows.push(opaque);
  }

  let best = { start: -1, end: -1 };
  let runStart = -1;
  for (let y = 0; y <= FRAME_SIZE; y++) {
    const opaque = y < FRAME_SIZE && opaqueRows[y];
    if (opaque && runStart === -1) runStart = y;
    if (!opaque && runStart !== -1) {
      if (y - 1 - runStart > best.end - best.start)
        best = { start: runStart, end: y - 1 };
      runStart = -1;
    }
  }
  if (best.end === -1) throw new Error("Frame is fully transparent");
  return best.end;
}

describe("player walk spritesheet consistency", () => {
  const entry = PROLOGUE_SHEET_SPRITE_ASSETS.find(
    (asset) => asset.key === PROLOGUE_SHEET_KEYS.PLAYER,
  );

  it("declares the player sheet with 256px frames", () => {
    expect(entry).toBeDefined();
    expect(entry?.frameWidth).toBe(FRAME_SIZE);
    expect(entry?.frameHeight).toBe(FRAME_SIZE);
  });

  it("all four direction rows stand on the same ground line", () => {
    if (!entry) throw new Error("player sheet asset entry missing");
    const png = decodePng(
      readFileSync(resolve(__dirname, "../../public", entry.path)),
    );
    expect(png.width).toBe(FRAME_SIZE * 8);
    expect(png.height).toBe(FRAME_SIZE * 4);

    // Ground line per direction row, sampled across all 8 frames.
    const groundLines = DIRECTION_ROWS.map((_, row) => {
      const bottoms = Array.from({ length: 8 }, (_, col) =>
        bodyBottom(png, col * FRAME_SIZE, row * FRAME_SIZE),
      );
      return Math.max(...bottoms);
    });

    const spread = Math.max(...groundLines) - Math.min(...groundLines);
    expect(
      spread,
      `ground lines per direction row ${JSON.stringify(
        Object.fromEntries(DIRECTION_ROWS.map((d, i) => [d, groundLines[i]])),
      )} drift more than ${GROUND_LINE_TOLERANCE_PX}px — a row's art floats above the others`,
    ).toBeLessThanOrEqual(GROUND_LINE_TOLERANCE_PX);
  });
});
