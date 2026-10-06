const SIGNATURES = {
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
};
const EXT_KIND = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', pdf: 'pdf' };

// Client-side courtesy check only; the server's validation stays authoritative.
// kinds: any of 'png' | 'jpg' | 'webp' | 'pdf'. Resolves to an error string or ''.
export async function checkUpload(file, { kinds, maxBytes }) {
  if (!file) return '';
  const label = kinds.map((k) => (k === 'jpg' ? 'JPG' : k.toUpperCase())).join(', ');
  const kind = EXT_KIND[(file.name.split('.').pop() || '').toLowerCase()];
  if (!kind || !kinds.includes(kind)) return `Only ${label} files are allowed.`;
  if (file.size > maxBytes) return `That file is over ${Math.round(maxBytes / 1048576)} MB. Choose a smaller one.`;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!SIGNATURES[kind](head)) return `That file is not a real ${kind === 'jpg' ? 'JPG' : kind.toUpperCase()}. Choose another file.`;
  } catch { return 'Could not read that file. Choose another one.'; }
  return '';
}
