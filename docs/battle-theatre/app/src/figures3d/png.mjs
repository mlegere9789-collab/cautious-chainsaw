// Minimal deterministic PNG writer (RGBA8 / RGB8) for the inspection images and the baked impostor atlases. node-only (zlib).
import zlib from 'node:zlib';
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); Buffer.from(data.buffer, data.byteOffset, data.length).copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
export function pngEncode(w, h, rgba, channels = 4) {
  const raw = Buffer.alloc((w * channels + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * channels + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * channels, w * channels).copy(raw, y * (w * channels + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = channels === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))]);
}
