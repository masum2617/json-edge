// Small original code-native icon, written as PNG without an image dependency.
const fs = require('node:fs');
const zlib = require('node:zlib');
const size = 128;
const pixels = Buffer.alloc((size * 4 + 1) * size);
function color(x, y, rgba) {
  const i = y * (size * 4 + 1) + 1 + x * 4;
  rgba.forEach((value, offset) => {
    pixels[i + offset] = value;
  });
}
function line(x1, y1, x2, y2, width, rgba) {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) /
            ((x2 - x1) ** 2 + (y2 - y1) ** 2),
        ),
      );
      if (
        Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) <=
        width / 2
      )
        color(x, y, rgba);
    }
}
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const dx = Math.max(22 - x, 0, x - 105),
      dy = Math.max(22 - y, 0, y - 105);
    color(
      x,
      y,
      dx * dx + dy * dy <= 22 * 22 ? [24, 38, 58, 255] : [0, 0, 0, 0],
    );
  }
const white = [225, 239, 255, 255],
  blue = [83, 181, 255, 255],
  orange = [255, 184, 92, 255];
for (const [a, b, c, d] of [
  [44, 30, 36, 30],
  [36, 30, 36, 54],
  [36, 54, 28, 64],
  [28, 64, 36, 74],
  [36, 74, 36, 98],
  [36, 98, 44, 98],
  [84, 30, 92, 30],
  [92, 30, 92, 54],
  [92, 54, 100, 64],
  [100, 64, 92, 74],
  [92, 74, 92, 98],
  [92, 98, 84, 98],
])
  line(a, b, c, d, 6, white);
line(57, 46, 71, 46, 6, blue);
line(57, 64, 71, 64, 6, orange);
line(57, 82, 71, 82, 6, blue);
function crc(buf) {
  let n = 0xffffffff;
  for (const byte of buf) {
    n ^= byte;
    for (let b = 0; b < 8; b++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, sum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
fs.writeFileSync(
  'media/icon.png',
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
