// Draws the app icon: a hexagon outline on the theme background. Run once: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x0d, 0x10, 0x16];
const FG = [0x7f, 0xb2, 0xff];

function crc32(buf) {
  let c, crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

/** Distance from the centre to the hexagon edge along the angle, for a pointy-top hexagon of the given radius. */
function inHexRing(x, y, size, outer, inner) {
  const dx = x - size / 2, dy = y - size / 2;
  const d = Math.max(Math.abs(dx) * Math.sqrt(3) / 2 + Math.abs(dy) / 2, Math.abs(dy));
  return d <= outer && d >= inner;
}

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const on = inHexRing(x + 0.5, y + 0.5, size, size * 0.32, size * 0.24) || inHexRing(x + 0.5, y + 0.5, size, size * 0.1, 0);
      row.set(on ? FG : BG, 1 + x * 3);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const size of [192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
