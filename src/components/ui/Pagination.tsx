import { ChevronLeft, ChevronRight } from 'lucide-react';

// The one pager: "from-to of total" (polite live region), Previous / Page x of y / Next, 44px targets, disabled while loading.
// `pages` is the last page number; the bar hides on a single page unless `always` (lists that show a count anyway).
export default function Pagination({ page, pages, onPage, label, total = null, from = null, to = null, noun = 'items', note = '', busy = false, always = false }: any) {
  if (pages <= 1 && !always) return null;
  const summary = total == null ? `Page ${page} of ${pages}` : from == null ? `${total} ${noun}` : `${total === 0 ? 0 : from}–${to} of ${total} ${noun}${note ? `, ${note}` : ''}`;
  return (
    <nav className="ui-pager" aria-label={label} aria-busy={busy || undefined}>
      <span className="ui-pager-sum" role="status" aria-live="polite">{summary}</span>
      {pages > 1 && (
        <span className="ui-pager-btns">
          <button type="button" className="adm-btn" disabled={busy || page <= 1} onClick={() => onPage(page - 1)} aria-label={`Previous page, ${page - 1} of ${pages}`}><ChevronLeft size={16} aria-hidden="true"/>Previous</button>
          <span className="ui-pager-at">Page {page} of {pages}</span>
          <button type="button" className="adm-btn" disabled={busy || page >= pages} onClick={() => onPage(page + 1)} aria-label={`Next page, ${page + 1} of ${pages}`}>Next<ChevronRight size={16} aria-hidden="true"/></button>
        </span>
      )}
    </nav>
  );
}
