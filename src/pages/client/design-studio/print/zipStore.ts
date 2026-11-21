// Minimal ZIP writer (method 0, STORE): print PNGs are already compressed, so storing them is the right trade and needs no library.
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const u16 = (n: number) => [n & 255, (n >>> 8) & 255];
const u32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const dos = (d: Date) => ({ time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() });

export function makeZip(files: Array<{ name: string; data: Uint8Array }>, when: Date = new Date()): Uint8Array {
  const enc = new TextEncoder(), { time, date } = dos(when);
  const chunks: Uint8Array[] = [], central: number[][] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const local = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(time), ...u16(date), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
    chunks.push(local, name, f.data);
    central.push([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(time), ...u16(date), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]);
    offset += local.length + name.length + size;
  }
  const dir = Uint8Array.from(central.flat());
  const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(dir.length), ...u32(offset), ...u16(0)]);
  const out = new Uint8Array(offset + dir.length + end.length);
  let p = 0; for (const c of [...chunks, dir, end]) { out.set(c, p); p += c.length; }
  return out;
}

// Writes a pHYs chunk (pixels per metre) right after IHDR so print software reads the real DPI.
export function pngWithDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254), at = 33; // 8-byte signature + 25-byte IHDR chunk
  if (png.length < at || png[1] !== 0x50) return png;
  const c = new Uint8Array(21), v = new DataView(c.buffer);
  v.setUint32(0, 9); c.set([0x70, 0x48, 0x59, 0x73], 4); v.setUint32(8, ppm); v.setUint32(12, ppm); c[16] = 1;
  v.setUint32(17, crc32(c.subarray(4, 17)));
  const out = new Uint8Array(png.length + 21);
  out.set(png.subarray(0, at)); out.set(c, at); out.set(png.subarray(at), at + 21);
  return out;
}
