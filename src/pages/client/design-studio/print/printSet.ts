// Naming for a Top + Bottom production package (pure, no DOM): one folder per piece, unique even when both pieces share a garment name.
import { slug } from './printSpec.ts';

export const ROLE_TITLE: Record<'top' | 'bottom', string> = { top: 'Top', bottom: 'Bottom' };

// "top-polo-shirt", "bottom-pants". A repeated folder gets -2, -3, so two files can never land in one place.
export function setFolders(pieces: Array<{ role: 'top' | 'bottom'; garment: string }>): string[] {
  const seen = new Map<string, number>();
  return pieces.map(p => {
    const base = `${p.role}-${slug(p.garment)}`, n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

// Print sizes are keyed by layer id; a set holds one map per piece, so ids from different pieces never mix.
export const sizesKey = (role: string) => role;
