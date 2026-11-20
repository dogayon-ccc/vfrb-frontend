// Pure logic for the complete-uniform-set order: size matrices, totals, messages and the POST payload.
// Mirrors App\\Support\\SetOrder on the server, which is the one that enforces these rules.
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
export const PIECES = ['top', 'bottom'] as const;
export const MIN_PER_PIECE = 100;

export type Piece = (typeof PIECES)[number];
export type Matrix = Record<Piece, Record<string, string>>;

export const emptyMatrix = (): Matrix => ({
  top: Object.fromEntries(SIZES.map(s => [s, ''])),
  bottom: Object.fromEntries(SIZES.map(s => [s, ''])),
});

// A copy, never a shared reference, so editing the bottom afterwards leaves the top alone.
export const copyTopToBottom = (m: Matrix): Matrix => ({ top: m.top, bottom: { ...m.top } });

export const setCell = (m: Matrix, piece: Piece, size: string, raw: string): Matrix => ({
  ...m, [piece]: { ...m[piece], [size]: raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6) },
});

export const total = (row: Record<string, string>) => SIZES.reduce((n, s) => n + (Number(row[s]) || 0), 0);

export interface MatrixCheck { ok: boolean; sets: number; top: number; bottom: number; messages: string[] }

export function checkMatrix(m: Matrix): MatrixCheck {
  const top = total(m.top);
  const bottom = total(m.bottom);
  const messages: string[] = [];
  if (top < MIN_PER_PIECE) messages.push(`Tops: add ${MIN_PER_PIECE - top} more (minimum ${MIN_PER_PIECE}).`);
  if (bottom < MIN_PER_PIECE) messages.push(`Bottoms: add ${MIN_PER_PIECE - bottom} more (minimum ${MIN_PER_PIECE}).`);
  if (top !== bottom && top >= MIN_PER_PIECE && bottom >= MIN_PER_PIECE) {
    messages.push(`Tops and bottoms must match: ${Math.abs(top - bottom)} ${top > bottom ? 'more tops than bottoms' : 'more bottoms than tops'}.`);
  }
  const ok = !messages.length;
  return { ok, sets: ok ? top : 0, top, bottom, messages };
}

export const matrixPayload = (m: Matrix) => JSON.stringify(Object.fromEntries(PIECES.map(p =>
  [p, Object.fromEntries(SIZES.filter(s => Number(m[p][s]) > 0).map(s => [s, Number(m[p][s])]))])));

export type Verdict = 'accepted' | 'needs_review' | 'rejected';
export interface RefResult { validation_id: number | null; verdict: Verdict; reason: string; top: string | null; bottom: string | null }

export const REASON_COPY: Record<string, string> = {
  complete_set: 'This looks like a complete uniform set.',
  incomplete_set_top_only: 'We only found a top. VFRB takes complete sets: a top and a matching bottom.',
  incomplete_set_bottom_only: 'We only found a bottom. VFRB takes complete sets: a top and a matching bottom.',
  not_uniform: 'This does not look like a uniform reference. Choose another file.',
  unsupported_file: 'This file type is not supported. Use a JPG, PNG or one-page PDF.',
  ai_unavailable: 'The automatic check is not available right now. Nothing was submitted. Try again in a moment.',
  ai_unreadable: 'The automatic check could not read this file. Try again, or choose another file.',
  pdf_needs_review: 'Multi-page or unreadable PDFs need VFRB review before they can be ordered. A single page image works faster.',
  ambiguous_pair: 'We found more than one top or bottom. VFRB needs to confirm which pair you mean.',
  one_piece_garment: 'This shows a one-piece garment. VFRB needs to review it before it can be ordered as a set.',
  second_piece_unclear: 'One piece is not clear in this file. VFRB needs to review it.',
  uncertain: 'We are not sure what this shows. VFRB needs to review it.',
  pair_not_approved: 'We found a top and a bottom, but VFRB has not approved that combination as a set yet. VFRB needs to review it.',
  no_supported_garment: 'We could not match this to garments VFRB makes. VFRB needs to review it.',
};

// Retry makes sense only when the provider, not the file, was the problem.
export const canRetry = (r: RefResult | null) => !!r && (r.reason === 'ai_unavailable' || r.reason === 'ai_unreadable');
// The only state that lets the customer continue; the server checks the stored verdict again on submit.
export const canContinue = (r: RefResult | null, confirmed: boolean) => !!r && r.verdict === 'accepted' && !!r.validation_id && !!r.top && !!r.bottom && confirmed;

export function setOrderFields(r: RefResult, m: Matrix, d: { deadline: string; delivery_method: string; delivery_address: string; po_reference: string; special_notes: string }) {
  return Object.fromEntries(Object.entries({
    reference_validation_id: r.validation_id, size_matrix: matrixPayload(m), delivery_method: d.delivery_method,
    delivery_address: d.delivery_method === 'pickup' ? '' : d.delivery_address.trim(), preferred_date: d.deadline,
    po_reference: d.po_reference.trim(), special_notes: d.special_notes.trim(),
  }).filter(([, v]) => v !== '' && v != null));
}

// An earlier upload of this customer's, as the server lists it. Only the server's `orderable` flag lets it be resumed.
export interface HeldUpload { id: number; status: string; reason: string; top_garment: string | null; bottom_garment: string | null; orderable: boolean }
export const resumeRef = (h: HeldUpload): RefResult | null =>
  h.orderable && h.top_garment && h.bottom_garment ? { validation_id: h.id, verdict: 'accepted', reason: 'complete_set', top: h.top_garment, bottom: h.bottom_garment } : null;
