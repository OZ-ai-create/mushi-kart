import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 180;
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, crcBuf, crc]);
}

function png(rgba) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPx(px, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function fillCircle(px, cx, cy, rad, r, g, b) {
  const r2 = rad * rad;
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(px, x, y, r, g, b);
    }
  }
}

function fillRoundRect(px, x0, y0, w, h, rad, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(x0 + rad - x, 0, x - (x0 + w - 1 - rad));
      const dy = Math.max(y0 + rad - y, 0, y - (y0 + h - 1 - rad));
      if (dx * dx + dy * dy <= rad * rad || (x >= x0 + rad && x < x0 + w - rad) || (y >= y0 + rad && y < y0 + h - rad)) {
        setPx(px, x, y, r, g, b);
      }
    }
  }
}

const px = Buffer.alloc(SIZE * SIZE * 4, 255);
fillRoundRect(px, 0, 0, SIZE, SIZE, 40, 61, 124, 58);
fillRoundRect(px, 26, 98, 128, 38, 14, 201, 163, 106);
fillCircle(px, 50, 138, 14, 44, 33, 24);
fillCircle(px, 130, 138, 14, 44, 33, 24);
fillCircle(px, 90, 78, 38, 42, 33, 24);
fillCircle(px, 90, 72, 24, 90, 70, 50);
fillRoundRect(px, 82, 28, 12, 36, 6, 216, 195, 154);
fillCircle(px, 88, 30, 10, 216, 195, 154);
fillCircle(px, 76, 66, 8, 244, 226, 168);
fillCircle(px, 104, 66, 8, 244, 226, 168);
fillCircle(px, 76, 66, 4, 26, 18, 12);
fillCircle(px, 104, 66, 4, 26, 18, 12);

const out = png(px);
writeFileSync(join(dir, "apple-touch-icon.png"), out);
writeFileSync(join(dir, "pwa-192.png"), out);
console.log("wrote icons");
