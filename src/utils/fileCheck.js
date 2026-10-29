const SIGNATURES = {
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
};
export const KIND_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf', svg: 'image/svg+xml' };

// The file's real kind from its first bytes (png | jpg | webp | pdf), or null. Names and MIME types are never trusted.
export const sniffKind = (b) => Object.keys(SIGNATURES).find((k) => SIGNATURES[k](b)) ?? null;

export const kindsLabel = (kinds) => {
  const names = kinds.map((k) => (k === 'jpg' ? 'JPG' : k.toUpperCase()));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0] ?? '';
};
export const acceptAttr = (kinds) => kinds.flatMap((k) => [...(k === 'jpg' ? ['.jpg', '.jpeg'] : [`.${k}`]), KIND_MIME[k]]).join(',');

// Client-side courtesy check only; the server's validation stays authoritative.
// kinds: any of 'png' | 'jpg' | 'webp' | 'pdf'. Resolves to an error string or ''.
export async function checkUpload(file, { kinds, maxBytes }) {
  if (!file) return '';
  if (file.size > maxBytes) return `That file is over ${Math.round(maxBytes / 1048576)} MB. Choose a smaller one.`;
  let kind;
  try { kind = sniffKind(new Uint8Array(await file.slice(0, 12).arrayBuffer())); } catch { return 'Could not read that file. Choose another one.'; }
  if (!kinds.includes(kind)) return `That file is not a ${kindsLabel(kinds)}, whatever its name says. Choose another file.`;
  return '';
}
