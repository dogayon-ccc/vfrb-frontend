// Customer-facing technical-fit disclosure. Only the server-written status sentences are ever shown:
// no thresholds, spec values, provenance, supplier, stock or cost. This is VFRB's status, not an accuracy score.
export type SpecFit = { complete?: boolean; items?: { text?: unknown }[] } | null | undefined;

export function specFitLines(specFit: unknown): string[] {
  const items = (specFit as SpecFit)?.items;
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const it of items) {
    const t = typeof it?.text === 'string' ? it.text.trim() : '';
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
